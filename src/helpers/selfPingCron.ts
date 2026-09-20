import config from "../config/index.js";

/**
 * Initializes a recurring keep-alive self-ping cron job.
 * Pings the server's main route ("/") every 15 minutes (or 14 minutes on Render)
 * to keep the service active and prevent free hosting sleep timeouts.
 */
export const initSelfPingScheduler = () => {
  const pingServer = async () => {
    const urlsToPing: string[] = [
      "https://chaim-backend.onrender.com/",
    ];

    if (process.env.RENDER_EXTERNAL_URL) {
      const renderUrl = `${process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, "")}/`;
      if (!urlsToPing.includes(renderUrl)) {
        urlsToPing.push(renderUrl);
      }
    }

    if (process.env.BACKEND_URL && !process.env.BACKEND_URL.includes("localhost")) {
      const backendUrl = `${process.env.BACKEND_URL.replace(/\/+$/, "")}/`;
      if (!urlsToPing.includes(backendUrl)) {
        urlsToPing.push(backendUrl);
      }
    }

    for (const targetUrl of urlsToPing) {
      try {
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Render-KeepAlive-Cron/1.0",
          },
        });

        if (response.ok) {
          const data: any = await response.json().catch(() => ({}));
          console.log(
            `[KeepAliveCron] Ping successful: ${targetUrl} (Status: ${response.status}, Uptime: ${data?.uptime || "N/A"})`,
          );
        } else {
          console.warn(
            `[KeepAliveCron] Ping returned status ${response.status} from ${targetUrl}`,
          );
        }
      } catch (err: any) {
        console.error(`[KeepAliveCron] Error pinging ${targetUrl}:`, err?.message || err);
      }
    }
  };

  // Run initial ping 10 seconds after startup
  setTimeout(pingServer, 10 * 1000);

  // Run recurring ping every 14 minutes (840,000 ms) to prevent Render free instance idle sleep
  const PING_INTERVAL_MS = 14 * 60 * 1000;
  setInterval(pingServer, PING_INTERVAL_MS);
  console.log("[KeepAliveCron] Scheduled keep-alive ping every 14 minutes");
};
