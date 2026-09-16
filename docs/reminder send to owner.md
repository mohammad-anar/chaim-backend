# Owner Notification Preferences & Reminder System — Frontend Integration Guide

This guide covers the **Owner Notification Preferences & Automated Reminder Module** (`/api/v1/owner`), detailing all endpoints, request bodies, response models, Zod validation rules, TypeScript types, React Query hooks, and UI implementation details.

---

## 1. System Overview & Architecture

### How the Owner Notification & Reminder System Works
1. **Self-Service Owner Preferences (`owner_notification_preferences`)**:
   - Every property owner can configure their communication channels, reminder schedules, custom contact details, and pause/resume automated reminder notifications.
   - **Delivery Channels**:
     - `EMAIL`: Delivers rich HTML emails with direct action links.
     - `PHONE`: Initiates voice call notifications via Twilio SIM bridge.
     - `BOTH`: Dispatches both email and voice call simultaneously.
   - **Scheduling Controls**:
     - `preferredDay`: Weekly recurring reminder day (`SUNDAY`, `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`).
     - `preferredTime`: Preferred delivery time of day (e.g., `"06:00 PM (Evening)"`, `"09:00 AM"`).
     - `specificReminderDate`: Custom one-off target date (`YYYY-MM-DD`).
   - **Pause / Opt-out Controls**:
     - `isPaused`: Pauses automated reminders when `true`.
     - `allowReminder`: Master toggle enabling or disabling reminders.

2. **Immediate Test Reminders (`POST /api/v1/owner/me/test-reminder`)**:
   - Allows owners to immediately verify that their configured email and phone receive alerts without waiting for their weekly scheduled reminder day.

3. **Admin Enforcement & Validation Rules**:
   - When an admin (or automated scheduler) calls reminder endpoints (`/availability-reminder` or `/payment-due-reminder`), the backend strictly checks owner preferences:
     - **Paused / Disabled**: Returns `403 FORBIDDEN` if `isPaused: true` or `allowReminder: false`.
     - **Day Mismatch**: If `preferredDay` is configured and today is a different day of the week, returns `400 BAD_REQUEST`.
     - **Specific Date Mismatch**: If `specificReminderDate` is set and today is not that date, returns `400 BAD_REQUEST`.
   - On successful dispatch, the backend updates `lastReminderSentAt` timestamp and dispatches an in-app system notification (`AlertType.INFO`).

---

## 2. API Routes Summary

Base URL: `/api/v1/owner`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/me/notification-pref` | Owner / Super Admin | Fetch current user's reminder settings (with fallback defaults) |
| `PATCH` | `/me/notification-pref` | Owner / Super Admin | Update owner's reminder schedule, channels, pause state, and contact details |
| `POST` | `/me/test-reminder` | Owner / Super Admin | Send an immediate test reminder across owner's selected channels |
| `GET` | `/` | Super Admin | List all property owners with financial summary, total listings & reminder preferences |
| `GET` | `/:id` | Super Admin | Get single owner full profile (financial breakdown, all apartments & reminder settings) |
| `POST` | `/:id/availability-reminder` | Super Admin | Send availability calendar update reminder to owner (enforces owner schedule & pause rules) |
| `POST` | `/:id/payment-due-reminder` | Super Admin | Send payment due reminder to owner (enforces owner schedule & pause rules) |

---

## 3. Detailed Endpoint Specifications

### 3.1 `GET /api/v1/owner/me/notification-pref` — Get My Reminder Settings

Retrieves the authenticated owner's notification preferences. If no preference record exists in the database yet, the backend automatically returns fallback defaults derived from the user's primary profile.

**Headers:**
- `Authorization: Bearer <owner_or_admin_jwt_token>`

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Owner notification preference retrieved successfully",
  "data": {
    "id": "pref-uuid-1",
    "userId": "user-uuid-10",
    "channel": "EMAIL",
    "notificationEmail": "owner@example.com",
    "notificationPhone": "+972501234567",
    "preferredDay": "THURSDAY",
    "preferredTime": "06:00 PM (Evening)",
    "isPaused": false,
    "allowReminder": true,
    "specificReminderDate": null,
    "lastReminderSentAt": "2026-09-10T15:30:00.000Z",
    "createdAt": "2026-09-01T12:00:00.000Z",
    "updatedAt": "2026-09-14T08:00:00.000Z"
  }
}
```

---

### 3.2 `PATCH /api/v1/owner/me/notification-pref` — Update Reminder Settings

Upserts the owner's notification and reminder preferences. Supports partial updates.

**Headers:**
- `Authorization: Bearer <owner_or_admin_jwt_token>`
- `Content-Type: application/json`

#### Validation Rules (Zod Schema)
- `channel`: Enum `["EMAIL", "PHONE", "BOTH"]` (Optional)
- `notificationEmail`: Valid email format or `null` (Optional)
- `notificationPhone`: String or `null` (Optional)
- `preferredDay`: Enum `["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]` or `null` (Optional)
- `preferredTime`: String or `null` (Optional)
- `isPaused`: Boolean (Optional, accepts `true`/`false` or `"true"`/`"false"`)
- `allowReminder`: Boolean (Optional, accepts `true`/`false` or `"true"`/`"false"`)
- `specificReminderDate`: Date string (`YYYY-MM-DD` or ISO) or `null` (Optional)

#### Request Body Example (Standard Schedule Setup)
```json
{
  "channel": "BOTH",
  "notificationEmail": "chaim.owner@gmail.com",
  "notificationPhone": "+972501234567",
  "preferredDay": "THURSDAY",
  "preferredTime": "06:00 PM (Evening)",
  "isPaused": false,
  "allowReminder": true,
  "specificReminderDate": null
}
```

#### Request Body Example (Pausing Reminders)
```json
{
  "isPaused": true,
  "allowReminder": false
}
```

#### Request Body Example (Specific Target Date)
```json
{
  "channel": "EMAIL",
  "specificReminderDate": "2026-10-15",
  "preferredDay": null,
  "preferredTime": "10:00 AM",
  "isPaused": false,
  "allowReminder": true
}
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Owner notification preference updated successfully",
  "data": {
    "id": "pref-uuid-1",
    "userId": "user-uuid-10",
    "channel": "BOTH",
    "notificationEmail": "chaim.owner@gmail.com",
    "notificationPhone": "+972501234567",
    "preferredDay": "THURSDAY",
    "preferredTime": "06:00 PM (Evening)",
    "isPaused": false,
    "allowReminder": true,
    "specificReminderDate": null,
    "lastReminderSentAt": "2026-09-10T15:30:00.000Z",
    "createdAt": "2026-09-01T12:00:00.000Z",
    "updatedAt": "2026-09-14T09:45:00.000Z"
  }
}
```

---

### 3.3 `POST /api/v1/owner/me/test-reminder` — Test Reminder Now

Dispatches an immediate reminder across the owner's active channels to verify email delivery, phone voice trigger, and in-app notifications.

**Headers:**
- `Authorization: Bearer <owner_or_admin_jwt_token>`

#### Request Body
*(None required)*

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Test reminder processed successfully",
  "data": {
    "success": true,
    "message": "Test reminder processed successfully",
    "channelUsed": "BOTH",
    "emailSent": true,
    "callInitiated": true,
    "callSid": "CA1234567890abcdef1234567890abcdef",
    "notices": undefined
  }
}
```

---

### 3.4 `GET /api/v1/owner` — List All Owners (Admin)

Returns all property owners with aggregated financial metrics, number of listings, apartments list, and reminder settings.

**Headers:**
- `Authorization: Bearer <super_admin_jwt_token>`

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `searchTerm` | `string` | Optional | Search by username, email, phone, or apartment title | `"Jerusalem"` |
| `hasDue` | `string` | Optional | Filter by overdue payment status | `"true"` or `"false"` |
| `channel` | `string` | Optional | Filter by reminder channel | `"EMAIL"`, `"PHONE"`, `"BOTH"` |
| `page` | `number` | Optional | Page number (default: `1`) | `1` |
| `limit` | `number` | Optional | Items per page (default: `10`) | `10` |

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Owners retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 39
  },
  "data": [
    {
      "id": "user-uuid-10",
      "username": "chaim_host",
      "email": "chaim@example.com",
      "phone": "+972501234567",
      "profileImage": "https://example.com/avatar.jpg",
      "status": "ACTIVE",
      "isVerified": true,
      "notificationPreference": "EMAIL",
      "ownerNotificationPreference": {
        "id": "pref-uuid-1",
        "channel": "EMAIL",
        "notificationEmail": "chaim@example.com",
        "notificationPhone": "+972501234567",
        "preferredDay": "THURSDAY",
        "preferredTime": "06:00 PM (Evening)",
        "isPaused": false,
        "allowReminder": true,
        "specificReminderDate": null,
        "lastReminderSentAt": "2026-09-10T15:30:00.000Z"
      },
      "totalListings": 2,
      "apartments": [
        {
          "id": "apt-uuid-1",
          "propertyId": "PROP-001",
          "title": "Luxury Geula Suite",
          "city": "Jerusalem",
          "phoneNumber": "+972501234567",
          "status": "APPROVED",
          "availabilities": [
            {
              "id": "avail-1",
              "weekendId": "wknd-1",
              "isSpecial": false
            }
          ]
        },
        {
          "id": "apt-uuid-2",
          "propertyId": "PROP-002",
          "title": "Cozy Mea Shearim Studio",
          "city": "Jerusalem",
          "phoneNumber": "+972501234567",
          "status": "APPROVED",
          "availabilities": []
        }
      ],
      "financials": {
        "totalEarnings": 1500,
        "totalDue": 0,
        "hasOverduePayment": false,
        "listing": {
          "isPaid": true,
          "earnings": 28,
          "due": 0
        },
        "reportRented": {
          "unpaidCount": 0,
          "unpaidAmount": 0,
          "paidCount": 1,
          "paidAmount": 50,
          "earnings": 50
        }
      }
    }
  ]
}
```

---

### 3.5 `GET /api/v1/owner/:id` — Get Single Owner Details (Admin)

Returns full details for a single owner including all owned apartments, availability schedules, payment records, and reminder preferences.

**Headers:**
- `Authorization: Bearer <super_admin_jwt_token>`

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Owner details retrieved successfully",
  "data": {
    "id": "user-uuid-10",
    "username": "chaim_host",
    "email": "chaim@example.com",
    "phone": "+972501234567",
    "profileImage": "https://example.com/avatar.jpg",
    "status": "ACTIVE",
    "isVerified": true,
    "notificationPreference": "EMAIL",
    "ownerNotificationPreference": {
      "id": "pref-uuid-1",
      "channel": "EMAIL",
      "notificationEmail": "chaim@example.com",
      "notificationPhone": "+972501234567",
      "preferredDay": "THURSDAY",
      "preferredTime": "06:00 PM (Evening)",
      "isPaused": false,
      "allowReminder": true,
      "specificReminderDate": null,
      "lastReminderSentAt": "2026-09-10T15:30:00.000Z"
    },
    "totalListings": 2,
    "apartments": [
      {
        "id": "apt-uuid-1",
        "propertyId": "PROP-001",
        "title": "Luxury Geula Suite",
        "city": "Jerusalem",
        "phoneNumber": "+972501234567",
        "status": "APPROVED",
        "availabilities": [
          {
            "id": "avail-1",
            "weekendId": "wknd-1",
            "isSpecial": false,
            "weekend": {
              "id": "wknd-1",
              "title": "Parshat Bereshit",
              "date": "2026-10-03T00:00:00.000Z"
            }
          }
        ],
        "listingPayment": {
          "id": "pay-1",
          "amount": 28,
          "status": "COMPLETED"
        },
        "reportRented": []
      }
    ],
    "financials": {
      "totalEarnings": 1500,
      "totalDue": 0,
      "hasOverduePayment": false,
      "listing": {
        "isPaid": true,
        "earnings": 28,
        "due": 0
      },
      "reportRented": {
        "unpaidCount": 0,
        "unpaidAmount": 0,
        "paidCount": 1,
        "paidAmount": 50,
        "earnings": 50
      }
    }
  }
}
```

---

### 3.6 `POST /api/v1/owner/:id/availability-reminder` — Send Availability Reminder (Admin)

Dispatches an availability calendar update reminder to an owner across their selected channels (Email HTML, Voice SIM Call, and In-App Alert).

**Headers:**
- `Authorization: Bearer <super_admin_jwt_token>`
- `Content-Type: application/json`

#### Request Body Fields
| Field Name | Type | Required | Description | Example |
|---|---|---|---|---|
| `apartmentId` | `string` | Optional | Target specific apartment (defaults to owner's first listing) | `"apt-uuid-1"` |
| `emailSubject` | `string` | Optional | Custom email subject line | `"Please update your Shabbos calendar"` |
| `emailBody` | `string` | Optional | Custom HTML body from frontend rich text editor | `"<p>Custom message...</p>"` |
| `adminPhone` | `string` | Optional | Admin SIM phone number for Twilio bridge | `"+972509998877"` |
| `channel` | `string` | Optional | Override delivery channel | `"EMAIL"`, `"PHONE"`, `"BOTH"` |

#### Request Body Example
```json
{
  "apartmentId": "apt-uuid-1",
  "emailSubject": "Update your apartment availability for upcoming Shabbatot",
  "channel": "EMAIL"
}
```

#### Owner Schedule Restriction Rules
- **Rule 1: Paused / Disabled**
  If owner has `isPaused: true` or `allowReminder: false`, returns **`403 Forbidden`**:
  ```json
  {
    "statusCode": 403,
    "success": false,
    "message": "Owner has paused/disabled automated reminder notifications"
  }
  ```

- **Rule 2: Preferred Day Mismatch**
  If owner configured `preferredDay: "THURSDAY"` and today is not Thursday, returns **`400 Bad Request`**:
  ```json
  {
    "statusCode": 400,
    "success": false,
    "message": "Owner has scheduled reminders for THURSDAY. Today is MONDAY. Reminders cannot be sent on other days."
  }
  ```

- **Rule 3: Specific Date Mismatch**
  If owner configured `specificReminderDate: "2026-10-15"` and today is not that date, returns **`400 Bad Request`**:
  ```json
  {
    "statusCode": 400,
    "success": false,
    "message": "Owner has scheduled reminder specifically for 2026-10-15. Today is 2026-09-14."
  }
  ```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Availability reminder processed for chaim_host",
  "data": {
    "success": true,
    "message": "Availability reminder processed for chaim_host",
    "channelUsed": "EMAIL",
    "notificationPreference": "EMAIL",
    "emailSent": true,
    "callInitiated": false,
    "callSid": null,
    "notices": undefined
  }
}
```

---

### 3.7 `POST /api/v1/owner/:id/payment-due-reminder` — Send Payment Due Reminder (Admin)

Dispatches an outstanding payment due reminder with calculated breakdown and direct payment link.

**Headers:**
- `Authorization: Bearer <super_admin_jwt_token>`
- `Content-Type: application/json`

#### Request Body Fields
| Field Name | Type | Required | Description | Example |
|---|---|---|---|---|
| `apartmentId` | `string` | Optional | Target specific apartment | `"apt-uuid-1"` |
| `amount` | `number` | Optional | Override auto-calculated due amount (ILS) | `78` |
| `emailSubject` | `string` | Optional | Custom email subject line | `"Payment Due for Listing Fees"` |
| `emailBody` | `string` | Optional | Custom HTML body | `"<p>Please settle...</p>"` |
| `adminPhone` | `string` | Optional | Admin SIM phone number for Twilio bridge | `"+972509998877"` |
| `channel` | `string` | Optional | Override delivery channel | `"EMAIL"`, `"PHONE"`, `"BOTH"` |

#### Request Body Example
```json
{
  "amount": 78,
  "emailSubject": "Outstanding Listing & Report Fees Reminder",
  "channel": "BOTH"
}
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Payment reminder processed for chaim_host",
  "data": {
    "success": true,
    "message": "Payment reminder processed for chaim_host",
    "dueAmount": 78,
    "channelUsed": "BOTH",
    "emailSent": true,
    "callInitiated": true,
    "callSid": "CA9876543210abcdef9876543210abcdef"
  }
}
```

---

## 4. TypeScript Interfaces

```typescript
// ==========================================
// 1. Enums & Base Types
// ==========================================

export type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

export type NotificationChannel = 'EMAIL' | 'PHONE' | 'BOTH';

// ==========================================
// 2. Owner Preference Models
// ==========================================

export interface OwnerNotificationPreference {
  id?: string;
  userId: string;
  channel: NotificationChannel;
  notificationEmail?: string | null;
  notificationPhone?: string | null;
  preferredDay?: DayOfWeek | null;
  preferredTime?: string | null; // e.g., "06:00 PM (Evening)"
  isPaused: boolean;
  allowReminder: boolean;
  specificReminderDate?: string | null;
  lastReminderSentAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateNotificationPrefPayload {
  channel?: NotificationChannel;
  notificationEmail?: string | null;
  notificationPhone?: string | null;
  preferredDay?: DayOfWeek | null;
  preferredTime?: string | null;
  isPaused?: boolean;
  allowReminder?: boolean;
  specificReminderDate?: string | null;
}

export interface TestReminderResponse {
  success: boolean;
  message: string;
  channelUsed: NotificationChannel;
  emailSent: boolean;
  callInitiated: boolean;
  callSid: string | null;
  notices?: string[];
}

// ==========================================
// 3. Admin Reminder Request Payloads
// ==========================================

export interface SendAvailabilityReminderPayload {
  apartmentId?: string;
  emailSubject?: string;
  emailBody?: string;
  adminPhone?: string;
  channel?: NotificationChannel;
}

export interface SendPaymentDueReminderPayload extends SendAvailabilityReminderPayload {
  amount?: number;
}

// ==========================================
// 4. Owner Directory Models
// ==========================================

export interface OwnerFinancialSummary {
  totalEarnings: number;
  totalDue: number;
  hasOverduePayment: boolean;
  listing: {
    isPaid: boolean;
    earnings: number;
    due: number;
  };
  reportRented: {
    unpaidCount: number;
    unpaidAmount: number;
    paidCount: number;
    paidAmount: number;
    earnings: number;
  };
}

export interface OwnerApartmentSummary {
  id: string;
  propertyId: string;
  title: string;
  city: string;
  phoneNumber: string | null;
  status: string;
  availabilities?: Array<{
    id: string;
    weekendId: string;
    isSpecial: boolean;
    weekend?: {
      id: string;
      title: string;
      date: string;
    };
  }>;
  listingPayment?: {
    id: string;
    amount: number;
    status: string;
  } | null;
}

export interface OwnerListItem {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  profileImage: string | null;
  status: string;
  isVerified: boolean;
  notificationPreference: NotificationChannel;
  ownerNotificationPreference: OwnerNotificationPreference | null;
  totalListings: number;
  apartments: OwnerApartmentSummary[];
  financials: OwnerFinancialSummary;
  createdAt: string;
}

export interface OwnerFilterParams {
  searchTerm?: string;
  hasDue?: string; // "true" | "false"
  channel?: NotificationChannel;
  page?: number;
  limit?: number;
}
```

---

## 5. Ready-to-Use React Query Hooks

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  OwnerNotificationPreference,
  UpdateNotificationPrefPayload,
  TestReminderResponse,
  SendAvailabilityReminderPayload,
  SendPaymentDueReminderPayload,
  OwnerListItem,
  OwnerFilterParams,
} from './ownerTypes';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==========================================
// 1. Owner Self-Service Hooks
// ==========================================

// Fetch Logged-in Owner Reminder Settings
export const useOwnerNotificationPref = () => {
  return useQuery<OwnerNotificationPreference>({
    queryKey: ['ownerNotificationPref'],
    queryFn: async () => {
      const res = await api.get('/owner/me/notification-pref');
      return res.data.data;
    },
  });
};

// Update Owner Reminder Settings
export const useUpdateOwnerNotificationPref = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateNotificationPrefPayload) => {
      const res = await api.patch('/owner/me/notification-pref', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerNotificationPref'] });
    },
  });
};

// Trigger Immediate Test Reminder
export const useTestReminderNow = () => {
  return useMutation<TestReminderResponse>({
    mutationFn: async () => {
      const res = await api.post('/owner/me/test-reminder');
      return res.data.data;
    },
  });
};

// ==========================================
// 2. Admin Management Hooks
// ==========================================

// Admin: List All Owners (Filtered & Paginated)
export const useOwnersList = (params?: OwnerFilterParams) => {
  return useQuery<{
    meta: { page: number; limit: number; total: number };
    data: OwnerListItem[];
  }>({
    queryKey: ['ownersList', params],
    queryFn: async () => {
      const res = await api.get('/owner', { params });
      return res.data;
    },
  });
};

// Admin: Get Single Owner Full Details
export const useOwnerDetails = (ownerId: string) => {
  return useQuery<OwnerListItem>({
    queryKey: ['ownerDetails', ownerId],
    queryFn: async () => {
      const res = await api.get(`/owner/${ownerId}`);
      return res.data.data;
    },
    enabled: Boolean(ownerId),
  });
};

// Admin: Send Availability Calendar Reminder
export const useSendAvailabilityReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ownerId,
      payload,
    }: {
      ownerId: string;
      payload: SendAvailabilityReminderPayload;
    }) => {
      const res = await api.post(`/owner/${ownerId}/availability-reminder`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownersList'] });
      queryClient.invalidateQueries({ queryKey: ['ownerDetails'] });
    },
  });
};

// Admin: Send Payment Due Reminder
export const useSendPaymentDueReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ownerId,
      payload,
    }: {
      ownerId: string;
      payload: SendPaymentDueReminderPayload;
    }) => {
      const res = await api.post(`/owner/${ownerId}/payment-due-reminder`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownersList'] });
      queryClient.invalidateQueries({ queryKey: ['ownerDetails'] });
    },
  });
};
```

---

## 6. Frontend UI Components & Best Practices

### 1. Owner Dashboard Settings Card
Render the reminder settings card with:
- **Radio Options / Visual Cards**:
  - `PHONE`: 📞 Phone Call (Plays voice prompt via Twilio SIM bridge).
  - `EMAIL`: ✉️ Email (Delivers rich HTML email with update link).
  - `BOTH`: 🔄 Both (Phone Call + Email).
- **Custom Contact Overrides**:
  - `notificationEmail`: Input with email validation.
  - `notificationPhone`: International phone input.
- **Weekly Schedule Selector**:
  - `preferredDay`: Dropdown (`Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`).
  - `preferredTime`: Dropdown (e.g., `"06:00 PM (Evening)"`, `"09:00 AM"`, `"12:00 PM"`).
  - `specificReminderDate`: Date picker for single one-off target reminders.
- **Pause Switch**:
  - Toggle for `isPaused` (shows red badge when paused).
- **"Test Reminder Now" Button**:
  - Dispatches `POST /api/v1/owner/me/test-reminder`.
  - Shows instant toast: *"Test reminder triggered! Check your inbox and phone."*

### 2. Admin Reminder Modal
- **Owner Information Summary**: Shows owner name, total listings count, preferred day/time, and last reminder timestamp.
- **Permission Check Indicator**:
  - If `isPaused === true` or `allowReminder === false`, disables the send button and shows a banner: *"Owner has paused reminder notifications."*
  - If today is not the owner's `preferredDay`, displays a warning that dispatching will return a day mismatch error unless scheduled for today.
- **Message Customization**:
  - Rich text editor for `emailBody`.
  - Subject input field for `emailSubject`.
  - Channel override selector.
