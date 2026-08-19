import { Queue, Worker, Job } from "bullmq";
import config from "../config/index.js";
import { emailHelper } from "./emailHelper.js";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

export const emailQueue = new Queue("emailQueue", {
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

export const emailWorker = new Worker(
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

emailWorker.on("completed", (job: any) => {
  console.log(`Job ${job.id} (${job.name}) completed successfully`);
});

emailWorker.on("failed", (job: any, err: any) => {
  console.error(`Job ${job?.id} (${job?.name}) failed:`, err?.message || err);
});

export const excelImportQueue = new Queue("excelImportQueue", {
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

export const excelImportWorker = new Worker(
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

excelImportWorker.on("completed", (job: any) => {
  console.log(`Excel Import Job ${job.id} (${job.name}) completed successfully`);
});

excelImportWorker.on("failed", (job: any, err: any) => {
  console.error(`Excel Import Job ${job?.id} (${job?.name}) failed:`, err?.message || err);
});

