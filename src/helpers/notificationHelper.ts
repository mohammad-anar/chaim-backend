import { AlertType, UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";
import { emitToUser, getIO } from "./socketHelper.js";

interface INotificationPayload {
  title: string;
  message: string;
  type?: AlertType;
  targetRole?: UserRole;
  targetUserId?: string;
  link?: string;
  metadata?: any;
}

/**
 * Core dispatch function that saves notification to DB and broadcasts over Socket.IO
 */
export const dispatchNotification = async (payload: INotificationPayload) => {
  try {
    // 1. Persist in database
    const alert = await prisma.alert.create({
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type || AlertType.INFO,
        targetRole: payload.targetRole || null,
        targetUserId: payload.targetUserId || null,
        link: payload.link || null,
        isActive: true,
      },
    });

    // 2. Emit via Socket.IO
    try {
      const io = getIO();
      const eventData = {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        type: alert.type,
        targetRole: alert.targetRole,
        targetUserId: alert.targetUserId,
        link: alert.link,
        createdAt: alert.createdAt,
        metadata: payload.metadata,
      };

      // Broadcast to specific user if targeted
      if (payload.targetUserId) {
        emitToUser(payload.targetUserId, "new_alert", eventData);
        emitToUser(payload.targetUserId, "notification", eventData);
      }

      // If targeted to SUPER_ADMIN or ALL, broadcast to admin room & global admin event
      if (!payload.targetRole || payload.targetRole === UserRole.SUPER_ADMIN) {
        io.to("admin").emit("admin_alert", eventData);
        io.emit("admin_notification", eventData);
      }

      // If targeted to AMBASSADOR or ALL
      if (!payload.targetRole || payload.targetRole === UserRole.AMBASSADOR) {
        io.to("ambassadors").emit("ambassador_alert", eventData);
      }

      // Generic broadcast
      io.emit("newAlert", eventData);
    } catch (socketErr) {
      console.error("[NotificationHelper] Socket emission warning:", socketErr);
    }

    return alert;
  } catch (dbErr) {
    console.error("[NotificationHelper] Failed to persist and dispatch alert:", dbErr);
    return null;
  }
};

// =========================================================================
// SPECIFIC BUSINESS EVENT NOTIFICATION DISPATCHERS
// =========================================================================

/**
 * 1. Alert Admin when a new Apartment is created/added
 */
export const notifyAdminOnApartmentAdded = async (data: {
  apartmentId: string;
  title: string;
  city: string;
  ownerName: string;
}) => {
  return await dispatchNotification({
    title: "New Apartment Listed",
    message: `Apartment "${data.title}" in ${data.city} was listed by ${data.ownerName}. Pending admin confirmation.`,
    type: AlertType.INFO,
    targetRole: UserRole.SUPER_ADMIN,
    link: `/dashboard/apartments`,
    metadata: { apartmentId: data.apartmentId },
  });
};

/**
 * 2. Alert Admin when a new Ambassador applies/registers
 */
export const notifyAdminOnAmbassadorRegistered = async (data: {
  ambassadorId: string;
  name: string;
  email: string;
  phone: string;
}) => {
  return await dispatchNotification({
    title: "New Ambassador Application",
    message: `${data.name} (${data.email}, ${data.phone}) has submitted an ambassador application.`,
    type: AlertType.INFO,
    targetRole: UserRole.SUPER_ADMIN,
    link: `/dashboard/ambassadors`,
    metadata: { ambassadorId: data.ambassadorId },
  });
};

/**
 * 3. Alert Admin & Ambassador when an apartment is listed using an Ambassador referral link
 */
export const notifyOnAmbassadorAttribution = async (data: {
  ambassadorId: string;
  ambassadorName: string;
  apartmentId: string;
  apartmentTitle: string;
  ownerName: string;
  referralCode: string;
}) => {
  // Notify Admin
  await dispatchNotification({
    title: "New Property Referral Linkage",
    message: `Property "${data.apartmentTitle}" listed by ${data.ownerName} was linked to Ambassador ${data.ambassadorName} (${data.referralCode}).`,
    type: AlertType.INFO,
    targetRole: UserRole.SUPER_ADMIN,
    link: `/dashboard/ambassadors`,
    metadata: { apartmentId: data.apartmentId, ambassadorId: data.ambassadorId },
  });

  // Notify Ambassador
  await dispatchNotification({
    title: "New Property Linked to Your Referral!",
    message: `Great news! "${data.apartmentTitle}" was listed using your referral link. You have 7 days to choose your commission model (Model A or Model B).`,
    type: AlertType.SUCCESS,
    targetRole: UserRole.AMBASSADOR,
    targetUserId: data.ambassadorId,
    link: `/ambassador/dashboard`,
    metadata: { apartmentId: data.apartmentId },
  });
};

/**
 * 4. Alert Admin when an apartment is reported rented
 */
export const notifyAdminOnReportRented = async (data: {
  reportRentedId: string;
  apartmentTitle: string;
  city: string;
  weekend: string | Date;
  hostName: string;
  amount: number;
}) => {
  const formattedDate =
    typeof data.weekend === "string" ? data.weekend : data.weekend.toLocaleDateString();

  return await dispatchNotification({
    title: "Apartment Reported Rented",
    message: `"${data.apartmentTitle}" in ${data.city} was reported rented for weekend ${formattedDate} by ${data.hostName} (₪${data.amount} fee paid).`,
    type: AlertType.SUCCESS,
    targetRole: UserRole.SUPER_ADMIN,
    link: `/dashboard/rentals`,
    metadata: { reportRentedId: data.reportRentedId },
  });
};

/**
 * 5. Alert Admin & Users when an Apartment Swap Request is accepted
 */
export const notifyOnSwapAccepted = async (data: {
  swapId: string;
  swapCode: string;
  fromApartmentTitle: string;
  toApartmentTitle: string;
  fromUserId?: string;
  toUserId?: string;
}) => {
  // Notify Admin
  await dispatchNotification({
    title: "Apartment Swap Accepted",
    message: `Swap [${data.swapCode}] between "${data.fromApartmentTitle}" and "${data.toApartmentTitle}" has been accepted.`,
    type: AlertType.SUCCESS,
    targetRole: UserRole.SUPER_ADMIN,
    link: `/dashboard/swaps`,
    metadata: { swapId: data.swapId },
  });

  // Notify From User
  if (data.fromUserId) {
    await dispatchNotification({
      title: "Swap Request Accepted!",
      message: `Your swap request for "${data.toApartmentTitle}" was accepted.`,
      type: AlertType.SUCCESS,
      targetRole: UserRole.USER,
      targetUserId: data.fromUserId,
      link: `/swap`,
      metadata: { swapId: data.swapId },
    });
  }

  // Notify To User
  if (data.toUserId) {
    await dispatchNotification({
      title: "Swap Confirmed!",
      message: `Swap with "${data.fromApartmentTitle}" is confirmed.`,
      type: AlertType.SUCCESS,
      targetRole: UserRole.USER,
      targetUserId: data.toUserId,
      link: `/swap`,
      metadata: { swapId: data.swapId },
    });
  }
};

/**
 * 6. Alert Admin when an Ambassador requests a payout
 */
export const notifyAdminOnPayoutRequested = async (data: {
  payoutId: string;
  ambassadorId: string;
  ambassadorName: string;
  amount: number;
}) => {
  return await dispatchNotification({
    title: "Ambassador Payout Requested",
    message: `Ambassador ${data.ambassadorName} requested a payout of ₪${data.amount}. Please review in Payout Queue.`,
    type: AlertType.URGENT,
    targetRole: UserRole.SUPER_ADMIN,
    link: `/dashboard/ambassadors`,
    metadata: { payoutId: data.payoutId, ambassadorId: data.ambassadorId },
  });
};

/**
 * 7. Alert Admin when a Review is submitted by a user for moderation
 */
export const notifyAdminOnReviewCreated = async (data: {
  reviewId: string;
  apartmentId: string;
  apartmentTitle: string;
  reviewerName: string;
  rating: number;
  message: string;
}) => {
  return await dispatchNotification({
    title: "New Review Submitted",
    message: `${data.reviewerName} gave ${data.rating}★ for "${data.apartmentTitle}". Review ready for moderation.`,
    type: AlertType.INFO,
    targetRole: UserRole.SUPER_ADMIN,
    link: `/dashboard/reviews`,
    metadata: { reviewId: data.reviewId, apartmentId: data.apartmentId },
  });
};

/**
 * 8. Alert Admin when a Voice Call is initiated (Twilio Masked Call or Hotline)
 */
export const notifyAdminOnCallInitiated = async (data: {
  callLogId: string;
  callerName: string;
  receiverName: string;
  apartmentTitle?: string;
  channel?: string;
}) => {
  return await dispatchNotification({
    title: "Voice Call Initiated",
    message: `${data.callerName} initiated a masked call to ${data.receiverName}${data.apartmentTitle ? ` regarding "${data.apartmentTitle}"` : ""}.`,
    type: AlertType.INFO,
    targetRole: UserRole.SUPER_ADMIN,
    link: `/dashboard/apartment-calls`,
    metadata: { callLogId: data.callLogId },
  });
};

/**
 * 9. Alert Admin when a WhatsApp Contact is initiated
 */
export const notifyAdminOnWhatsAppInitiated = async (data: {
  callLogId: string;
  callerName: string;
  receiverName: string;
  apartmentTitle?: string;
}) => {
  return await dispatchNotification({
    title: "WhatsApp Contact Initiated",
    message: `${data.callerName} clicked WhatsApp contact for ${data.receiverName}${data.apartmentTitle ? ` regarding "${data.apartmentTitle}"` : ""}.`,
    type: AlertType.INFO,
    targetRole: UserRole.SUPER_ADMIN,
    link: `/dashboard/apartment-calls`,
    metadata: { callLogId: data.callLogId },
  });
};
