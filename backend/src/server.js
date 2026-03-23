require('dotenv').config();

const { connectDB } = require('./db');
const { buildServer } = require('./serverFactory');

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kanban-mvp';

async function startServer() {
  await connectDB(MONGO_URI);

  const { httpServer } = buildServer();

  httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', error);
    process.exit(1);
  });
}

module.exports = {
  startServer
};