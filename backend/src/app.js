const cors = require('cors');
const express = require('express');

const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const boardRoutes = require('./routes/boardRoutes');
const cardRoutes = require('./routes/cardRoutes');
const { authMiddleware } = require('./middlewares/authMiddleware');
const { notFoundMiddleware, errorMiddleware } = require('./middlewares/errorMiddleware');

function createApp(io) {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || '*'
    })
  );
  app.use(express.json());

  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/workspaces', authMiddleware, workspaceRoutes);
  app.use('/api/boards', authMiddleware, boardRoutes);
  app.use('/api/cards', authMiddleware, cardRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

module.exports = {
  createApp
};
