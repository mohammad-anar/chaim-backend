# Admin - Get All Users API Integration Guide

This guide documents the Admin API endpoint for retrieving all registered users, including searching, status and role filtering, sorting, and pagination.

---

## 1. Overview & Authentication

- **Endpoint**: `/api/v1/user/admin/users` *(also accessible via `/api/v1/user`)*
- **Method**: `GET`
- **Access Level**: `SUPER_ADMIN` only
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: application/json
  ```

---

## 2. Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `searchTerm` | `string` | No | — | Case-insensitive search matching against `username`, `email`, or `phone`. |
| `role` | `string` | No | — | Filter by user role (`USER`, `SUPER_ADMIN`). |
| `status` | `string` | No | — | Filter by account status (`ACTIVE`, `BLOCKED`, `SUSPENDED`). |
| `page` | `number` | No | `1` | Page number for pagination. |
| `limit` | `number` | No | `10` | Number of items per page. |
| `sortBy` | `string` | No | `createdAt` | Field to sort by (e.g., `createdAt`, `updatedAt`, `username`). |
| `sortOrder` | `string` | No | `desc` | Sort direction (`asc` or `desc`). |

---

## 3. Supported Enums

### UserRole
- `USER`
- `SUPER_ADMIN`

### UserStatus
- `ACTIVE`
- `BLOCKED`
- `SUSPENDED`

---

## 4. Request Examples

### Example 1: Basic Paginated List
```http
GET /api/v1/user/admin/users?page=1&limit=10
Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
```

### Example 2: Search by Keyword
```http
GET /api/v1/user/admin/users?searchTerm=david&page=1&limit=10
Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
```

### Example 3: Filter by Role and Status
```http
GET /api/v1/user/admin/users?role=USER&status=ACTIVE&page=1&limit=10
Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
```

### Example 4: Combined Search, Filters, and Custom Sorting
```http
GET /api/v1/user/admin/users?searchTerm=jerusalem&role=USER&status=ACTIVE&page=1&limit=20&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
```

---

## 5. Response Format & Examples

### A. Success Response (`200 OK`)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Users retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPage": 5
  },
  "data": [
    {
      "id": "a81d4b68-b747-4977-9df0-7d72c08ec20a",
      "username": "david_cohen",
      "email": "david.cohen@example.com",
      "phone": "+972501234567",
      "profileImage": "/images/avatar-1726482100.png",
      "role": "USER",
      "status": "ACTIVE",
      "isVerified": true,
      "ownerNotificationPreference": {
        "id": "c1782e02-4416-4a1f-81da-45c1507f3001",
        "userId": "a81d4b68-b747-4977-9df0-7d72c08ec20a",
        "channel": "EMAIL",
        "notificationEmail": "david.cohen@example.com",
        "notificationPhone": "+972501234567",
        "preferredDay": null,
        "preferredTime": null,
        "isPaused": false,
        "allowReminder": true,
        "specificReminderDate": null,
        "lastReminderSentAt": null,
        "createdAt": "2026-09-01T08:00:00.000Z",
        "updatedAt": "2026-09-05T12:00:00.000Z"
      },
      "createdAt": "2026-09-01T08:00:00.000Z",
      "updatedAt": "2026-09-10T14:30:00.000Z",
      "marketingPlatform": {
        "id": "e30129bc-4a1d-4001-9011-8812c3f81e10",
        "title": "Google Ads Campaign",
        "platform": "Google"
      },
      "apartments": [
        {
          "id": "f5127022-811c-4b55-a220-33290b21a719",
          "title": "Spacious 3BR near Western Wall",
          "city": "Jerusalem"
        }
      ]
    }
  ]
}
```

---

### B. Empty Result Response (`200 OK`)

When no users match the query parameters:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Users retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPage": 0
  },
  "data": []
}
```

---

### C. Error Responses

#### 1. Unauthorized (`401 Unauthorized`)
Triggered when the request is missing or has an invalid/expired token.

```json
{
  "success": false,
  "message": "You are not authorized",
  "errorMessages": [
    {
      "path": "",
      "message": "You are not authorized"
    }
  ]
}
```

#### 2. Forbidden (`403 Forbidden`)
Triggered when the authenticated user does not have the `SUPER_ADMIN` role.

```json
{
  "success": false,
  "message": "Forbidden access",
  "errorMessages": [
    {
      "path": "",
      "message": "You do not have permission to access this resource"
    }
  ]
}
```

---

## 6. Response Field Reference

### Metadata (`meta`)

| Field | Type | Description |
|---|---|---|
| `page` | `number` | Current page number. |
| `limit` | `number` | Number of items requested per page. |
| `total` | `number` | Total number of records matching criteria. |
| `totalPage` | `number` | Total available pages. |

### User Record (`data[]`)

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique UUID of the user. |
| `username` | `string` | Unique username. |
| `email` | `string \| null` | User email address. |
| `phone` | `string \| null` | User phone number. |
| `profileImage` | `string \| null` | Avatar/profile image URL or path. |
| `role` | `string` | Role (`USER`, `SUPER_ADMIN`). |
| `status` | `string` | Account status (`ACTIVE`, `BLOCKED`, `SUSPENDED`). |
| `isVerified` | `boolean` | Verification status of user. |
| `ownerNotificationPreference` | `object \| null` | User's reminder & notification preferences. |
| `marketingPlatform` | `object \| null` | Origin marketing platform data if linked. |
| `apartments` | `array` | Summary list of apartments owned (`id`, `title`, `city`). |
| `createdAt` | `string` | ISO 8601 timestamp of user creation. |
| `updatedAt` | `string` | ISO 8601 timestamp of last update. |
