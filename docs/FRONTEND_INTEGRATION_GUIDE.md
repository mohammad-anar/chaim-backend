# Next.js Frontend Integration Guide: Apartments by Cities & Browsing History

This documentation provides ready-to-use TypeScript definitions, API endpoints, request/response structures, and Next.js / React components for:
1. **Explore Premium Destinations** (`Available for Tel Aviv`, `Available for Jerusalem`, `Available for Tzfat` sections with `View all N +` counts)
2. **Popular Cities** (Top clicked/searched cities with image cards and counts)
3. **Recently Viewed Apartments** (User browsing history with Clear History & Explore All)
4. **Apartment View / Click Tracking** (Real-time click recording)

---

## Table of Contents
1. [Base Configuration & Headers](#1-base-configuration--headers)
2. [TypeScript Interfaces & Enums](#2-typescript-interfaces--enums)
3. [API Endpoints Summary](#3-api-endpoints-summary)
4. [Endpoint Specifications with Request & Response Examples](#4-endpoint-specifications)
   - [1. Grouped Apartments by Cities (`GET /api/v1/apartments/by-cities`)](#1-grouped-apartments-by-cities)
   - [2. Top Popular Cities (`GET /api/v1/apartments/popular-cities`)](#2-top-popular-cities)
   - [3. Record Click / View (`POST /api/v1/apartments/view-history/:apartmentId`)](#3-record-click--view)
   - [4. Get Recently Viewed Apartments (`GET /api/v1/apartments/recently-viewed`)](#4-get-recently-viewed-apartments)
   - [5. Clear Browsing History (`DELETE /api/v1/apartments/recently-viewed`)](#5-clear-browsing-history)
5. [Frontend Service Client (`services/apartmentService.ts`)](#5-frontend-service-client)
6. [Next.js React Components (Tailwind CSS)](#6-nextjs-react-components)
   - [A. `ExplorePremiumDestinations.tsx` (Multi-City Section)](#a-explorepremiumdestinationstsx)
   - [B. `PopularCities.tsx` (Top Cities Grid)](#b-popularcitiestsx)
   - [C. `RecentlyViewed.tsx` (Browsing History Carousel/Grid)](#c-recentlyviewedtsx)

---

## 1. Base Configuration & Headers

- **Base URL**: `https://api.yourdomain.com/api/v1` (or `http://localhost:5000/api/v1` in local dev)
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Authentication**: When user is logged in, pass token in `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```

---

## 2. TypeScript Interfaces & Enums

Add these definitions to your frontend project at `@/types/apartment.ts`:

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

// Single Apartment Card Structure
export interface IApartmentCard {
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
  averageRating: number;
  totalReviews: number;
  isWishlisted?: boolean;
  viewedAt?: string;
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
}

// Grouped City Section Item (for "Available for Tel Aviv", etc.)
export interface ICityApartmentGroup {
  city: string;
  totalApartments: number;
  apartments: IApartmentCard[];
}

// Popular City Card Item
export interface IPopularCity {
  city: string;
  viewCount: number;
  apartmentCount: number;
  image: string | null;
}

// Standard API Response Envelope
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

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/apartments/by-cities` | Optional | Get apartments grouped by top cities (with `totalApartments` & top 4 cards each) |
| `GET` | `/api/v1/apartments/popular-cities` | Public | Get top 5 popular cities based on click views |
| `POST` | `/api/v1/apartments/view-history/:apartmentId` | Required | Record an apartment view/click |
| `GET` | `/api/v1/apartments/recently-viewed` | Required | Get logged-in user's recently viewed apartments |
| `DELETE` | `/api/v1/apartments/recently-viewed` | Required | Clear browsing history |

---

## 4. Endpoint Specifications

### 1. Grouped Apartments by Cities
Fetches apartments grouped by cities for sections like **"Available for Tel Aviv"**, **"Available for Jerusalem"**, and **"Available for Tzfat"**.

- **URL**: `/api/v1/apartments/by-cities`
- **Method**: `GET`
- **Auth**: Optional (if logged in, includes `isWishlisted` status for each apartment)
- **Query Parameters**:
  - `cityLimit` *(optional, default: `3`)*: Number of city sections to return
  - `limitPerCity` *(optional, default: `4`)*: Number of apartments per city section
  - `cities` *(optional)*: Specific comma-separated cities to fetch, e.g. `?cities=Tel Aviv,Jerusalem,Tzfat`

#### Request:
```http
GET /api/v1/apartments/by-cities?cityLimit=3&limitPerCity=4 HTTP/1.1
Host: api.example.com
```

#### Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Apartments by cities retrieved successfully",
  "data": [
    {
      "city": "Tel Aviv",
      "totalApartments": 24,
      "apartments": [
        {
          "id": "c1f7a2d4-1111-4444-9999-000000000001",
          "title": "Luxury Penthouse near Beach",
          "city": "Tel Aviv",
          "neighborhood": "City Center",
          "street1": "HaPalmach Street",
          "bedrooms": 3,
          "bathrooms": 2,
          "maxGuest": 6,
          "pricePerShabbat": 4000,
          "coverImage": "https://example.com/uploads/apt1.jpg",
          "images": ["https://example.com/uploads/apt1.jpg"],
          "averageRating": 4.9,
          "totalReviews": 18,
          "isWishlisted": false,
          "upcomingAvailability": {
            "isAvailableNextWeekend": true,
            "isAvailableSecondWeekend": false,
            "isAvailableNextTwoWeekends": false,
            "availabilityMessage": "Available for next weekend"
          }
        }
      ]
    },
    {
      "city": "Jerusalem",
      "totalApartments": 32,
      "apartments": [
        {
          "id": "c1f7a2d4-2222-4444-9999-000000000002",
          "title": "Historic Stone House in Old City",
          "city": "Jerusalem",
          "neighborhood": "Old City",
          "street1": "HaPalmach Street",
          "bedrooms": 4,
          "bathrooms": 3,
          "maxGuest": 10,
          "pricePerShabbat": 4500,
          "coverImage": "https://example.com/uploads/apt2.jpg",
          "images": ["https://example.com/uploads/apt2.jpg"],
          "averageRating": 5.0,
          "totalReviews": 24,
          "isWishlisted": true,
          "upcomingAvailability": {
            "isAvailableNextWeekend": true,
            "isAvailableSecondWeekend": true,
            "isAvailableNextTwoWeekends": true,
            "availabilityMessage": "Available for the next two weekends"
          }
        }
      ]
    },
    {
      "city": "Tzfat",
      "totalApartments": 18,
      "apartments": [
        {
          "id": "c1f7a2d4-3333-4444-9999-000000000003",
          "title": "Artistic Villa with Mountain Views",
          "city": "Tzfat",
          "neighborhood": "Artists Colony",
          "street1": "HaPalmach Street",
          "bedrooms": 4,
          "bathrooms": 2,
          "maxGuest": 8,
          "pricePerShabbat": 3000,
          "coverImage": "https://example.com/uploads/apt3.jpg",
          "images": ["https://example.com/uploads/apt3.jpg"],
          "averageRating": 4.8,
          "totalReviews": 9,
          "isWishlisted": false,
          "upcomingAvailability": {
            "isAvailableNextWeekend": false,
            "isAvailableSecondWeekend": false,
            "isAvailableNextTwoWeekends": false,
            "availabilityMessage": "Unavailable for next weekend"
          }
        }
      ]
    }
  ]
}
```

---

### 2. Top Popular Cities
- **URL**: `/api/v1/apartments/popular-cities`
- **Method**: `GET`
- **Query Params**: `limit` *(default: `5`)*

#### Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Popular cities retrieved successfully",
  "data": [
    {
      "city": "Jerusalem",
      "viewCount": 182,
      "apartmentCount": 32,
      "image": "https://example.com/uploads/jerusalem.jpg"
    },
    {
      "city": "Tel Aviv",
      "viewCount": 140,
      "apartmentCount": 24,
      "image": "https://example.com/uploads/telaviv.jpg"
    },
    {
      "city": "Tzfat",
      "viewCount": 95,
      "apartmentCount": 18,
      "image": "https://example.com/uploads/tzfat.jpg"
    }
  ]
}
```

---

### 3. Record Click / View
- **URL**: `/api/v1/apartments/view-history/:apartmentId`
- **Method**: `POST`
- **Auth**: Required (`Bearer <access_token>`)

#### Request:
```http
POST /api/v1/apartments/view-history/c1f7a2d4-1111-4444-9999-000000000001 HTTP/1.1
Authorization: Bearer <access_token>
```

#### Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Apartment view recorded successfully",
  "data": {
    "id": "673f8a00-1111-4444-9999-abcdef012345",
    "userId": "user-uuid",
    "apartmentId": "c1f7a2d4-1111-4444-9999-000000000001",
    "createdAt": "2026-09-19T08:00:00.000Z",
    "updatedAt": "2026-09-19T08:00:00.000Z"
  }
}
```

---

### 4. Get Recently Viewed Apartments
- **URL**: `/api/v1/apartments/recently-viewed`
- **Method**: `GET`
- **Auth**: Required (`Bearer <access_token>`)
- **Query Params**: `page` *(default `1`)*, `limit` *(default `10`)*

#### Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Recently viewed apartments retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 4,
    "total": 4,
    "totalPage": 1
  },
  "data": [
    {
      "id": "c1f7a2d4-1111-4444-9999-000000000001",
      "title": "Beautiful Apartment in Jerusalem",
      "city": "Jerusalem",
      "neighborhood": "Rehavia",
      "street1": "HaPalmach Street",
      "bedrooms": 3,
      "bathrooms": 2,
      "maxGuest": 6,
      "pricePerShabbat": 4500,
      "coverImage": "https://example.com/uploads/apt1.jpg",
      "viewedAt": "2026-09-19T08:00:00.000Z",
      "averageRating": 4.8,
      "totalReviews": 12
    }
  ]
}
```

---

### 5. Clear Browsing History
- **URL**: `/api/v1/apartments/recently-viewed`
- **Method**: `DELETE`
- **Auth**: Required (`Bearer <access_token>`)

#### Response (`200 OK`):
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

## 5. Frontend Service Client

Create `src/services/apartmentService.ts`:

```typescript
import axios from "axios";
import {
  IApiResponse,
  ICityApartmentGroup,
  IPopularCity,
  IApartmentCard,
} from "@/types/apartment";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const getAuthHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};

export const ApartmentService = {
  // 1. Get Grouped Apartments for Premium Destinations
  getApartmentsByCities: async (
    cityLimit = 3,
    limitPerCity = 4,
    cities?: string
  ): Promise<ICityApartmentGroup[]> => {
    const params = new URLSearchParams({
      cityLimit: String(cityLimit),
      limitPerCity: String(limitPerCity),
      ...(cities && { cities }),
    });

    const res = await axios.get<IApiResponse<ICityApartmentGroup[]>>(
      `${API_BASE_URL}/apartments/by-cities?${params.toString()}`,
      getAuthHeaders()
    );
    return res.data.data;
  },

  // 2. Get Top Popular Cities
  getPopularCities: async (limit = 5): Promise<IPopularCity[]> => {
    const res = await axios.get<IApiResponse<IPopularCity[]>>(
      `${API_BASE_URL}/apartments/popular-cities?limit=${limit}`
    );
    return res.data.data;
  },

  // 3. Track Apartment Click
  trackApartmentView: async (apartmentId: string): Promise<void> => {
    try {
      await axios.post(
        `${API_BASE_URL}/apartments/view-history/${apartmentId}`,
        {},
        getAuthHeaders()
      );
    } catch {
      // Fail silently if tracking fails
    }
  },

  // 4. Get Recently Viewed Apartments
  getRecentlyViewed: async (
    page = 1,
    limit = 4
  ): Promise<IApiResponse<IApartmentCard[]>> => {
    const res = await axios.get<IApiResponse<IApartmentCard[]>>(
      `${API_BASE_URL}/apartments/recently-viewed?page=${page}&limit=${limit}`,
      getAuthHeaders()
    );
    return res.data;
  },

  // 5. Clear Browsing History
  clearHistory: async (): Promise<void> => {
    await axios.delete(
      `${API_BASE_URL}/apartments/recently-viewed`,
      getAuthHeaders()
    );
  },
};
```

---

## 6. Next.js React Components

### A. `ExplorePremiumDestinations.tsx`
Matches the exact screenshot layout for **"Explore Premium Destinations"** / **"Available for Tel Aviv"**, **"Available for Jerusalem"**, **"Available for Tzfat"**.

```tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ICityApartmentGroup, IApartmentCard } from "@/types/apartment";
import { ApartmentService } from "@/services/apartmentService";

export default function ExplorePremiumDestinations() {
  const [cityGroups, setCityGroups] = useState<ICityApartmentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApartmentService.getApartmentsByCities(3, 4)
      .then((data) => setCityGroups(data))
      .catch((err) => console.error("Error loading destinations:", err))
      .finally(() => setLoading(false));
  }, []);

  const getAvailabilityBadge = (apt: IApartmentCard) => {
    const avail = apt.upcomingAvailability;
    if (!avail || !avail.isAvailableNextWeekend) {
      return (
        <span className="bg-rose-600 text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full">
          • Unavailable
        </span>
      );
    }
    if (avail.isAvailableNextWeekend && !avail.isAvailableSecondWeekend) {
      return (
        <span className="bg-amber-500 text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full">
          • Unavailable for upcoming weekend
        </span>
      );
    }
    return (
      <span className="bg-emerald-600 text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full">
        • Available
      </span>
    );
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-400">Loading premium destinations...</div>;
  }

  if (!cityGroups.length) return null;

  return (
    <section className="py-12 space-y-14 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Explore Premium Destinations
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Find the perfect apartment for your Shabbos in Israel&apos;s most sought-after cities.
        </p>
      </div>

      {/* City Sections */}
      {cityGroups.map((group) => (
        <div key={group.city} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                — PREMIUM CITY
              </span>
              <h3 className="text-2xl font-bold text-gray-900">
                Available for {group.city}
              </h3>
            </div>
            <Link
              href={`/apartments?city=${encodeURIComponent(group.city)}`}
              className="text-xs font-semibold px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              View all {group.totalApartments} +
            </Link>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {group.apartments.map((apt) => (
              <Link
                key={apt.id}
                href={`/apartments/${apt.id}`}
                onClick={() => ApartmentService.trackApartmentView(apt.id)}
                className="group bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
              >
                {/* Image Container */}
                <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                  {apt.coverImage ? (
                    <Image
                      src={apt.coverImage}
                      alt={apt.title}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">{getAvailabilityBadge(apt)}</div>

                  {/* Wishlist Heart Icon */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      // trigger wishlist toggle
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-red-500 shadow-sm"
                  >
                    <svg
                      className={`w-4 h-4 ${apt.isWishlisted ? "fill-red-500 text-red-500" : "fill-none stroke-current"}`}
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>

                {/* Details */}
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition">
                      {apt.title}
                    </h4>

                    {/* Meta info box */}
                    <div className="mt-2.5 bg-gray-50 rounded-xl p-2.5 text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">📍</span>
                        <span>City: <strong className="text-gray-800">{apt.city}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">🏠</span>
                        <span>Neighborhood: <strong className="text-gray-800">{apt.neighborhood}</strong></span>
                      </div>
                      {apt.street1 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">🛣️</span>
                          <span className="truncate">Street: <strong className="text-gray-800">{apt.street1}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Facilities */}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 font-medium">
                      <span>🛏️ {apt.bedrooms} Beds</span>
                      <span>🚪 {apt.bedrooms} Rooms</span>
                      <span>👥 {apt.maxGuest} Guests</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-extrabold text-gray-900">
                        ₪{apt.pricePerShabbat}
                      </span>
                      <span className="text-xs text-gray-500 font-normal"> / weekend</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
```

---

### B. `PopularCities.tsx`
Matches the **"Popular Cities"** card grid (image background with white badge pill).

```tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IPopularCity } from "@/types/apartment";
import { ApartmentService } from "@/services/apartmentService";

export default function PopularCities() {
  const [cities, setCities] = useState<IPopularCity[]>([]);

  useEffect(() => {
    ApartmentService.getPopularCities(5).then(setCities).catch(console.error);
  }, []);

  if (!cities.length) return null;

  return (
    <section className="py-8 max-w-7xl mx-auto px-4">
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
            className="group relative overflow-hidden rounded-2xl h-36 bg-gray-100 block shadow-sm hover:shadow-md transition"
          >
            {item.image ? (
              <Image
                src={item.image}
                alt={item.city}
                fill
                className="object-cover group-hover:scale-105 transition duration-300"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-gray-300 font-semibold">
                {item.city}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
              <span className="font-semibold text-sm drop-shadow">{item.city}</span>
              <span className="bg-white text-gray-900 font-bold text-xs px-2 py-0.5 rounded-full shadow">
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

### C. `RecentlyViewed.tsx`
Matches the **"Recently Viewed Apartments"** section with "Clear History" and "Explore All →".

```tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IApartmentCard } from "@/types/apartment";
import { ApartmentService } from "@/services/apartmentService";

export default function RecentlyViewed() {
  const [apartments, setApartments] = useState<IApartmentCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApartmentService.getRecentlyViewed(1, 4)
      .then((res) => setApartments(res.data))
      .catch(() => setApartments([]))
      .finally(() => setLoading(false));
  }, []);

  const handleClearHistory = async () => {
    try {
      await ApartmentService.clearHistory();
      setApartments([]);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !apartments.length) return null;

  return (
    <section className="py-8 max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
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
            className="text-xs px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-medium"
          >
            Clear History
          </button>
          <Link
            href="/apartments"
            className="text-xs px-4 py-1.5 rounded-lg bg-indigo-950 text-white hover:bg-indigo-900 font-medium"
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
            onClick={() => ApartmentService.trackApartmentView(apt.id)}
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
