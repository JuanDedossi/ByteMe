import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = { conn: null, promise: null };
}

const cached = globalWithMongoose.mongoose;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/byteme";
    cached.promise = mongoose.connect(uri);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
