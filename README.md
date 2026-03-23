# Real-Time Collaborative Kanban MVP

## 1) Install dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## 2) Configure environment

### Backend
Copy `.env.example` to `.env` and set values:
- `MONGO_URI`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`

### Frontend
Copy `.env.example` to `.env`.

## 3) Run the app

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```

Backend default: `http://localhost:4000`
Frontend default: `http://localhost:5173`

## 4) Run with Docker Compose

```bash
docker compose up --build
```

Frontend (nginx): `http://localhost:5173`
Backend API: `http://localhost:4000`

## 5) Run tests

```bash
cd backend
npm test
```

## Core features shipped
- JWT auth (access + refresh)
- Multi-user board state + realtime sync via Socket.io
- Card create, move, edit, delete
- Drag and drop supports cross-column moves and within-column reorder
- Optimistic locking with `version` and `card:rejected`
- Optimistic UI updates with rollback on rejection
- Basic test coverage (unit, API, socket)
