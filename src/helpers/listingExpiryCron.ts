import { prisma } from "./prisma.js";
import {
  dispatchNotification,
  notifyAdminOnListingExpired,
  notifyOwnerListingExpiringSoon,
} from "./notificationHelper.js";
import { emailHelper } from "./emailHelper.js";
import { AlertType } from "@prisma/client";
import config from "../config/index.js";

const FRONTEND_URL = config.frontend_url || "https://shabbos-rent-website.vercel.app";

// ─── Email Templates ────────────────────────────────────────────────────────

const buildExpiryWarningEmail = (opts: {
  ownerName: string;
  apartmentTitle: string;
  daysLeft: number;
  renewUrl: string;
}) => ({
  subject: `⚠️ Your listing "${opts.apartmentTitle}" expires in ${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"}`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:10px">
      <h2 style="color:#e67e22">⚠️ Listing Renewal Reminder</h2>
      <p>Hello <strong>${opts.ownerName}</strong>,</p>
      <p>Your apartment listing <strong>"${opts.apartmentTitle}"</strong> will expire in
        <strong style="color:#e74c3c">${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"}</strong>.
      </p>
      <p>Once expired, your listing will be <strong>hidden from search results</strong> and you won't be able
        to receive rent or swap requests until you renew.</p>
      <p style="margin:24px 0">
        <a href="${opts.renewUrl}"
           style="background:#2ecc71;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Renew My Listing — ₪28
        </a>
      </p>
      <p style="color:#888;font-size:13px">If you have already renewed, please ignore this email.</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
      <p style="color:#aaa;font-size:12px">Shabbos Rent · ${FRONTEND_URL}</p>
    </div>
  `,
});

const buildExpiredEmail = (opts: {
  ownerName: string;
  apartmentTitle: string;
  renewUrl: string;
}) => ({
  subject: `🔴 Your listing "${opts.apartmentTitle}" has expired — renew to stay active`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:10px">
      <h2 style="color:#e74c3c">🔴 Listing Expired</h2>
      <p>Hello <strong>${opts.ownerName}</strong>,</p>
      <p>Your apartment listing <strong>"${opts.apartmentTitle}"</strong> has <strong>expired</strong> and
        is now <strong>hidden from all search results and swap/rent requests</strong>.</p>
      <p>To reactivate your listing for another year, please renew your subscription:</p>
      <p style="margin:24px 0">
        <a href="${opts.renewUrl}"
           style="background:#e74c3c;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Renew My Listing — ₪28
        </a>
      </p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
      <p style="color:#aaa;font-size:12px">Shabbos Rent · ${FRONTEND_URL}</p>
    </div>
  `,
});

// ─── Core Expiry Runner ──────────────────────────────────────────────────────

export const runListingExpiryCheck = async () => {
  const now = new Date();

  console.log("[ListingExpiryCron] Running expiry check at", now.toISOString());

  // ── 1. Suspend apartments whose listing payment is expired & still CONFIRMED ──
  const expired = await prisma.apartmentListingPayment.findMany({
    where: {
      status: "COMPLETED",
      expiresAt: { lt: now },
    },
    include: {
      apartment: {
        select: {
          id: true,
          title: true,
          status: true,
          userId: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  let suspendedCount = 0;
  let notifiedCount = 0;

  for (const payment of expired) {
    const apt = payment.apartment;
    if (!apt) continue;

    // Suspend apartment if it's still CONFIRMED
    if (apt.status === "CONFIRMED") {
      await prisma.apartment.update({
        where: { id: apt.id },
        data: {
          status: "SUSPENDED",
          inactiveNote: "Listing fee expired. Please renew to reactivate your listing.",
        },
      });
      suspendedCount++;

      // In-app notification to owner
      await dispatchNotification({
        title: "🔴 Listing Expired — Action Required",
        message: `Your listing "${apt.title}" has expired. Renew your listing fee (₪28) to reactivate it for rent and swap.`,
        type: AlertType.URGENT,
        targetRole: "OWNER",
        targetUserId: apt.userId,
        link: `${FRONTEND_URL}/my-apartment`,
        metadata: { apartmentId: apt.id },
      });

      // In-app notification to admin
      if (payment.user) {
        await notifyAdminOnListingExpired({
          apartmentId: apt.id,
          apartmentTitle: apt.title,
          ownerName: payment.user.username,
          expiredAt: payment.expiresAt!,
        });
      }

      // Email owner if email available
      if (payment.user?.email) {
        const renewUrl = `${FRONTEND_URL}/my-apartment`;
        const tpl = buildExpiredEmail({
          ownerName: payment.user.username,
          apartmentTitle: apt.title,
          renewUrl,
        });
        try {
          await emailHelper.sendEmail({
            to: payment.user.email,
            subject: tpl.subject,
            html: tpl.html,
          });
          notifiedCount++;
        } catch (emailErr) {
          console.error(`[ListingExpiryCron] Email failed for ${payment.user.email}:`, emailErr);
        }
      }
    }
  }

  // ── 2. Warn owners 30 days before expiry ────────────────────────────────────
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const thirtyDayWindow = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000); // 1-day window

  const expiringSoon30 = await prisma.apartmentListingPayment.findMany({
    where: {
      status: "COMPLETED",
      expiresAt: {
        gte: thirtyDaysFromNow,
        lt: thirtyDayWindow,
      },
      apartment: { status: "CONFIRMED" },
    },
    include: {
      apartment: { select: { id: true, title: true } },
      user: { select: { id: true, username: true, email: true } },
    },
  });

  for (const payment of expiringSoon30) {
    if (!payment.user?.email || !payment.apartment) continue;

    await dispatchNotification({
      title: "⚠️ Listing Renewal Reminder (30 days)",
      message: `Your listing "${payment.apartment.title}" expires in 30 days. Renew to keep it active.`,
      type: AlertType.WARNING,
      targetRole: "OWNER",
      targetUserId: payment.user.id,
      link: `${FRONTEND_URL}/my-apartment`,
      metadata: { apartmentId: payment.apartment.id },
    });

    const renewUrl = `${FRONTEND_URL}/my-apartment`;
    const tpl = buildExpiryWarningEmail({
      ownerName: payment.user.username,
      apartmentTitle: payment.apartment.title,
      daysLeft: 30,
      renewUrl,
    });
    try {
      await emailHelper.sendEmail({ to: payment.user.email, subject: tpl.subject, html: tpl.html });
    } catch (e) {
      console.error("[ListingExpiryCron] 30-day warning email failed:", e);
    }
  }

  // ── 3. Warn owners 7 days before expiry ─────────────────────────────────────
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDayWindow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  const expiringSoon7 = await prisma.apartmentListingPayment.findMany({
    where: {
      status: "COMPLETED",
      expiresAt: {
        gte: sevenDaysFromNow,
        lt: sevenDayWindow,
      },
      apartment: { status: "CONFIRMED" },
    },
    include: {
      apartment: { select: { id: true, title: true } },
      user: { select: { id: true, username: true, email: true } },
    },
  });

  for (const payment of expiringSoon7) {
    if (!payment.user?.email || !payment.apartment) continue;

    await dispatchNotification({
      title: "⚠️ Listing Expires in 7 Days!",
      message: `Your listing "${payment.apartment.title}" expires in 7 days. Renew now to avoid interruption.`,
      type: AlertType.WARNING,
      targetRole: "OWNER",
      targetUserId: payment.user.id,
      link: `${FRONTEND_URL}/my-apartment`,
      metadata: { apartmentId: payment.apartment.id },
    });

    const renewUrl = `${FRONTEND_URL}/my-apartment`;
    const tpl = buildExpiryWarningEmail({
      ownerName: payment.user.username,
      apartmentTitle: payment.apartment.title,
      daysLeft: 7,
      renewUrl,
    });
    try {
      await emailHelper.sendEmail({ to: payment.user.email, subject: tpl.subject, html: tpl.html });
    } catch (e) {
      console.error("[ListingExpiryCron] 7-day warning email failed:", e);
    }
  }

  // ── 4. Warn owners 1 day before expiry ──────────────────────────────────────
  const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const oneDayWindow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const expiringSoon1 = await prisma.apartmentListingPayment.findMany({
    where: {
      status: "COMPLETED",
      expiresAt: {
        gte: oneDayFromNow,
        lt: oneDayWindow,
      },
      apartment: { status: "CONFIRMED" },
    },
    include: {
      apartment: { select: { id: true, title: true } },
      user: { select: { id: true, username: true, email: true } },
    },
  });

  for (const payment of expiringSoon1) {
    if (!payment.user?.email || !payment.apartment) continue;

    await dispatchNotification({
      title: "🚨 Listing Expires Tomorrow!",
      message: `Your listing "${payment.apartment.title}" expires TOMORROW. Renew now to avoid being deactivated.`,
      type: AlertType.URGENT,
      targetRole: "OWNER",
      targetUserId: payment.user.id,
      link: `${FRONTEND_URL}/my-apartment`,
      metadata: { apartmentId: payment.apartment.id },
    });

    const renewUrl = `${FRONTEND_URL}/my-apartment`;
    const tpl = buildExpiryWarningEmail({
      ownerName: payment.user.username,
      apartmentTitle: payment.apartment.title,
      daysLeft: 1,
      renewUrl,
    });
    try {
      await emailHelper.sendEmail({ to: payment.user.email, subject: tpl.subject, html: tpl.html });
    } catch (e) {
      console.error("[ListingExpiryCron] 1-day warning email failed:", e);
    }
  }

  console.log(
    `[ListingExpiryCron] Done. Suspended: ${suspendedCount}, Expired emails sent: ${notifiedCount}, ` +
    `30-day warnings: ${expiringSoon30.length}, 7-day warnings: ${expiringSoon7.length}, 1-day warnings: ${expiringSoon1.length}`
  );

  return {
    suspendedCount,
    warned30: expiringSoon30.length,
    warned7: expiringSoon7.length,
    warned1: expiringSoon1.length,
  };
};

// ─── Re-activate on Renewal ──────────────────────────────────────────────────

/**
 * Called after a successful listing payment verification to reactivate a SUSPENDED apartment.
 * The payment.service.ts already sets status=CONFIRMED — this is a utility to confirm that logic.
 */
export const reactivateApartmentAfterRenewal = async (apartmentId: string) => {
  await prisma.apartment.update({
    where: { id: apartmentId },
    data: {
      status: "CONFIRMED",
      inactiveNote: null,
    },
  });
};

// ─── Scheduler ───────────────────────────────────────────────────────────────

export const initListingExpiryScheduler = () => {
  const run = async () => {
    try {
      await runListingExpiryCheck();
    } catch (err) {
      console.error("[ListingExpiryScheduler] Error:", err);
    }
  };

  // Run once at startup after 15 seconds
  setTimeout(run, 15_000);

  // Run every 24 hours
  setInterval(run, 24 * 60 * 60 * 1000);

  console.log("[ListingExpiryScheduler] Initialized. Runs every 24 hours.");
};
