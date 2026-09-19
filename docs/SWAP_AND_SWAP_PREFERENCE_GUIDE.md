# Swap & Swap Preference System: Next.js & Leaflet Integration Guide

This guide documents the API endpoints, query parameters, request bodies, populated JSON responses, and frontend integration workflow for **Apartment Swap**, **Swap Preferences**, **Swap Search & Matching**, and the **Leaflet Map Walking Distance Calculator**.

---

## 1. System Overview & Core Business Rules

1. **Listing & Swap Requirement**:
   - To access swappable listings or perform a swap search, a user **must** have listed at least one apartment and turned on their **Swap Preference** (`isEnabled: true`) with a selected Shabbat weekend from the `WeekendCalendar`.
2. **Matching & Scoring**:
   - `GET /api/v1/swap-preference/matched-swaps` ranks swappable apartments based on compatibility with the user's desired destination:
     - **Weekend availability match**: `+15 pts`
     - **Destination city match**: `+10 pts`
     - **Neighborhood match**: `+5 pts`
     - **Min bedrooms match**: `+3 pts`
     - **Min beds/guests match**: `+2 pts`
3. **Live Search Overrides**:
   - The UI search bar (City, Neighborhood, Target Destination, Desired Weekend, Min Bedrooms, Min Beds, Max Walking Distance) can pass query parameters to `GET /api/v1/swap-preference/matched-swaps` to dynamically filter results without having to overwrite the user's permanent saved preferences.
4. **Map View & Walking Distance Calculator (Leaflet)**:
   - Backend provides apartment coordinates (`lat`, `lng`), neighborhood coordinates (`neighborhoodLat`, `neighborhoodLng`), and computed distance metrics:
     - `walkingDistanceToNeighborhood` (in minutes)
     - `distanceKmToNeighborhood` (in km)
     - `walkingDistanceToDestination` (in minutes, when `destLat`/`destLng` are supplied)
     - `distanceKmToDestination` (in km, when `destLat`/`destLng` are supplied)
   - Frontend renders the interactive Leaflet map, marker pins, and walking route polylines (via OSRM / Leaflet Routing Machine).

---

## 2. Base Configuration & Headers

```http
Base URL: http://10.10.26.200:8000/api/v1
Content-Type: application/json
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

## 3. TypeScript Interfaces

```typescript
export type SwapStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";

export interface WeekendCalendar {
  id: string;
  title: string; // e.g. "Parashat Vayechi"
  date: string;  // ISO string: "2026-09-25T00:00:00.000Z"
}

export interface SwapPreference {
  id: string;
  apartmentId: string;
  isEnabled: boolean;
  city?: string | null;
  neighborhood?: string | null;
  rooms?: number | null; // Desired minimum bedrooms
  beds?: number | null;  // Desired minimum beds
  weekend?: string | null;
  whatsApp?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
  weekendCalendar?: WeekendCalendar | null;
}

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
  walkingDistanceToNeighborhood?: number | null; // in minutes
  distanceKmToNeighborhood?: number | null;      // in km (e.g. 0.4)
  walkingDistanceToDestination?: number | null;  // in minutes (when destLat/destLng provided)
  distanceKmToDestination?: number | null;       // in km (e.g. 0.1)
  user: {
    id: string;
    username: string;
    email: string;
    phone?: string | null;
    profileImage?: string | null;
  };
}

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

export interface MatchedSwapsResponse {
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
}
```

---

## 4. Endpoints Specification

### 4.1 Save / Update Swap Preferences & Toggle Swap
Save or toggle swap mode and set target preferences (Destination City, Neighborhood, Min Bedrooms, Min Beds, Desired Weekend, Contact WhatsApp/Email).

- **Route**: `/api/v1/swap-preference`
- **Method**: `POST`
- **Auth**: Required (`Bearer <token>`)

#### Request Body
```json
{
  "apartmentId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
  "isEnabled": true,
  "city": "Jerusalem",
  "neighborhood": "Rehavia",
  "rooms": 5,
  "beds": 2,
  "weekend": "2026-09-25",
  "whatsApp": "+972501234567",
  "email": "host@example.com"
}
```

#### Success Response (`200 OK`)
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
    "rooms": 5,
    "beds": 2,
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

### 4.2 Get My Swap Preference
Fetches the logged-in user's active swap configuration and apartment information.

- **Route**: `/api/v1/swap-preference/my-preference`
- **Method**: `GET`
- **Auth**: Required (`Bearer <token>`)

#### Success Response (`200 OK`)
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
    "rooms": 5,
    "beds": 2,
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

### 4.3 Search & Matched Swappable Listings (Primary Swap Search)
Performs matching against other swappable apartments. Supports live filter queries from the UI form, coordinates for distance calculation, and destination keyword matching.

- **Route**: `/api/v1/swap-preference/matched-swaps`
- **Method**: `GET`
- **Auth**: Required (`Bearer <token>`)

#### Available Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `city` | `string` | Optional | Destination city (e.g. `Jerusalem`) |
| `neighborhood` | `string` | Optional | Neighborhood name (e.g. `Rehavia`) |
| `targetDestination` | `string` | Optional | Landmark, specific address, or apartment title |
| `weekend` | `string` | Optional | Desired Shabbat weekend (`YYYY-MM-DD`) |
| `rooms` / `minBedrooms` | `number` | Optional | Minimum bedrooms (e.g. `5`) |
| `beds` / `minBeds` | `number` | Optional | Minimum beds needed (e.g. `2`) |
| `destLat` | `number` | Optional | Latitude of target destination point |
| `destLng` | `number` | Optional | Longitude of target destination point |
| `walkingMinutes` | `number` | Optional | Maximum walking minutes radius |
| `page` | `number` | Optional | Pagination page number (default: `1`) |
| `limit` | `number` | Optional | Items per page (default: `10`) |
| `sortBy` | `string` | Optional | Sort field (default: `createdAt`) |
| `sortOrder` | `asc` \| `desc` | Optional | Sort direction (default: `desc`) |

#### Example Request URL
```http
GET /api/v1/swap-preference/matched-swaps?city=Jerusalem&neighborhood=Rehavia&minBedrooms=5&minBeds=2&destLat=31.7767&destLng=35.2162&walkingMinutes=15&page=1&limit=10
```

#### Success Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Swappable properties matched by your preference",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 13
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
      "rooms": 5,
      "beds": 2,
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
        "rooms": 5,
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
          "description": "Spacious penthouse in heart of Rehavia, steps from Great Synagogue.",
          "city": "Jerusalem",
          "neighborhood": "Rehavia",
          "street1": "Ramban St 14",
          "street2": "Apt 4",
          "lat": 31.7745,
          "lng": 35.2158,
          "neighborhoodLat": 31.7741,
          "neighborhoodLng": 31.2150,
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
    "matchedProperties": [ /* matched items */ ],
    "matchedMeta": { "page": 1, "limit": 10, "total": 13 },
    "otherProperties": [ /* fallback items */ ],
    "otherMeta": { "page": 1, "limit": 10, "total": 0 }
  }
}
```

---

### 4.4 Send Swap Request
Sends an official swap proposal from the logged-in user's apartment to the target apartment for a specific weekend.

- **Route**: `/api/v1/swap/request`
- **Method**: `POST`
- **Auth**: Required (`Bearer <token>`)

#### Request Body
```json
{
  "fromAppId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
  "toAppId": "apt-uuid-99",
  "weekend": "2026-09-25"
}
```

#### Success Response (`201 Created`)
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
    "swapCode": "SWAP-89102",
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
      "coverImage": "https://res.cloudinary.com/.../apt1.jpg"
    },
    "toApartment": {
      "id": "apt-uuid-99",
      "title": "Luxury Penthouse on Ramban St",
      "city": "Jerusalem",
      "neighborhood": "Rehavia",
      "coverImage": "https://res.cloudinary.com/.../ramban1.jpg"
    }
  }
}
```

---

### 4.5 Get My Swaps (Sent & Received)
Fetches all swap proposals where the user's apartment is either the requester (`fromApartment`) or the recipient (`toApartment`).

- **Route**: `/api/v1/swap/my-swaps`
- **Method**: `GET`
- **Auth**: Required (`Bearer <token>`)

#### Available Query Parameters
- `type`: `all` | `sent` | `received` (default: `all`)
- `status`: `PENDING` | `APPROVED` | `REJECTED` | `CANCELLED` | `COMPLETED`
- `destLat`, `destLng`, `walkingMinutes`
- `page`, `limit`, `sortBy`, `sortOrder`

#### Example Request
```http
GET /api/v1/swap/my-swaps?type=all&page=1&limit=10
```

#### Success Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "My swaps retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2
  },
  "data": [
    {
      "id": "swap-req-uuid-101",
      "fromAppId": "0e95c102-cf32-4786-8a07-ff360b9435f3",
      "toAppId": "apt-uuid-99",
      "status": "PENDING",
      "weekend": "2026-09-25T00:00:00.000Z",
      "swapCode": "SWAP-89102",
      "createdAt": "2026-09-19T10:15:00.000Z",
      "updatedAt": "2026-09-19T10:15:00.000Z",
      "weekendCalendar": {
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
      }
    }
  ]
}
```

---

### 4.6 Update Swap Request Status
Accepts, rejects, or cancels a swap request.

- **Route**: `/api/v1/swap/status/:id`
- **Method**: `PATCH`
- **Auth**: Required (`Bearer <token>`)

#### Request Body
```json
{
  "status": "APPROVED"
}
```
*(Options: `"APPROVED"`, `"REJECTED"`, `"CANCELLED"`)*

#### Success Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Swap request updated successfully",
  "data": {
    "id": "swap-req-uuid-101",
    "status": "APPROVED",
    "swapCode": "SWAP-89102",
    "updatedAt": "2026-09-19T10:30:00.000Z"
  }
}
```

---

### 4.7 Admin: Get All Swap Requests (Filtering by Status & Pagination)
Retrieves a paginated list of all swap requests across the platform with full apartment details, status filtering, search term, and optional location/distance filtering.

- **Route**: `/api/v1/swap/admin/all`
- **Method**: `GET`
- **Auth**: Required (`SUPER_ADMIN` role required, `Bearer <token>`)

#### Available Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | `SwapStatus` | Optional | Filter by status (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`) |
| `searchTerm` | `string` | Optional | Search by `swapCode`, `fromApartment.title`, `toApartment.title`, or `city` |
| `city` | `string` | Optional | Filter by city (matches either `fromApartment` or `toApartment`) |
| `neighborhood` | `string` | Optional | Filter by neighborhood (matches either `fromApartment` or `toApartment`) |
| `destLat` | `number` | Optional | Latitude of target point for walking distance calculation |
| `destLng` | `number` | Optional | Longitude of target point for walking distance calculation |
| `walkingMinutes` | `number` | Optional | Max walking minutes radius from destination coordinates |
| `page` | `number` | Optional | Page number (default: `1`) |
| `limit` | `number` | Optional | Items per page (default: `10`) |
| `sortBy` | `string` | Optional | Sort field (default: `createdAt`) |
| `sortOrder` | `asc` \| `desc` | Optional | Sort order (default: `desc`) |

#### Example Request URLs
```http
# 1. Filter by Status only
GET /api/v1/swap/admin/all?status=PENDING&page=1&limit=10

# 2. Filter by Status + Search Term + Pagination
GET /api/v1/swap/admin/all?status=APPROVED&searchTerm=SWAP-89102&page=1&limit=20&sortBy=createdAt&sortOrder=desc

# 3. Filter by Status + City
GET /api/v1/swap/admin/all?status=PENDING&city=Jerusalem&page=1&limit=10
```

#### Success Response (`200 OK`)
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
      "swapCode": "SWAP-89102",
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
        "description": "Lovely ground floor apartment in quiet Baka neighborhood.",
        "city": "Jerusalem",
        "neighborhood": "Baka",
        "street1": "Derech Beit Lehem 45",
        "lat": 31.7583,
        "lng": 35.2185,
        "neighborhoodWalkingMinutes": 5,
        "bedrooms": 3,
        "bathrooms": 2,
        "maxGuest": 6,
        "pricePerShabbat": 950,
        "coverImage": "https://res.cloudinary.com/.../apt1.jpg",
        "images": ["https://res.cloudinary.com/.../apt1.jpg"],
        "phoneNumber": "+972501234567",
        "whatsApp": "+972501234567",
        "phone": true,
        "whatsapp": true,
        "email": true,
        "unavailable": false,
        "receiveRequestWhenUnavailable": false,
        "isActive": true,
        "status": "APPROVED",
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
        "description": "Spacious penthouse in heart of Rehavia.",
        "city": "Jerusalem",
        "neighborhood": "Rehavia",
        "street1": "Ramban St 14",
        "lat": 31.7745,
        "lng": 35.2158,
        "neighborhoodWalkingMinutes": 2,
        "bedrooms": 5,
        "bathrooms": 3,
        "maxGuest": 10,
        "pricePerShabbat": 1200,
        "coverImage": "https://res.cloudinary.com/.../ramban1.jpg",
        "images": ["https://res.cloudinary.com/.../ramban1.jpg"],
        "phoneNumber": "+972529998877",
        "whatsApp": "+972529998877",
        "phone": true,
        "whatsapp": true,
        "email": true,
        "unavailable": false,
        "receiveRequestWhenUnavailable": false,
        "isActive": true,
        "status": "APPROVED",
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
  ]
}
```

---

### 4.8 Admin: Update Any Swap Request Status
Allows super administrators to override and update the status of any swap request.

- **Route**: `/api/v1/swap/admin/status/:id`
- **Method**: `PATCH`
- **Auth**: Required (`SUPER_ADMIN` role required, `Bearer <token>`)

#### Request Body
```json
{
  "status": "APPROVED"
}
```
*(Options: `"PENDING"`, `"APPROVED"`, `"REJECTED"`, `"CANCELLED"`, `"COMPLETED"`)*

#### Success Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Swap request status updated to APPROVED successfully",
  "data": {
    "id": "swap-req-uuid-101",
    "status": "APPROVED",
    "swapCode": "SWAP-89102",
    "updatedAt": "2026-09-19T10:45:00.000Z"
  }
}
```


---

## 5. Leaflet Map & Walking Distance Calculator Integration

### 5.1 Map Data Flow & Coordinates
When rendering an apartment card or map view:
1. **Apartment Pin**: Render a marker at `[apartment.lat, apartment.lng]`.
2. **Target Destination Pin**: If user types a target destination (e.g., Shul, Kotel, Great Synagogue) and it is geocoded to `[destLat, destLng]`, render a second pin at `[destLat, destLng]`.
3. **Display Stats**:
   - **Walking Time**: `apartment.walkingDistanceToDestination ?? apartment.walkingDistanceToNeighborhood` (e.g. `2 Minutes`)
   - **Distance**: `apartment.distanceKmToDestination ?? apartment.distanceKmToNeighborhood` (e.g. `0.1 km`)

### 5.2 Fetching Walking Route Polylines for Leaflet
To draw the walking route path between the apartment and target destination, query the Open Source Routing Machine (OSRM) walking profile from frontend:

```typescript
// Example OSRM Walking Route Fetcher in Next.js:
export async function getWalkingRouteCoordinates(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/walking/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.routes && data.routes.length > 0) {
    // GeoJSON coordinates are [lng, lat], map to Leaflet [lat, lng]
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  }
  
  return [];
}
```

In Leaflet JSX:
```tsx
<MapContainer center={[apartment.lat, apartment.lng]} zoom={16}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  
  {/* Apartment Pin */}
  <Marker position={[apartment.lat, apartment.lng]} icon={apartmentIcon}>
    <Popup>{apartment.title}</Popup>
  </Marker>
  
  {/* Target Destination Pin */}
  {destCoords && (
    <Marker position={[destCoords.lat, destCoords.lng]} icon={targetIcon}>
      <Popup>{targetName}</Popup>
    </Marker>
  )}
  
  {/* Walking Route Polyline */}
  {routeCoordinates.length > 0 && (
    <Polyline
      positions={routeCoordinates}
      pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.8, dashArray: "1, 8" }}
    />
  )}
</MapContainer>
```

---

## 6. Error Codes & Handling Summary

| Status Code | Error Message | Action / Remedy |
| :--- | :--- | :--- |
| `401 Unauthorized` | `You are not authorized` | User must log in and pass a valid Bearer token. |
| `403 Forbidden` | `You must list an apartment and turn on your swap preference before you can view swappable properties` | Redirect user to list an apartment and toggle swap preference ON. |
| `400 Bad Request` | `You must select a weekend in your swap preference...` | Prompt user to choose a valid Shabbat weekend from the Weekend Calendar. |
| `400 Bad Request` | `The selected weekend date does not exist in the Weekend Calendar` | Ensure the weekend date string matches an existing record in `WeekendCalendar`. |
| `404 Not Found` | `No swap preference found for your apartment` | User has not created a swap preference record yet. Prompt to create one via `POST /swap-preference`. |
