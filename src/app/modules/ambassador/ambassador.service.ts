import bcrypt from "bcryptjs";
import {
  AmbassadorModel,
  AmbassadorStatus,
  CommissionStatus,
  CommissionType,
  PayoutStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { Secret } from "jsonwebtoken";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import { jwtHelper } from "../../../helpers/jwtHelper.js";
import {
  notifyAdminOnAmbassadorRegistered,
  notifyAdminOnPayoutRequested,
} from "../../../helpers/notificationHelper.js";
import { prisma } from "../../../helpers/prisma.js";
import {
  DEFAULT_AMBASSADOR_RATES,
  IAdminApproveFeePayload,
  IAdminProcessPayoutPayload,
  IAdminRelinkAttributionPayload,
  IAdminReviewApplicationPayload,
  IAdminReverseCommissionPayload,
  IAmbassadorBalances,
  IAmbassadorRates,
  ILoginAmbassadorPayload,
  IManualClaimApartmentPayload,
  IRegisterAmbassadorPayload,
  ISelectAttributionModelPayload,
  IUpdateAmbassadorSettingsPayload,
} from "./ambassador.interface.js";

const MINIMUM_PAYOUT_THRESHOLD = 50;

/**
 * Generate a clean, unique referral code from name (e.g. MOSHE50, MOSHE51)
 */
const generateUniqueReferralCode = async (name: string): Promise<string> => {
  const cleanName = name.trim().toUpperCase().replace(/[^A-Z]/g, "");
  const prefix = cleanName.length >= 3 ? cleanName.slice(0, 4) : "AMB";
  let randomNum = Math.floor(10 + Math.random() * 90);
  let code = `${prefix}${randomNum}`;
  let attempt = 0;

  while (await prisma.ambassador.findUnique({ where: { referralCode: code } })) {
    attempt++;
    code = `${prefix}${randomNum + attempt}`;
  }

  return code;
};

/**
 * Get effective commission rates for an ambassador
 */
const getAmbassadorRates = (ratesJson: any): IAmbassadorRates => {
  if (!ratesJson || typeof ratesJson !== "object") {
    return { ...DEFAULT_AMBASSADOR_RATES };
  }
  return {
    modelAListing: ratesJson.modelAListing ?? DEFAULT_AMBASSADOR_RATES.modelAListing,
    modelARental: ratesJson.modelARental ?? DEFAULT_AMBASSADOR_RATES.modelARental,
    modelBListing: ratesJson.modelBListing ?? DEFAULT_AMBASSADOR_RATES.modelBListing,
    modelBRental: ratesJson.modelBRental ?? DEFAULT_AMBASSADOR_RATES.modelBRental,
    subReferralListing: ratesJson.subReferralListing ?? DEFAULT_AMBASSADOR_RATES.subReferralListing,
  };
};

/**
 * Calculate dynamic financial balance for an ambassador
 */
const calculateBalances = async (ambassadorId: string): Promise<IAmbassadorBalances> => {
  const commissions = await prisma.ambassadorCommission.findMany({
    where: { ambassadorId },
  });

  let pendingBalance = 0;
  let approvedBalance = 0;
  let totalPaid = 0;

  for (const comm of commissions) {
    if (comm.status === CommissionStatus.PENDING) {
      pendingBalance += comm.amount;
    } else if (comm.status === CommissionStatus.APPROVED) {
      approvedBalance += comm.amount;
    } else if (comm.status === CommissionStatus.PAID) {
      totalPaid += comm.amount;
    }
  }

  return {
    pendingBalance: Math.max(0, pendingBalance),
    approvedBalance: Math.max(0, approvedBalance),
    totalPaid: Math.max(0, totalPaid),
    totalEarned: Math.max(0, approvedBalance + totalPaid),
  };
};

/**
 * Register a new ambassador applicant
 */
const registerAmbassador = async (payload: IRegisterAmbassadorPayload) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedPhone = payload.phone.replace(/\D/g, "");

  const existingByEmail = await prisma.ambassador.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingByEmail) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "An ambassador account with this email already exists",
    );
  }

  const existingByPhone = await prisma.ambassador.findUnique({
    where: { phone: normalizedPhone },
  });
  if (existingByPhone) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "An ambassador account with this phone number already exists",
    );
  }

  let recruitedById: string | null = null;
  if (payload.recruitmentCode && payload.recruitmentCode.trim() !== "") {
    const recruiter = await prisma.ambassador.findUnique({
      where: { referralCode: payload.recruitmentCode.trim().toUpperCase() },
    });
    if (recruiter && recruiter.status === AmbassadorStatus.ACTIVE) {
      recruitedById = recruiter.id;
    }
  }

  const saltRound = config.bcrypt_salt_round || 10;
  const rawPassword = payload.password || "password123";
  const hashedPassword = await bcrypt.hash(rawPassword, saltRound);

  const ambassador = await prisma.ambassador.create({
    data: {
      name: payload.name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      status: AmbassadorStatus.PENDING,
      defaultModel: AmbassadorModel.MODEL_A,
      recruitedById,
      rates: DEFAULT_AMBASSADOR_RATES as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
    },
  });

  // Notify Admin of New Ambassador Application
  await notifyAdminOnAmbassadorRegistered({
    ambassadorId: ambassador.id,
    name: ambassador.name,
    email: ambassador.email,
    phone: ambassador.phone,
  });

  return ambassador;
};

/**
 * Ambassador login
 */
const loginAmbassador = async (payload: ILoginAmbassadorPayload) => {
  const normalized = payload.identifier.trim().toLowerCase();
  const phoneOnly = payload.identifier.replace(/\D/g, "");

  const ambassador = await prisma.ambassador.findFirst({
    where: {
      OR: [
        { email: normalized },
        ...(phoneOnly.length >= 6 ? [{ phone: phoneOnly }] : []),
      ],
    },
  });

  if (!ambassador) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "No ambassador account found with these credentials",
    );
  }

  if (payload.password) {
    const isPasswordMatched = await bcrypt.compare(payload.password, ambassador.password);
    if (!isPasswordMatched) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Password does not match");
    }
  }

  if (ambassador.status === AmbassadorStatus.PENDING) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Your application is currently under review by Admin. Please check back soon!",
    );
  }

  if (ambassador.status === AmbassadorStatus.SUSPENDED || ambassador.status === AmbassadorStatus.INACTIVE) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `Your ambassador account is currently ${ambassador.status.toLowerCase()}. Please contact support.`,
    );
  }

  const accessToken = jwtHelper.createToken(
    {
      id: ambassador.id,
      email: ambassador.email,
      role: UserRole.AMBASSADOR,
    },
    config.jwt.jwt_secret as Secret,
    (config.jwt.jwt_expire_in || "7d") as any,
  );

  const balances = await calculateBalances(ambassador.id);

  return {
    accessToken,
    ambassador: {
      id: ambassador.id,
      name: ambassador.name,
      email: ambassador.email,
      phone: ambassador.phone,
      referralCode: ambassador.referralCode,
      defaultModel: ambassador.defaultModel,
      status: ambassador.status,
      rateLockedUntil: ambassador.rateLockedUntil,
      rates: ambassador.rates,
      payoutDetails: ambassador.payoutDetails,
      balances,
    },
  };
};

/**
 * Get current Ambassador profile with real-time stats
 */
const getAmbassadorProfile = async (ambassadorId: string) => {
  const ambassador = await prisma.ambassador.findUnique({
    where: { id: ambassadorId },
    include: {
      recruitedBy: {
        select: { id: true, name: true, referralCode: true },
      },
      _count: {
        select: {
          attributions: true,
          recruitedAmbassadors: true,
          commissions: true,
        },
      },
    },
  });

  if (!ambassador) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ambassador not found");
  }

  const balances = await calculateBalances(ambassadorId);

  const rentalCommissionsCount = await prisma.ambassadorCommission.count({
    where: {
      ambassadorId,
      type: CommissionType.RENTAL,
      status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] },
    },
  });

  return {
    ...ambassador,
    balances,
    stats: {
      apartmentsListed: ambassador._count.attributions,
      rentalsCompleted: rentalCommissionsCount,
      subAmbassadorsCount: ambassador._count.recruitedAmbassadors,
    },
  };
};

/**
 * Update Ambassador settings (defaultModel & payoutDetails)
 */
const updateAmbassadorSettings = async (
  ambassadorId: string,
  payload: IUpdateAmbassadorSettingsPayload,
) => {
  const ambassador = await prisma.ambassador.findUnique({
    where: { id: ambassadorId },
  });
  if (!ambassador) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ambassador not found");
  }

  const updated = await prisma.ambassador.update({
    where: { id: ambassadorId },
    data: {
      ...(payload.defaultModel ? { defaultModel: payload.defaultModel } : {}),
      ...(payload.payoutDetails ? { payoutDetails: payload.payoutDetails as Prisma.InputJsonValue } : {}),
    },
  });

  return updated;
};

/**
 * Get attributed apartments for an ambassador
 */
const getAttributedApartments = async (ambassadorId: string) => {
  const attributions = await prisma.ambassadorAttribution.findMany({
    where: {
      ambassadorId,
      status: "ACTIVE",
    },
    include: {
      apartment: {
        select: {
          id: true,
          title: true,
          city: true,
          neighborhood: true,
          status: true,
          createdAt: true,
          listingPayment: {
            select: { status: true, paidAt: true, amount: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Attach calculated earnings per attribution
  const attributionsWithEarnings = await Promise.all(
    attributions.map(async (attr) => {
      const commissions = await prisma.ambassadorCommission.findMany({
        where: {
          ambassadorId,
          OR: [
            { sourceListingId: attr.apartmentId || attr.id },
            { apartmentTitle: attr.apartmentTitle },
          ],
          status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] },
        },
      });

      const totalEarned = commissions.reduce((sum, c) => sum + c.amount, 0);

      return {
        ...attr,
        totalEarned: Math.max(0, totalEarned),
      };
    }),
  );

  return attributionsWithEarnings;
};

/**
 * Ambassador locks Commission Model (A or B) for an attribution
 */
const selectAttributionModel = async (
  ambassadorId: string,
  payload: ISelectAttributionModelPayload,
) => {
  const attribution = await prisma.ambassadorAttribution.findUnique({
    where: { id: payload.attributionId },
    include: {
      apartment: {
        include: { listingPayment: true },
      },
    },
  });

  if (!attribution) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Attribution record not found");
  }

  if (attribution.ambassadorId !== ambassadorId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized: You do not own this attribution");
  }

  if (attribution.model !== null) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Model has already been locked for this apartment");
  }

  const now = new Date();
  const updatedAttribution = await prisma.ambassadorAttribution.update({
    where: { id: attribution.id },
    data: {
      model: payload.model,
      modelSetAt: now,
    },
  });

  // Calculate commission amount based on ambassador rates
  const ambassador = await prisma.ambassador.findUnique({
    where: { id: ambassadorId },
  });
  const rates = getAmbassadorRates(ambassador?.rates);
  const listingAmount = payload.model === AmbassadorModel.MODEL_A ? rates.modelAListing : rates.modelBListing;

  // Determine status: if apartment listing payment is already completed -> APPROVED, else PENDING
  const isPaid = attribution.apartment?.listingPayment?.status === "COMPLETED";
  const commissionStatus = isPaid ? CommissionStatus.APPROVED : CommissionStatus.PENDING;

  // Create or update listing commission
  const existingComm = await prisma.ambassadorCommission.findFirst({
    where: {
      ambassadorId,
      sourceListingId: attribution.apartmentId || attribution.id,
      type: CommissionType.LISTING,
    },
  });

  if (!existingComm) {
    await prisma.ambassadorCommission.create({
      data: {
        ambassadorId,
        type: CommissionType.LISTING,
        sourceListingId: attribution.apartmentId || attribution.id,
        apartmentTitle: attribution.apartmentTitle,
        amount: listingAmount,
        status: commissionStatus,
        earnedAt: now,
      },
    });
  } else {
    await prisma.ambassadorCommission.update({
      where: { id: existingComm.id },
      data: {
        amount: listingAmount,
        status: commissionStatus,
      },
    });
  }

  // If paid and ambassador has parent recruiter, ensure sub-referral is created
  if (isPaid && ambassador?.recruitedById) {
    const parentRecruiter = await prisma.ambassador.findUnique({
      where: { id: ambassador.recruitedById },
    });
    if (parentRecruiter) {
      const parentRates = getAmbassadorRates(parentRecruiter.rates);
      const existingSub = await prisma.ambassadorCommission.findFirst({
        where: {
          ambassadorId: parentRecruiter.id,
          sourceListingId: attribution.apartmentId || attribution.id,
          type: CommissionType.SUB_REFERRAL,
        },
      });

      if (!existingSub) {
        await prisma.ambassadorCommission.create({
          data: {
            ambassadorId: parentRecruiter.id,
            type: CommissionType.SUB_REFERRAL,
            sourceListingId: attribution.apartmentId || attribution.id,
            apartmentTitle: attribution.apartmentTitle,
            amount: parentRates.subReferralListing || 5,
            status: CommissionStatus.APPROVED,
            earnedAt: now,
          },
        });
      }
    }
  }

  return updatedAttribution;
};

/**
 * Ambassador manually claims a property by owner contact details
 */
const manualClaimApartment = async (
  ambassadorId: string,
  payload: IManualClaimApartmentPayload,
) => {
  const ambassador = await prisma.ambassador.findUnique({
    where: { id: ambassadorId },
  });

  if (!ambassador || ambassador.status !== AmbassadorStatus.ACTIVE) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Ambassador account is not active");
  }

  const phoneOnly = payload.ownerPhone.replace(/\D/g, "");
  const normalizedEmail = payload.ownerEmail ? payload.ownerEmail.trim().toLowerCase() : null;

  // Collision Check: Check if this owner phone or email is already claimed in active attributions
  const existingClaim = await prisma.ambassadorAttribution.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { ownerPhone: phoneOnly },
        ...(normalizedEmail ? [{ ownerEmail: normalizedEmail }] : []),
      ],
    },
  });

  if (existingClaim) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "This apartment/owner has already been claimed by an ambassador",
    );
  }

  // Check if apartment already exists in system for this phone/email
  const existingApartment = await prisma.apartment.findFirst({
    where: {
      OR: [
        { phoneNumber: phoneOnly },
        { whatsApp: phoneOnly },
        ...(normalizedEmail ? [{ user: { email: normalizedEmail } }] : []),
      ],
    },
    include: { listingPayment: true },
  });

  const now = new Date();
  const rates = getAmbassadorRates(ambassador.rates);
  const listingAmount = payload.model === AmbassadorModel.MODEL_A ? rates.modelAListing : rates.modelBListing;

  const attribution = await prisma.ambassadorAttribution.create({
    data: {
      apartmentId: existingApartment?.id || null,
      ambassadorId,
      apartmentTitle: existingApartment?.title || `Apartment (${payload.ownerName || "Owner Listing"})`,
      ownerName: payload.ownerName || "Property Owner",
      ownerPhone: phoneOnly,
      ownerEmail: normalizedEmail,
      model: payload.model,
      modelSetAt: now,
      modelDeadline: now,
      method: "MANUAL",
      status: "ACTIVE",
      listingCreatedAt: existingApartment?.createdAt || now,
    },
  });

  // If apartment is already listed & listing fee is completed -> APPROVED listing commission, else PENDING
  const isPaid = existingApartment?.listingPayment?.status === "COMPLETED";
  const commissionStatus = isPaid ? CommissionStatus.APPROVED : CommissionStatus.PENDING;

  await prisma.ambassadorCommission.create({
    data: {
      ambassadorId,
      type: CommissionType.LISTING,
      sourceListingId: existingApartment?.id || attribution.id,
      apartmentTitle: attribution.apartmentTitle,
      amount: listingAmount,
      status: commissionStatus,
      earnedAt: now,
    },
  });

  return attribution;
};

/**
 * Get Commission Audit Ledger for Ambassador
 */
const getAmbassadorCommissions = async (
  ambassadorId: string,
  filter?: { status?: string; type?: string },
) => {
  const where: Prisma.AmbassadorCommissionWhereInput = {
    ambassadorId,
    ...(filter?.status && filter.status !== "all"
      ? { status: filter.status.toUpperCase() as CommissionStatus }
      : {}),
    ...(filter?.type && filter.type !== "all"
      ? { type: filter.type.toUpperCase() as CommissionType }
      : {}),
  };

  const commissions = await prisma.ambassadorCommission.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return commissions;
};

/**
 * Get Sub-Ambassadors recruited by this Ambassador
 */
const getRecruitedSubAmbassadors = async (ambassadorId: string) => {
  const subAmbassadors = await prisma.ambassador.findMany({
    where: { recruitedById: ambassadorId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      referralCode: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      _count: {
        select: { attributions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate total sub-referral commission earned from each
  const result = await Promise.all(
    subAmbassadors.map(async (sub) => {
      const subCommissions = await prisma.ambassadorCommission.findMany({
        where: {
          ambassadorId,
          type: CommissionType.SUB_REFERRAL,
        },
      });

      const totalEarned = subCommissions.reduce((sum, c) => sum + c.amount, 0);

      return {
        ...sub,
        apartmentsCount: sub._count.attributions,
        totalOverrideEarned: totalEarned,
      };
    }),
  );

  return result;
};

/**
 * Request Payout
 */
const requestPayout = async (ambassadorId: string, requestedAmount?: number) => {
  const balances = await calculateBalances(ambassadorId);

  if (balances.approvedBalance < MINIMUM_PAYOUT_THRESHOLD) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Minimum payout threshold is ₪${MINIMUM_PAYOUT_THRESHOLD}. Your approved balance is ₪${balances.approvedBalance}.`,
    );
  }

  // Check if there is already an active pending payout request
  const existingPending = await prisma.ambassadorPayout.findFirst({
    where: {
      ambassadorId,
      status: PayoutStatus.REQUESTED,
    },
  });

  if (existingPending) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You already have a payout request pending approval by Admin.",
    );
  }

  const payoutAmount = requestedAmount && requestedAmount <= balances.approvedBalance
    ? requestedAmount
    : balances.approvedBalance;

  const payout = await prisma.ambassadorPayout.create({
    data: {
      ambassadorId,
      amount: payoutAmount,
      status: PayoutStatus.REQUESTED,
    },
  });

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: ambassadorId },
    select: { name: true },
  });

  // Notify Admin of Payout Request
  await notifyAdminOnPayoutRequested({
    payoutId: payout.id,
    ambassadorId,
    ambassadorName: ambassador?.name || "Ambassador",
    amount: payoutAmount,
  });

  return payout;
};

/**
 * Get Ambassador Payouts History
 */
const getAmbassadorPayouts = async (ambassadorId: string) => {
  const payouts = await prisma.ambassadorPayout.findMany({
    where: { ambassadorId },
    orderBy: { requestedAt: "desc" },
  });
  return payouts;
};

/**
 * Process Expired 7-Day Deadlines (Daily Background Job / Runner)
 */
const processExpiredDeadlines = async () => {
  const now = new Date();
  const expiredAttributions = await prisma.ambassadorAttribution.findMany({
    where: {
      model: null,
      status: "ACTIVE",
      modelDeadline: { lte: now },
    },
    include: {
      ambassador: true,
      apartment: { include: { listingPayment: true } },
    },
  });

  let processedCount = 0;

  for (const attr of expiredAttributions) {
    const defaultModel = attr.ambassador.defaultModel || AmbassadorModel.MODEL_A;
    const rates = getAmbassadorRates(attr.ambassador.rates);
    const listingAmount = defaultModel === AmbassadorModel.MODEL_A ? rates.modelAListing : rates.modelBListing;

    await prisma.$transaction(async (tx) => {
      await tx.ambassadorAttribution.update({
        where: { id: attr.id },
        data: {
          model: defaultModel,
          modelSetAt: now,
        },
      });

      const isPaid = attr.apartment?.listingPayment?.status === "COMPLETED";
      const commissionStatus = isPaid ? CommissionStatus.APPROVED : CommissionStatus.PENDING;

      const existingComm = await tx.ambassadorCommission.findFirst({
        where: {
          ambassadorId: attr.ambassadorId,
          sourceListingId: attr.apartmentId || attr.id,
          type: CommissionType.LISTING,
        },
      });

      if (!existingComm) {
        await tx.ambassadorCommission.create({
          data: {
            ambassadorId: attr.ambassadorId,
            type: CommissionType.LISTING,
            sourceListingId: attr.apartmentId || attr.id,
            apartmentTitle: attr.apartmentTitle,
            amount: listingAmount,
            status: commissionStatus,
            earnedAt: now,
          },
        });
      }
    });

    processedCount++;
  }

  return { processedCount };
};

// ==========================================
// ADMIN CONTROL CENTER SERVICES
// ==========================================

/**
 * Admin Stats for Ambassador Overview Dashboard
 */
const getAdminStats = async () => {
  const pendingApplicants = await prisma.ambassador.count({
    where: { status: AmbassadorStatus.PENDING },
  });

  const activeAmbassadors = await prisma.ambassador.count({
    where: { status: AmbassadorStatus.ACTIVE },
  });

  const attributedProperties = await prisma.ambassadorAttribution.count({
    where: { status: "ACTIVE" },
  });

  const pendingPayouts = await prisma.ambassadorPayout.count({
    where: { status: PayoutStatus.REQUESTED },
  });

  return {
    pendingApplicants,
    activeAmbassadors,
    attributedProperties,
    pendingPayouts,
  };
};

/**
 * Admin: List all ambassadors with filters & pagination
 */
const getAllAmbassadorsAdmin = async (query: { status?: string; search?: string }) => {
  const where: Prisma.AmbassadorWhereInput = {
    ...(query.status && query.status !== "all"
      ? { status: query.status.toUpperCase() as AmbassadorStatus }
      : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search } },
            { referralCode: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const ambassadors = await prisma.ambassador.findMany({
    where,
    include: {
      recruitedBy: {
        select: { id: true, name: true, referralCode: true },
      },
      _count: {
        select: {
          attributions: true,
          recruitedAmbassadors: true,
          commissions: true,
          payouts: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    ambassadors.map(async (amb) => {
      const balances = await calculateBalances(amb.id);
      return {
        ...amb,
        balances,
        propertiesCount: amb._count.attributions,
      };
    }),
  );

  return enriched;
};

/**
 * Admin: Review Ambassador Application (Approve or Reject)
 */
const reviewAmbassadorApplication = async (
  ambassadorId: string,
  payload: IAdminReviewApplicationPayload,
) => {
  const ambassador = await prisma.ambassador.findUnique({
    where: { id: ambassadorId },
  });

  if (!ambassador) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ambassador application not found");
  }

  const now = new Date();

  if (payload.status === "APPROVED") {
    let referralCode = payload.customReferralCode?.trim().toUpperCase();
    if (!referralCode) {
      referralCode = await generateUniqueReferralCode(ambassador.name);
    } else {
      const codeExists = await prisma.ambassador.findUnique({
        where: { referralCode },
      });
      if (codeExists && codeExists.id !== ambassadorId) {
        throw new ApiError(StatusCodes.CONFLICT, "Custom referral code is already in use");
      }
    }

    const rateLockedUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1-Year Rate Lock

    const updated = await prisma.ambassador.update({
      where: { id: ambassadorId },
      data: {
        status: AmbassadorStatus.ACTIVE,
        referralCode,
        approvedAt: now,
        contractSignedAt: now,
        rateLockedUntil,
        ...(payload.rates ? { rates: payload.rates as Prisma.InputJsonValue } : {}),
      },
    });

    return updated;
  } else {
    const updated = await prisma.ambassador.update({
      where: { id: ambassadorId },
      data: {
        status: AmbassadorStatus.INACTIVE,
      },
    });

    return updated;
  }
};

/**
 * Admin: Get all attributions with ambassador details
 */
const getAllAttributionsAdmin = async () => {
  const attributions = await prisma.ambassadorAttribution.findMany({
    include: {
      ambassador: {
        select: { id: true, name: true, email: true, phone: true, referralCode: true },
      },
      apartment: {
        select: {
          id: true,
          title: true,
          status: true,
          listingPayment: { select: { status: true, paidAt: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return attributions;
};

/**
 * Admin: Relink / Override attribution
 */
const adminRelinkAttribution = async (payload: IAdminRelinkAttributionPayload) => {
  const attribution = await prisma.ambassadorAttribution.findUnique({
    where: { id: payload.attributionId },
  });

  if (!attribution) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Attribution record not found");
  }

  const now = new Date();

  const updated = await prisma.ambassadorAttribution.update({
    where: { id: payload.attributionId },
    data: {
      ...(payload.newAmbassadorId ? { ambassadorId: payload.newAmbassadorId } : {}),
      ...(payload.newModel ? { model: payload.newModel, modelSetAt: now } : {}),
      method: "ADMIN",
    },
  });

  return updated;
};

/**
 * Admin: Get all commissions system-wide
 */
const getAllCommissionsAdmin = async () => {
  const commissions = await prisma.ambassadorCommission.findMany({
    include: {
      ambassador: {
        select: { id: true, name: true, email: true, referralCode: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return commissions;
};

/**
 * Admin: Manually approve pending listing fee commission
 */
const adminApproveFee = async (payload: IAdminApproveFeePayload) => {
  const target = await prisma.ambassadorCommission.findFirst({
    where: {
      type: CommissionType.LISTING,
      status: CommissionStatus.PENDING,
      OR: [
        ...(payload.commissionId ? [{ id: payload.commissionId }] : []),
        ...(payload.sourceListingId ? [{ sourceListingId: payload.sourceListingId }] : []),
      ],
    },
  });

  if (!target) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "No pending listing commission found matching the criteria",
    );
  }

  const updated = await prisma.ambassadorCommission.update({
    where: { id: target.id },
    data: {
      status: CommissionStatus.APPROVED,
    },
  });

  return updated;
};

/**
 * Admin: Generate negative reversal entry for audit ledger
 */
const adminReverseCommission = async (payload: IAdminReverseCommissionPayload) => {
  const original = await prisma.ambassadorCommission.findUnique({
    where: { id: payload.commissionId },
  });

  if (!original) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Original commission not found");
  }

  if (original.status === CommissionStatus.REVERSED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Commission is already marked as reversed");
  }

  const now = new Date();

  const reversal = await prisma.$transaction(async (tx) => {
    await tx.ambassadorCommission.update({
      where: { id: original.id },
      data: { status: CommissionStatus.REVERSED },
    });

    const revEntry = await tx.ambassadorCommission.create({
      data: {
        ambassadorId: original.ambassadorId,
        type: CommissionType.REVERSAL,
        sourceListingId: original.sourceListingId,
        sourceRentalId: original.sourceRentalId,
        apartmentTitle: original.apartmentTitle,
        amount: -Math.abs(original.amount),
        status: CommissionStatus.REVERSED,
        reversalOf: original.id,
        reversalReason: payload.reason || "Admin audit reversal: listing fee refunded or rental invalid",
        earnedAt: now,
      },
    });

    return revEntry;
  });

  return reversal;
};

/**
 * Admin: List all payout requests
 */
const getAllPayoutsAdmin = async () => {
  const payouts = await prisma.ambassadorPayout.findMany({
    include: {
      ambassador: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          payoutDetails: true,
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  return payouts;
};

/**
 * Admin: Process Payout Request (Approve as PAID or REJECT)
 */
const adminProcessPayout = async (
  payoutId: string,
  payload: IAdminProcessPayoutPayload,
) => {
  const payout = await prisma.ambassadorPayout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Payout request not found");
  }

  if (payout.status !== PayoutStatus.REQUESTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Payout request is already ${payout.status.toLowerCase()}`,
    );
  }

  const now = new Date();

  if (payload.status === "PAID") {
    const referenceCode =
      payload.referenceCode || `PAY-${Math.floor(100000 + Math.random() * 900000)}`;

    const processed = await prisma.$transaction(async (tx) => {
      const updatedPayout = await tx.ambassadorPayout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.PAID,
          referenceCode,
          paidAt: now,
        },
      });

      // Update approved commissions for this ambassador to PAID
      await tx.ambassadorCommission.updateMany({
        where: {
          ambassadorId: payout.ambassadorId,
          status: CommissionStatus.APPROVED,
        },
        data: {
          status: CommissionStatus.PAID,
          payoutId: payout.id,
        },
      });

      return updatedPayout;
    });

    return processed;
  } else {
    const rejected = await prisma.ambassadorPayout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.REJECTED,
        rejectionReason: payload.rejectionReason || "Information mismatch or rejected by admin",
      },
    });

    return rejected;
  }
};

export const AmbassadorService = {
  registerAmbassador,
  loginAmbassador,
  getAmbassadorProfile,
  updateAmbassadorSettings,
  getAttributedApartments,
  selectAttributionModel,
  manualClaimApartment,
  getAmbassadorCommissions,
  getRecruitedSubAmbassadors,
  requestPayout,
  getAmbassadorPayouts,
  processExpiredDeadlines,
  getAdminStats,
  getAllAmbassadorsAdmin,
  reviewAmbassadorApplication,
  getAllAttributionsAdmin,
  adminRelinkAttribution,
  getAllCommissionsAdmin,
  adminApproveFee,
  adminReverseCommission,
  getAllPayoutsAdmin,
  adminProcessPayout,
  getAmbassadorRates,
};
