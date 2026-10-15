import mongoose from "mongoose";
import { MongoClient, Db } from "mongodb";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

interface MongoNativeCache {
  client: MongoClient | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
  // eslint-disable-next-line no-var
  var mongoNativeCache: MongoNativeCache | undefined;
}

let cached = global.mongooseCache;
if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

let nativeCached = global.mongoNativeCache;
if (!nativeCached) {
  nativeCached = global.mongoNativeCache = { client: null };
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Пожалуйста, укажите переменную окружения MONGODB_URI в файле .env или .env.local"
    );
  }
  return uri;
}

export function getMongoClient(): MongoClient {
  const uri = getMongoUri();
  if (!nativeCached!.client) {
    nativeCached!.client = new MongoClient(uri);
  }
  return nativeCached!.client;
}

export function getMongoDb(): Db {
  const uri = getMongoUri();
  const dbName = uri.split("/").pop()?.split("?")[0] || "kabachok";
  return getMongoClient().db(dbName || "kabachok");
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = getMongoUri();

  if (cached!.conn && mongoose.connection.readyState === 1) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached!.promise = mongoose.connect(uri, opts).then((m) => {
      return m;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectToDatabase;
