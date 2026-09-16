# ShabbosRent Apartment & Reminder Settings API Guide

A complete reference for frontend and backend integration covering apartment listing, editing, contact preferences, availability rules, and self-service reminder settings.

---

## 1. Overview of Changes

1. **Multiple Apartments per Owner**:
   - An owner can create and manage multiple properties.
   - `GET /api/v1/apartment/my-apartment` returns an array of all apartments owned by the authenticated user.
   - Specific apartment operations (`GET /:id`, `PATCH /:id`, `DELETE /:id`) use the `apartmentId`.
2. **Contact Preferences**:
   - Replaced `howToContact` enum with 3 boolean flags:
     - `phone` (Boolean, default: `true`)
     - `whatsapp` (Boolean, default: `false`)
     - `email` (Boolean, default: `false`)
3. **Operational & Availability Settings**:
   - `unavailable` (Boolean, default: `false`)
   - `receiveRequestWhenUnavailable` (Boolean, default: `false`) — *"Accept Requests When Unavailable / Allow renters to send requests even when unavailable"*.
   - `isActive` (Boolean, default: `true`) — Owner can activate/deactivate the listing.
4. **Public Search & Listing Visibility (`GET /api/v1/apartment`)**:
   - An apartment appears in public listings if and only if:
     - `isActive == true` **AND**
     - (`unavailable == false` **OR** (`unavailable == true` **AND** `receiveRequestWhenUnavailable == true`))
   - When `unavailable: true` and `receiveRequestWhenUnavailable: true`, frontend displays the listing with the *"Send Offer"* action.
5. **Self-Service Owner Reminder Settings (`/api/v1/owner/me/notification-pref`)**:
   - Configurable reminder schedule (`preferredDay`: `SUNDAY`–`FRIDAY`, `preferredTime`: e.g. `"06:00 PM (Evening)"`).
   - Delivery channels (`channel`: `PHONE`, `EMAIL`, `BOTH`).
   - "Reminders Paused" toggle (`isPaused`: boolean).
   - "Test Reminder Now" trigger (`POST /api/v1/owner/me/test-reminder`).
   - Admin enforcement: Admin cannot send availability reminders if owner paused reminders or on a different day than the owner's preferred day.

---

## 2. API Endpoints Reference

### 2.1 Apartment Endpoints

| Method | Endpoint | Auth Required | Content-Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/apartment` | `USER` / `SUPER_ADMIN` | `multipart/form-data` or `application/json` | Create a new apartment listing |
| `PATCH` | `/api/v1/apartment/:id` | `USER` / `SUPER_ADMIN` | `multipart/form-data` or `application/json` | Update apartment details and settings |
| `GET` | `/api/v1/apartment/my-apartment` | `USER` / `SUPER_ADMIN` | `application/json` | Get all apartments owned by the current user |
| `GET` | `/api/v1/apartment/:id` | Optional / Public | `application/json` | Get single apartment details by ID or Property ID |
| `GET` | `/api/v1/apartment` | Optional / Public | `application/json` | Search and list public active apartments |
| `DELETE` | `/api/v1/apartment/:id` | `USER` / `SUPER_ADMIN` | `application/json` | Delete an apartment listing |

---

### 2.2 Owner Reminder Settings Endpoints

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/owner/me/notification-pref` | `USER` / `SUPER_ADMIN` | Fetch current owner's reminder preferences and status |
| `PATCH` | `/api/v1/owner/me/notification-pref` | `USER` / `SUPER_ADMIN` | Update/save reminder schedule, channel, and pause toggle |
| `POST` | `/api/v1/owner/me/test-reminder` | `USER` / `SUPER_ADMIN` | Send an immediate test reminder to the owner's configured channel |
| `POST` | `/api/v1/owner/:id/availability-reminder` | `SUPER_ADMIN` | Admin trigger to send availability reminder to owner |

---

## 3. Data Dictionary

### Apartment Fields

| Field Name | Type | Default | Required on Create | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `String` | — | **Yes** | Apartment headline / title |
| `description` | `String?` | `null` | No | Full apartment description |
| `city` | `String` | — | **Yes** | City (e.g., `"Jerusalem"`) |
| `neighborhood` | `String` | — | **Yes** | Neighborhood / Area (e.g., `"Geula"`) |
| `street1` | `String?` | `null` | No | Street address line 1 |
| `street2` | `String?` | `null` | No | Street address line 2 |
| `lat` | `Float?` | `null` | No | Apartment latitude coordinate |
| `lng` | `Float?` | `null` | No | Apartment longitude coordinate |
| `propertyType` | `Enum` | — | **Yes** | `APARTMENT`, `VILLA`, `PENTHOUSE`, `STUDIO` |
| `bedrooms` | `Int` | — | **Yes** | Number of bedrooms (min: 1) |
| `bathrooms` | `Int` | — | **Yes** | Number of bathrooms (min: 1) |
| `maxGuest` | `Int` | — | **Yes** | Maximum guests accommodated (min: 0) |
| `pricePerShabbat` | `Float` | — | **Yes** | Price per Shabbat in ILS (min: 1) |
| `amenities` | `String[]` / `JSON string` | `[]` | No | Array of amenity names |
| `coverImage` | `File` / `String?` | `null` | No | Single cover image file or URL |
| `images` | `File[]` / `String[]` | `[]` | No | Gallery image files or URLs |
| `phoneNumber` | `String?` | `null` | No | Display phone number |
| `whatsApp` | `String?` | `null` | No | Display WhatsApp number |
| `phone` | `Boolean` | `true` | No | Enable phone call contact channel |
| `whatsapp` | `Boolean` | `false` | No | Enable WhatsApp message contact channel |
| `email` | `Boolean` | `false` | No | Enable email contact channel |
| `unavailable` | `Boolean` | `false` | No | Marks apartment as currently unavailable |
| `receiveRequestWhenUnavailable` | `Boolean` | `false` | No | Accept requests/offers when unavailable |
| `isActive` | `Boolean` | `true` | No | Owner active status switch |
| `additionalDetails` | `String?` | `null` | No | Kosher/Kashrut or house notes |
| `referralCode` | `String?` | `null` | No | Optional ambassador referral code |

---

### Owner Reminder Settings Fields

| Field Name | Type | Default | Options / Format | Description |
| :--- | :--- | :--- | :--- | :--- |
| `isPaused` | `Boolean` | `false` | `true` / `false` | "Reminders Paused" toggle |
| `allowReminder` | `Boolean` | `true` | `true` / `false` | Synced with `!isPaused` |
| `preferredDay` | `Enum?` | `null` | `SUNDAY`, `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY` | Scheduled reminder day of week |
| `preferredTime` | `String?` | `null` | e.g. `"18:00"` or `"06:00 PM (Evening)"` | Scheduled reminder time |
| `channel` | `Enum` | `EMAIL` | `PHONE`, `EMAIL`, `BOTH` | Delivery channel |
| `notificationPhone` | `String?` | `null` | e.g. `"+972501234567"` | Destination phone for voice call reminders |
| `notificationEmail` | `String?` | `null` | e.g. `"owner@shabbosrent.com"` | Destination email address |
| `lastReminderSentAt` | `DateTime?` | `null` | ISO 8601 Timestamp | Last reminder dispatched timestamp |

---

## 4. Request & Response Examples

### 4.1 Create Apartment (`POST /api/v1/apartment`)

#### Headers:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

#### Form-Data Body:
```form-data
title: Luxury Shabbat Retreat in Jerusalem
description: Spacious penthouse with Mehadrin kitchen and panoramic view.
city: Jerusalem
neighborhood: Geula
propertyType: PENTHOUSE
bedrooms: 3
bathrooms: 2
maxGuest: 8
pricePerShabbat: 1500
phoneNumber: +972501234567
whatsApp: +972501234567
phone: true
whatsapp: true
email: true
unavailable: false
receiveRequestWhenUnavailable: false
isActive: true
amenities: ["Air Conditioning", "Mehadrin Kitchen", "Hot Plate", "Urn", "Balcony"]
coverImage: (binary image file)
images: (binary image file 1)
images: (binary image file 2)
```

#### Success Response (`201 Created`):
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Apartment listed successfully. Payment is pending.",
  "data": {
    "id": "c6a287be-3199-4d69-a3ec-58476d0284ab",
    "propertyId": "apart-042",
    "userId": "usr-87239482",
    "title": "Luxury Shabbat Retreat in Jerusalem",
    "description": "Spacious penthouse with Mehadrin kitchen and panoramic view.",
    "city": "Jerusalem",
    "neighborhood": "Geula",
    "propertyType": "PENTHOUSE",
    "bedrooms": 3,
    "bathrooms": 2,
    "maxGuest": 8,
    "pricePerShabbat": 1500,
    "phone": true,
    "whatsapp": true,
    "email": true,
    "unavailable": false,
    "receiveRequestWhenUnavailable": false,
    "isActive": true,
    "coverImage": "/uploads/coverImage-1726301234.jpg",
    "images": [
      "/uploads/images-1726301234-1.jpg",
      "/uploads/images-1726301234-2.jpg"
    ],
    "status": "PENDING",
    "createdAt": "2026-09-14T10:00:00.000Z",
    "updatedAt": "2026-09-14T10:00:00.000Z"
  }
}
```

---

### 4.2 Update Apartment (`PATCH /api/v1/apartment/:id`)

#### Headers:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### JSON Body (Updating settings all together):
```json
{
  "unavailable": true,
  "receiveRequestWhenUnavailable": true,
  "isActive": true,
  "phone": true,
  "whatsapp": true,
  "email": false,
  "pricePerShabbat": 1600
}
```

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Apartment updated successfully",
  "data": {
    "id": "c6a287be-3199-4d69-a3ec-58476d0284ab",
    "propertyId": "apart-042",
    "title": "Luxury Shabbat Retreat in Jerusalem",
    "phone": true,
    "whatsapp": true,
    "email": false,
    "unavailable": true,
    "receiveRequestWhenUnavailable": true,
    "isActive": true,
    "pricePerShabbat": 1600,
    "status": "CONFIRMED",
    "updatedAt": "2026-09-14T10:15:00.000Z"
  }
}
```

---

### 4.3 Get My Apartments (`GET /api/v1/apartment/my-apartment`)

#### Headers:
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User apartment retrieved successfully",
  "data": [
    {
      "id": "c6a287be-3199-4d69-a3ec-58476d0284ab",
      "propertyId": "apart-042",
      "title": "Luxury Shabbat Retreat in Jerusalem",
      "city": "Jerusalem",
      "neighborhood": "Geula",
      "phone": true,
      "whatsapp": true,
      "email": false,
      "unavailable": false,
      "receiveRequestWhenUnavailable": false,
      "isActive": true,
      "pricePerShabbat": 1500,
      "isListingActive": true,
      "isListingExpired": false,
      "daysRemaining": 28,
      "upcomingAvailability": {
        "isAvailable": true,
        "availabilityMessage": "Available for booking"
      }
    }
  ]
}
```

---

### 4.4 Save Reminder Settings (`PATCH /api/v1/owner/me/notification-pref`)

#### Headers:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### JSON Body:
```json
{
  "isPaused": false,
  "preferredDay": "THURSDAY",
  "preferredTime": "06:00 PM (Evening)",
  "channel": "BOTH",
  "notificationPhone": "+972501234567",
  "notificationEmail": "owner@shabbosrent.com"
}
```

#### Success Response (`200 OK`):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Owner notification preference updated successfully",
  "data": {
    "id": "pref-82937102",
    "userId": "usr-87239482",
    "channel": "BOTH",
    "notificationEmail": "owner@shabbosrent.com",
    "notificationPhone": "+972501234567",
    "preferredDay": "THURSDAY",
    "preferredTime": "06:00 PM (Evening)",
    "isPaused": false,
    "allowReminder": true,
    "lastReminderSentAt": null,
    "updatedAt": "2026-09-14T10:20:00.000Z"
  }
}
```

---

### 4.5 Test Reminder Now (`POST /api/v1/owner/me/test-reminder`)

#### Headers:
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Success Response (`200 OK`):
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
    "callSid": "CA1234567890abcdef"
  }
}
```

---

### 4.6 Admin Send Availability Reminder (`POST /api/v1/owner/:id/availability-reminder`)

#### Headers:
```http
Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
Content-Type: application/json
```

#### Request Body (Optional `apartmentId`):
```json
{
  "apartmentId": "c6a287be-3199-4d69-a3ec-58476d0284ab"
}
```

#### Error Response when owner paused reminders (`403 Forbidden`):
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Owner has paused/disabled automated reminder notifications"
}
```

#### Error Response when sending on a different day than preferred day (`400 Bad Request`):
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Owner has scheduled reminders for THURSDAY. Today is MONDAY. Reminders cannot be sent on other days."
}
```

---

## 5. Summary Guide for Frontend Developers

1. **Owner Can Have Multiple Listings**:
   - Do not assume one apartment per user ID.
   - Always pass `apartmentId` in route parameters for detail, edit, and deletion requests.
2. **Contact Options**:
   - Render 3 separate checkboxes for Phone, WhatsApp, and Email.
   - Send `phone`, `whatsapp`, `email` as booleans (or `"true"`/`"false"` strings in FormData).
3. **Availability & "Send Offer" UI Logic**:
   - When owner toggles `unavailable = true`, expose the switch **"Accept Requests When Unavailable"** (`receiveRequestWhenUnavailable`).
   - On the public apartment card / detail page:
     - If `unavailable === true` and `receiveRequestWhenUnavailable === true`, display the **"Send Offer"** button instead of standard direct booking.
     - If `unavailable === true` and `receiveRequestWhenUnavailable === false`, do not display the listing in public search results.
4. **Reminder Settings UI**:
   - Map `isPaused` to the top-right switch **"Reminders Paused"**.
   - Map `preferredDay` to the 6 buttons (`Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`).
   - Map `channel` to `Phone Call` (`PHONE`), `Email` (`EMAIL`), `Both` (`BOTH`).
   - Map `lastReminderSentAt` to the footer label (display *"No reminders sent yet"* if null).
   - Link the **"Test Reminder Now"** button to `POST /api/v1/owner/me/test-reminder`.
   - Link the **"Save Reminder Settings"** button to `PATCH /api/v1/owner/me/notification-pref`.
