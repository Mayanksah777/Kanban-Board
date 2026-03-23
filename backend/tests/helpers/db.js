const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB } = require('../../src/db');

async function startInMemoryMongo() {
  const mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
  return mongoServer;
}

async function clearDatabase() {
  const collections = mongoose.connection.collections;
  const tasks = Object.keys(collections).map((name) => collections[name].deleteMany({}));
  await Promise.all(tasks);
}

async function stopInMemoryMongo(mongoServer) {
  if (mongoServer) {
    await mongoServer.stop({ doCleanup: true, force: true });
  }
}

module.exports = {
  startInMemoryMongo,
  clearDatabase,
  stopInMemoryMongo
};
