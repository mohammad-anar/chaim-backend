import config from "../config/index.js";

/**
 * Initializes a recurring keep-alive self-ping cron job.
 * Pings the server's main route ("/") every 15 minutes (or 14 minutes on Render)
 * to keep the service active and prevent free hosting sleep timeouts.
 */
export const initSelfPingScheduler = () => {
  const pingServer = async () => {
    try {
      const baseUrl =
        process.env.RENDER_EXTERNAL_URL ||
        process.env.BACKEND_URL ||
        `http://127.0.0.1:${config.port || 8000}`;

      const targetUrl = `${baseUrl.replace(/\/+$/, "")}/`;

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Render-KeepAlive-Cron/1.0",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(
          `[KeepAliveCron] Ping successful: ${targetUrl} (Status: ${response.status}, Uptime: ${data?.uptime || "N/A"})`,
        );
      } else {
        console.warn(
          `[KeepAliveCron] Ping returned status ${response.status} from ${targetUrl}`,
        );
      }
    } catch (err: any) {
      console.error("[KeepAliveCron] Error pinging server:", err?.message || err);
    }
  };

  // Run initial ping 30 seconds after startup
  setTimeout(pingServer, 30 * 1000);

  // Run recurring ping every 14 minutes (840,000 ms) to stay comfortably under 15-minute idle sleep timeouts
  const PING_INTERVAL_MS = 14 * 60 * 1000;
  setInterval(pingServer, PING_INTERVAL_MS);
};
