import cors from "cors";
import express, { Application, Request, Response } from "express";
import config from "./config/index.js";
import router from "./app/routes/index.js";
import globalErrorHandler from "./app/middlewares/globalErrorHandler.js";
import notFound from "./app/middlewares/notFound.js";
import { getIO } from "./helpers/socketHelper.js";

const app: Application = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://10.10.7.102:3000",
  "https://shabbos-rent-website.vercel.app",
  ...(config.cors_origin ? [config.cors_origin] : []),
  ...(config.frontend_url ? [config.frontend_url] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/staging to prevent CORS blocks for frontend
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

//parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("uploads"));

app.use("/api/v1", router);

app.post("/send-job", (req, res) => {
  const { roomId, jobId, message } = req.body;

  try {
    const io = getIO();
    io.to(roomId).emit("newJob", { jobId, message });

    res.json({ success: true, message: `Job sent to room ${roomId}` });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/", (req: Request, res: Response) => {
  res.send({
    message: "Server is running..",
    environment: config.node_env,
    uptime: process.uptime().toFixed(2) + " sec",
    timeStamp: new Date().toISOString(),
  });
});

app.use(globalErrorHandler);

app.use(notFound);

export default app;
