export type IDashboardStats = {
  totalApartments: number;
  activeApartments: number;
  pendingApartments: number;
  blockedApartments: number;
  completedRentals: number;
  completedSwaps: number;
  unpaidFees: {
    totalUnpaidAmount: number;
    totalUnpaidCount: number;
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

export type IMonthlyRevenueData = {
  year: number;
  month: number;
  monthName: string;
  totalMonthlyRevenue: number;
  totalTransactions: number;
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
    | "REPORT_RENTED"
    | "REPORT_SWAP"
    | "LISTING_PAYMENT"
    | "REPORT_RENTED_PAYMENT"
    | "SWAP_PAYMENT"
    | "SWAP_REQUEST"
    | "NEW_APARTMENT"
    | "NEW_USER";
  title: string;
  description: string;
  status: string;
  amount?: number;
  currency?: string;
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
