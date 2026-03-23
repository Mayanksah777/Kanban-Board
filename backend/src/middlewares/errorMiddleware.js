function notFoundMiddleware(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

function errorMiddleware(error, req, res, next) {
  const status = error.status || 500;
  const message = error.message || 'Unexpected server error';

  if (process.env.NODE_ENV !== 'test') {
    // Keep logs in non-test env for easier debugging.
    // eslint-disable-next-line no-console
    console.error(error);
  }

  res.status(status).json({ message });
}

module.exports = {
  notFoundMiddleware,
  errorMiddleware
};