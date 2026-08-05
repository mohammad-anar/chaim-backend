import { createClient } from "redis";
import config from "../config/index.js";

const redisClient = createClient({
  url: config.redis_url || process.env.REDIS_URL || "redis://localhost:6379",
});

let isConnected = false;

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err?.message || err);
  isConnected = false;
});

redisClient.on("connect", () => {
  isConnected = true;
  console.log("Redis client connected successfully");
});

(async () => {
  try {
    await redisClient.connect();
    isConnected = true;
  } catch (err: any) {
    console.warn("Redis connection failed. Continuing without caching:", err?.message || err);
    isConnected = false;
  }
})();

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!isConnected) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Redis getCache error for key ${key}:`, err);
    return null;
  }
};

export const setCache = async (key: string, data: any, ttlSeconds: number = 300): Promise<void> => {
  if (!isConnected) return;
  try {
    await redisClient.set(key, JSON.stringify(data), {
      EX: ttlSeconds,
    });
  } catch (err) {
    console.error(`Redis setCache error for key ${key}:`, err);
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!isConnected) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`Redis deleteCache error for key ${key}:`, err);
  }
};

export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
  if (!isConnected) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error(`Redis deleteCacheByPattern error for pattern ${pattern}:`, err);
  }
};

export default redisClient;
