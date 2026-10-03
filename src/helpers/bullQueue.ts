import { Queue, Worker, Job } from "bullmq";
import config from "../config/index.js";
import { emailHelper } from "./emailHelper.js";

const redisUrl = config.redis_url || process.env.REDIS_URL;
const isExplicitlyDisabled =
  process.env.ENABLE_REDIS === "false" ||
  process.env.REDIS_ENABLE === "false" ||
  !redisUrl;

let isQueueActive = !isExplicitlyDisabled;
let hasLoggedQueueFallback = false;

const logQueueFallbackOnce = (reason?: string) => {
  if (!hasLoggedQueueFallback) {
    hasLoggedQueueFallback = true;
    if (reason) {
      console.warn(
        `[BullMQ] Redis unavailable or request limit reached (${reason}). Disabling background workers and falling back to direct execution.`,
      );
    } else {
      console.log("[BullMQ] Background workers disabled. Running in direct fallback mode.");
    }
  }
};

let connection: any = null;

if (!isExplicitlyDisabled && redisUrl) {
  try {
    if (redisUrl.startsWith("redis://") || redisUrl.startsWith("rediss://")) {
      const parsed = new URL(redisUrl);
      const isTls = redisUrl.startsWith("rediss://");
      connection = {
        host: parsed.hostname,
        port: Number(parsed.port) || 6379,
        password: parsed.password || undefined,
        username: parsed.username || undefined,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 3000,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy(times: number) {
          if (times > 1) return null; // Do not endlessly retry if Redis rejects
          return 1000;
        },
      };
    } else {
      connection = {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        connectTimeout: 3000,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy(times: number) {
          if (times > 1) return null;
          return 1000;
        },
      };
    }
  } catch (e: any) {
    isQueueActive = false;
    logQueueFallbackOnce(e?.message || e);
  }
} else {
  isQueueActive = false;
  logQueueFallbackOnce("Redis URL not provided or disabled");
}

export const isQueueAvailable = (): boolean => isQueueActive;

let emailQueue: Queue | null = null;
let emailWorker: Worker | null = null;
let excelImportQueue: Queue | null = null;
let excelImportWorker: Worker | null = null;

const disableBullMQ = async (reason: string) => {
  if (!isQueueActive && !emailWorker && !excelImportWorker) return;
  isQueueActive = false;
  logQueueFallbackOnce(reason);

  const workersToClose = [emailWorker, excelImportWorker];
  emailWorker = null;
  excelImportWorker = null;

  for (const worker of workersToClose) {
    if (worker) {
      try {
        await worker.close();
      } catch (_) {}
    }
  }

  const queuesToClose = [emailQueue, excelImportQueue];
  for (const queue of queuesToClose) {
    if (queue) {
      try {
        await queue.close();
      } catch (_) {}
    }
  }
};

if (isQueueActive && connection) {
  try {
    emailQueue = new Queue("emailQueue", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });

    emailQueue.on("error", (err: any) => {
      const msg = err?.message || String(err);
      disableBullMQ(msg);
    });

    emailWorker = new Worker(
      "emailQueue",
      async (job: Job) => {
        if (job.name === "sendContactAdminEmail") {
          const { name, email, phone, subject, message } = job.data;
          const adminEmail = config.admin.email || config.email.user || "admin@example.com";

          const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>New Contact Us Submission</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || "N/A"}</p>
              <p><strong>Subject:</strong> ${subject || "No Subject"}</p>
              <p><strong>Message:</strong></p>
              <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
                ${message}
              </div>
            </div>
          `;

          await emailHelper.sendEmail({
            to: adminEmail,
            subject: `[Contact Us] ${subject || "New Message"} from ${name}`,
            html,
          });
        }
      },
      { connection },
    );

    emailWorker.on("error", (err: any) => {
      const msg = err?.message || String(err);
      disableBullMQ(msg);
    });

    emailWorker.on("completed", (job: any) => {
      console.log(`Job ${job.id} (${job.name}) completed successfully`);
    });

    emailWorker.on("failed", (job: any, err: any) => {
      console.error(`Job ${job?.id} (${job?.name}) failed:`, err?.message || err);
    });

    excelImportQueue = new Queue("excelImportQueue", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });

    excelImportQueue.on("error", (err: any) => {
      const msg = err?.message || String(err);
      disableBullMQ(msg);
    });

    excelImportWorker = new Worker(
      "excelImportQueue",
      async (job: Job) => {
        if (job.name === "processWeekendCalendarExcel") {
          const { filePath } = job.data;
          const { WeekendCalendarServices } = await import(
            "../app/modules/weekendCalendar/weekendCalendar.service.js"
          );
          await WeekendCalendarServices.processExcelFile(filePath);
        }
      },
      { connection },
    );

    excelImportWorker.on("error", (err: any) => {
      const msg = err?.message || String(err);
      disableBullMQ(msg);
    });

    excelImportWorker.on("completed", (job: any) => {
      console.log(`Excel Import Job ${job.id} (${job.name}) completed successfully`);
    });

    excelImportWorker.on("failed", (job: any, err: any) => {
      console.error(`Excel Import Job ${job?.id} (${job?.name}) failed:`, err?.message || err);
    });
  } catch (err: any) {
    disableBullMQ(err?.message || err);
  }
}

export { emailQueue, emailWorker, excelImportQueue, excelImportWorker };

