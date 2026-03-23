const request = require('supertest');

const { buildServer } = require('../src/serverFactory');
const { startInMemoryMongo, clearDatabase, stopInMemoryMongo } = require('./helpers/db');

describe('Auth + create card API', () => {
  let mongoServer;
  let app;
  let io;
  let httpServer;

  beforeAll(async () => {
    mongoServer = await startInMemoryMongo();
    const built = buildServer();
    app = built.app;
    io = built.io;
    httpServer = built.httpServer;
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => httpServer.close(resolve));
    await stopInMemoryMongo(mongoServer);
  });

  it('logs in and creates a card', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'alice@example.com',
      password: 'password123',
      displayName: 'Alice'
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'password123'
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.accessToken).toBeTruthy();
    expect(loginResponse.body.boardId).toBeTruthy();

    const accessToken = loginResponse.body.accessToken;
    const boardId = loginResponse.body.boardId;

    const boardStateResponse = await request(app)
      .get(`/api/boards/${boardId}/state`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(boardStateResponse.status).toBe(200);
    expect(boardStateResponse.body.columns.length).toBeGreaterThan(0);

    const columnId = boardStateResponse.body.columns[0].id;

    const createResponse = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        boardId,
        columnId,
        title: 'Test card',
        description: 'From api test'
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.card.title).toBe('Test card');
    expect(createResponse.body.card.version).toBe(0);
  });
});