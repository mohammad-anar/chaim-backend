# Next.js Frontend Integration Guide: Report Rented & Dues Payment Module

This documentation provides all endpoint definitions, TypeScript models, query parameters, request payloads, populated response examples, and payment workflows for the **Report Rented (`/api/v1/report-rented`)** feature.

---

## 📌 1. Module Overview & Business Flow

When an apartment owner rents out or swaps their apartment for a Shabbat weekend, they report it on the platform:

```
Apartment Owner Dashboard
│
├── 1. "Report as Rented" (RENT Mode)
│   └── POST /api/v1/report-rented/create-intent
│       ├── Body: { apartmentId?, weekend?, reportType: "RENT" }
│       └── Generates a 50 ILS pending due (Payment Intent)
│
├── 2. "Report Swap as Rented" (SWAP Mode)
│   └── POST /api/v1/report-rented/create-intent
│       ├── Body: { apartmentId?, targetApartmentId: "apart-002", weekend?, reportType: "SWAP" }
│       └── Generates mutual 50 ILS pending dues for both owners & marks swap as APPROVED
│
├── 3. "My Dues & Stats"
│   ├── GET /api/v1/report-rented/stats     (Counts & Amounts)
│   ├── GET /api/v1/report-rented/my-dues   (Unpaid items + Mosad ID + Total amount)
│   └── GET /api/v1/report-rented/my-reports (Full history with populated apartments & payments)
│
└── 4. "Payment of Dues"
    ├── Single Pay: POST /api/v1/report-rented/:id/pay
    └── Batch Pay:  POST /api/v1/report-rented/pay-all (Pay all pending dues in one transaction)
```

---

## Table of Contents
1. [Base Configuration & Headers](#1-base-configuration--headers)
2. [TypeScript Interfaces & Enums](#2-typescript-interfaces--enums)
3. [API Endpoints Summary](#3-api-endpoints-summary)
4. [Endpoint Specifications with Populated Examples](#4-endpoint-specifications-with-populated-examples)
   - [4.1 Create Report Rented Intent (`POST /create-intent`)](#41-create-report-rented-intent)
   - [4.2 Get Report Rented Statistics (`GET /stats`)](#42-get-report-rented-statistics)
   - [4.3 Get Unpaid Dues Summary (`GET /my-dues`)](#43-get-unpaid-dues-summary)
   - [4.4 Get My Historical Reports (`GET /my-reports`)](#44-get-my-historical-reports)
   - [4.5 Pay Single Report Due (`POST /:id/pay`)](#45-pay-single-report-due)
   - [4.6 Batch Pay All Unpaid Dues (`POST /pay-all`)](#46-batch-pay-all-unpaid-dues)
   - [4.7 Admin: Get All Reports (`GET /admin/all`)](#47-admin-get-all-reports)
   - [4.8 Admin: Mark Report as Paid (`PATCH /:id/mark-paid`)](#48-admin-mark-report-as-paid)
5. [Nedarim Plus Payment Gateway Integration Details](#5-nedarim-plus-payment-gateway-integration-details)
6. [Error Handling Reference](#6-error-handling-reference)

---

## 1. Base Configuration & Headers

- **Base URL:** `http://10.10.26.200:8000/api/v1/report-rented`
- **Authentication:** All routes require JWT Bearer Token:
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```

---

## 2. TypeScript Interfaces & Enums

```typescript
// ─── Enums ────────────────────────────────────────────────────────────────────
export type ReportType = "RENT" | "SWAP";
export type PaymentMethod = "NEDARIM_PLUS" | "CARD";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

// ─── Populated Entity Sub-Types ───────────────────────────────────────────────
export interface IReportApartmentUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  profileImage?: string | null;
}

export interface IReportApartmentSummary {
  id: string;
  propertyId: string | null;
  title: string;
  city: string;
  coverImage: string | null;
  user?: IReportApartmentUser;
}

export interface IReportRentedPayment {
  id: string;
  reportRentedId: string;
  apartmentId: string;
  payerId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionId: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IReportRentedItem {
  id: string;
  apartmentId: string;
  targetApartmentId: string | null;
  reportType: ReportType;
  weekend: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  apartment: IReportApartmentSummary;
  targetApartment: IReportApartmentSummary | null;
  payment: IReportRentedPayment | null;
  counterpartPayment?: IReportRentedPayment | null; // For SWAP reports
}

// ─── Request Payloads ─────────────────────────────────────────────────────────

// POST /create-intent
export interface ICreateReportRentedIntentPayload {
  apartmentId?: string;       // Optional if user has 1 listing; required if multiple
  reportType?: ReportType;    // "RENT" | "SWAP" (Default: "RENT")
  targetApartmentId?: string; // Required when reportType is "SWAP" (UUID or "apart-001")
  weekend?: string;           // Single weekend ISO date string e.g. "2026-09-26"
  weekends?: string[];        // Multiple weekends array e.g. ["2026-09-26", "2026-10-03"] (RENT only)
}

// POST /:id/pay
export interface IPaySingleReportRentedPayload {
  paymentMethod: PaymentMethod; // "NEDARIM_PLUS" | "CARD"
  transactionId?: string;       // Required for NEDARIM_PLUS verification
}

// POST /pay-all
export interface IPayAllReportRentedDuesPayload {
  paymentMethod: PaymentMethod; // "NEDARIM_PLUS" | "CARD"
  transactionId?: string;       // Required for NEDARIM_PLUS verification
  reportRentedIds?: string[];   // Optional: if omitted, pays all unpaid dues
}

// ─── Response Interfaces ──────────────────────────────────────────────────────

export interface IReportRentedIntentResponse {
  reportRentedId: string;
  paymentId: string;
  reportType: ReportType;
  targetApartment: {
    id: string;
    propertyId: string | null;
    title: string;
    city: string;
  } | null;
  amount: number;             // Usually 50 ILS
  currency: string;           // "ILS"
  paymentStatus: PaymentStatus;
  mosadId: string;
  paymentType: "REPORT_RENTED";
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

export interface IReportRentedStats {
  totalReports: number;
  totalPendingCount: number;
  totalPendingAmount: number;
  totalPaidCount: number;
  totalPaidAmount: number;
  rentReportsCount: number;
  swapReportsCount: number;
  feePerReport: number;
}

export interface IReportRentedDuesSummary {
  totalDueAmount: number;
  unpaidCount: number;
  reportRentedIds: string[];
  reports: IReportRentedItem[];
  feePerReport: number;
  mosadId: string;
}

export interface IPayReportRentedResult {
  success: boolean;
  message: string;
  reportRentedId?: string;
  reportRentedIds?: string[];
  transactionId?: string;
  paidAt: string;
  amount?: number;
  paidCount?: number;
  totalPaidAmount?: number;
  paymentMethod: PaymentMethod;
}

export interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}
```

---

## 3. API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/report-rented/create-intent` | Owner | Create rent/swap report intent (Generates 50 ILS due) |
| `GET` | `/api/v1/report-rented/stats` | Owner | Get summary statistics (paid vs pending amounts & counts) |
| `GET` | `/api/v1/report-rented/my-dues` | Owner | Get unpaid dues list, total due amount, and Mosad ID |
| `GET` | `/api/v1/report-rented/my-reports` | Owner | Get all historical reports with full populated relations |
| `POST` | `/api/v1/report-rented/:id/pay` | Owner | Pay a specific report rented due by ID |
| `POST` | `/api/v1/report-rented/pay-all` | Owner | Batch pay all (or selected) unpaid report dues |
| `GET` | `/api/v1/report-rented/admin/all` | Super Admin | View all platform rental reports |
| `PATCH` | `/api/v1/report-rented/:id/mark-paid` | Super Admin | Manually mark a report as paid |

---

## 4. Endpoint Specifications with Populated Examples

---

### 4.1 Create Report Rented Intent
Used when the owner clicks **"Report as Rented"** or **"Report Swap as Rented"**.

- **Method:** `POST`
- **URL:** `/api/v1/report-rented/create-intent`
- **Auth:** Required

#### Request Body (Standard RENT with Multiple Weekends):
```json
{
  "apartmentId": "c6a287be-3199-4d69-a3ec-58476d0284ab",
  "reportType": "RENT",
  "weekends": [
    "2026-09-26",
    "2026-10-03"
  ]
}
```

> **Note:** You can pass either `weekends: ["2026-09-26", "2026-10-03"]` (multiple) or `weekend: "2026-09-26"` (single). For `SWAP` reports, only a single weekend can be selected.

#### Request Body (SWAP Mode - Single Weekend Only):
```json
{
  "apartmentId": "c6a287be-3199-4d69-a3ec-58476d0284ab",
  "reportType": "SWAP",
  "targetApartmentId": "apart-002",
  "weekend": "2026-09-26"
}
```

#### Success Response (`201 Created` - Returns Array of Created Intent Items):
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Report rented payment intent created successfully for 2 weekend(s)",
  "data": [
    {
      "reportRentedId": "rep-rent-uuid-001",
      "paymentId": "rep-pay-uuid-001",
      "reportType": "RENT",
      "weekend": "2026-09-26T00:00:00.000Z",
      "targetApartment": null,
      "amount": 50,
      "currency": "ILS",
      "paymentStatus": "PENDING",
      "mosadId": "7005400",
      "paymentType": "REPORT_RENTED",
      "clientName": "David Host",
      "clientEmail": "david@example.com",
      "clientPhone": "+972501234567"
    },
    {
      "reportRentedId": "rep-rent-uuid-002",
      "paymentId": "rep-pay-uuid-002",
      "reportType": "RENT",
      "weekend": "2026-10-03T00:00:00.000Z",
      "targetApartment": null,
      "amount": 50,
      "currency": "ILS",
      "paymentStatus": "PENDING",
      "mosadId": "7005400",
      "paymentType": "REPORT_RENTED",
      "clientName": "David Host",
      "clientEmail": "david@example.com",
      "clientPhone": "+972501234567"
    }
  ]
}
```

---

### 4.2 Get Report Rented Statistics
Used to render statistics cards (Total Reports, Paid Reports, Pending Dues Amount).

- **Method:** `GET`
- **URL:** `/api/v1/report-rented/stats`
- **Auth:** Required

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Report rented statistics retrieved successfully",
  "data": {
    "totalReports": 5,
    "totalPendingCount": 2,
    "totalPendingAmount": 100,
    "totalPaidCount": 3,
    "totalPaidAmount": 150,
    "rentReportsCount": 4,
    "swapReportsCount": 1,
    "feePerReport": 50
  }
}
```

---

### 4.3 Get Unpaid Dues Summary
Returns the list of unpaid reports, array of IDs, total due amount, and Nedarim Mosad ID for direct checkout.

- **Method:** `GET`
- **URL:** `/api/v1/report-rented/my-dues`
- **Auth:** Required

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Unpaid report rented dues retrieved successfully",
  "data": {
    "totalDueAmount": 100,
    "unpaidCount": 2,
    "reportRentedIds": [
      "rep-rent-uuid-001",
      "rep-rent-uuid-002"
    ],
    "feePerReport": 50,
    "mosadId": "7005400",
    "reports": [
      {
        "id": "rep-rent-uuid-001",
        "apartmentId": "c6a287be-3199-4d69-a3ec-58476d0284ab",
        "targetApartmentId": null,
        "reportType": "RENT",
        "weekend": "2026-09-26T00:00:00.000Z",
        "paidAt": null,
        "createdAt": "2026-09-19T10:00:00.000Z",
        "apartment": {
          "id": "c6a287be-3199-4d69-a3ec-58476d0284ab",
          "propertyId": "apart-001",
          "title": "Luxury Suite in Jerusalem",
          "city": "Jerusalem",
          "coverImage": "https://example.com/uploads/apt1.jpg"
        },
        "targetApartment": null,
        "payment": {
          "id": "rep-pay-uuid-001",
          "reportRentedId": "rep-rent-uuid-001",
          "amount": 50,
          "currency": "ILS",
          "paymentMethod": "NEDARIM_PLUS",
          "status": "PENDING",
          "paidAt": null,
          "transactionId": null
        }
      },
      {
        "id": "rep-rent-uuid-002",
        "apartmentId": "c6a287be-3199-4d69-a3ec-58476d0284ab",
        "targetApartmentId": "target-apt-uuid-002",
        "reportType": "SWAP",
        "weekend": "2026-10-03T00:00:00.000Z",
        "paidAt": null,
        "createdAt": "2026-09-19T11:00:00.000Z",
        "apartment": {
          "id": "c6a287be-3199-4d69-a3ec-58476d0284ab",
          "propertyId": "apart-001",
          "title": "Luxury Suite in Jerusalem",
          "city": "Jerusalem",
          "coverImage": "https://example.com/uploads/apt1.jpg"
        },
        "targetApartment": {
          "id": "target-apt-uuid-002",
          "propertyId": "apart-002",
          "title": "Beach Villa in Tel Aviv",
          "city": "Tel Aviv",
          "coverImage": "https://example.com/uploads/apt2.jpg"
        },
        "payment": {
          "id": "rep-pay-uuid-002",
          "reportRentedId": "rep-rent-uuid-002",
          "amount": 50,
          "currency": "ILS",
          "paymentMethod": "NEDARIM_PLUS",
          "status": "PENDING",
          "paidAt": null,
          "transactionId": null
        }
      }
    ]
  }
}
```

---

### 4.4 Get My Historical Reports
Returns all historical reports (both paid and unpaid) with populated apartments, counterpart owner info, and payment statuses.

- **Method:** `GET`
- **URL:** `/api/v1/report-rented/my-reports`
- **Auth:** Required

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Reported rented history retrieved successfully",
  "data": [
    {
      "id": "rep-rent-uuid-001",
      "apartmentId": "c6a287be-3199-4d69-a3ec-58476d0284ab",
      "targetApartmentId": null,
      "reportType": "RENT",
      "weekend": "2026-09-26T00:00:00.000Z",
      "paidAt": null,
      "createdAt": "2026-09-19T10:00:00.000Z",
      "apartment": {
        "id": "c6a287be-3199-4d69-a3ec-58476d0284ab",
        "propertyId": "apart-001",
        "title": "Luxury Suite in Jerusalem",
        "city": "Jerusalem",
        "coverImage": "https://example.com/uploads/apt1.jpg"
      },
      "targetApartment": null,
      "payment": {
        "id": "rep-pay-uuid-001",
        "amount": 50,
        "currency": "ILS",
        "status": "PENDING",
        "paymentMethod": "NEDARIM_PLUS",
        "paidAt": null,
        "transactionId": null
      }
    },
    {
      "id": "rep-rent-uuid-paid-003",
      "apartmentId": "c6a287be-3199-4d69-a3ec-58476d0284ab",
      "targetApartmentId": "target-apt-uuid-002",
      "reportType": "SWAP",
      "weekend": "2026-09-12T00:00:00.000Z",
      "paidAt": "2026-09-12T14:30:00.000Z",
      "createdAt": "2026-09-10T08:00:00.000Z",
      "apartment": {
        "id": "c6a287be-3199-4d69-a3ec-58476d0284ab",
        "propertyId": "apart-001",
        "title": "Luxury Suite in Jerusalem",
        "city": "Jerusalem",
        "coverImage": "https://example.com/uploads/apt1.jpg"
      },
      "targetApartment": {
        "id": "target-apt-uuid-002",
        "propertyId": "apart-002",
        "title": "Beach Villa in Tel Aviv",
        "city": "Tel Aviv",
        "coverImage": "https://example.com/uploads/apt2.jpg",
        "user": {
          "id": "user-counterpart-456",
          "username": "Shlomo Swap",
          "email": "shlomo@example.com",
          "phone": "+972509876543"
        }
      },
      "payment": {
        "id": "rep-pay-uuid-003",
        "amount": 50,
        "currency": "ILS",
        "status": "COMPLETED",
        "paymentMethod": "NEDARIM_PLUS",
        "paidAt": "2026-09-12T14:30:00.000Z",
        "transactionId": "NED-TX-987654"
      },
      "counterpartPayment": {
        "id": "rep-pay-uuid-counterpart-004",
        "amount": 50,
        "currency": "ILS",
        "status": "COMPLETED",
        "paymentMethod": "NEDARIM_PLUS",
        "paidAt": "2026-09-12T15:00:00.000Z",
        "transactionId": "NED-TX-987655"
      }
    }
  ]
}
```

---

### 4.5 Pay Single Report Due
- **Method:** `POST`
- **URL:** `/api/v1/report-rented/:id/pay`
- **Auth:** Required

#### Request Body (Nedarim Plus):
```json
{
  "paymentMethod": "NEDARIM_PLUS",
  "transactionId": "NED-TX-123456"
}
```

#### Request Body (Direct Card):
```json
{
  "paymentMethod": "CARD"
}
```

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Rental report paid successfully via NEDARIM_PLUS",
  "data": {
    "success": true,
    "message": "Rental report paid successfully via NEDARIM_PLUS",
    "reportRentedId": "rep-rent-uuid-001",
    "transactionId": "NED-TX-123456",
    "paidAt": "2026-09-19T12:35:00.000Z",
    "amount": 50,
    "paymentMethod": "NEDARIM_PLUS"
  }
}
```

---

### 4.6 Batch Pay All Unpaid Dues
Allows paying all accumulated unpaid rental report dues in a single payment checkout.

- **Method:** `POST`
- **URL:** `/api/v1/report-rented/pay-all`
- **Auth:** Required

#### Request Body (Pay All):
```json
{
  "paymentMethod": "NEDARIM_PLUS",
  "transactionId": "NED-BATCH-789012"
}
```

#### Request Body (Pay Selected Subset):
```json
{
  "paymentMethod": "NEDARIM_PLUS",
  "transactionId": "NED-BATCH-789012",
  "reportRentedIds": [
    "rep-rent-uuid-001",
    "rep-rent-uuid-002"
  ]
}
```

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Successfully paid all 2 rental report dues (100 ILS)",
  "data": {
    "success": true,
    "message": "Successfully paid all 2 rental report dues (100 ILS)",
    "paidCount": 2,
    "totalPaidAmount": 100,
    "reportRentedIds": [
      "rep-rent-uuid-001",
      "rep-rent-uuid-002"
    ],
    "transactionId": "NED-BATCH-789012",
    "paidAt": "2026-09-19T12:35:00.000Z",
    "paymentMethod": "NEDARIM_PLUS"
  }
}
```

---

### 4.7 Admin: Get All Reports
- **Method:** `GET`
- **URL:** `/api/v1/report-rented/admin/all`
- **Auth:** Super Admin

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "All reported rented records retrieved successfully",
  "data": [
    {
      "id": "rep-rent-uuid-001",
      "apartmentId": "c6a287be-3199-4d69-a3ec-58476d0284ab",
      "targetApartmentId": null,
      "reportType": "RENT",
      "weekend": "2026-09-26T00:00:00.000Z",
      "paidAt": "2026-09-19T12:35:00.000Z",
      "createdAt": "2026-09-19T10:00:00.000Z",
      "apartment": {
        "id": "c6a287be-3199-4d69-a3ec-58476d0284ab",
        "propertyId": "apart-001",
        "title": "Luxury Suite in Jerusalem",
        "city": "Jerusalem",
        "user": {
          "id": "user-123",
          "username": "David Host",
          "email": "david@example.com",
          "phone": "+972501234567"
        }
      },
      "targetApartment": null,
      "payment": {
        "id": "rep-pay-uuid-001",
        "amount": 50,
        "currency": "ILS",
        "status": "COMPLETED",
        "transactionId": "NED-TX-123456"
      }
    }
  ]
}
```

---

### 4.8 Admin: Mark Report as Paid
- **Method:** `PATCH`
- **URL:** `/api/v1/report-rented/:id/mark-paid`
- **Auth:** Super Admin

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Report rented marked as paid successfully by admin",
  "data": {
    "message": "Report rented marked as paid successfully by admin"
  }
}
```

---

## 5. Nedarim Plus Payment Gateway Integration Details

When opening the Nedarim Plus iframe / modal on Next.js:

```typescript
// Parameters received from POST /create-intent or GET /my-dues
const nedarimConfig = {
  Mosad: data.mosadId,             // e.g., "7005400"
  Amount: data.amount,             // e.g., 50 for single, or totalDueAmount for batch
  Currency: "1",                   // "1" for ILS
  ClientName: data.clientName,
  Mail: data.clientEmail,
  Phone: data.clientPhone,
  PaymentType: "Report Rented Fee",
};

// On Nedarim Success Callback:
const onPaymentSuccess = async (transactionId: string) => {
  // Call backend verification & payment complete:
  await fetch(`/api/v1/report-rented/${data.reportRentedId}/pay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentMethod: "NEDARIM_PLUS",
      transactionId: transactionId,
    }),
  });
};
```

---

## 6. Error Handling Reference

| HTTP Status | Scenario | Error Message |
|---|---|---|
| `400 Bad Request` | Swap report missing target | `Target apartment must be specified when reporting rented against a swap` |
| `400 Bad Request` | Swap with own apartment | `You cannot swap an apartment with itself` |
| `400 Bad Request` | Missing transactionId | `Transaction ID is required for Nedarim Plus verification` |
| `400 Bad Request` | Invalid Nedarim transaction | `Nedarim Plus Payment Verification Failed: ...` |
| `400 Bad Request` | Already paid | `This rental report has already been marked as paid` |
| `400 Bad Request` | Batch pay with 0 unpaid | `No unpaid rental reports found to process` |
| `403 Forbidden` | Non-owner attempting pay | `You do not have permission to pay for this rental report` |
| `404 Not Found` | No listing | `You do not have an active apartment listing` |
| `404 Not Found` | Target not found | `Target apartment for swap not found` |
| `404 Not Found` | Report ID not found | `Rental report record not found` |
