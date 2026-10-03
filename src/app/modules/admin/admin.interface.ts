export type IDashboardStats = {
  totalApartments: number;
  totalApartmentsLabel?: string;
  totalApartmentsBadge?: string;
  activeApartments: number;
  activeApartmentsLabel?: string;
  activeApartmentsBadge?: string; // e.g. "+12"
  newApartmentsThisMonth?: number;
  completedRentals: number;
  completedRentalsLabel?: string;
  completedRentalsBadge?: string; // e.g. "+8%"
  completedRentalsThisMonth?: number;
  completedRentalsLastMonth?: number;
  completedRentalsGrowthPercentage?: number;
  completedSwaps: number;
  pendingApartments: number;
  blockedApartments: number;
  unpaidFees: {
    totalUnpaidAmount: number;
    totalUnpaidCount: number;
    feePerUnit?: number; // 50
    badge?: string; // "Pending"
    label?: string; // "Needs follow-up"
    listingFees: {
      count: number;
      amount: number;
    };
    reportRentedFees: {
      count: number;
      amount: number;
    };
    swapFees: {
      count: number;
      amount: number;
    };
  };
};

export type IWeeklyRevenueItem = {
  week: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  listingRevenue: number;
  reportRentedRevenue: number;
  swapRevenue: number;
  transactionCount: number;
};

export type ICumulativeRevenuePoint = {
  label: string;
  weekNumber: number;
  weeklyRevenue: number;
  cumulativeRevenue: number;
};

export type IMonthlyRevenueData = {
  year: number;
  month: number;
  monthName: string;
  totalMonthlyRevenue: number;
  totalTransactions: number;
  cumulativeTrajectory: ICumulativeRevenuePoint[];
  weeks: IWeeklyRevenueItem[];
};

export type ICityDemandItem = {
  city: string;
  searchVolume: number;
  apartmentCount: number;
  interestedCount: number;
  totalDemandScore: number;
};

export type IRecentActivityItem = {
  id: string;
  type:
    | "RENTED"
    | "PAYMENT_PENDING"
    | "SWAP_MATCH"
    | "NEW_LISTING"
    | "NEW_USER"
    | "REPORT_RENTED"
    | "REPORT_SWAP"
    | "LISTING_PAYMENT"
    | "REPORT_RENTED_PAYMENT"
    | "SWAP_PAYMENT"
    | "SWAP_REQUEST";
  title: string;
  subtitle: string;
  relativeTime: string;
  iconType: "apartment" | "payment" | "swap" | "user";
  iconColor: "green" | "orange" | "purple" | "blue";
  status: string;
  amount?: number;
  currency?: string;
  targetType: "apartment" | "payment" | "swap" | "user";
  targetId?: string | null;
  link?: string | null;
  user?: {
    id: string;
    username: string;
    email?: string | null;
    phone?: string | null;
    profileImage?: string | null;
  } | null;
  timestamp: Date;
  metadata?: Record<string, any>;
};

export type IRecentActivityResponse = {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: IRecentActivityItem[];
};
