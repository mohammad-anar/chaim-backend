import { AmbassadorService } from "../app/modules/ambassador/ambassador.service.js";

/**
 * Initializes the recurring job to process expired 7-day ambassador attribution deadlines.
 * Runs on startup and subsequently every 1 hour.
 */
export const initAmbassadorDeadlineScheduler = () => {
  const runCheck = async () => {
    try {
      const result = await AmbassadorService.processExpiredDeadlines();
      if (result.processedCount > 0) {
        console.log(
          `[AmbassadorDeadlineRunner] Auto-assigned default models to ${result.processedCount} expired attribution(s).`,
        );
      }
    } catch (err) {
      console.error("[AmbassadorDeadlineRunner] Error running deadline check:", err);
    }
  };

  // Run initial check after 10 seconds of startup
  setTimeout(runCheck, 10000);

  // Run recurring check every 1 hour (3,600,000 ms)
  setInterval(runCheck, 60 * 60 * 1000);
};
