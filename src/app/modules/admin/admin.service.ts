import {
  ApartmentStatus,
  PaymentStatus,
  ReportType,
  SwapStatus,
} from "@prisma/client";
import { prisma } from "../../../helpers/prisma.js";
import { AmbassadorService } from "../ambassador/ambassador.service.js";
import { CallLogServices } from "../callLog/callLog.service.js";
import {
  ICityDemandItem,
  IDashboardStats,
  IMonthlyRevenueData,
  IRecentActivityItem,
  IWeeklyRevenueItem,
} from "./admin.interface.js";

/**
 * 1. Admin Dashboard Primary KPI Stats
 */
const getDashboardStats = async (): Promise<IDashboardStats> => {
  const [
    totalApartments,
    activeApartments,
    pendingApartments,
    blockedApartments,
    completedRentals,
    completedSwaps,
    pendingListingPayments,
    pendingReportRentedPayments,
    pendingSwapPayments,
  ] = await Promise.all([
    prisma.apartment.count(),
    prisma.apartment.count({ where: { status: ApartmentStatus.CONFIRMED } }),
    prisma.apartment.count({ where: { status: ApartmentStatus.PENDING } }),
    prisma.apartment.count({ where: { status: ApartmentStatus.BLOCKED } }),
    prisma.reportRented.count({ where: { reportType: ReportType.RENT } }),
    prisma.reportRented.count({ where: { reportType: ReportType.SWAP } }),
    prisma.apartmentListingPayment.findMany({
      where: { status: PaymentStatus.PENDING },
      select: { amount: true },
    }),
    prisma.reportRentedPayment.findMany({
      where: { status: PaymentStatus.PENDING },
      select: { amount: true },
    }),
    prisma.swapPayment.findMany({
      where: { status: PaymentStatus.PENDING },
      select: { amount: true },
    }),
  ]);

  const listingFeesAmount = pendingListingPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  const reportRentedFeesAmount = pendingReportRentedPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  const swapFeesAmount = pendingSwapPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );

  const totalUnpaidAmount =
    listingFeesAmount + reportRentedFeesAmount + swapFeesAmount;
  const totalUnpaidCount =
    pendingListingPayments.length +
    pendingReportRentedPayments.length +
    pendingSwapPayments.length;

  return {
    totalApartments,
    activeApartments,
    pendingApartments,
    blockedApartments,
    completedRentals,
    completedSwaps,
    unpaidFees: {
      totalUnpaidAmount,
      totalUnpaidCount,
      listingFees: {
        count: pendingListingPayments.length,
        amount: listingFeesAmount,
      },
      reportRentedFees: {
        count: pendingReportRentedPayments.length,
        amount: reportRentedFeesAmount,
      },
      swapFees: {
        count: pendingSwapPayments.length,
        amount: swapFeesAmount,
      },
    },
  };
};

/**
 * 2. Monthly Revenue Bar Chart Data (Grouped by Week1, Week2, ...)
 */
const getMonthlyRevenue = async (
  queryYear?: number,
  queryMonth?: number,
): Promise<IMonthlyRevenueData> => {
  const now = new Date();
  const year = queryYear || now.getFullYear();
  const month = queryMonth || now.getMonth() + 1; // 1 to 12

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthName = monthNames[month - 1] || `Month ${month}`;

  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999);

  // Completed payments within the month
  const [listingPayments, reportPayments, swapPayments] = await Promise.all([
    prisma.apartmentListingPayment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        OR: [
          { paidAt: { gte: startDate, lte: endDate } },
          {
            AND: [
              { paidAt: null },
              { createdAt: { gte: startDate, lte: endDate } },
            ],
          },
        ],
      },
      select: { amount: true, paidAt: true, createdAt: true },
    }),
    prisma.reportRentedPayment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        OR: [
          { paidAt: { gte: startDate, lte: endDate } },
          {
            AND: [
              { paidAt: null },
              { createdAt: { gte: startDate, lte: endDate } },
            ],
          },
        ],
      },
      select: { amount: true, paidAt: true, createdAt: true },
    }),
    prisma.swapPayment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        OR: [
          { paidAt: { gte: startDate, lte: endDate } },
          {
            AND: [
              { paidAt: null },
              { createdAt: { gte: startDate, lte: endDate } },
            ],
          },
        ],
      },
      select: { amount: true, paidAt: true, createdAt: true },
    }),
  ]);

  // Define weeks: Week 1 (1-7), Week 2 (8-14), Week 3 (15-21), Week 4 (22-28), Week 5 (29-end)
  const weekDefinitions = [
    { weekNumber: 1, startDay: 1, endDay: 7 },
    { weekNumber: 2, startDay: 8, endDay: 14 },
    { weekNumber: 3, startDay: 15, endDay: 21 },
    { weekNumber: 4, startDay: 22, endDay: 28 },
    { weekNumber: 5, startDay: 29, endDay: daysInMonth },
  ];

  const weeks: IWeeklyRevenueItem[] = weekDefinitions.map((def) => {
    const wStart = new Date(year, month - 1, def.startDay, 0, 0, 0, 0);
    const wEnd = new Date(year, month - 1, def.endDay, 23, 59, 59, 999);

    const isInWeek = (date: Date | null, fallbackDate: Date) => {
      const d = date || fallbackDate;
      return d >= wStart && d <= wEnd;
    };

    const wListing = listingPayments.filter((p) =>
      isInWeek(p.paidAt, p.createdAt),
    );
    const wReport = reportPayments.filter((p) =>
      isInWeek(p.paidAt, p.createdAt),
    );
    const wSwap = swapPayments.filter((p) => isInWeek(p.paidAt, p.createdAt));

    const listingRevenue = wListing.reduce((acc, p) => acc + (p.amount || 0), 0);
    const reportRentedRevenue = wReport.reduce(
      (acc, p) => acc + (p.amount || 0),
      0,
    );
    const swapRevenue = wSwap.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalRevenue = listingRevenue + reportRentedRevenue + swapRevenue;
    const transactionCount = wListing.length + wReport.length + wSwap.length;

    return {
      week: `Week ${def.weekNumber}`,
      weekNumber: def.weekNumber,
      startDate: `${year}-${String(month).padStart(2, "0")}-${String(def.startDay).padStart(2, "0")}`,
      endDate: `${year}-${String(month).padStart(2, "0")}-${String(def.endDay).padStart(2, "0")}`,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      listingRevenue: Math.round(listingRevenue * 100) / 100,
      reportRentedRevenue: Math.round(reportRentedRevenue * 100) / 100,
      swapRevenue: Math.round(swapRevenue * 100) / 100,
      transactionCount,
    };
  });

  const totalMonthlyRevenue = weeks.reduce((sum, w) => sum + w.totalRevenue, 0);
  const totalTransactions = weeks.reduce(
    (sum, w) => sum + w.transactionCount,
    0,
  );

  return {
    year,
    month,
    monthName,
    totalMonthlyRevenue: Math.round(totalMonthlyRevenue * 100) / 100,
    totalTransactions,
    weeks,
  };
};

/**
 * 3. Search Demand by City Bar Chart Data
 */
const getCitySearchDemand = async (limit = 10): Promise<ICityDemandItem[]> => {
  const [searchLogs, apartmentGroups, interestedRequests] = await Promise.all([
    prisma.citySearchLog.findMany({
      orderBy: { searchCount: "desc" },
    }),
    prisma.apartment.groupBy({
      by: ["city"],
      _count: { id: true },
    }),
    prisma.interestedRequest.findMany({
      include: {
        apartment: { select: { city: true } },
      },
    }),
  ]);

  const cityMap = new Map<
    string,
    { searchVolume: number; apartmentCount: number; interestedCount: number }
  >();

  // Helper to normalize city key
  const formatCity = (name: string) => {
    if (!name) return "";
    const clean = name.trim();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  // Populate logged searches
  searchLogs.forEach((log) => {
    const key = formatCity(log.city);
    if (!key) return;
    const existing = cityMap.get(key) || {
      searchVolume: 0,
      apartmentCount: 0,
      interestedCount: 0,
    };
    existing.searchVolume += log.searchCount;
    cityMap.set(key, existing);
  });

  // Populate apartment distribution
  apartmentGroups.forEach((group) => {
    const key = formatCity(group.city);
    if (!key) return;
    const existing = cityMap.get(key) || {
      searchVolume: 0,
      apartmentCount: 0,
      interestedCount: 0,
    };
    existing.apartmentCount += group._count.id;
    cityMap.set(key, existing);
  });

  // Populate interested requests
  interestedRequests.forEach((req) => {
    if (!req.apartment?.city) return;
    const key = formatCity(req.apartment.city);
    const existing = cityMap.get(key) || {
      searchVolume: 0,
      apartmentCount: 0,
      interestedCount: 0,
    };
    existing.interestedCount += 1;
    cityMap.set(key, existing);
  });

  // Convert to list with demand score
  const result: ICityDemandItem[] = Array.from(cityMap.entries()).map(
    ([city, data]) => {
      // Demand score = searchVolume * 2 + interestedCount * 3 + apartmentCount
      const totalDemandScore =
        data.searchVolume * 2 + data.interestedCount * 3 + data.apartmentCount;
      return {
        city,
        searchVolume: data.searchVolume,
        apartmentCount: data.apartmentCount,
        interestedCount: data.interestedCount,
        totalDemandScore,
      };
    },
  );

  // Sort by search volume, then demand score
  result.sort((a, b) => {
    if (b.searchVolume !== a.searchVolume) {
      return b.searchVolume - a.searchVolume;
    }
    return b.totalDemandScore - a.totalDemandScore;
  });

  return result.slice(0, limit);
};

/**
 * 4. Recent Activity Stream
 */
const getRecentActivity = async (
  limit = 20,
): Promise<IRecentActivityItem[]> => {
  const fetchLimit = Math.min(limit, 50);

  const [
    reportRentedList,
    listingPayments,
    reportPayments,
    swapPayments,
    swapRequests,
    recentApartments,
    recentUsers,
  ] = await Promise.all([
    prisma.reportRented.findMany({
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      include: {
        apartment: {
          select: {
            id: true,
            title: true,
            city: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                profileImage: true,
              },
            },
          },
        },
        payment: true,
      },
    }),
    prisma.apartmentListingPayment.findMany({
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      include: {
        apartment: { select: { id: true, title: true, city: true } },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
      },
    }),
    prisma.reportRentedPayment.findMany({
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      include: {
        apartment: { select: { id: true, title: true, city: true } },
        payer: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
      },
    }),
    prisma.swapPayment.findMany({
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      include: {
        swap: {
          include: {
            fromApartment: { select: { id: true, title: true } },
            toApartment: { select: { id: true, title: true } },
          },
        },
        payer: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
      },
    }),
    prisma.swap.findMany({
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      include: {
        fromApartment: {
          select: {
            id: true,
            title: true,
            city: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                profileImage: true,
              },
            },
          },
        },
        toApartment: {
          select: {
            id: true,
            title: true,
            city: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                profileImage: true,
              },
            },
          },
        },
      },
    }),
    prisma.apartment.findMany({
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        profileImage: true,
        createdAt: true,
      },
    }),
  ]);

  const activities: IRecentActivityItem[] = [];

  // Map Report Rented
  reportRentedList.forEach((r) => {
    const isSwap = r.reportType === ReportType.SWAP;
    activities.push({
      id: r.id,
      type: isSwap ? "REPORT_SWAP" : "REPORT_RENTED",
      title: isSwap ? "Apartment Swapped" : "Apartment Rented",
      description: `Apartment "${r.apartment?.title}" was reported ${isSwap ? "swapped" : "rented"} for weekend ${r.weekend.toISOString().split("T")[0]}`,
      status: r.paidAt ? "PAID" : "UNPAID",
      amount: r.payment?.amount || 50,
      currency: "ILS",
      user: r.apartment?.user || null,
      timestamp: r.createdAt,
      metadata: {
        apartmentId: r.apartmentId,
        targetApartmentId: r.targetApartmentId,
        reportType: r.reportType,
      },
    });
  });

  // Map Listing Payments
  listingPayments.forEach((p) => {
    activities.push({
      id: p.id,
      type: "LISTING_PAYMENT",
      title: "Apartment Listing Payment",
      description: `Listing fee of ${p.amount} ILS for "${p.apartment?.title}" (${p.status})`,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      user: p.user || null,
      timestamp: p.paidAt || p.createdAt,
      metadata: {
        apartmentId: p.apartmentId,
        transactionId: p.transactionId,
      },
    });
  });

  // Map Report Rented Payments
  reportPayments.forEach((p) => {
    activities.push({
      id: p.id,
      type: "REPORT_RENTED_PAYMENT",
      title: "Report Rented Booking Fee",
      description: `50 ILS fee payment for "${p.apartment?.title}" (${p.status})`,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      user: p.payer || null,
      timestamp: p.paidAt || p.createdAt,
      metadata: {
        apartmentId: p.apartmentId,
        reportRentedId: p.reportRentedId,
      },
    });
  });

  // Map Swap Payments
  swapPayments.forEach((p) => {
    activities.push({
      id: p.id,
      type: "SWAP_PAYMENT",
      title: "Swap Fee Payment",
      description: `Swap fee payment of ${p.amount} ILS (${p.status})`,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      user: p.payer || null,
      timestamp: p.paidAt || p.createdAt,
      metadata: {
        swapId: p.swapId,
      },
    });
  });

  // Map Swap Requests
  swapRequests.forEach((s) => {
    activities.push({
      id: s.id,
      type: "SWAP_REQUEST",
      title: "Swap Request Created",
      description: `Swap requested from "${s.fromApartment?.title}" to "${s.toApartment?.title}" (${s.status})`,
      status: s.status,
      user: s.fromApartment?.user || null,
      timestamp: s.createdAt,
      metadata: {
        swapCode: s.swapCode,
        fromApartmentId: s.fromAppId,
        toApartmentId: s.toAppId,
      },
    });
  });

  // Map New Apartments
  recentApartments.forEach((a) => {
    activities.push({
      id: a.id,
      type: "NEW_APARTMENT",
      title: "New Apartment Listed",
      description: `"${a.title}" in ${a.city} (${a.neighborhood}) listed for ${a.pricePerShabbat} ILS`,
      status: a.status,
      amount: a.pricePerShabbat,
      currency: "ILS",
      user: a.user || null,
      timestamp: a.createdAt,
      metadata: {
        apartmentId: a.id,
        propertyId: a.propertyId,
        city: a.city,
      },
    });
  });

  // Map New Users
  recentUsers.forEach((u) => {
    activities.push({
      id: u.id,
      type: "NEW_USER",
      title: "New User Registered",
      description: `User @${u.username} signed up`,
      status: "ACTIVE",
      user: u,
      timestamp: u.createdAt,
      metadata: {
        userId: u.id,
      },
    });
  });

  // Sort all descending by timestamp
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return activities.slice(0, limit);
};

/**
 * 5. Ambassador Overview Stats for Admin Dashboard
 */
const getAmbassadorOverview = async () => {
  return await AmbassadorService.getAdminStats();
};

/**
 * 6. Twilio Call Logs Admin
 */
const getAllCallLogs = async () => {
  return await CallLogServices.getAllCallLogsAdmin();
};

export const AdminServices = {
  getDashboardStats,
  getMonthlyRevenue,
  getCitySearchDemand,
  getRecentActivity,
  getAmbassadorOverview,
  getAllCallLogs,
};
