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
  ICumulativeRevenuePoint,
  IDashboardStats,
  IMonthlyRevenueData,
  IRecentActivityItem,
  IRecentActivityResponse,
  IWeeklyRevenueItem,
} from "./admin.interface.js";

/**
 * Format relative time (e.g. "5 minutes ago", "2 hours ago", "Yesterday")
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60)
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * 1. Admin Dashboard Primary KPI Stats
 */
const getDashboardStats = async (): Promise<IDashboardStats> => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const startOfThisMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
  const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
  const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const [
    totalApartments,
    activeApartments,
    newApartmentsThisMonth,
    pendingApartments,
    blockedApartments,
    completedRentals,
    completedRentalsThisMonth,
    completedRentalsLastMonth,
    completedSwaps,
    pendingListingPayments,
    pendingReportRentedPayments,
    pendingSwapPayments,
  ] = await Promise.all([
    prisma.apartment.count(),
    prisma.apartment.count({ where: { status: ApartmentStatus.CONFIRMED } }),
    prisma.apartment.count({
      where: {
        status: ApartmentStatus.CONFIRMED,
        createdAt: { gte: startOfThisMonth },
      },
    }),
    prisma.apartment.count({ where: { status: ApartmentStatus.PENDING } }),
    prisma.apartment.count({ where: { status: ApartmentStatus.BLOCKED } }),
    prisma.reportRented.count({ where: { reportType: ReportType.RENT } }),
    prisma.reportRented.count({
      where: {
        reportType: ReportType.RENT,
        createdAt: { gte: startOfThisMonth },
      },
    }),
    prisma.reportRented.count({
      where: {
        reportType: ReportType.RENT,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
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

  // Calculate rental growth percentage
  let rentalGrowthPercentage = 0;
  if (completedRentalsLastMonth > 0) {
    rentalGrowthPercentage = Math.round(
      ((completedRentalsThisMonth - completedRentalsLastMonth) /
        completedRentalsLastMonth) *
        100,
    );
  } else if (completedRentalsThisMonth > 0) {
    rentalGrowthPercentage = 100;
  }

  const rentalBadge =
    rentalGrowthPercentage >= 0
      ? `+${rentalGrowthPercentage}%`
      : `${rentalGrowthPercentage}%`;

  const activeBadge =
    newApartmentsThisMonth > 0
      ? `+${newApartmentsThisMonth}`
      : `0`;

  return {
    totalApartments,
    totalApartmentsLabel: "All registered listings",
    totalApartmentsBadge: "Total",
    activeApartments,
    activeApartmentsLabel: "Currently live on site",
    activeApartmentsBadge: activeBadge,
    newApartmentsThisMonth,
    completedRentals,
    completedRentalsLabel: "This month",
    completedRentalsBadge: rentalBadge,
    completedRentalsThisMonth,
    completedRentalsLastMonth,
    completedRentalsGrowthPercentage: rentalGrowthPercentage,
    completedSwaps,
    pendingApartments,
    blockedApartments,
    unpaidFees: {
      totalUnpaidAmount,
      totalUnpaidCount,
      feePerUnit: 50,
      badge: "Pending",
      label: "Needs follow-up",
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
 * 2. Monthly Revenue Bar / Area Chart Data (Grouped by Week1, Week2, ...)
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

  // Build cumulative trajectory for smooth curve charting
  let runningCumulative = 0;
  const cumulativeTrajectory: ICumulativeRevenuePoint[] = weeks.map((w) => {
    runningCumulative += w.totalRevenue;
    return {
      label: w.week,
      weekNumber: w.weekNumber,
      weeklyRevenue: w.totalRevenue,
      cumulativeRevenue: Math.round(runningCumulative * 100) / 100,
    };
  });

  return {
    year,
    month,
    monthName,
    totalMonthlyRevenue: Math.round(totalMonthlyRevenue * 100) / 100,
    totalTransactions,
    cumulativeTrajectory,
    weeks,
  };
};

/**
 * 3. Search Demand by City Bar Chart Data (Filtered by Month / Year)
 */
const getCitySearchDemand = async (
  limit = 5,
  queryYear?: number,
  queryMonth?: number,
): Promise<ICityDemandItem[]> => {
  const isFiltered = Boolean(queryYear && queryMonth);
  const now = new Date();
  const year = queryYear || now.getFullYear();
  const month = queryMonth || now.getMonth() + 1;

  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999);

  const [searchLogs, apartmentGroups, interestedRequests, viewHistories, reportRentals] =
    await Promise.all([
      // 1. Search logs (if filtered, only logs updated within this month)
      prisma.citySearchLog.findMany({
        where: isFiltered
          ? { updatedAt: { gte: startDate, lte: endDate } }
          : undefined,
        orderBy: { searchCount: "desc" },
      }),
      // 2. Apartments existing up to the end of this month
      prisma.apartment.groupBy({
        by: ["city"],
        where: isFiltered ? { createdAt: { lte: endDate } } : undefined,
        _count: { id: true },
      }),
      // 3. Interested requests created in this month
      prisma.interestedRequest.findMany({
        where: isFiltered
          ? { createdAt: { gte: startDate, lte: endDate } }
          : undefined,
        include: {
          apartment: { select: { city: true } },
        },
      }),
      // 4. View histories created in this month
      prisma.apartmentViewHistory.findMany({
        where: isFiltered
          ? { createdAt: { gte: startDate, lte: endDate } }
          : undefined,
        include: {
          apartment: { select: { city: true } },
        },
      }),
      // 5. Rentals/swaps completed in this month
      prisma.reportRented.findMany({
        where: isFiltered
          ? { createdAt: { gte: startDate, lte: endDate } }
          : undefined,
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

  // Populate search volume from search logs (only matching logs for the filtered month)
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

  // Populate apartment distribution up to this month
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

  // Populate interested requests for this month
  interestedRequests.forEach((req) => {
    if (!req.apartment?.city) return;
    const key = formatCity(req.apartment.city);
    const existing = cityMap.get(key) || {
      searchVolume: 0,
      apartmentCount: 0,
      interestedCount: 0,
    };
    existing.interestedCount += 1;
    existing.searchVolume += 3; // each interested request contributes to search demand
    cityMap.set(key, existing);
  });

  // Populate view histories for this month
  viewHistories.forEach((vh) => {
    if (!vh.apartment?.city) return;
    const key = formatCity(vh.apartment.city);
    const existing = cityMap.get(key) || {
      searchVolume: 0,
      apartmentCount: 0,
      interestedCount: 0,
    };
    existing.searchVolume += 1; // each view adds to search volume
    cityMap.set(key, existing);
  });

  // Populate completed rentals for this month
  reportRentals.forEach((rr) => {
    if (!rr.apartment?.city) return;
    const key = formatCity(rr.apartment.city);
    const existing = cityMap.get(key) || {
      searchVolume: 0,
      apartmentCount: 0,
      interestedCount: 0,
    };
    existing.searchVolume += 5; // completed rentals contribute strongly to city demand
    cityMap.set(key, existing);
  });

  // Convert to list with demand score
  const result: ICityDemandItem[] = Array.from(cityMap.entries()).map(
    ([city, data]) => {
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

  // Sort primarily by searchVolume descending, then demand score
  result.sort((a, b) => {
    if (b.searchVolume !== a.searchVolume) {
      return b.searchVolume - a.searchVolume;
    }
    return b.totalDemandScore - a.totalDemandScore;
  });

  return result.slice(0, limit);
};

/**
 * 4. Recent Activity Stream / Table Data
 */
const getRecentActivity = async (query: {
  page?: number;
  limit?: number;
  type?: string;
}): Promise<IRecentActivityResponse> => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const fetchLimit = Math.max(page * limit + 20, 50);

  const [
    reportRentedList,
    listingPayments,
    reportPayments,
    swapPayments,
    swapRequests,
    recentApartments,
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
            propertyId: true,
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
      where: { status: PaymentStatus.PENDING },
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      include: {
        apartment: { select: { id: true, title: true, city: true, propertyId: true } },
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
      where: { status: PaymentStatus.PENDING },
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      include: {
        apartment: { select: { id: true, title: true, city: true, propertyId: true } },
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
      where: { status: PaymentStatus.PENDING },
      take: fetchLimit,
      orderBy: { createdAt: "desc" },
      include: {
        swap: {
          include: {
            fromApartment: { select: { id: true, title: true, city: true } },
            toApartment: { select: { id: true, title: true, city: true } },
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
  ]);

  const activities: IRecentActivityItem[] = [];

  // 1. Map Report Rented (Green Icon -> "Apartment A-102 rented")
  reportRentedList.forEach((r) => {
    const isSwap = r.reportType === ReportType.SWAP;
    const aptIdentifier = r.apartment?.propertyId || r.apartment?.title || "Apartment";
    const title = isSwap
      ? `Apartment ${aptIdentifier} swapped`
      : `Apartment ${aptIdentifier} rented`;
    const relativeTime = formatRelativeTime(r.createdAt);

    activities.push({
      id: r.id,
      type: isSwap ? "REPORT_SWAP" : "RENTED",
      title,
      subtitle: relativeTime,
      relativeTime,
      iconType: "apartment",
      iconColor: "green",
      status: r.paidAt ? "PAID" : "COMPLETED",
      amount: r.payment?.amount || 50,
      currency: "ILS",
      targetType: "apartment",
      targetId: r.apartmentId,
      link: `/dashboard/apartments/${r.apartmentId}`,
      user: r.apartment?.user || null,
      timestamp: r.createdAt,
      metadata: {
        apartmentId: r.apartmentId,
        propertyId: r.apartment?.propertyId,
        weekend: r.weekend,
        reportType: r.reportType,
      },
    });
  });

  // 2. Map Pending Payments (Orange Icon -> "₪50 payment pending" / "Owner: David")
  reportPayments.forEach((p) => {
    const ownerName = p.payer?.username || "Owner";
    const relativeTime = formatRelativeTime(p.createdAt);

    activities.push({
      id: p.id,
      type: "PAYMENT_PENDING",
      title: `₪${p.amount || 50} payment pending`,
      subtitle: `Owner: ${ownerName}`,
      relativeTime,
      iconType: "payment",
      iconColor: "orange",
      status: "PENDING",
      amount: p.amount || 50,
      currency: p.currency || "ILS",
      targetType: "payment",
      targetId: p.id,
      link: `/dashboard/payments`,
      user: p.payer || null,
      timestamp: p.createdAt,
      metadata: {
        apartmentId: p.apartmentId,
        reportRentedId: p.reportRentedId,
      },
    });
  });

  listingPayments.forEach((p) => {
    const ownerName = p.user?.username || "Owner";
    const relativeTime = formatRelativeTime(p.createdAt);

    activities.push({
      id: p.id,
      type: "PAYMENT_PENDING",
      title: `₪${p.amount || 28} listing payment pending`,
      subtitle: `Owner: ${ownerName}`,
      relativeTime,
      iconType: "payment",
      iconColor: "orange",
      status: "PENDING",
      amount: p.amount || 28,
      currency: p.currency || "ILS",
      targetType: "payment",
      targetId: p.id,
      link: `/dashboard/payments`,
      user: p.user || null,
      timestamp: p.createdAt,
      metadata: {
        apartmentId: p.apartmentId,
      },
    });
  });

  swapPayments.forEach((p) => {
    const ownerName = p.payer?.username || "User";
    const relativeTime = formatRelativeTime(p.createdAt);

    activities.push({
      id: p.id,
      type: "PAYMENT_PENDING",
      title: `₪${p.amount || 50} swap payment pending`,
      subtitle: `User: ${ownerName}`,
      relativeTime,
      iconType: "payment",
      iconColor: "orange",
      status: "PENDING",
      amount: p.amount || 50,
      currency: p.currency || "ILS",
      targetType: "payment",
      targetId: p.id,
      link: `/dashboard/payments`,
      user: p.payer || null,
      timestamp: p.createdAt,
      metadata: {
        swapId: p.swapId,
      },
    });
  });

  // 3. Map Swap Matches (Purple Icon -> "New swap match found" / "Bnei Brak ↔ Jerusalem")
  swapRequests.forEach((s) => {
    const fromCity = s.fromApartment?.city || "City A";
    const toCity = s.toApartment?.city || "City B";
    const relativeTime = formatRelativeTime(s.createdAt);

    activities.push({
      id: s.id,
      type: "SWAP_MATCH",
      title: "New swap match found",
      subtitle: `${fromCity} ↔ ${toCity}`,
      relativeTime,
      iconType: "swap",
      iconColor: "purple",
      status: s.status,
      targetType: "swap",
      targetId: s.id,
      link: `/dashboard/swaps/${s.id}`,
      user: s.fromApartment?.user || null,
      timestamp: s.createdAt,
      metadata: {
        swapCode: s.swapCode,
        fromApartmentId: s.fromAppId,
        toApartmentId: s.toAppId,
        fromCity,
        toCity,
      },
    });
  });

  // 4. Map New Listings (Blue Icon -> "New Apartment Listed" / "Jerusalem, Geula")
  recentApartments.forEach((a) => {
    const relativeTime = formatRelativeTime(a.createdAt);
    activities.push({
      id: a.id,
      type: "NEW_LISTING",
      title: `New apartment listed: "${a.title}"`,
      subtitle: `${a.city}${a.neighborhood ? `, ${a.neighborhood}` : ""}`,
      relativeTime,
      iconType: "apartment",
      iconColor: "blue",
      status: a.status,
      amount: a.pricePerShabbat,
      currency: "ILS",
      targetType: "apartment",
      targetId: a.id,
      link: `/dashboard/apartments/${a.id}`,
      user: a.user || null,
      timestamp: a.createdAt,
      metadata: {
        apartmentId: a.id,
        propertyId: a.propertyId,
        city: a.city,
      },
    });
  });

  // Sort all activities by timestamp descending
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Filter by type if provided
  let filteredActivities = activities;
  if (query.type) {
    filteredActivities = activities.filter((act) => act.type === query.type);
  }

  const total = filteredActivities.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedData = filteredActivities.slice(skip, skip + limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: paginatedData,
  };
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
