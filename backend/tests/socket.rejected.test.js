const request = require('supertest');
const { io: Client } = require('socket.io-client');

const { buildServer } = require('../src/serverFactory');
const { startInMemoryMongo, clearDatabase, stopInMemoryMongo } = require('./helpers/db');

describe('Socket conflict handling', () => {
  let mongoServer;
  let app;
  let io;
  let httpServer;
  let baseUrl;
  let socketClient;

  beforeAll(async () => {
    mongoServer = await startInMemoryMongo();

    const built = buildServer();
    app = built.app;
    io = built.io;
    httpServer = built.httpServer;

    await new Promise((resolve) => {
      httpServer.listen(0, resolve);
    });

    const { port } = httpServer.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    if (socketClient && socketClient.connected) {
      await new Promise((resolve) => {
        socketClient.on('disconnect', resolve);
        socketClient.disconnect();
      });
    }
    socketClient = null;
  });

  afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => httpServer.close(resolve));
    await stopInMemoryMongo(mongoServer);
  });

  it('emits card:rejected when clientVersion does not match', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      email: 'bob@example.com',
      password: 'password123',
      displayName: 'Bob'
    });

    const accessToken = registerResponse.body.accessToken;
    const boardId = registerResponse.body.boardId;

    const boardStateResponse = await request(app)
      .get(`/api/boards/${boardId}/state`)
      .set('Authorization', `Bearer ${accessToken}`);

    const columnId = boardStateResponse.body.columns[0].id;

    const createResponse = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        boardId,
        columnId,
        title: 'Socket conflict card',
        description: ''
      });

    const cardId = createResponse.body.card.id;

    socketClient = new Client(baseUrl, {
      transports: ['websocket'],
      auth: {
        token: accessToken
      }
    });

    await new Promise((resolve, reject) => {
      socketClient.on('connect', resolve);
      socketClient.on('connect_error', reject);
    });

    socketClient.emit('board:join', { boardId });

    const rejectedPromise = new Promise((resolve) => {
      socketClient.on('card:rejected', (payload) => {
        resolve(payload);
      });
    });

    socketClient.emit('card:update', {
      boardId,
      cardId,
      title: 'Conflict update',
      description: 'stale version',
      clientVersion: 999
    });

    const rejectedPayload = await rejectedPromise;

    expect(rejectedPayload.action).toBe('update');
    expect(rejectedPayload.cardId).toBe(cardId);
    expect(rejectedPayload.serverVersion).toBe(0);
  });
});