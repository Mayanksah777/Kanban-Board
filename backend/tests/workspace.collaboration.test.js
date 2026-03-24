const request = require('supertest');

const { buildServer } = require('../src/serverFactory');
const { startInMemoryMongo, clearDatabase, stopInMemoryMongo } = require('./helpers/db');

describe('Workspace collaboration', () => {
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

  it('owner can add member and member can access shared board', async () => {
    const ownerRegister = await request(app).post('/api/auth/register').send({
      email: 'owner@example.com',
      password: 'password123',
      displayName: 'Owner'
    });

    const memberRegister = await request(app).post('/api/auth/register').send({
      email: 'member@example.com',
      password: 'password123',
      displayName: 'Member'
    });

    const ownerWorkspaceId = ownerRegister.body.workspaceId;
    const ownerBoardId = ownerRegister.body.boardId;
    const ownerToken = ownerRegister.body.accessToken;

    const addMemberResponse = await request(app)
      .post(`/api/workspaces/${ownerWorkspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'member@example.com',
        role: 'editor'
      });

    expect(addMemberResponse.status).toBe(200);
    expect(addMemberResponse.body.member.email).toBe('member@example.com');

    const memberLogin = await request(app).post('/api/auth/login').send({
      email: 'member@example.com',
      password: 'password123'
    });

    const memberToken = memberLogin.body.accessToken;

    const workspaceList = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(workspaceList.status).toBe(200);
    expect(workspaceList.body.workspaces.some((workspace) => workspace.id === ownerWorkspaceId)).toBe(true);

    const boardList = await request(app)
      .get('/api/boards')
      .query({ workspaceId: ownerWorkspaceId })
      .set('Authorization', `Bearer ${memberToken}`);

    expect(boardList.status).toBe(200);
    expect(boardList.body.boards.some((board) => board.id === ownerBoardId)).toBe(true);

    const boardState = await request(app)
      .get(`/api/boards/${ownerBoardId}/state`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(boardState.status).toBe(200);
    expect(boardState.body.columns.length).toBeGreaterThan(0);
  });
});
