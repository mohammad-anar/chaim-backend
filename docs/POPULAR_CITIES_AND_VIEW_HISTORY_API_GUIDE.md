# Popular Cities & Apartment View History API Guide (Next.js Frontend)

This guide provides everything needed to integrate the **Popular Cities** and **Recently Viewed Apartments / Click History** features in a Next.js (App Router / Pages Router) frontend application.

---

## Table of Contents
1. [General Configuration & Headers](#1-general-configuration--headers)
2. [TypeScript Interfaces & Enums](#2-typescript-interfaces--enums)
3. [API Endpoints Summary](#3-api-endpoints-summary)
4. [Endpoint Details & Examples](#4-endpoint-details--examples)
   - [1. Get Popular Cities (`GET /api/v1/apartments/popular-cities`)](#1-get-popular-cities)
   - [2. Record Apartment Click/View (`POST /api/v1/apartments/view-history/:apartmentId`)](#2-record-apartment-clickview)
   - [3. Get Recently Viewed Apartments (`GET /api/v1/apartments/recently-viewed`)](#3-get-recently-viewed-apartments)
   - [4. Clear Browsing History (`DELETE /api/v1/apartments/recently-viewed`)](#4-clear-browsing-history)
5. [Next.js Integration Code Examples](#5-nextjs-integration-code-examples)
   - [API Client Helper (`services/apartmentService.ts`)](#api-client-helper)
   - [Popular Cities Component (`components/PopularCities.tsx`)](#popular-cities-component)
   - [Recently Viewed Component (`components/RecentlyViewed.tsx`)](#recently-viewed-component)

---

## 1. General Configuration & Headers

- **Base URL**: `https://your-api-domain.com/api/v1` or `http://localhost:5000/api/v1`
- **Authenticated Requests**: Include JWT Bearer token in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **Public Requests**: No authorization header required.

---

## 2. TypeScript Interfaces & Enums

Add these TypeScript types to your frontend project (e.g. `@/types/apartment.ts`):

```typescript
// Enums
export enum PropertyType {
  APARTMENT = "APARTMENT",
  HOUSE = "HOUSE",
  VILLA = "VILLA",
  STUDIO = "STUDIO",
  PENTHOUSE = "PENTHOUSE",
  COTTAGE = "COTTAGE",
}

export enum ApartmentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  REJECTED = "REJECTED",
  BLOCKED = "BLOCKED",
}

// Popular City Item
export interface IPopularCity {
  city: string;
  viewCount: number;      // Total clicks/views across apartments in this city
  apartmentCount: number; // Total available/active apartments in this city
  image: string | null;   // Representative cover image
}

// Weekend Availability Item
export interface IWeekendAvailability {
  id: string;
  apartmentId: string;
  weekendId: string;
  isSpecial: boolean;
  specialPrice: number | null;
  weekend: {
    id: string;
    title: string;
    date: string;
  };
}

// Recently Viewed Apartment Item
export interface IRecentlyViewedApartment {
  id: string;
  propertyId: string | null;
  userId: string;
  title: string;
  description: string | null;
  city: string;
  neighborhood: string;
  street1: string | null;
  street2: string | null;
  lat: number | null;
  lng: number | null;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  maxGuest: number;
  pricePerShabbat: number;
  amenities: string[];
  coverImage: string | null;
  images: string[];
  phoneNumber: string | null;
  whatsApp: string | null;
  phone: boolean;
  whatsapp: boolean;
  email: boolean;
  isActive: boolean;
  status: ApartmentStatus;
  viewedAt: string; // ISO date string when viewed by user
  averageRating: number;
  totalReviews: number;
  upcomingAvailability?: {
    isAvailableNextWeekend: boolean;
    isAvailableSecondWeekend: boolean;
    isAvailableNextTwoWeekends: boolean;
    availabilityMessage: string;
    nextWeekend: {
      id: string;
      title: string;
      date: string;
      isAvailable: boolean;
    } | null;
    followingWeekend: {
      id: string;
      title: string;
      date: string;
      isAvailable: boolean;
    } | null;
  };
  user?: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
    profileImage: string | null;
  };
}

// Standard API Response Wrappers
export interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  data: T;
}
```

---

## 3. API Endpoints Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/apartments/popular-cities` | Public | Get top 5 popular cities based on click counts |
| `POST` | `/api/v1/apartments/view-history/:apartmentId` | Authenticated | Record an apartment view/click for the logged-in user |
| `GET` | `/api/v1/apartments/recently-viewed` | Authenticated | Get paginated recently viewed apartments |
| `DELETE` | `/api/v1/apartments/recently-viewed` | Authenticated | Clear user's recently viewed history |

---

## 4. Endpoint Details & Examples

### 1. Get Popular Cities
Retrieves the 5 most popular cities based on apartment click metrics. Includes active listing count and image.

- **URL**: `/api/v1/apartments/popular-cities`
- **Method**: `GET`
- **Query Params**:
  - `limit` *(optional, default: `5`)*: number of cities to fetch
- **Headers**: None required (Public)

#### Request Example:
```http
GET /api/v1/apartments/popular-cities?limit=5 HTTP/1.1
Host: api.example.com
```

#### Response Example (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Popular cities retrieved successfully",
  "data": [
    {
      "city": "Jerusalem",
      "viewCount": 142,
      "apartmentCount": 18,
      "image": "https://example.com/uploads/jerusalem-cover.jpg"
    },
    {
      "city": "Bnei Brak",
      "viewCount": 98,
      "apartmentCount": 12,
      "image": "https://example.com/uploads/bnei-brak-cover.jpg"
    },
    {
      "city": "Tzfat",
      "viewCount": 65,
      "apartmentCount": 9,
      "image": "https://example.com/uploads/tzfat-cover.jpg"
    },
    {
      "city": "Beit Shemesh",
      "viewCount": 42,
      "apartmentCount": 6,
      "image": "https://example.com/uploads/beit-shemesh.jpg"
    },
    {
      "city": "Modi'in Illit",
      "viewCount": 30,
      "apartmentCount": 4,
      "image": "https://example.com/uploads/modiin.jpg"
    }
  ]
}
```

---

### 2. Record Apartment Click/View
Call this endpoint whenever a user clicks on an apartment card or opens an apartment details page.

- **URL**: `/api/v1/apartments/view-history/:apartmentId`
- **Method**: `POST`
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  ```

#### Request Example:
```http
POST /api/v1/apartments/view-history/ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```

#### Response Example (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Apartment view recorded successfully",
  "data": {
    "id": "208703ea-27da-4b77-b3dd-b798cf28d5b2",
    "userId": "5abf21e1-4c9d-4487-a95f-cafe0c3a7afc",
    "apartmentId": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2",
    "createdAt": "2026-09-19T02:57:58.534Z",
    "updatedAt": "2026-09-19T02:57:58.534Z"
  }
}
```

---

### 3. Get Recently Viewed Apartments
Retrieves the list of apartments recently inspected by the authenticated user in reverse chronological order.

- **URL**: `/api/v1/apartments/recently-viewed`
- **Method**: `GET`
- **Query Params**:
  - `page` *(optional, default: `1`)*
  - `limit` *(optional, default: `10`)*
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  ```

#### Request Example:
```http
GET /api/v1/apartments/recently-viewed?page=1&limit=4 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```

#### Response Example (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Recently viewed apartments retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 4,
    "total": 1,
    "totalPage": 1
  },
  "data": [
    {
      "id": "ef51ca5f-48d4-4adc-bc3b-a40372f8f3e2",
      "propertyId": "apart-001",
      "userId": "5abf21e1-4c9d-4487-a95f-cafe0c3a7afc",
      "title": "Beautiful Apartment in Jerusalem",
      "description": "Spacious apartment close to Great Synagogue.",
      "city": "Jerusalem",
      "neighborhood": "Rehavia",
      "street1": "HaPalmach Street",
      "bedrooms": 3,
      "bathrooms": 2,
      "maxGuest": 6,
      "pricePerShabbat": 4500,
      "amenities": ["WiFi", "Air Conditioning", "Kosher Kitchen"],
      "coverImage": "/images/apt-1.jpg",
      "images": ["/images/apt-1.jpg", "/images/apt-2.jpg"],
      "averageRating": 4.8,
      "totalReviews": 12,
      "viewedAt": "2026-09-19T08:57:58.534Z",
      "upcomingAvailability": {
        "isAvailableNextWeekend": true,
        "isAvailableSecondWeekend": false,
        "isAvailableNextTwoWeekends": false,
        "availabilityMessage": "Available for next weekend (Parshat Noach)"
      }
    }
  ]
}
```

---

### 4. Clear Browsing History
Clears all viewed apartment history for the logged-in user.

- **URL**: `/api/v1/apartments/recently-viewed`
- **Method**: `DELETE`
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  ```

#### Request Example:
```http
DELETE /api/v1/apartments/recently-viewed HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```

#### Response Example (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Recently viewed history cleared successfully",
  "data": {
    "message": "Recently viewed history cleared successfully"
  }
}
```

---

## 5. Next.js Integration Code Examples

### API Client Helper
Create `src/services/apartmentHistoryService.ts`:

```typescript
import axios from "axios";
import { IApiResponse, IPopularCity, IRecentlyViewedApartment } from "@/types/apartment";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const getAuthHeaders = (token?: string) => ({
  headers: {
    Authorization: `Bearer ${token || (typeof window !== "undefined" ? localStorage.getItem("accessToken") : "")}`,
  },
});

export const ApartmentHistoryService = {
  // 1. Get Top Popular Cities (Public)
  getPopularCities: async (limit: number = 5): Promise<IPopularCity[]> => {
    const res = await axios.get<IApiResponse<IPopularCity[]>>(
      `${API_BASE_URL}/apartments/popular-cities?limit=${limit}`
    );
    return res.data.data;
  },

  // 2. Track Apartment Click / View (Authenticated)
  trackApartmentView: async (apartmentId: string, token?: string): Promise<void> => {
    try {
      await axios.post(
        `${API_BASE_URL}/apartments/view-history/${apartmentId}`,
        {},
        getAuthHeaders(token)
      );
    } catch (error) {
      console.error("Failed to record view history", error);
    }
  },

  // 3. Get Recently Viewed Apartments (Authenticated)
  getRecentlyViewed: async (
    page: number = 1,
    limit: number = 4,
    token?: string
  ): Promise<IApiResponse<IRecentlyViewedApartment[]>> => {
    const res = await axios.get<IApiResponse<IRecentlyViewedApartment[]>>(
      `${API_BASE_URL}/apartments/recently-viewed?page=${page}&limit=${limit}`,
      getAuthHeaders(token)
    );
    return res.data;
  },

  // 4. Clear Browsing History (Authenticated)
  clearHistory: async (token?: string): Promise<void> => {
    await axios.delete(
      `${API_BASE_URL}/apartments/recently-viewed`,
      getAuthHeaders(token)
    );
  },
};
```

---

### Popular Cities Component
Create `src/components/PopularCities.tsx`:

```tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IPopularCity } from "@/types/apartment";
import { ApartmentHistoryService } from "@/services/apartmentHistoryService";

export default function PopularCities() {
  const [cities, setCities] = useState<IPopularCity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApartmentHistoryService.getPopularCities(5)
      .then((data) => setCities(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-gray-400">Loading popular cities...</div>;
  }

  if (cities.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Popular Cities</h2>
          <p className="text-sm text-gray-500">Explore apartments in the most searched cities</p>
        </div>
        <Link href="/apartments" className="text-sm font-semibold text-blue-600 hover:underline">
          View All Cities
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {cities.map((item) => (
          <Link
            key={item.city}
            href={`/apartments?city=${encodeURIComponent(item.city)}`}
            className="group relative overflow-hidden rounded-xl h-36 bg-gray-100 block shadow-sm hover:shadow-md transition"
          >
            {item.image ? (
              <Image
                src={item.image}
                alt={item.city}
                fill
                className="object-cover group-hover:scale-105 transition duration-300"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-gray-400">
                {item.city}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
              <span className="font-semibold text-sm drop-shadow">{item.city}</span>
              <span className="bg-white/20 backdrop-blur-md text-xs px-2 py-0.5 rounded-full">
                {item.apartmentCount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

---

### Recently Viewed Component
Create `src/components/RecentlyViewed.tsx`:

```tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IRecentlyViewedApartment } from "@/types/apartment";
import { ApartmentHistoryService } from "@/services/apartmentHistoryService";

export default function RecentlyViewed() {
  const [apartments, setApartments] = useState<IRecentlyViewedApartment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentlyViewed = () => {
    setLoading(true);
    ApartmentHistoryService.getRecentlyViewed(1, 4)
      .then((res) => setApartments(res.data))
      .catch(() => setApartments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecentlyViewed();
  }, []);

  const handleClearHistory = async () => {
    try {
      await ApartmentHistoryService.clearHistory();
      setApartments([]);
    } catch (err) {
      console.error("Failed to clear history", err);
    }
  };

  if (loading || apartments.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
            🕒 YOUR BROWSING HISTORY
          </span>
          <h2 className="text-2xl font-bold text-gray-900">Recently Viewed Apartments</h2>
          <p className="text-sm text-gray-500">
            Quickly return to properties you inspected for upcoming Shabbatot.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearHistory}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            Clear History
          </button>
          <Link
            href="/apartments"
            className="text-xs px-4 py-1.5 rounded-lg bg-indigo-900 text-white hover:bg-indigo-800"
          >
            Explore All →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {apartments.map((apt) => (
          <Link
            key={apt.id}
            href={`/apartments/${apt.id}`}
            onClick={() => ApartmentHistoryService.trackApartmentView(apt.id)}
            className="group rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition bg-white flex flex-col"
          >
            <div className="relative h-44 w-full bg-gray-100">
              {apt.coverImage && (
                <Image
                  src={apt.coverImage}
                  alt={apt.title}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
              )}
              <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                • Available
              </span>
            </div>
            <div className="p-4 flex flex-col flex-1 justify-between">
              <div>
                <h3 className="font-bold text-gray-900 line-clamp-1">{apt.title}</h3>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <div>City: <span className="font-semibold text-gray-700">{apt.city}</span></div>
                  <div>Neighborhood: <span className="font-semibold text-gray-700">{apt.neighborhood}</span></div>
                </div>
                <div className="mt-3 text-xs text-gray-400 flex gap-2">
                  <span>🛏️ {apt.bedrooms} Beds</span>
                  <span>🚪 {apt.bedrooms} Rooms</span>
                  <span>👥 {apt.maxGuest} Guests</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-gray-900">
                  ₪{apt.pricePerShabbat} <span className="text-xs font-normal text-gray-500">/ weekend</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```
