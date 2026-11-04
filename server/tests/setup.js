import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

export async function startDb() {
  process.env.JWT_ACCESS_SECRET = 'test-a';
  process.env.JWT_REFRESH_SECRET = 'test-r';

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}

export async function clearDb() {
  for (const c of Object.values(mongoose.connection.collections)) {
    await c.deleteMany({});
  }
}