// db.js
import { MongoClient } from 'mongodb';
import { MONGO_CONNECTION_STRING } from './env-configs.js';
const client = new MongoClient(MONGO_CONNECTION_STRING);

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('vyapar-hackathon');
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

async function getDB() {
  if (!db) {
    await connectDB();
    return db;
  }
  return db;
}

export { connectDB, getDB };
