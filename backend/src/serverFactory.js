const http = require('http');
const { Server } = require('socket.io');

const { createApp } = require('./app');
const { socketAuthMiddleware } = require('./sockets/socketAuth');
const { registerBoardSocket } = require('./sockets/boardSocket');

function buildServer() {
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*'
    }
  });

  io.use(socketAuthMiddleware);
  io.on('connection', (socket) => {
    registerBoardSocket(io, socket);
  });

  const app = createApp(io);
  httpServer.on('request', app);

  return {
    app,
    io,
    httpServer
  };
}

module.exports = {
  buildServer
};