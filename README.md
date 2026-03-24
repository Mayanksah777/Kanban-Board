# Real-Time Collaborative Kanban Board

MERN + Socket.io collaborative Kanban board with:
- JWT auth (access + refresh)
- Workspace-based collaboration
- Real-time card sync
- Optimistic updates + version conflict handling

## Stack
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.io
- Frontend: React, TailwindCSS, `@dnd-kit/core`
- Tests: Jest, Supertest

## Project Structure
```text
/backend
  /src
  /tests
/frontend
  /src
docker-compose.yml
```

## Local Setup

### 1) Install dependencies
```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2) Configure environment variables

Create these files from examples:
```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Backend required variables:
- `MONGO_URI`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `FRONTEND_URL`

Frontend variables:
- `VITE_API_URL`
- `VITE_SOCKET_URL`

### 3) Run app
Terminal 1:
```bash
cd backend
npm run dev
```

Terminal 2:
```bash
cd frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Docker Setup
```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`

## How To Use (Example)

### Single user
1. Register/login.
2. Create a workspace (`+ New`).
3. Create a board (`+ New Board`).
4. Open board and add cards.
5. Drag cards between columns or reorder in same column.
6. Click card to edit/delete.

### Multi-user collaboration
1. User A logs in and creates workspace + board.
2. User A clicks `+ Member` and adds User B email.
3. User B logs in and opens the same workspace/board.
4. Both users edit/move cards and see real-time sync.

## Conflict Handling
- Each card has `version`.
- Client sends `clientVersion`.
- If mismatch, server emits `card:rejected`.
- UI rolls back and shows conflict toast.

## API Highlights
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/workspaces`
- `POST /api/workspaces`
- `POST /api/workspaces/:workspaceId/members` (owner only)
- `GET /api/boards?workspaceId=<id>`
- `POST /api/boards`
- `GET /api/boards/:boardId/state`

## Run Tests
```bash
cd backend
npm test
```

## Notes
- Workspace roles are stored as `owner | editor | viewer`.
- Current permission enforcement is minimal.
- Owner can add members.
- Workspace members can collaborate on board/card actions.
