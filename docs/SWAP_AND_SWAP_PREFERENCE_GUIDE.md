# Swap & Swap Preference System: Next.js Integration Guide

Comprehensive API documentation, request/response payloads, TypeScript interfaces, Prisma enums, Zod validation schemas, and Leaflet map integration specifications for the **Apartment Swap** and **Swap Preference** modules.

---

## 1. System Overview & Core Business Rules

### 1.1 Swap Preference & Toggle
1. **Free Swap Toggle**:
   - Users can toggle swap mode **ON** or **OFF** (`isEnabled: true` / `isEnabled: false`) anytime freely without requiring any other field.
   - All filter preference fields (`city`, `neighborhood`, `rooms`, `beds`, `weekend`, `whatsApp`, `email`) are optional and nullable.
   - When a user logs in, `GET /api/v1/user/me` includes `isSwapEnabled: boolean` and their active `swapPreference`.
2. **Access Gate**:
   - Only users who have listed an apartment and set `isEnabled: true` on their swap preference are permitted to search swappable properties (`/matched-swaps` and `/all`).

### 1.2 Matching & Scoring Algorithm (`GET /swap-preference/matched-swaps`)
The matching algorithm scores other swappable apartments based on user preferences or live query overrides:
- **Weekend Availability Match**: `+15 pts` (target apartment has active availability matching the requested weekend)
- **Destination City Match**: `+10 pts` (`apartment.city` contains requested `city`, case-insensitive)
- **Neighborhood Match**: `+5 pts` (`apartment.neighborhood` contains requested `neighborhood`, case-insensitive)
- **Min Bedrooms Match**: `+3 pts` (`apartment.bedrooms >= requested rooms`)
- **Min Beds / Bathrooms Match**: `+2 pts` (`apartment.bathrooms >= beds` or `apartment.maxGuest >= beds`)
- **Sorting**: Matches are sorted by `matchScore` descending.
- **Fallback**: If no apartments score `> 0`, `isPreferenceMatched` is set to `false` and all available swappable listings are returned in `otherProperties`.

### 1.3 Swap Request Lifecycle & Statuses
- **SwapStatus Enum**: `PENDING`, `APPROVED`, `REJECTED`
- **Request Creation (`POST /swap/request`)**:
  - Requester's apartment must have `isEnabled: true`. Target apartment must also have `isEnabled: true`.
  - **Weekend selection is optional**. If both apartments have selected a specific weekend, they must match. If not set, the swap request proceeds with `weekend: null` or the available preference weekend.
  - Requester criteria (city, neighborhood, min bedrooms, min beds) are validated against target apartment attributes.
  - Generates a unique `swapCode` (e.g., `SWAP-1726829456123-4819`).
- **Approval (`PATCH /swap/status/:id` with status `APPROVED`)**:
  - Only the recipient apartment owner (or `SUPER_ADMIN`) can approve.
  - Automatically deletes the corresponding weekend from `ApartmentAvailability` for **both** apartments so neither can be booked by third parties.
  - Automatically sets `isEnabled: false` and `weekend: null` on `SwapPreference` for **both** apartments to prevent double-swapping.
  - Clears apartment cache in Redis (`apartment:*`).
  - Triggers push/in-app notifications to both users via `notifyOnSwapAccepted`.

### 1.4 Map View & Walking Distance Calculations
- Every apartment payload includes coordinates and calculated walking distances:
  - `lat`, `lng`: Apartment geographical coordinates.
  - `neighborhoodLat`, `neighborhoodLng`: Neighborhood centroid coordinates.
  - `neighborhoodWalkingMinutes`: Estimated walking time to neighborhood center.
  - `walkingDistanceToNeighborhood`: Computed walking minutes to neighborhood center.
  - `distanceKmToNeighborhood`: Computed distance in kilometers to neighborhood center.
  - `walkingDistanceToDestination`: Computed walking minutes when `destLat` & `destLng` query params are supplied.
  - `distanceKmToDestination`: Computed distance in kilometers when `destLat` & `destLng` query params are supplied.

---

## 2. Base Configuration & Headers

```http
Base URL: http://<HOST>:<PORT>/api/v1
Content-Type: application/json
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

## 3. Enums & TypeScript Interfaces

### 3.1 Enums

```typescript
export enum SwapStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum UserRole {
  USER = "USER",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum ApartmentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  REJECTED = "REJECTED",
  SUSPENDED = "SUSPENDED",
  BLOCKED = "BLOCKED",
}

export enum PropertyType {
  APARTMENT = "APARTMENT",
  VILLA = "VILLA",
  PENTHOUSE = "PENTHOUSE",
  STUDIO = "STUDIO",
}
```

### 3.2 TypeScript Interfaces

```typescript
// Weekend Calendar Record
export interface WeekendCalendar {
  id: string;
  title: string;
  date: string; // ISO-8601 string: "2026-09-25T00:00:00.000Z"
}

// User Profile Snippet in Apartment
export interface ApartmentUser {
  id: string;
  username: string;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
}

// Comprehensive Apartment Details
export interface SwappableApartment {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  city: string;
  neighborhood: string;
  street1?: string | null;
  street2?: string | null;
  lat: number | null;
  lng: number | null;
  neighborhoodLat: number | null;
  neighborhoodLng: number | null;
  neighborhoodWalkingMinutes?: number | null;
  propertyType?: PropertyType;
  bedrooms: number;
  bathrooms: number;
  maxGuest: number;
  pricePerShabbat: number;
  coverImage?: string | null;
  images: string[];
  phoneNumber?: string | null;
  whatsApp?: string | null;
  phone: boolean;
  whatsapp: boolean;
  email: boolean;
  unavailable: boolean;
  receiveRequestWhenUnavailable: boolean;
  isActive: boolean;
  status?: ApartmentStatus;
  amenities?: string[];
  additionalDetails?: Record<string, any> | null;
  walkingDistanceToNeighborhood?: number | null; // in minutes
  distanceKmToNeighborhood?: number | null;      // in km (e.g. 0.4)
  walkingDistanceToDestination?: number | null;  // in minutes (if destLat/destLng provided)
  distanceKmToDestination?: number | null;       // in km (if destLat/destLng provided)
  user: ApartmentUser;
}

// User Swap Preference Model
export interface SwapPreference {
  id: string;
  apartmentId: string;
  isEnabled: boolean;
  city?: string | null;
  neighborhood?: string | null;
  rooms?: number | null;
  beds?: number | null;
  weekend?: string | null; // ISO-8601 string
  whatsApp?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
  weekendCalendar?: WeekendCalendar | null;
  apartment?: SwappableApartment;
}

// Swappable Listing Item in Matched / Search Results
export interface SwappableListingItem {
  id: string;
  apartmentId: string;
  isEnabled: boolean;
  city: string | null;
  neighborhood: string | null;
  rooms: number | null;
  beds: number | null;
  weekend: string | null;
  whatsApp: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  weekendCalendar?: WeekendCalendar | null;
  isMatch?: boolean;
  matchScore?: number;
  apartment: SwappableApartment;
}

// Response for GET /swap-preference/matched-swaps
export interface MatchedSwapsData {
  isPreferenceMatched: boolean;
  hasPreferenceSet: boolean;
  userPreference: SwapPreference;
  message: string;
  data: SwappableListingItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  matchedProperties: SwappableListingItem[];
  matchedMeta: {
    page: number;
    limit: number;
    total: number;
  };
  otherProperties: SwappableListingItem[];
  otherMeta: {
    page: number;
    limit: number;
    total: number;
  };
}

// Swap Proposal Object
export interface SwapRequestItem {
  id: string;
  fromAppId: string;
  toAppId: string;
  status: SwapStatus;
  weekend: string | null;
  swapCode: string;
  createdAt: string;
  updatedAt: string;
  weekendCalendar?: WeekendCalendar | null;
  fromApartment: SwappableApartment;
  toApartment: SwappableApartment;
  payments?: any[];
}

// Response for GET /swap/my-swaps
export interface MySwapsData {
  sent: SwapRequestItem[];
  received: SwapRequestItem[];
}
```

---

## 4. Zod Validation Schemas

### 4.1 Swap Preference Validation (`SwapPreferenceValidation`)

```typescript
import { z } from "zod";

export const createOrUpdateSwapPreferenceZodSchema = z.object({
  apartmentId: z.string().optional(),
  isEnabled: z.boolean().optional(),
  city: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  rooms: z.coerce.number().int().optional().nullable(),
  beds: z.coerce.number().int().optional().nullable(),
  weekend: z.string().optional().nullable(),
  whatsApp: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
});
```

### 4.2 Swap Request Validation (`SwapValidation`)

```typescript
import { z } from "zod";
import { SwapStatus } from "@prisma/client";

export const createSwapRequestZodSchema = z.object({
  toAppId: z.string().min(1, "Target apartment ID (toAppId) is required"),
  fromAppId: z.string().optional(),
});

export const updateSwapStatusZodSchema = z.object({
  status: z.enum([SwapStatus.PENDING, SwapStatus.APPROVED, SwapStatus.REJECTED]),
});
```

---

## 5. Endpoints: Swap Preference Module (`/api/v1/swap-preference`)

### 5.1 Save / Update Swap Preference & Toggle Swap
Creates or updates the authenticated user's swap settings and toggles swap mode.

- **Method**: `POST`
- **Path**: `/api/v1/swap-preference`
- **Authentication**: Required (`Bearer <token>`)

#### Request Body
```json
{
  "apartmentId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
  "isEnabled": true,
  "city": "Jerusalem",
  "neighborhood": "Rehavia",
  "rooms": 4,
  "beds": 3,
  "weekend": "2026-09-25",
  "whatsApp": "+972501234567",
  "email": "host@example.com"
}
```

#### Field Rules:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `apartmentId` | `string` | Optional | Target apartment ID. If omitted, defaults to the user's apartment. |
| `isEnabled` | `boolean` | Optional | `true` to enable swap, `false` to disable. Defaults to `true` on creation. |
| `city` | `string \| null` | Optional | Desired swap destination city. |
| `neighborhood` | `string \| null` | Optional | Desired swap neighborhood. |
| `rooms` | `number \| null` | Optional | Desired minimum bedrooms. |
| `beds` | `number \| null` | Optional | Desired minimum beds / bathrooms. |
| `weekend` | `string \| null` | Optional | Target Shabbat date (e.g. `"2026-09-25"` or ISO format). Must exist in `WeekendCalendar`. |
| `whatsApp` | `string \| null` | Optional | Contact WhatsApp phone number. |
| `email` | `string \| null` | Optional | Contact email address. |

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Swap preference saved successfully",
  "data": {
    "id": "7fa6b12a-89a1-432a-bc91-23d87a4efb31",
    "apartmentId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
    "isEnabled": true,
    "city": "Jerusalem",
    "neighborhood": "Rehavia",
    "rooms": 4,
    "beds": 3,
    "weekend": "2026-09-25T00:00:00.000Z",
    "whatsApp": "+972501234567",
    "email": "host@example.com",
    "createdAt": "2026-09-19T10:00:00.000Z",
    "updatedAt": "2026-09-19T10:00:00.000Z",
    "weekendCalendar": {
      "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
      "title": "Parashat Nitzavim-Vayeilech",
      "date": "2026-09-25T00:00:00.000Z"
    },
    "apartment": {
      "id": "0e95c102-cf32-4786-8a07-ff360b9435f3",
      "title": "Charming 3BR in Baka",
      "city": "Jerusalem",
      "neighborhood": "Baka",
      "coverImage": "https://res.cloudinary.com/.../apt1.jpg",
      "phoneNumber": "+972501234567",
      "whatsApp": "+972501234567",
      "phone": true,
      "whatsapp": true,
      "email": true,
      "user": {
        "id": "user-uuid-1",
        "username": "david_cohen",
        "email": "david@example.com",
        "phone": "+972501234567",
        "profileImage": "https://res.cloudinary.com/.../profile.jpg"
      }
    }
  }
}
```

---

### 5.2 Get My Swap Preference
Retrieves the logged-in user's active swap configuration and apartment details.

- **Method**: `GET`
- **Path**: `/api/v1/swap-preference/my-preference`
- **Authentication**: Required (`Bearer <token>`)

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Swap preference retrieved successfully",
  "data": {
    "id": "7fa6b12a-89a1-432a-bc91-23d87a4efb31",
    "apartmentId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
    "isEnabled": true,
    "city": "Jerusalem",
    "neighborhood": "Rehavia",
    "rooms": 4,
    "beds": 3,
    "weekend": "2026-09-25T00:00:00.000Z",
    "whatsApp": "+972501234567",
    "email": "host@example.com",
    "createdAt": "2026-09-19T10:00:00.000Z",
    "updatedAt": "2026-09-19T10:00:00.000Z",
    "weekendCalendar": {
      "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
      "title": "Parashat Nitzavim-Vayeilech",
      "date": "2026-09-25T00:00:00.000Z"
    },
    "apartment": {
      "id": "0e95c102-cf32-4786-8a07-ff360b9435f3",
      "title": "Charming 3BR in Baka",
      "city": "Jerusalem",
      "neighborhood": "Baka",
      "coverImage": "https://res.cloudinary.com/.../apt1.jpg",
      "bedrooms": 3,
      "bathrooms": 2,
      "maxGuest": 6,
      "lat": 31.7583,
      "lng": 35.2185
    }
  }
}
```

---

### 5.3 Get Matched Swappable Properties (Main Matching Engine)
Performs scoring and ranking against all swappable properties based on user preference and live query overrides.

- **Method**: `GET`
- **Path**: `/api/v1/swap-preference/matched-swaps`
- **Authentication**: Required (`Bearer <token>`)

#### Query Parameters:
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `city` | `string` | Optional | Override destination city (e.g. `Jerusalem`) |
| `neighborhood` | `string` | Optional | Override neighborhood (e.g. `Rehavia`) |
| `rooms` / `minBedrooms` | `number` | Optional | Override minimum bedrooms needed |
| `beds` / `minBeds` | `number` | Optional | Override minimum beds / bathrooms needed |
| `weekend` | `string` | Optional | Override Shabbat date (`YYYY-MM-DD`) |
| `targetDestination` / `searchTerm` | `string` | Optional | Text search matching title, description, address, propertyId |
| `destLat` | `number` | Optional | Latitude of point of interest (for walking distance calculation) |
| `destLng` | `number` | Optional | Longitude of point of interest (for walking distance calculation) |
| `walkingMinutes` | `number` | Optional | Maximum walking minutes filter from destination point |
| `page` | `number` | Optional | Page number (default: `1`) |
| `limit` | `number` | Optional | Page size (default: `10`) |
| `sortBy` | `string` | Optional | Field to sort by |
| `sortOrder` | `asc \| desc` | Optional | Sort direction |

#### Example Request:
```http
GET /api/v1/swap-preference/matched-swaps?city=Jerusalem&neighborhood=Rehavia&minBedrooms=4&minBeds=3&destLat=31.7745&destLng=35.2158&walkingMinutes=15&page=1&limit=10
```

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Swappable properties matched by your preference",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3
  },
  "data": {
    "isPreferenceMatched": true,
    "hasPreferenceSet": true,
    "userPreference": {
      "id": "7fa6b12a-89a1-432a-bc91-23d87a4efb31",
      "apartmentId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
      "isEnabled": true,
      "city": "Jerusalem",
      "neighborhood": "Rehavia",
      "rooms": 4,
      "beds": 3,
      "weekend": "2026-09-25T00:00:00.000Z",
      "weekendCalendar": {
        "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
        "title": "Parashat Nitzavim-Vayeilech",
        "date": "2026-09-25T00:00:00.000Z"
      }
    },
    "message": "Swappable properties matched by your preference",
    "data": [
      {
        "id": "pref-uuid-99",
        "apartmentId": "apt-uuid-99",
        "isEnabled": true,
        "city": "Jerusalem",
        "neighborhood": "Rehavia",
        "rooms": 4,
        "beds": 4,
        "weekend": "2026-09-25T00:00:00.000Z",
        "isMatch": true,
        "matchScore": 35,
        "weekendCalendar": {
          "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
          "title": "Parashat Nitzavim-Vayeilech",
          "date": "2026-09-25T00:00:00.000Z"
        },
        "apartment": {
          "id": "apt-uuid-99",
          "propertyId": "CHM-88912",
          "title": "Luxury Penthouse on Ramban St",
          "description": "Spacious penthouse in heart of Rehavia.",
          "city": "Jerusalem",
          "neighborhood": "Rehavia",
          "street1": "Ramban St 14",
          "street2": "Apt 4",
          "lat": 31.7745,
          "lng": 35.2158,
          "neighborhoodLat": 31.7741,
          "neighborhoodLng": 35.215,
          "neighborhoodWalkingMinutes": 2,
          "bedrooms": 5,
          "bathrooms": 3,
          "maxGuest": 10,
          "pricePerShabbat": 1200,
          "coverImage": "https://res.cloudinary.com/.../ramban1.jpg",
          "images": [
            "https://res.cloudinary.com/.../ramban1.jpg",
            "https://res.cloudinary.com/.../ramban2.jpg"
          ],
          "walkingDistanceToNeighborhood": 2,
          "distanceKmToNeighborhood": 0.15,
          "walkingDistanceToDestination": 2,
          "distanceKmToDestination": 0.1,
          "user": {
            "id": "user-uuid-99",
            "username": "shimon_levy",
            "email": "shimon@example.com",
            "phone": "+972529998877",
            "profileImage": "https://res.cloudinary.com/.../shimon.jpg"
          }
        }
      }
    ],
    "matchedProperties": [
      /* All matched items paginated */
    ],
    "matchedMeta": {
      "page": 1,
      "limit": 10,
      "total": 3
    },
    "otherProperties": [
      /* Other properties if not matched or fallback */
    ],
    "otherMeta": {
      "page": 1,
      "limit": 10,
      "total": 0
    }
  }
}
```

---

### 5.4 Get All Swap Preferences (Direct Listing Search)
Returns a paginated list of all active swap preferences with standard filtering and distance computation.

- **Method**: `GET`
- **Path**: `/api/v1/swap-preference/all`
- **Authentication**: Required (`Bearer <token>`)

#### Query Parameters:
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `city` | `string` | Optional | Filter by city |
| `neighborhood` | `string` | Optional | Filter by neighborhood |
| `rooms` / `minBedrooms` | `number` | Optional | Filter by minimum rooms |
| `beds` / `minBeds` | `number` | Optional | Filter by minimum beds / bathrooms |
| `weekend` | `string` | Optional | Filter by weekend date |
| `targetDestination` / `searchTerm` | `string` | Optional | Filter by keyword |
| `isEnabled` | `boolean` | Optional | Default is `true` |
| `destLat` | `number` | Optional | Destination latitude for radius calculation |
| `destLng` | `number` | Optional | Destination longitude for radius calculation |
| `walkingMinutes` | `number` | Optional | Maximum walking minutes from destination coordinates |
| `page` | `number` | Optional | Page number (default: `1`) |
| `limit` | `number` | Optional | Items per page (default: `10`) |
| `sortBy` | `string` | Optional | Sort field (default: `createdAt`) |
| `sortOrder` | `asc \| desc` | Optional | Sort direction (default: `desc`) |

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Swap preferences retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 12
  },
  "data": [
    {
      "id": "pref-uuid-99",
      "apartmentId": "apt-uuid-99",
      "isEnabled": true,
      "city": "Jerusalem",
      "neighborhood": "Rehavia",
      "rooms": 4,
      "beds": 3,
      "weekend": "2026-09-25T00:00:00.000Z",
      "whatsApp": "+972529998877",
      "email": "shimon@example.com",
      "createdAt": "2026-09-19T09:00:00.000Z",
      "updatedAt": "2026-09-19T09:00:00.000Z",
      "weekendCalendar": {
        "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
        "title": "Parashat Nitzavim-Vayeilech",
        "date": "2026-09-25T00:00:00.000Z"
      },
      "apartment": {
        "id": "apt-uuid-99",
        "propertyId": "CHM-88912",
        "title": "Luxury Penthouse on Ramban St",
        "city": "Jerusalem",
        "neighborhood": "Rehavia",
        "bedrooms": 5,
        "bathrooms": 3,
        "maxGuest": 10,
        "coverImage": "https://res.cloudinary.com/.../ramban1.jpg",
        "walkingDistanceToNeighborhood": 2,
        "distanceKmToNeighborhood": 0.15,
        "user": {
          "id": "user-uuid-99",
          "username": "shimon_levy",
          "email": "shimon@example.com",
          "phone": "+972529998877",
          "profileImage": "https://res.cloudinary.com/.../shimon.jpg"
        }
      }
    }
  ]
}
```

---

## 6. Endpoints: Swap Module (`/api/v1/swap`)

### 6.1 Send Swap Request
Proposes a swap between the authenticated user's apartment and the target apartment.

- **Method**: `POST`
- **Path**: `/api/v1/swap/request`
- **Authentication**: Required (`Bearer <token>`)

#### Request Body
```json
{
  "toAppId": "apt-uuid-99",
  "fromAppId": "0e95c102-cf32-4786-8a07-ff360b9435f3"
}
```

#### Field Rules:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `toAppId` | `string` | **Required** | Target apartment ID to swap with. |
| `fromAppId` | `string` | Optional | Requester apartment ID. If omitted, defaults to the user's apartment. |

> **Note**: The swap date is optional. If either apartment has set a weekend in `swapPreference`, it will be associated. If both apartments have selected a weekend, they must match. If neither has selected a weekend, the swap request proceeds with `weekend: null`.

#### Response (`201 Created`)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Swap request sent successfully",
  "data": {
    "id": "swap-req-uuid-101",
    "fromAppId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
    "toAppId": "apt-uuid-99",
    "status": "PENDING",
    "weekend": "2026-09-25T00:00:00.000Z",
    "swapCode": "SWAP-1726829456123-4819",
    "createdAt": "2026-09-19T10:15:00.000Z",
    "updatedAt": "2026-09-19T10:15:00.000Z",
    "weekendCalendar": {
      "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
      "title": "Parashat Nitzavim-Vayeilech",
      "date": "2026-09-25T00:00:00.000Z"
    },
    "fromApartment": {
      "id": "0e95c102-cf32-4786-8a07-ff360b9435f3",
      "propertyId": "CHM-10294",
      "title": "Charming 3BR in Baka",
      "city": "Jerusalem",
      "neighborhood": "Baka",
      "coverImage": "https://res.cloudinary.com/.../apt1.jpg",
      "bedrooms": 3,
      "bathrooms": 2,
      "maxGuest": 6,
      "walkingDistanceToNeighborhood": 5,
      "distanceKmToNeighborhood": 0.4,
      "user": {
        "id": "user-uuid-1",
        "username": "david_cohen",
        "email": "david@example.com",
        "phone": "+972501234567",
        "profileImage": "https://res.cloudinary.com/.../profile.jpg"
      }
    },
    "toApartment": {
      "id": "apt-uuid-99",
      "propertyId": "CHM-88912",
      "title": "Luxury Penthouse on Ramban St",
      "city": "Jerusalem",
      "neighborhood": "Rehavia",
      "coverImage": "https://res.cloudinary.com/.../ramban1.jpg",
      "bedrooms": 5,
      "bathrooms": 3,
      "maxGuest": 10,
      "walkingDistanceToNeighborhood": 2,
      "distanceKmToNeighborhood": 0.15,
      "user": {
        "id": "user-uuid-99",
        "username": "shimon_levy",
        "email": "shimon@example.com",
        "phone": "+972529998877",
        "profileImage": "https://res.cloudinary.com/.../shimon.jpg"
      }
    },
    "payments": []
  }
}
```

---

### 6.2 Get My Swaps (Sent & Received)
Retrieves all sent and received swap requests organized in two separate arrays.

- **Method**: `GET`
- **Path**: `/api/v1/swap/my-swaps`
- **Authentication**: Required (`Bearer <token>`)

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User swap requests retrieved successfully",
  "data": {
    "sent": [
      {
        "id": "swap-req-uuid-101",
        "fromAppId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
        "toAppId": "apt-uuid-99",
        "status": "PENDING",
        "weekend": "2026-09-25T00:00:00.000Z",
        "swapCode": "SWAP-1726829456123-4819",
        "createdAt": "2026-09-19T10:15:00.000Z",
        "updatedAt": "2026-09-19T10:15:00.000Z",
        "weekendCalendar": {
          "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
          "title": "Parashat Nitzavim-Vayeilech",
          "date": "2026-09-25T00:00:00.000Z"
        },
        "fromApartment": {
          "id": "0e95c102-cf32-4786-8a07-ff360b9435f3",
          "title": "Charming 3BR in Baka",
          "city": "Jerusalem",
          "neighborhood": "Baka",
          "coverImage": "https://res.cloudinary.com/.../apt1.jpg",
          "user": {
            "id": "user-uuid-1",
            "username": "david_cohen",
            "email": "david@example.com"
          }
        },
        "toApartment": {
          "id": "apt-uuid-99",
          "title": "Luxury Penthouse on Ramban St",
          "city": "Jerusalem",
          "neighborhood": "Rehavia",
          "coverImage": "https://res.cloudinary.com/.../ramban1.jpg",
          "user": {
            "id": "user-uuid-99",
            "username": "shimon_levy",
            "email": "shimon@example.com"
          }
        },
        "payments": []
      }
    ],
    "received": [
      {
        "id": "swap-req-uuid-202",
        "fromAppId": "apt-uuid-88",
        "toAppId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
        "status": "PENDING",
        "weekend": "2026-09-25T00:00:00.000Z",
        "swapCode": "SWAP-1726829456999-1234",
        "createdAt": "2026-09-19T11:00:00.000Z",
        "updatedAt": "2026-09-19T11:00:00.000Z",
        "weekendCalendar": {
          "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
          "title": "Parashat Nitzavim-Vayeilech",
          "date": "2026-09-25T00:00:00.000Z"
        },
        "fromApartment": {
          "id": "apt-uuid-88",
          "title": "Modern Flat in Talbiyeh",
          "city": "Jerusalem",
          "neighborhood": "Talbiyeh",
          "coverImage": "https://res.cloudinary.com/.../tal1.jpg",
          "user": {
            "id": "user-uuid-88",
            "username": "rachel_k",
            "email": "rachel@example.com"
          }
        },
        "toApartment": {
          "id": "0e95c102-cf32-4786-8a07-ff360b9435f3",
          "title": "Charming 3BR in Baka",
          "city": "Jerusalem",
          "neighborhood": "Baka",
          "coverImage": "https://res.cloudinary.com/.../apt1.jpg",
          "user": {
            "id": "user-uuid-1",
            "username": "david_cohen",
            "email": "david@example.com"
          }
        },
        "payments": []
      }
    ]
  }
}
```

---

### 6.3 Update Swap Request Status (Accept / Reject)
Accepts or rejects an incoming swap request. Only the recipient user (`toApartment.userId`) can perform this action.

- **Method**: `PATCH`
- **Path**: `/api/v1/swap/status/:id`
- **Authentication**: Required (`Bearer <token>`)

#### Path Parameters:
- `id` (`string`, required): Swap request ID.

#### Request Body
```json
{
  "status": "APPROVED"
}
```
*(Allowed values: `"PENDING"`, `"APPROVED"`, `"REJECTED"`)*

#### Side Effects on `"APPROVED"`:
1. Deletes availability record for that weekend from `ApartmentAvailability` for **both** apartments.
2. Sets `isEnabled: false` and `weekend: null` in `SwapPreference` for **both** apartments.
3. Invalidates Redis cache `apartment:*`.
4. Sends automated push notifications to both users.

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Swap request approved successfully",
  "data": {
    "id": "swap-req-uuid-101",
    "fromAppId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
    "toAppId": "apt-uuid-99",
    "status": "APPROVED",
    "weekend": "2026-09-25T00:00:00.000Z",
    "swapCode": "SWAP-1726829456123-4819",
    "createdAt": "2026-09-19T10:15:00.000Z",
    "updatedAt": "2026-09-19T10:30:00.000Z",
    "weekendCalendar": {
      "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
      "title": "Parashat Nitzavim-Vayeilech",
      "date": "2026-09-25T00:00:00.000Z"
    },
    "fromApartment": {
      "id": "0e95c102-cf32-4786-8a07-ff360b9435f3",
      "title": "Charming 3BR in Baka",
      "city": "Jerusalem",
      "neighborhood": "Baka"
    },
    "toApartment": {
      "id": "apt-uuid-99",
      "title": "Luxury Penthouse on Ramban St",
      "city": "Jerusalem",
      "neighborhood": "Rehavia"
    },
    "payments": []
  }
}
```

---

### 6.4 Admin: Get All Swaps
Retrieves a paginated list of all swap requests platform-wide.

- **Method**: `GET`
- **Path**: `/api/v1/swap/admin/all`
- **Authentication**: Required (`SUPER_ADMIN` role, `Bearer <token>`)

#### Query Parameters:
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | `SwapStatus` | Optional | Filter by status (`PENDING`, `APPROVED`, `REJECTED`) |
| `searchTerm` | `string` | Optional | Search by `swapCode`, `fromApartment.title`, `toApartment.title`, or `city` |
| `city` | `string` | Optional | Filter by city (matches either `from` or `to` apartment) |
| `neighborhood` | `string` | Optional | Filter by neighborhood (matches either `from` or `to` apartment) |
| `destLat` | `number` | Optional | Latitude for walking distance calculation |
| `destLng` | `number` | Optional | Longitude for walking distance calculation |
| `walkingMinutes` | `number` | Optional | Max walking minutes radius from coordinates |
| `page` | `number` | Optional | Page number (default: `1`) |
| `limit` | `number` | Optional | Items per page (default: `10`) |
| `sortBy` | `string` | Optional | Sort field (default: `createdAt`) |
| `sortOrder` | `asc \| desc` | Optional | Sort direction (default: `desc`) |

#### Example Request:
```http
GET /api/v1/swap/admin/all?status=PENDING&page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "All swap requests retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45
  },
  "data": [
    {
      "id": "swap-req-uuid-101",
      "fromAppId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
      "toAppId": "apt-uuid-99",
      "status": "PENDING",
      "weekend": "2026-09-25T00:00:00.000Z",
      "swapCode": "SWAP-1726829456123-4819",
      "createdAt": "2026-09-19T10:15:00.000Z",
      "updatedAt": "2026-09-19T10:15:00.000Z",
      "weekendCalendar": {
        "id": "c1f76b12-9901-4672-bd88-5188ef77a012",
        "title": "Parashat Nitzavim-Vayeilech",
        "date": "2026-09-25T00:00:00.000Z"
      },
      "fromApartment": {
        "id": "0e95c102-cf32-4786-8a07-ff360b9435f3",
        "propertyId": "CHM-10294",
        "title": "Charming 3BR in Baka",
        "city": "Jerusalem",
        "neighborhood": "Baka",
        "street1": "Derech Beit Lehem 45",
        "lat": 31.7583,
        "lng": 35.2185,
        "bedrooms": 3,
        "bathrooms": 2,
        "maxGuest": 6,
        "pricePerShabbat": 950,
        "coverImage": "https://res.cloudinary.com/.../apt1.jpg",
        "user": {
          "id": "user-uuid-1",
          "username": "david_cohen",
          "email": "david@example.com",
          "phone": "+972501234567",
          "profileImage": "https://res.cloudinary.com/.../profile.jpg"
        }
      },
      "toApartment": {
        "id": "apt-uuid-99",
        "propertyId": "CHM-88912",
        "title": "Luxury Penthouse on Ramban St",
        "city": "Jerusalem",
        "neighborhood": "Rehavia",
        "street1": "Ramban St 14",
        "lat": 31.7745,
        "lng": 35.2158,
        "bedrooms": 5,
        "bathrooms": 3,
        "maxGuest": 10,
        "pricePerShabbat": 1200,
        "coverImage": "https://res.cloudinary.com/.../ramban1.jpg",
        "user": {
          "id": "user-uuid-99",
          "username": "shimon_levy",
          "email": "shimon@example.com",
          "phone": "+972529998877",
          "profileImage": "https://res.cloudinary.com/.../shimon.jpg"
        }
      },
      "payments": []
    }
  ]
}
```

---

### 6.5 Admin: Update Any Swap Status
Allows super administrators to override and update the status of any swap request.

- **Method**: `PATCH`
- **Path**: `/api/v1/swap/admin/status/:id`
- **Authentication**: Required (`SUPER_ADMIN` role, `Bearer <token>`)

#### Request Body
```json
{
  "status": "APPROVED"
}
```
*(Allowed values: `"PENDING"`, `"APPROVED"`, `"REJECTED"`)*

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Swap request status updated to APPROVED successfully",
  "data": {
    "id": "swap-req-uuid-101",
    "fromAppId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
    "toAppId": "apt-uuid-99",
    "status": "APPROVED",
    "swapCode": "SWAP-1726829456123-4819",
    "updatedAt": "2026-09-19T10:45:00.000Z"
  }
}
```

---

## 7. Leaflet Map Walking Distance Data Flow

### 7.1 Coordinate Fields Available in Apartment Responses
| Field | Type | Description |
| :--- | :--- | :--- |
| `lat` | `number \| null` | Apartment latitude coordinate |
| `lng` | `number \| null` | Apartment longitude coordinate |
| `neighborhoodLat` | `number \| null` | Neighborhood center latitude |
| `neighborhoodLng` | `number \| null` | Neighborhood center longitude |
| `neighborhoodWalkingMinutes` | `number \| null` | Stored walking time to neighborhood center |
| `walkingDistanceToNeighborhood` | `number \| null` | Computed walking minutes to neighborhood center |
| `distanceKmToNeighborhood` | `number \| null` | Computed direct/walking distance in km to neighborhood |
| `walkingDistanceToDestination` | `number \| null` | Computed walking minutes when `destLat` & `destLng` are supplied |
| `distanceKmToDestination` | `number \| null` | Computed distance in km when `destLat` & `destLng` are supplied |

### 7.2 UI Walking Route Polylines
When users select a destination point on the UI map:
1. Pass `destLat` and `destLng` to `/matched-swaps` to get backend-computed walking minutes & distances.
2. In Leaflet, render the apartment marker at `[apartment.lat, apartment.lng]` and the target point at `[destLat, destLng]`.
3. Fetch walking route geometries from OSRM:
   ```
   https://router.project-osrm.org/route/v1/walking/{apartment.lng},{apartment.lat};{destLng},{destLat}?overview=full&geometries=geojson
   ```
4. Render the polyline coordinates on the Leaflet map overlay.

---

## 8. Common Error Codes & Troubleshooting

| HTTP Status | Error Message | Solution / Action |
| :--- | :--- | :--- |
| `401 Unauthorized` | `You are not authorized!` | Pass a valid JWT `Bearer <token>` in the `Authorization` header. |
| `403 Forbidden` | `You must list an apartment and turn on your swap preference before you can view swappable properties` | Direct user to create an apartment listing and toggle swap preference ON. |
| `403 Forbidden` | `You must enable swap on your apartment before sending a swap request` | User must toggle `isEnabled: true` in their swap preference. |
| `403 Forbidden` | `Only the recipient of the swap request can update its status` | Only the owner of `toApartment` can accept/reject the swap request. |
| `400 Bad Request` | `You must select a weekend in your swap preference before sending a swap request` | Set a valid Shabbat weekend date on your swap preference first. |
| `400 Bad Request` | `The target apartment has not enabled swap` / `The target apartment has not selected an active swap weekend` | The recipient must have active swap mode and weekend enabled. |
| `400 Bad Request` | `Cannot swap: Both apartments must have selected the exact same weekend for swap` | Both apartments' `swapPreference.weekend` must match the exact same date. |
| `400 Bad Request` | `Target apartment city (...) does not match your preferred city (...)` | Requester's city preference is incompatible with target apartment. |
| `400 Bad Request` | `The selected weekend date does not exist in the Weekend Calendar` | Pick a date that exists in the platform's `WeekendCalendar` database. |
| `404 Not Found` | `You have not listed an apartment yet` | User needs to list an apartment first. |
| `404 Not Found` | `No swap preference found for your apartment` | User must save a swap preference via `POST /swap-preference`. |
| `404 Not Found` | `Swap request not found` | Invalid or non-existent swap ID. |
| `409 Conflict` | `A pending swap request already exists for this apartment` | A pending proposal already exists between these two apartments. |
