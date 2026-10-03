import { createClient } from "redis";
import config from "../config/index.js";

const redisUrl = config.redis_url || process.env.REDIS_URL;
const isExplicitlyDisabled =
  process.env.ENABLE_REDIS === "false" ||
  process.env.REDIS_ENABLE === "false" ||
  !redisUrl;

let isConnected = false;
let redisClient: ReturnType<typeof createClient> | null = null;
let hasLoggedFallback = false;

const logFallbackOnce = (reason?: string) => {
  if (!hasLoggedFallback) {
    hasLoggedFallback = true;
    if (reason) {
      console.warn(
        `[Redis] Redis disabled / unavailable (${reason}). Running in direct DB mode without Redis caching.`,
      );
    } else {
      console.log(
        "[Redis] Running in direct DB mode without Redis caching.",
      );
    }
  }
};

if (!isExplicitlyDisabled && redisUrl) {
  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy(retries) {
          if (retries > 1) {
            return false; // Stop retrying quickly to avoid error floods
          }
          return 1000;
        },
      },
    });

    redisClient.on("error", (err: any) => {
      const msg = err?.message || String(err);
      isConnected = false;
      logFallbackOnce(msg);
      if (
        msg.includes("max requests limit exceeded") ||
        msg.includes("WRONGPASS") ||
        msg.includes("NOAUTH")
      ) {
        try {
          redisClient?.disconnect().catch(() => {});
        } catch (_) {}
      }
    });

    (async () => {
      try {
        await redisClient!.connect();
        // Test basic command
        await redisClient!.ping();
        await redisClient!.flushAll();
        isConnected = true;
        console.log("[Redis] Client connected and cache flushed successfully");
      } catch (err: any) {
        isConnected = false;
        logFallbackOnce(err?.message || err);
        try {
          await redisClient?.disconnect();
        } catch (_) {}
      }
    })();
  } catch (err: any) {
    isConnected = false;
    logFallbackOnce(err?.message || err);
  }
} else {
  logFallbackOnce("Redis URL not provided or disabled");
}

export const isRedisConnected = (): boolean => isConnected;

export const flushAllCache = async (): Promise<void> => {
  if (!isConnected || !redisClient) return;
  try {
    await redisClient.flushAll();
    console.log("[Redis] Successfully flushed all cache keys");
  } catch (err: any) {
    isConnected = false;
    logFallbackOnce(err?.message || err);
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!isConnected || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err: any) {
    isConnected = false;
    logFallbackOnce(err?.message || err);
    return null;
  }
};

export const setCache = async (
  key: string,
  data: any,
  ttlSeconds: number = 300,
): Promise<void> => {
  if (!isConnected || !redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(data), {
      EX: ttlSeconds,
    });
  } catch (err: any) {
    isConnected = false;
    logFallbackOnce(err?.message || err);
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!isConnected || !redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err: any) {
    isConnected = false;
    logFallbackOnce(err?.message || err);
  }
};

export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
  if (!isConnected || !redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
      console.log(`[Redis] Cleared ${keys.length} cache key(s) matching "${pattern}"`);
    }
  } catch (err: any) {
    isConnected = false;
    logFallbackOnce(err?.message || err);
  }
};

export const deleteApartmentCache = async (
  apartmentId?: string | null,
  propertyId?: string | null,
): Promise<void> => {
  if (!isConnected || !redisClient) return;
  try {
    const specificKeys: string[] = [];
    if (apartmentId) {
      specificKeys.push(`apartment:detail:${apartmentId}`);
    }
    if (propertyId) {
      specificKeys.push(`apartment:detail:${propertyId}`);
    }
    if (specificKeys.length > 0) {
      await redisClient.del(specificKeys).catch(() => {});
    }
    await deleteCacheByPattern("apartment:*");
    await deleteCacheByPattern("cities:*");
    await deleteCacheByPattern("locations:*");
  } catch (err: any) {
    isConnected = false;
    logFallbackOnce(err?.message || err);
  }
};

export default redisClient;
