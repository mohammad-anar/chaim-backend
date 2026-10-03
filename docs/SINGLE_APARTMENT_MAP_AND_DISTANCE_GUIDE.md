# Single Apartment Details, Map View & Distance Calculator Integration Guide

This guide documents the integration of the **Single Apartment API endpoint (`GET /api/v1/apartment/:id`)** and **Public Apartment Search (`GET /api/v1/apartment`)** with the frontend **Location on Map** and **Walking Distance Calculator** components.

---

## 1. Endpoint Overview & Authentication

### 1.1 Single Apartment Detail & Live Distance
- **Endpoint**: `/api/v1/apartment/:id`
- **Method**: `GET`
- **Access Level**: `Public` (No authentication required, accessible to guests and logged-in users)
- **URL Parameter**:
  - `:id` — Can be either the UUID (`id`) or the user-friendly property ID (e.g., `apart-001`).
- **Optional Query Parameters (Live Distance Calculation to Destination)**:
  - `destLat` (or `lat`, `latitude`) — Latitude of the selected destination / synagogue (e.g. `31.7758`)
  - `destLng` (or `lng`, `longitude`) — Longitude of the selected destination / synagogue (e.g. `35.2173`)
  - `targetDestination` (or `shulAddress`, `destination`, `place`, `shul`, `synagogue`) — Name/address of the destination (e.g. `"Great Synagogue"` or `"Kotel"`). Automatically matches predefined landmark centroids if coordinates are omitted.

### 1.2 Public Search with Walking Distance Filter
- **Endpoint**: `/api/v1/apartment`
- **Method**: `GET`
- **Access Level**: `Public` (No authentication required)
- **Destination & Walking Filter Query Parameters**:
  - `destLat` / `destLng` — Coordinates of the target destination / synagogue
  - `walkingMinutes` (or `maxWalkingMinutes`, `walkingTime`, `walkingDistance`) — Maximum walking time in minutes (e.g. `10`, `15`)
  - `targetDestination` (or `shulAddress`, `destination`) — Landmark or address text
  - `sortBy` — Optional sort (e.g. `"distance"`, `"walkingMinutes"`, `"pricePerShabbat"`, `"bedrooms"`, `"createdAt"`). When destination coordinates are provided, defaults to ascending walking distance (closest first).

### Request Headers
```http
Content-Type: application/json
```
*(Optional: `Authorization: Bearer <USER_JWT_TOKEN>` if the user is logged in)*

---

## 2. Request Examples

### 2.1 Basic Apartment Details
```http
GET /api/v1/apartment/apart-001
Content-Type: application/json
```

### 2.2 Apartment Details with Target Destination (e.g., Great Synagogue)
```http
GET /api/v1/apartment/apart-001?destLat=31.7758&destLng=35.2173&targetDestination=Great%20Synagogue
Content-Type: application/json
```

### 2.3 Search Apartments within 10 Minutes Walk of a Synagogue
```http
GET /api/v1/apartment?destLat=31.7758&destLng=35.2173&walkingMinutes=10
Content-Type: application/json
```

---

## 3. Response Example

### Status: `200 OK`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Apartment retrieved successfully",
  "data": {
    "id": "7b8f9e21-4d32-48a1-b842-12ef34a56b78",
    "propertyId": "apart-001",
    "title": "Charming 3-Bedroom Apartment in Rehavia",
    "description": "Spacious and fully furnished apartment near Great Synagogue and Kotel.",
    "propertyType": "APARTMENT",
    "city": "Jerusalem",
    "neighborhood": "Rehavia",
    "street1": "Ramban St 14",
    "street2": "Apt 4B",
    "lat": 31.7749,
    "lng": 35.2155,
    "neighborhoodLat": 31.7745,
    "neighborhoodLng": 35.2160,
    "neighborhoodWalkingMinutes": 4,
    "pricePerShabbat": 1200,
    "bedrooms": 3,
    "bathrooms": 2,
    "maxGuest": 6,
    "amenities": [
      "WiFi",
      "Air Conditioning",
      "Kosher Kitchen",
      "Shabbos Plata",
      "Hot Water Urn",
      "Shabbos Clock",
      "Balcony"
    ],
    "coverImage": "https://example.com/uploads/apartments/cover-ramban.jpg",
    "images": [
      "https://example.com/uploads/apartments/living-room.jpg",
      "https://example.com/uploads/apartments/kosher-kitchen.jpg",
      "https://example.com/uploads/apartments/bedroom-1.jpg"
    ],
    "status": "CONFIRMED",
    "averageRating": 4.8,
    "totalReviews": 12,
    "walkingDistanceToNeighborhood": 4,
    "distanceKmToNeighborhood": 0.3,
    "walkingDistanceToDestination": 3,
    "distanceKmToDestination": 0.2,
    "destLat": 31.7758,
    "destLng": 35.2173,
    "availabilityMessage": "Available for next weekend (Parashat Bereishit)",
    "marker": {
      "id": "7b8f9e21-4d32-48a1-b842-12ef34a56b78",
      "propertyId": "apart-001",
      "title": "Charming 3-Bedroom Apartment in Rehavia",
      "lat": 31.7749,
      "lng": 35.2155,
      "city": "Jerusalem",
      "neighborhood": "Rehavia",
      "street1": "Ramban St 14",
      "propertyType": "APARTMENT",
      "bedrooms": 3,
      "bathrooms": 2,
      "maxGuest": 6,
      "pricePerShabbat": 1200,
      "coverImage": "https://example.com/uploads/apartments/cover-ramban.jpg"
    },
    "upcomingAvailability": {
      "isAvailableNextWeekend": true,
      "isAvailableSecondWeekend": false,
      "isAvailableNextTwoWeekends": false,
      "availabilityMessage": "Available for next weekend (Parashat Bereishit), unavailable for next two weekends",
      "canNotify": true,
      "canMakeOffer": true
    },
    "user": {
      "id": "0d619b02-14cf-4a39-9533-8a03bb6ec928",
      "username": "David Cohen",
      "email": "david.cohen@example.com",
      "phone": "+972501234567",
      "profileImage": "https://example.com/uploads/users/david.jpg"
    },
    "createdAt": "2026-09-01T12:00:00.000Z",
    "updatedAt": "2026-09-22T08:00:00.000Z"
  }
}
```

---

## 4. UI Component Data Binding Breakdown

Based on the single apartment page design:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Location on map                                                                        │
│ Ramban St 14, Rehavia, Jerusalem    ◄── [street1, neighborhood, city]                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🔗 Walking Distance Calculator                                                         │
│ Enter your target destination (e.g. Shul, Kotel, Great Synagogue, Rehavia):             │
│                                                                                        │
│ [ 📍 Great Synagogue, Jerusalem                                                  ]     │
│   ▲ Google Places Autocomplete Input                                                   │
│                                                                                        │
│ ┌───────────────────────────────┐        ┌───────────────────────────────┐             │
│ │ 👟 WALKING TIME               │        │ 📍 DISTANCE                   │             │
│ │    3 Minutes                  │        │    0.2 km                     │             │
│ └───────────────────────────────┘        └───────────────────────────────┘             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                                    │ │
│ │                            📍 [lat: 31.7749, lng: 35.2155]                         │ │
│ │                                (Interactive Google Map)                            │ │
│ │                                                                                    │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Fields Mapping Table

| UI Element | Source API Field | Fallback / Format | Example Value |
|---|---|---|---|
| **Location Subtitle** | `street1`, `neighborhood`, `city` | Concatenate non-empty strings separated by comma | `Ramban St 14, Rehavia, Jerusalem` |
| **Map Center & Pin Marker** | `lat`, `lng` | `marker.lat`, `marker.lng` | `lat: 31.7749`, `lng: 35.2155` |
| **Default Walking Time** | `walkingDistanceToNeighborhood` | `neighborhoodWalkingMinutes` | `4` (Minutes) |
| **Default Distance to Center** | `distanceKmToNeighborhood` | Calculated in km | `0.3` (km) |
| **Live Target Walking Time** | `walkingDistanceToDestination` | Calculated via formula | `3` (Minutes) |
| **Live Target Distance** | `distanceKmToDestination` | Calculated via formula | `0.2` (km) |
| **Marker Info Window Title** | `marker.title` | `title` | `Charming 3-Bedroom Apartment in Rehavia` |
| **Marker Price Preview** | `marker.pricePerShabbat` | `pricePerShabbat` | `₪1,200` |
| **Marker Thumbnail** | `marker.coverImage` | `coverImage` | URL string |

---

## 5. Walking Distance Calculator Specification

### 5.1 Origin Coordinates
- **Origin Latitude**: `data.lat` (or `data.marker.lat`)
- **Origin Longitude**: `data.lng` (or `data.marker.lng`)

### 5.2 Destination Resolution
- The destination input field connects to **Google Places Autocomplete**.
- When a user selects a destination, the Google Places API returns the destination coordinates:
  - `destLat` (e.g., `31.7758`)
  - `destLng` (e.g., `35.2178`)

---

### 5.3 Walking Time & Distance Formulas (Matching Backend Standard)

To maintain 100% consistency with backend calculations across the platform:

#### **A. Distance Formula (Haversine Formula in Kilometers)**

$$\Delta\text{lat} = (\text{destLat} - \text{aptLat}) \times \frac{\pi}{180}$$

$$\Delta\text{lon} = (\text{destLng} - \text{aptLng}) \times \frac{\pi}{180}$$

$$a = \sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos\left(\text{aptLat} \times \frac{\pi}{180}\right) \times \cos\left(\text{destLat} \times \frac{\pi}{180}\right) \times \sin^2\left(\frac{\Delta\text{lon}}{2}\right)$$

$$c = 2 \times \text{atan2}(\sqrt{a}, \sqrt{1-a})$$

$$\text{Distance (km)} = 6371 \times c$$

- **Display Format**: Round to 1 or 2 decimal places with `km` (e.g. `0.2 km`).

#### **B. Walking Time Formula**
- **Standard Walking Speed**: `4.5 km/h` (standard brisk walking speed)

$$\text{Walking Time (Minutes)} = \text{round}\left(\frac{\text{Distance (km)}}{4.5} \times 60\right)$$

- **Display Format**: `X Minutes` (e.g., `3 Minutes`). If less than 1 minute, display `1 Minute` or `< 1 Minute`.

---

### 5.4 Predefined Landmark & Synagogue Centroids Table

When users enter common synagogues or points of interest, the backend automatically resolves their coordinates:

| Landmark / Synagogue | City / Area | Latitude | Longitude |
|---|---|---|---|
| **Great Synagogue / Jerusalem Great Synagogue** | Jerusalem | `31.7758` | `35.2173` |
| **Western Wall / Kotel** | Jerusalem (Old City) | `31.7767` | `35.2345` |
| **Belz Great Synagogue** | Jerusalem (Kiryat Belz) | `31.7920` | `35.2010` |
| **Mamilla** | Jerusalem | `31.7770` | `35.2210` |
| **Jaffa Gate** | Jerusalem | `31.7766` | `35.2276` |
| **770 Eastern Parkway** | Crown Heights, NY | `40.6694` | `-73.9422` |
| **BMG (Beth Medrash Govoha)** | Lakewood, NJ | `40.0968` | `-74.2174` |

---

## 6. Error Responses Reference

### 404 Not Found (Invalid or Missing Apartment ID)
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Apartment not found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "success": false,
  "message": "Something went wrong!"
}
```

