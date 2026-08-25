import app from "./app.js";
import config from "./config/index.js";
import { seedSuperAdmin } from "./db/seedSuperAdmin.js";
import { initAmbassadorDeadlineScheduler } from "./helpers/ambassadorDeadlineCron.js";
import { initSocket } from "./helpers/socketHelper.js";
import "./helpers/bullQueue.js";

let server: any;

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception detected. Shutting down...");
  console.error(error);
  process.exit(1);
});

async function bootstrap() {
  try {
    // seeding admin
    await seedSuperAdmin();

    server = app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
    });
    // socket
    initSocket(server);

    // ambassador deadline cron runner
    initAmbassadorDeadlineScheduler();
  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1);
  }
}

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection detected. Shutting down...");
  console.error(error);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received.");
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  }
});

process.on("SIGINT", () => {
  console.log("SIGINT received.");
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  }
});

bootstrap();
