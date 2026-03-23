const { verifyAccessToken } = require('../utils/jwt');

function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Missing access token'));
    }

    const payload = verifyAccessToken(token);
    socket.user = {
      id: payload.userId,
      email: payload.email
    };

    return next();
  } catch (error) {
    return next(new Error('Invalid access token'));
  }
}

module.exports = {
  socketAuthMiddleware
};