import { createClient } from "redis";
import config from "../config/index.js";

const redisUrl = config.redis_url || process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy(retries) {
      if (retries > 3) {
        return false; // Stop retrying after 3 attempts
      }
      return Math.min(retries * 500, 2000);
    },
  },
});

let isConnected = false;

redisClient.on("error", (err) => {
  if (isConnected) {
    console.warn("[Redis] Client Error:", err?.message || err);
  }
  isConnected = false;
});

redisClient.on("connect", () => {
  isConnected = true;
  console.log("[Redis] Client connected successfully");
});

(async () => {
  try {
    await redisClient.connect();
    isConnected = true;
    await redisClient.flushAll();
    console.log("[Redis] All cache keys flushed on startup");
  } catch (err: any) {
    console.warn(
      "[Redis] Connection failed. Running in fallback mode without Redis caching:",
      err?.message || err,
    );
    isConnected = false;
  }
})();

export const flushAllCache = async (): Promise<void> => {
  if (!isConnected) return;
  try {
    await redisClient.flushAll();
    console.log("[Redis] Successfully flushed all cache keys");
  } catch (err) {
    // Ignore in fallback mode
  }
};

export const getCache = async <T>(_key: string): Promise<T | null> => {
  // Invalidated / bypassed for now so all requests fetch fresh database records
  return null;
};

export const setCache = async (
  key: string,
  data: any,
  ttlSeconds: number = 300,
): Promise<void> => {
  if (!isConnected) return;
  try {
    await redisClient.set(key, JSON.stringify(data), {
      EX: ttlSeconds,
    });
  } catch (err) {
    // Ignore cache set error in fallback mode
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!isConnected) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    // Ignore cache delete error in fallback mode
  }
};

export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
  if (!isConnected) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
      console.log(`[Redis] Cleared ${keys.length} cache key(s) matching "${pattern}"`);
    }
  } catch (err) {
    // Ignore cache delete error in fallback mode
  }
};

export default redisClient;
