# Frontend Integration Guide: Apartment Availability, Inactive Notes, Offers, Interested & Notify Requests

This document outlines the complete rules, API endpoints, request/response models, and UI button visibility logic for Next.js frontend integration.

---

## 📌 1. UI Button Visibility & Business Logic

### A. When Apartment is Available for Upcoming Weekend
> Condition: `apartment.unavailable === false && apartment.upcomingAvailability?.isAvailableNextWeekend === true`

- **Action:** Standard apartment viewing / booking.
- **Buttons to Show:**
  - `View all available dates`
- **Buttons to HIDE:**
  - ❌ Do **NOT** show `I'm interested`
  - ❌ Do **NOT** show `Send Offer`
  - ❌ Do **NOT** show `Notify me when available`

---

### B. When Apartment is Unavailable for Upcoming Weekend
> Condition: `apartment.unavailable === true || apartment.upcomingAvailability?.isAvailableNextWeekend === false`

- **Banner:** Show `Unavailable for upcoming weekend` (with lock / warning badge)
- **Buttons to Show:**
  - `View all available dates` (opens calendar dates)
  - `I'm interested` (opens modal -> calls `POST /api/v1/interested-request/`)
  - `Send Offer` (opens custom offer modal -> calls `POST /api/v1/offer/`)
  - `Notify me when available` (calls `POST /api/v1/notify-request/`)

---

### C. Owner Settings: Inactive Note & "Receive Offer When Unavailable" Toggle
When an apartment owner updates apartment availability or active status:

| Flag / Field | Type | Description |
|---|---|---|
| `isActive` | `boolean` | `true` = Active listing, `false` = Inactive. |
| `inactiveNote` | `string` | Reason / note why the apartment is inactive or unavailable. |
| `unavailable` | `boolean` | `true` = Property is marked unavailable by the owner. |
| `receiveRequestWhenUnavailable` | `boolean` | **Toggle**: `true` = User allows requests/offers even when unavailable. |

#### 🔍 Public Search & Listing Visibility Matrix:
```
isActive = false ───────────────────────────────────► ❌ Hidden from all public search results
isActive = true + unavailable = false ──────────────► ✅ Visible as Available
isActive = true + unavailable = true:
   ├── receiveRequestWhenUnavailable = true ────────► ✅ Visible in Search (Marked "Unavailable", shows Interest/Notify/Offer buttons)
   └── receiveRequestWhenUnavailable = false ───────► ❌ Hidden from Search
```

---

## 2. API Endpoints Summary

| Module | Method | Endpoint | Auth | Purpose |
|---|---|---|---|---|
| **Apartment** | `PATCH` | `/api/v1/apartments/:id` | Owner | Update active status, `inactiveNote`, `unavailable`, and `receiveRequestWhenUnavailable` |
| **Apartment** | `GET` | `/api/v1/apartments/:id` | Public | Get single apartment details including `upcomingAvailability` |
| **Interested** | `POST` | `/api/v1/interested-request/` | Guest (Auth) | Send interest request when apartment is unavailable |
| **Interested** | `GET` | `/api/v1/interested-request/my-requests` | Auth | Get all sent & received interest requests |
| **Notify** | `POST` | `/api/v1/notify-request/` | Guest (Auth) | Subscribe to availability notifications |
| **Notify** | `GET` | `/api/v1/notify-request/my-requests` | Auth | Get all sent & received notify requests |
| **Offer** | `POST` | `/api/v1/offer/` | Guest (Auth) | Submit custom price offer with date & message |
| **Offer** | `GET` | `/api/v1/offer/my-offers` | Auth | Get all sent & received custom offers |
| **Offer** | `PATCH` | `/api/v1/offer/status/:id` | Owner | Accept or reject a custom offer (`ACCEPTED` / `REJECTED`) |

---

## 3. TypeScript Interfaces

```typescript
// ─── Enums ────────────────────────────────────────────────────────────────────
export enum OfferStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

// ─── Availability Shape in Apartment Response ─────────────────────────────────
export interface IUpcomingWeekendInfo {
  id: string;
  title: string;
  date: string;
  isAvailable: boolean;
}

export interface IUpcomingAvailability {
  nextWeekend: IUpcomingWeekendInfo | null;
  followingWeekend: IUpcomingWeekendInfo | null;
  isAvailableNextWeekend: boolean;
  isAvailableSecondWeekend: boolean;
  isAvailableNextTwoWeekends: boolean;
  availabilityMessage: string;
  canNotify: boolean;
  canMakeOffer: boolean;
}

// ─── Apartment Model ──────────────────────────────────────────────────────────
export interface IApartment {
  id: string;
  title: string;
  description: string | null;
  city: string;
  neighborhood: string;
  pricePerShabbat: number;
  coverImage: string | null;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  maxGuest: number;
  isActive: boolean;
  inactiveNote: string | null;
  unavailable: boolean;
  receiveRequestWhenUnavailable: boolean;
  upcomingAvailability?: IUpcomingAvailability;
  user?: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
  };
}

// ─── Owner Update Payload (PATCH /api/v1/apartments/:id) ──────────────────────
export interface IUpdateApartmentStatusPayload {
  isActive?: boolean;
  inactiveNote?: string;
  unavailable?: boolean;
  receiveRequestWhenUnavailable?: boolean;
}

// ─── Interested Request ───────────────────────────────────────────────────────
export interface ICreateInterestedRequestPayload {
  apartmentId: string;
}

export interface IInterestedRequest {
  id: string;
  userId: string;
  ownerId: string;
  apartmentId: string;
  createdAt: string;
  apartment: {
    id: string;
    title: string;
    city: string;
    neighborhood: string;
    coverImage: string | null;
  };
  owner?: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
  };
  user?: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
  };
}

// ─── Notify Request ───────────────────────────────────────────────────────────
export interface ICreateNotifyRequestPayload {
  apartmentId: string;
}

export interface INotifyRequest {
  id: string;
  userId: string;
  ownerId: string;
  apartmentId: string;
  createdAt: string;
  apartment: {
    id: string;
    title: string;
    city: string;
    neighborhood: string;
    coverImage: string | null;
  };
  owner?: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
  };
  user?: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
  };
}

// ─── Offer Module ─────────────────────────────────────────────────────────────
export interface ICreateOfferPayload {
  apartmentId: string;
  offerPrice: number;
  shabbosId?: string;
  message?: string;
}

export interface IUpdateOfferStatusPayload {
  status: OfferStatus; // "PENDING" | "ACCEPTED" | "REJECTED"
}

export interface IOffer {
  id: string;
  apartmentId: string;
  ownerId: string;
  shabbosId: string | null;
  originalPrice: number;
  offerPrice: number;
  message: string | null;
  status: OfferStatus;
  createdAt: string;
  apartment: {
    id: string;
    title: string;
    city: string;
    neighborhood: string;
    coverImage: string | null;
  };
}
```

---

## 4. Endpoint Details & Examples

### 4.1 Owner: Update Apartment Status, Inactive Note & Toggles
- **Method:** `PATCH`
- **URL:** `/api/v1/apartments/:id`
- **Auth:** Required (Owner or Admin)

#### Request Body (When Inactivating):
```json
{
  "isActive": false,
  "inactiveNote": "Property undergoing renovation until end of October."
}
```

#### Request Body (When Toggling Unavailable & Accepting Offers):
```json
{
  "unavailable": true,
  "receiveRequestWhenUnavailable": true,
  "inactiveNote": "Currently booked by family for upcoming Shabbat."
}
```

---

### 4.2 Guest: Send Interested Request (When Unavailable)
- **Method:** `POST`
- **URL:** `/api/v1/interested-request/`
- **Auth:** Required

#### Request Body:
```json
{
  "apartmentId": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2"
}
```

#### Success Response (`201 Created`):
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Interested request sent successfully",
  "data": {
    "id": "interest-req-uuid-001",
    "userId": "guest-uuid-123",
    "ownerId": "host-uuid-456",
    "apartmentId": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2",
    "createdAt": "2026-09-19T11:55:00.000Z",
    "apartment": {
      "id": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2",
      "title": "Beautiful Apartment in Jerusalem",
      "city": "Jerusalem",
      "neighborhood": "Rehavia",
      "coverImage": "https://example.com/apt1.jpg"
    }
  }
}
```

---

### 4.3 Guest: Send Notify Me Request (When Unavailable)
- **Method:** `POST`
- **URL:** `/api/v1/notify-request/`
- **Auth:** Required

#### Request Body:
```json
{
  "apartmentId": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2"
}
```

#### Success Response (`201 Created`):
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Notify Me request submitted successfully",
  "data": {
    "id": "notify-req-uuid-001",
    "userId": "guest-uuid-123",
    "ownerId": "host-uuid-456",
    "apartmentId": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2",
    "createdAt": "2026-09-19T11:55:00.000Z",
    "apartment": {
      "id": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2",
      "title": "Beautiful Apartment in Jerusalem",
      "city": "Jerusalem",
      "neighborhood": "Rehavia",
      "coverImage": "https://example.com/apt1.jpg"
    }
  }
}
```

---

### 4.4 Guest: Submit Custom Offer (Contact Property)
- **Method:** `POST`
- **URL:** `/api/v1/offer/`
- **Auth:** Required

#### Request Body:
```json
{
  "apartmentId": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2",
  "offerPrice": 4200,
  "shabbosId": "61d9a244-6a84-4861-bb38-ec73b185b2e5",
  "message": "We are interested in staying for this upcoming weekend."
}
```

#### Success Response (`201 Created`):
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Custom offer submitted successfully",
  "data": {
    "id": "offer-uuid-001",
    "apartmentId": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2",
    "ownerId": "guest-uuid-123",
    "shabbosId": "61d9a244-6a84-4861-bb38-ec73b185b2e5",
    "originalPrice": 4500,
    "offerPrice": 4200,
    "message": "We are interested in staying for this upcoming weekend.",
    "status": "PENDING",
    "createdAt": "2026-09-19T11:55:00.000Z"
  }
}
```

---

## 5. Frontend React Condition Helper

```tsx
interface ApartmentBookingCardProps {
  apartment: IApartment;
  onOpenInterestedModal: () => void;
  onOpenOfferModal: () => void;
  onNotifyMe: () => void;
  onViewDates: () => void;
}

export const ApartmentBookingCard = ({
  apartment,
  onOpenInterestedModal,
  onOpenOfferModal,
  onNotifyMe,
  onViewDates,
}: ApartmentBookingCardProps) => {
  // Check if unavailable for upcoming weekend
  const isAvailableForNextWeekend =
    !apartment.unavailable &&
    apartment.upcomingAvailability?.isAvailableNextWeekend === true;

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="text-3xl font-bold">₪{apartment.pricePerShabbat}</div>

      {!isAvailableForNextWeekend ? (
        // ─── UNAVAILABLE STATE ──────────────────────────────────────
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900">
            Unavailable for upcoming weekend
          </div>

          <div className="flex gap-2">
            <button
              onClick={onViewDates}
              className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              View all available dates
            </button>
            <button
              onClick={onOpenInterestedModal}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              I'm interested
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onOpenOfferModal}
              className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
            >
              Send Offer
            </button>
            <button
              onClick={onNotifyMe}
              className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
            >
              Notify Me
            </button>
          </div>
        </div>
      ) : (
        // ─── AVAILABLE STATE ────────────────────────────────────────
        <div className="mt-4 space-y-3">
          <button
            onClick={onViewDates}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            View all available dates
          </button>
        </div>
      )}
    </div>
  );
};
```
