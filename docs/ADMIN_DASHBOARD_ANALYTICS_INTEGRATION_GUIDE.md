# Admin Dashboard Analytics & Recent Activity API Integration Guide

This guide details the API endpoints for the **Super Admin Dashboard**, covering:
1. **Top KPI Stat Cards** (Total Apartments, Active Apartments, Completed Rentals, Unpaid ₪50 Fees)
2. **Monthly Revenue Chart** (Weekly intervals & cumulative curve trajectory with month/year selector)
3. **Search Demand by City Bar Chart** (Top searched cities with ranking and demand score)
4. **Recent Activity Table/Stream** (Formatted events with status color tags, relative timestamps, and `View ->` deep-link IDs)

---

## Base URL & Authentication

- **Base URL**: `http://localhost:8000/api/v1` (or your deployed server domain)
- **Required Header**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Access Level**: `SUPER_ADMIN` only

---

## 1. Top KPI Stat Cards

### Endpoint
- **Route**: `/api/v1/admin/dashboard/stats`
- **Method**: `GET`
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  ```

### Request Example
```http
GET /api/v1/admin/dashboard/stats
```

### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Admin dashboard stats retrieved successfully",
  "data": {
    "totalApartments": 1520,
    "totalApartmentsLabel": "All registered listings",
    "totalApartmentsBadge": "Total",
    "activeApartments": 1245,
    "activeApartmentsLabel": "Currently live on site",
    "activeApartmentsBadge": "+12",
    "newApartmentsThisMonth": 12,
    "completedRentals": 98,
    "completedRentalsLabel": "This month",
    "completedRentalsBadge": "+8%",
    "completedRentalsThisMonth": 98,
    "completedRentalsLastMonth": 91,
    "completedRentalsGrowthPercentage": 8,
    "completedSwaps": 42,
    "pendingApartments": 15,
    "blockedApartments": 4,
    "unpaidFees": {
      "totalUnpaidAmount": 1150,
      "totalUnpaidCount": 23,
      "feePerUnit": 50,
      "badge": "Pending",
      "label": "Needs follow-up",
      "listingFees": {
        "count": 5,
        "amount": 140
      },
      "reportRentedFees": {
        "count": 18,
        "amount": 900
      },
      "swapFees": {
        "count": 2,
        "amount": 100
      }
    }
  }
}
```

### UI Card Mapping

| UI Card | Field in `data` | Subtitle | Badge |
|---|---|---|---|
| **Total Apartments** | `totalApartments` | `totalApartmentsLabel` ("All registered listings") | `totalApartmentsBadge` ("Total") |
| **Active Apartments** | `activeApartments` | `activeApartmentsLabel` ("Currently live on site") | `activeApartmentsBadge` ("+12") |
| **Completed Rentals** | `completedRentals` | `completedRentalsLabel` ("This month") | `completedRentalsBadge` ("+8%") |
| **Unpaid ₪50 Fees** | `unpaidFees.totalUnpaidCount` | `unpaidFees.label` ("Needs follow-up") | `unpaidFees.badge` ("Pending") |

---

## 2. Monthly Revenue Chart (Curve / Weekly Data)

### Endpoint
- **Route**: `/api/v1/admin/dashboard/monthly-revenue`
- **Method**: `GET`
- **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  |---|---|---|---|---|
  | `year` | `number` | No | Current Year | e.g. `2026` |
  | `month` | `number` | No | Current Month (1-12) | e.g. `9` for September |

### Request Example
```http
GET /api/v1/admin/dashboard/monthly-revenue?year=2026&month=9
```

### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Monthly revenue breakdown retrieved successfully",
  "data": {
    "year": 2026,
    "month": 9,
    "monthName": "September",
    "totalMonthlyRevenue": 6620,
    "totalTransactions": 148,
    "cumulativeTrajectory": [
      {
        "label": "Week 1",
        "weekNumber": 1,
        "weeklyRevenue": 2400,
        "cumulativeRevenue": 2400
      },
      {
        "label": "Week 2",
        "weekNumber": 2,
        "weeklyRevenue": 2600,
        "cumulativeRevenue": 5000
      },
      {
        "label": "Week 3",
        "weekNumber": 3,
        "weeklyRevenue": 1500,
        "cumulativeRevenue": 6500
      },
      {
        "label": "Week 4",
        "weekNumber": 4,
        "weeklyRevenue": 120,
        "cumulativeRevenue": 6620
      },
      {
        "label": "Week 5",
        "weekNumber": 5,
        "weeklyRevenue": 0,
        "cumulativeRevenue": 6620
      }
    ],
    "weeks": [
      {
        "week": "Week 1",
        "weekNumber": 1,
        "startDate": "2026-09-01",
        "endDate": "2026-09-07",
        "totalRevenue": 2400,
        "listingRevenue": 1120,
        "reportRentedRevenue": 1000,
        "swapRevenue": 280,
        "transactionCount": 54
      },
      {
        "week": "Week 2",
        "weekNumber": 2,
        "startDate": "2026-09-08",
        "endDate": "2026-09-14",
        "totalRevenue": 2600,
        "listingRevenue": 1200,
        "reportRentedRevenue": 1100,
        "swapRevenue": 300,
        "transactionCount": 58
      },
      {
        "week": "Week 3",
        "weekNumber": 3,
        "startDate": "2026-09-15",
        "endDate": "2026-09-21",
        "totalRevenue": 1500,
        "listingRevenue": 700,
        "reportRentedRevenue": 650,
        "swapRevenue": 150,
        "transactionCount": 32
      },
      {
        "week": "Week 4",
        "weekNumber": 4,
        "startDate": "2026-09-22",
        "endDate": "2026-09-28",
        "totalRevenue": 120,
        "listingRevenue": 56,
        "reportRentedRevenue": 50,
        "swapRevenue": 14,
        "transactionCount": 4
      },
      {
        "week": "Week 5",
        "weekNumber": 5,
        "startDate": "2026-09-29",
        "endDate": "2026-09-30",
        "totalRevenue": 0,
        "listingRevenue": 0,
        "reportRentedRevenue": 0,
        "swapRevenue": 0,
        "transactionCount": 0
      }
    ]
  }
}
```

---

## 3. Search Demand by City Bar Chart

### Endpoint
- **Route**: `/api/v1/admin/dashboard/city-search-demand`
- **Method**: `GET`
- **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  |---|---|---|---|---|
  | `limit` | `number` | No | `5` | Number of top cities to return |
  | `year` | `number` | No | - | Optional filter year |
  | `month` | `number` | No | - | Optional filter month |

### Request Example
```http
GET /api/v1/admin/dashboard/city-search-demand?limit=5
```

### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "City search demand data retrieved successfully",
  "data": [
    {
      "city": "Jerusalem",
      "searchVolume": 600,
      "apartmentCount": 240,
      "interestedCount": 85,
      "totalDemandScore": 1695
    },
    {
      "city": "Tel Aviv",
      "searchVolume": 1080,
      "apartmentCount": 190,
      "interestedCount": 110,
      "totalDemandScore": 2680
    },
    {
      "city": "Bnei Brak",
      "searchVolume": 1390,
      "apartmentCount": 310,
      "interestedCount": 150,
      "totalDemandScore": 3540
    },
    {
      "city": "Haifa",
      "searchVolume": 1300,
      "apartmentCount": 160,
      "interestedCount": 95,
      "totalDemandScore": 3045
    },
    {
      "city": "Ashdod",
      "searchVolume": 1480,
      "apartmentCount": 175,
      "interestedCount": 120,
      "totalDemandScore": 3495
    }
  ]
}
```

---

## 4. Recent Activity Stream / Table

### Endpoint
- **Route**: `/api/v1/admin/dashboard/recent-activity`
- **Method**: `GET`
- **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  |---|---|---|---|---|
  | `page` | `number` | No | `1` | Page number |
  | `limit` | `number` | No | `10` | Items per page |
  | `type` | `string` | No | - | Filter by `RENTED`, `PAYMENT_PENDING`, `SWAP_MATCH`, `NEW_LISTING` |

### Request Example
```http
GET /api/v1/admin/dashboard/recent-activity?page=1&limit=10
```

### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Recent activities retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 38,
    "totalPages": 4
  },
  "data": [
    {
      "id": "c1f76d90-3b42-49da-87e2-f28a8d052a91",
      "type": "RENTED",
      "title": "Apartment A-102 rented",
      "subtitle": "5 minutes ago",
      "relativeTime": "5 minutes ago",
      "iconType": "apartment",
      "iconColor": "green",
      "status": "COMPLETED",
      "amount": 50,
      "currency": "ILS",
      "targetType": "apartment",
      "targetId": "e2a9b311-2089-42c2-8419-4a9238e8cb55",
      "link": "/dashboard/apartments/e2a9b311-2089-42c2-8419-4a9238e8cb55",
      "timestamp": "2026-09-23T15:45:00.000Z",
      "user": {
        "id": "u1-92384",
        "username": "David",
        "email": "david@example.com",
        "profileImage": "https://example.com/avatar.jpg"
      }
    },
    {
      "id": "p8e24c51-789a-4712-bcde-90123456789a",
      "type": "PAYMENT_PENDING",
      "title": "₪50 payment pending",
      "subtitle": "Owner: David",
      "relativeTime": "12 minutes ago",
      "iconType": "payment",
      "iconColor": "orange",
      "status": "PENDING",
      "amount": 50,
      "currency": "ILS",
      "targetType": "payment",
      "targetId": "p8e24c51-789a-4712-bcde-90123456789a",
      "link": "/dashboard/payments",
      "timestamp": "2026-09-23T15:38:00.000Z",
      "user": {
        "id": "u1-92384",
        "username": "David",
        "email": "david@example.com",
        "profileImage": "https://example.com/avatar.jpg"
      }
    },
    {
      "id": "s4b11f32-6789-4def-0123-abcdef012345",
      "type": "SWAP_MATCH",
      "title": "New swap match found",
      "subtitle": "Bnei Brak ↔ Jerusalem",
      "relativeTime": "35 minutes ago",
      "iconType": "swap",
      "iconColor": "purple",
      "status": "APPROVED",
      "targetType": "swap",
      "targetId": "s4b11f32-6789-4def-0123-abcdef012345",
      "link": "/dashboard/swaps/s4b11f32-6789-4def-0123-abcdef012345",
      "timestamp": "2026-09-23T15:15:00.000Z",
      "user": {
        "id": "u2-11029",
        "username": "Moshe",
        "email": "moshe@example.com",
        "profileImage": null
      }
    }
  ]
}
```

---

### Activity Item UI Styling Reference

| Item Type | Icon | Background Color | Left Tag | Action Click (`View ->`) |
|---|---|---|---|---|
| `RENTED` | Checkmark in circle | Light Green (`#E8F8F0` / `text-emerald-600`) | `Apartment {propertyId/title} rented` | Navigates to `link` or uses `targetId` |
| `PAYMENT_PENDING` | Dollar sign in circle | Light Orange (`#FFF4E6` / `text-amber-600`) | `₪50 payment pending` | Navigates to `/dashboard/payments` |
| `SWAP_MATCH` | Horizontal exchange arrows | Light Purple (`#F3E8FF` / `text-purple-600`) | `New swap match found` | Navigates to `/dashboard/swaps/{id}` |
| `NEW_LISTING` | Building / Home | Light Blue (`#EBF5FF` / `text-blue-600`) | `New apartment listed` | Navigates to `/dashboard/apartments/{id}` |
