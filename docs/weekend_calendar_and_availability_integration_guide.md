# Weekend Calendar & Apartment Availability — Frontend Integration Guide

This guide covers the two interconnected scheduling and calendar modules:
1. **Weekend Calendar Module** (`/api/v1/weekend-calendar`): System-wide calendar of upcoming weekends (Parshiot / Jewish Holidays / Shabbatot).
2. **Apartment Availability Module** (`/api/v1/apartment-availability`): Managing an apartment's availability for specific weekends and holiday/special pricing.

---

## 1. Global Concepts & Architecture

### How the Calendar & Availability Work Together
1. **Weekend Calendar (`weekend_calendars`)**:
   - Central calendar maintained by admins (or uploaded via CSV/Excel).
   - Each entry represents a Shabbat or Yom Tov with a `title` (e.g. `"Parshat Noach"`, `"Rosh Hashanah"`) and a distinct UTC `date` (e.g. `"2026-10-10T00:00:00.000Z"`).
   - Every apartment availability record and swap preference references these central weekend records.

2. **Apartment Availability (`apartment_availabilities`)**:
   - Links an `apartmentId` to a `weekendId`.
   - Owners mark which weekends their apartment is open for rent.
   - Supports **Special Weekend Pricing** (`isSpecial: true`, `specialPrice: number`) for peak holidays (Sukkot, Pesach, special Shabbatot).
   - The API returns an **`effectivePrice`** field on every availability:
     - If `isSpecial === true` and `specialPrice` is set $\rightarrow$ `effectivePrice = specialPrice`
     - Otherwise $\rightarrow$ `effectivePrice = apartment.pricePerShabbat`

---

## 2. Module 1: Weekend Calendar API (`/api/v1/weekend-calendar`)

### Route Summary
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/weekend-calendar` | Public | List and search all weekend calendar records (paginated) |
| `GET` | `/api/v1/weekend-calendar/:id` | Public | Get a single weekend calendar entry by ID |
| `POST` | `/api/v1/weekend-calendar` | Super Admin | Create a single weekend calendar record |
| `POST` | `/api/v1/weekend-calendar/upload-excel` | Super Admin | Bulk import weekend calendar entries via Excel (`.xlsx`) |
| `POST` | `/api/v1/weekend-calendar/upload-csv` | Super Admin | Bulk import weekend calendar entries via CSV (`.csv`) |
| `PATCH` | `/api/v1/weekend-calendar/:id` | Super Admin | Update a weekend calendar entry title or date |
| `DELETE` | `/api/v1/weekend-calendar/:id` | Super Admin | Delete a weekend calendar entry |

---

### 2.1 `GET /api/v1/weekend-calendar` — Get All Weekend Calendars

**Headers:** None required (Public).

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `searchTerm` | `string` | Optional | Searches within the `title` field | `"Noach"` |
| `startDate` | `string` | Optional | Filter dates on or after (`YYYY-MM-DD` or ISO) | `"2026-10-01"` |
| `endDate` | `string` | Optional | Filter dates on or before (`YYYY-MM-DD` or ISO) | `"2026-12-31"` |
| `page` | `number` | Optional | Page number (default: `1`) | `1` |
| `limit` | `number` | Optional | Items per page (default: `10`) | `20` |
| `sortBy` | `string` | Optional | Sort field (default: `"date"`) | `"date"` |
| `sortOrder` | `string` | Optional | `"asc"` or `"desc"` (default: `"asc"`) | `"asc"` |

#### Request Example
```http
GET /api/v1/weekend-calendar?startDate=2026-10-01&endDate=2026-12-31&sortBy=date&sortOrder=asc
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Weekend calendars retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3
  },
  "data": [
    {
      "id": "wknd-uuid-1",
      "title": "Parshat Bereshit",
      "date": "2026-10-03T00:00:00.000Z",
      "createdAt": "2026-09-01T12:00:00.000Z",
      "updatedAt": "2026-09-01T12:00:00.000Z"
    },
    {
      "id": "wknd-uuid-2",
      "title": "Parshat Noach",
      "date": "2026-10-10T00:00:00.000Z",
      "createdAt": "2026-09-01T12:00:00.000Z",
      "updatedAt": "2026-09-01T12:00:00.000Z"
    },
    {
      "id": "wknd-uuid-3",
      "title": "Parshat Lech Lecha",
      "date": "2026-10-17T00:00:00.000Z",
      "createdAt": "2026-09-01T12:00:00.000Z",
      "updatedAt": "2026-09-01T12:00:00.000Z"
    }
  ]
}
```

---

### 2.2 `GET /api/v1/weekend-calendar/:id` — Get Weekend by ID

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Weekend calendar retrieved successfully",
  "data": {
    "id": "wknd-uuid-2",
    "title": "Parshat Noach",
    "date": "2026-10-10T00:00:00.000Z",
    "createdAt": "2026-09-01T12:00:00.000Z",
    "updatedAt": "2026-09-01T12:00:00.000Z"
  }
}
```

---

### 2.3 `POST /api/v1/weekend-calendar` — Create Weekend Calendar (Admin)

**Headers:** `Authorization: Bearer <super_admin_token>`

#### Request Body
```json
{
  "title": "Parshat Vayera",
  "date": "2026-10-24"
}
```

#### Validation Rules
- `title`: String, min 1 char (Required)
- `date`: String, min 1 char (Required, e.g. `"YYYY-MM-DD"`)

#### Response Example (`201 Created`)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Weekend calendar created successfully",
  "data": {
    "id": "wknd-uuid-4",
    "title": "Parshat Vayera",
    "date": "2026-10-24T00:00:00.000Z",
    "createdAt": "2026-09-10T10:00:00.000Z",
    "updatedAt": "2026-09-10T10:00:00.000Z"
  }
}
```

---

### 2.4 `POST /api/v1/weekend-calendar/upload-excel` or `/upload-csv` (Admin)

**Headers:**
- `Authorization: Bearer <super_admin_token>`
- `Content-Type: multipart/form-data`

#### Form Data Fields
| Field Name | Type | Description |
|---|---|---|
| `file` or `doc` or `csv` | `File` | Excel (`.xlsx`) or CSV file |

#### Expected Spreadsheet/CSV Columns
- `title` (or `Title`): Shabbat/Holiday name (e.g., `"Parshat Noach"`)
- `date` (or `Date`): Date string in `YYYY-MM-DD` or standard date format

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Weekend calendar Excel processed successfully",
  "data": {
    "count": 52,
    "message": "Weekend calendar Excel processed successfully"
  }
}
```

---

### 2.5 `PATCH /api/v1/weekend-calendar/:id` — Update Weekend (Admin)

**Headers:** `Authorization: Bearer <super_admin_token>`

#### Request Body
```json
{
  "title": "Parshat Noach (Rosh Chodesh)",
  "date": "2026-10-10"
}
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Weekend calendar updated successfully",
  "data": {
    "id": "wknd-uuid-2",
    "title": "Parshat Noach (Rosh Chodesh)",
    "date": "2026-10-10T00:00:00.000Z",
    "updatedAt": "2026-09-10T10:05:00.000Z"
  }
}
```

---

### 2.6 `DELETE /api/v1/weekend-calendar/:id` — Delete Weekend (Admin)

**Headers:** `Authorization: Bearer <super_admin_token>`

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Weekend calendar deleted successfully",
  "data": {
    "id": "wknd-uuid-4",
    "title": "Parshat Vayera"
  }
}
```

---

## 3. Module 2: Apartment Availability API (`/api/v1/apartment-availability`)

### Route Summary
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/apartment-availability/weekends` | Public | Convenience route to list upcoming weekends |
| `GET` | `/api/v1/apartment-availability/:apartmentId` | Public | Get all active availabilities for an apartment |
| `POST` | `/api/v1/apartment-availability/add` | Required (Owner) | Add availability for a single weekend |
| `POST` | `/api/v1/apartment-availability/remove` | Required (Owner) | Remove availability for a single weekend |
| `POST` | `/api/v1/apartment-availability/bulk-set` | Required (Owner) | Set/overwrite all available weekends at once |
| `POST` | `/api/v1/apartment-availability/special-price` | Required (Owner) | Direct set/upsert special holiday pricing for a weekend |
| `PATCH` | `/api/v1/apartment-availability/:availabilityId/special` | Required (Owner) | Toggle special pricing on an existing availability record |

---

### 3.1 `GET /api/v1/apartment-availability/:apartmentId` — Get Apartment Availabilities

Returns all active weekend availabilities scheduled for an apartment, sorted chronologically by weekend date.

**Headers:** None (Public)

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Apartment availabilities retrieved successfully",
  "data": [
    {
      "id": "avail-uuid-1",
      "apartmentId": "apt-uuid-1",
      "weekendId": "wknd-uuid-1",
      "isSpecial": false,
      "specialPrice": null,
      "effectivePrice": 950,
      "createdAt": "2026-09-05T10:00:00.000Z",
      "updatedAt": "2026-09-05T10:00:00.000Z",
      "weekend": {
        "id": "wknd-uuid-1",
        "title": "Parshat Bereshit",
        "date": "2026-10-03T00:00:00.000Z"
      }
    },
    {
      "id": "avail-uuid-2",
      "apartmentId": "apt-uuid-1",
      "weekendId": "wknd-uuid-2",
      "isSpecial": true,
      "specialPrice": 1400,
      "effectivePrice": 1400,
      "createdAt": "2026-09-05T10:00:00.000Z",
      "updatedAt": "2026-09-08T14:30:00.000Z",
      "weekend": {
        "id": "wknd-uuid-2",
        "title": "Parshat Noach",
        "date": "2026-10-10T00:00:00.000Z"
      }
    }
  ]
}
```

> **Pricing Behavior:**
> - In `avail-uuid-1`: `isSpecial` is `false`, so `effectivePrice` dynamically reflects the apartment's standard `pricePerShabbat` (`950`).
> - In `avail-uuid-2`: `isSpecial` is `true`, so `effectivePrice` reflects `specialPrice` (`1400`).

---

### 3.2 `POST /api/v1/apartment-availability/add` — Add Single Weekend

Marks an apartment as available for a specific weekend.

**Headers:** `Authorization: Bearer <token>` (Must be the apartment owner)

#### Validation Schema
- `apartmentId`: String, min 1 (Required)
- `weekendId`: String, min 1 (Required)

#### Request Body
```json
{
  "apartmentId": "apt-uuid-1",
  "weekendId": "wknd-uuid-3"
}
```

#### Possible Errors:
- `403 FORBIDDEN`: `"You do not own this apartment"`
- `404 NOT_FOUND`: `"Apartment not found"` or `"Weekend calendar entry not found"`
- `409 CONFLICT`: `"Apartment is already available for this weekend"`

#### Response Example (`201 Created`)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Weekend availability added successfully",
  "data": {
    "id": "avail-uuid-3",
    "apartmentId": "apt-uuid-1",
    "weekendId": "wknd-uuid-3",
    "isSpecial": false,
    "specialPrice": null,
    "createdAt": "2026-09-10T10:15:00.000Z",
    "updatedAt": "2026-09-10T10:15:00.000Z",
    "weekend": {
      "id": "wknd-uuid-3",
      "title": "Parshat Lech Lecha",
      "date": "2026-10-17T00:00:00.000Z"
    },
    "apartment": {
      "id": "apt-uuid-1",
      "title": "Charming Geula Flat",
      "city": "Jerusalem"
    }
  }
}
```

---

### 3.3 `POST /api/v1/apartment-availability/remove` — Remove Single Weekend

Marks an apartment as unavailable for a specific weekend.

**Headers:** `Authorization: Bearer <token>` (Must be the apartment owner)

#### Request Body
```json
{
  "apartmentId": "apt-uuid-1",
  "weekendId": "wknd-uuid-3"
}
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Weekend availability removed successfully",
  "data": {
    "message": "Availability removed successfully"
  }
}
```

---

### 3.4 `POST /api/v1/apartment-availability/bulk-set` — Bulk Set Availabilities

Atomically overwrites the apartment's entire availability schedule with the provided list of weekend IDs.

**Headers:** `Authorization: Bearer <token>` (Must be the apartment owner)

#### Validation Schema
- `apartmentId`: String, min 1 (Required)
- `weekendIds`: Array of strings, min 1 item (Required)

#### Request Body
```json
{
  "apartmentId": "apt-uuid-1",
  "weekendIds": [
    "wknd-uuid-1",
    "wknd-uuid-2",
    "wknd-uuid-3"
  ]
}
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Apartment availabilities updated successfully",
  "data": [
    {
      "id": "avail-uuid-10",
      "apartmentId": "apt-uuid-1",
      "weekendId": "wknd-uuid-1",
      "isSpecial": false,
      "specialPrice": null,
      "weekend": {
        "id": "wknd-uuid-1",
        "title": "Parshat Bereshit",
        "date": "2026-10-03T00:00:00.000Z"
      }
    },
    {
      "id": "avail-uuid-11",
      "apartmentId": "apt-uuid-1",
      "weekendId": "wknd-uuid-2",
      "isSpecial": false,
      "specialPrice": null,
      "weekend": {
        "id": "wknd-uuid-2",
        "title": "Parshat Noach",
        "date": "2026-10-10T00:00:00.000Z"
      }
    }
  ]
}
```

---

### 3.5 `POST /api/v1/apartment-availability/special-price` — Direct Set Special Pricing

Creates or updates an availability entry with holiday or custom pricing without needing the existing `availabilityId`.

**Headers:** `Authorization: Bearer <token>` (Must be the apartment owner)

#### Request Body
```json
{
  "apartmentId": "apt-uuid-1",
  "weekendId": "wknd-uuid-2",
  "isSpecial": true,
  "specialPrice": 1600
}
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Weekend special pricing updated successfully",
  "data": {
    "id": "avail-uuid-2",
    "apartmentId": "apt-uuid-1",
    "weekendId": "wknd-uuid-2",
    "isSpecial": true,
    "specialPrice": 1600,
    "weekend": {
      "id": "wknd-uuid-2",
      "title": "Parshat Noach",
      "date": "2026-10-10T00:00:00.000Z"
    }
  }
}
```

---

### 3.6 `PATCH /api/v1/apartment-availability/:availabilityId/special` — Toggle Special Price

Updates special pricing for an existing `ApartmentAvailability` record using its `availabilityId`.

**Headers:** `Authorization: Bearer <token>` (Must be the apartment owner)

#### Validation Schema
- `isSpecial`: Boolean (Required)
- `specialPrice`: Positive number (Required when `isSpecial` is `true`, ignored/cleared when `false`)

#### Request Body (Turn ON Special Pricing)
```json
{
  "isSpecial": true,
  "specialPrice": 1750
}
```

#### Request Body (Turn OFF Special Pricing)
```json
{
  "isSpecial": false
}
```
*(When `isSpecial: false`, `specialPrice` is automatically cleared to `null` in the database).*

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Weekend special pricing updated successfully",
  "data": {
    "id": "avail-uuid-2",
    "isSpecial": false,
    "specialPrice": null,
    "weekend": {
      "id": "wknd-uuid-2",
      "title": "Parshat Noach",
      "date": "2026-10-10T00:00:00.000Z"
    }
  }
}
```

---

## 4. TypeScript Interfaces

```typescript
// ==========================================
// 1. Weekend Calendar Models
// ==========================================

export interface WeekendCalendar {
  id: string;
  title: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeekendCalendarFilterParams {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateWeekendCalendarPayload {
  title: string;
  date: string;
}

export interface UpdateWeekendCalendarPayload {
  title?: string;
  date?: string;
}

// ==========================================
// 2. Apartment Availability Models
// ==========================================

export interface ApartmentAvailability {
  id: string;
  apartmentId: string;
  weekendId: string;
  isSpecial: boolean;
  specialPrice?: number | null;
  effectivePrice?: number;
  createdAt?: string;
  updatedAt?: string;
  weekend: WeekendCalendar;
  apartment?: {
    id: string;
    title: string;
    city: string;
  };
}

export interface ToggleAvailabilityPayload {
  apartmentId: string;
  weekendId: string;
}

export interface BulkSetAvailabilityPayload {
  apartmentId: string;
  weekendIds: string[];
}

export interface SetSpecialPriceDirectPayload {
  apartmentId: string;
  weekendId: string;
  isSpecial: boolean;
  specialPrice?: number;
}

export interface ToggleSpecialPricePayload {
  isSpecial: boolean;
  specialPrice?: number;
}
```

---

## 5. Ready-to-Use React Query Hooks

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  WeekendCalendar,
  WeekendCalendarFilterParams,
  ApartmentAvailability,
  ToggleAvailabilityPayload,
  BulkSetAvailabilityPayload,
  SetSpecialPriceDirectPayload,
  ToggleSpecialPricePayload,
  CreateWeekendCalendarPayload,
} from './calendarTypes';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==========================================
// Weekend Calendar Hooks
// ==========================================

// 1. Get All Weekend Calendars (Filtered & Paginated)
export const useWeekendCalendars = (params?: WeekendCalendarFilterParams) => {
  return useQuery<{ meta: { page: number; limit: number; total: number }; data: WeekendCalendar[] }>({
    queryKey: ['weekendCalendars', params],
    queryFn: async () => {
      const res = await api.get('/weekend-calendar', { params });
      return res.data;
    },
  });
};

// 2. Get Single Weekend by ID
export const useWeekendCalendar = (id: string) => {
  return useQuery<WeekendCalendar>({
    queryKey: ['weekendCalendar', id],
    queryFn: async () => {
      const res = await api.get(`/weekend-calendar/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
};

// 3. Admin: Create Weekend Calendar
export const useCreateWeekendCalendar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWeekendCalendarPayload) => {
      const res = await api.post('/weekend-calendar', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekendCalendars'] });
    },
  });
};

// ==========================================
// Apartment Availability Hooks
// ==========================================

// 4. Get All Availabilities for an Apartment (includes effectivePrice)
export const useApartmentAvailabilities = (apartmentId: string) => {
  return useQuery<ApartmentAvailability[]>({
    queryKey: ['apartmentAvailabilities', apartmentId],
    queryFn: async () => {
      const res = await api.get(`/apartment-availability/${apartmentId}`);
      return res.data.data;
    },
    enabled: Boolean(apartmentId),
  });
};

// 5. Add Single Weekend Availability
export const useAddAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ToggleAvailabilityPayload) => {
      const res = await api.post('/apartment-availability/add', payload);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apartmentAvailabilities', variables.apartmentId] });
      queryClient.invalidateQueries({ queryKey: ['myApartment'] });
    },
  });
};

// 6. Remove Single Weekend Availability
export const useRemoveAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ToggleAvailabilityPayload) => {
      const res = await api.post('/apartment-availability/remove', payload);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apartmentAvailabilities', variables.apartmentId] });
      queryClient.invalidateQueries({ queryKey: ['myApartment'] });
    },
  });
};

// 7. Bulk Set Availabilities (Overwrites schedule)
export const useBulkSetAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkSetAvailabilityPayload) => {
      const res = await api.post('/apartment-availability/bulk-set', payload);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apartmentAvailabilities', variables.apartmentId] });
      queryClient.invalidateQueries({ queryKey: ['myApartment'] });
    },
  });
};

// 8. Direct Set Special Weekend Price
export const useSetSpecialPriceDirect = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SetSpecialPriceDirectPayload) => {
      const res = await api.post('/apartment-availability/special-price', payload);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apartmentAvailabilities', variables.apartmentId] });
    },
  });
};

// 9. Toggle Special Price for Availability Record ID
export const useToggleSpecialPrice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      availabilityId,
      apartmentId,
      payload,
    }: {
      availabilityId: string;
      apartmentId: string;
      payload: ToggleSpecialPricePayload;
    }) => {
      const res = await api.patch(`/apartment-availability/${availabilityId}/special`, payload);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apartmentAvailabilities', variables.apartmentId] });
    },
  });
};
```
