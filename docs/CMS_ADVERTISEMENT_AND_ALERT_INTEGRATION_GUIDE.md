# CMS: Advertisements & Alerts API Integration Guide

This guide documents the API endpoints for managing **Advertisements** and **System Alerts/Announcements** within the platform, including request/response payloads, required headers, query filters, and status codes.

---

## Base URL & Headers

- **Base URL**: `http://localhost:8000/api/v1` (or your deployed server domain)
- **Standard Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

---

## 1. Supported Enums

### AdvertisementPosition
- `HOME_TOP` (Top banner on homepage)
- `HOME_MIDDLE` (Middle featured slot on homepage)
- `SIDEBAR` (Sidebar widget)
- `FOOTER` (Footer banner)

### AlertType
- `INFO`
- `WARNING`
- `SUCCESS`
- `URGENT`

### TargetRole (for Alerts)
- `USER`
- `AMBASSADOR`
- `SUPER_ADMIN`
- *(Omit or pass `null` to broadcast to ALL users)*

---

# Part 1: Advertisements API

---

### 1.1. Create Advertisement

- **Route**: `/api/v1/advertisement`
- **Method**: `POST`
- **Access Level**: `SUPER_ADMIN` only

#### Option A: JSON Request (`Content-Type: application/json`)
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "companyName": "Acme Real Estate Ltd",
    "title": "Special Holiday Promotion 2026",
    "subtitle": "Get up to 20% off on all weekend stays",
    "image": "https://example.com/uploads/ads/holiday-banner.png",
    "url": "https://chaim-rentals.com/promotions/holiday-2026",
    "position": "HOME_TOP",
    "isActive": true,
    "startDate": "2026-10-01T00:00:00.000Z",
    "endDate": "2026-10-31T23:59:59.000Z"
  }
  ```

#### Option B: Multipart / File Upload Request (`multipart/form-data`)
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: multipart/form-data
  ```
- **Form Data Fields**:
  - `image`: *(File - .jpg/.png/.webp)*
  - `data`: *(JSON string with advertisement payload)*:
    ```json
    {
      "companyName": "Acme Real Estate Ltd",
      "title": "Special Holiday Promotion 2026",
      "subtitle": "Get up to 20% off on all weekend stays",
      "url": "https://chaim-rentals.com/promotions/holiday-2026",
      "position": "HOME_TOP",
      "isActive": true
    }
    ```

- **Response** (`201 Created`):
  ```json
  {
    "statusCode": 201,
    "success": true,
    "message": "Advertisement created successfully",
    "data": {
      "id": "e8a93cb2-9d32-4fb2-a634-11fa6bb8c8e1",
      "companyName": "Acme Real Estate Ltd",
      "title": "Special Holiday Promotion 2026",
      "subtitle": "Get up to 20% off on all weekend stays",
      "image": "https://rheulevubbexbcdiilzi.supabase.co/storage/v1/object/public/images/image/banner-1727000000.png",
      "url": "https://chaim-rentals.com/promotions/holiday-2026",
      "position": "HOME_TOP",
      "isActive": true,
      "clicks": 0,
      "startDate": "2026-10-01T00:00:00.000Z",
      "endDate": "2026-10-31T23:59:59.000Z",
      "createdAt": "2026-09-23T09:30:00.000Z",
      "updatedAt": "2026-09-23T09:30:00.000Z"
    }
  }
  ```

---

### 1.2. Get All Advertisements (With Filters)

- **Route**: `/api/v1/advertisement`
- **Method**: `GET`
- **Access Level**: `Public`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Query Parameters**:
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `position` | `string` | No | Filter by position (`HOME_TOP`, `HOME_MIDDLE`, `SIDEBAR`, `FOOTER`). |
  | `isActive` | `string` | No | Filter by active status (`true` or `false`). |

- **Request Example**:
  ```http
  GET /api/v1/advertisement?position=HOME_TOP&isActive=true
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Advertisements retrieved successfully",
    "data": [
      {
        "id": "e8a93cb2-9d32-4fb2-a634-11fa6bb8c8e1",
        "companyName": "Acme Real Estate Ltd",
        "title": "Special Holiday Promotion 2026",
        "subtitle": "Get up to 20% off on all weekend stays",
        "image": "https://example.com/uploads/ads/holiday-banner.png",
        "url": "https://chaim-rentals.com/promotions/holiday-2026",
        "position": "HOME_TOP",
        "isActive": true,
        "clicks": 14,
        "startDate": "2026-10-01T00:00:00.000Z",
        "endDate": "2026-10-31T23:59:59.000Z",
        "createdAt": "2026-09-23T09:30:00.000Z",
        "updatedAt": "2026-09-23T09:30:00.000Z"
      }
    ]
  }
  ```

---

### 1.3. Get Single Advertisement by ID

- **Route**: `/api/v1/advertisement/:id`
- **Method**: `GET`
- **Access Level**: `Public`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Request Example**:
  ```http
  GET /api/v1/advertisement/e8a93cb2-9d32-4fb2-a634-11fa6bb8c8e1
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Advertisement retrieved successfully",
    "data": {
      "id": "e8a93cb2-9d32-4fb2-a634-11fa6bb8c8e1",
      "companyName": "Acme Real Estate Ltd",
      "title": "Special Holiday Promotion 2026",
      "subtitle": "Get up to 20% off on all weekend stays",
      "image": "https://example.com/uploads/ads/holiday-banner.png",
      "url": "https://chaim-rentals.com/promotions/holiday-2026",
      "position": "HOME_TOP",
      "isActive": true,
      "clicks": 14,
      "startDate": "2026-10-01T00:00:00.000Z",
      "endDate": "2026-10-31T23:59:59.000Z",
      "createdAt": "2026-09-23T09:30:00.000Z",
      "updatedAt": "2026-09-23T09:30:00.000Z"
    }
  }
  ```

---

### 1.4. Record Advertisement Click

- **Route**: `/api/v1/advertisement/:id/click`
- **Method**: `POST`
- **Access Level**: `Public`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Request Example**:
  ```http
  POST /api/v1/advertisement/e8a93cb2-9d32-4fb2-a634-11fa6bb8c8e1/click
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Click recorded successfully",
    "data": {
      "id": "e8a93cb2-9d32-4fb2-a634-11fa6bb8c8e1",
      "clicks": 15
    }
  }
  ```

---

### 1.5. Update Advertisement

- **Route**: `/api/v1/advertisement/:id`
- **Method**: `PATCH`
- **Access Level**: `SUPER_ADMIN` only
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: application/json (or multipart/form-data with file)
  ```
- **Request Body** (all fields optional):
  ```json
  {
    "companyName": "Updated Company Ltd",
    "title": "Updated Autumn Campaign",
    "subtitle": "New special weekend discounts",
    "url": "https://chaim-rentals.com/autumn",
    "position": "HOME_MIDDLE",
    "isActive": false
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Advertisement updated successfully",
    "data": {
      "id": "e8a93cb2-9d32-4fb2-a634-11fa6bb8c8e1",
      "title": "Updated Autumn Campaign",
      "image": "https://example.com/uploads/ads/holiday-banner.png",
      "targetUrl": "https://chaim-rentals.com/promotions/holiday-2026",
      "position": "HOME_MIDDLE",
      "isActive": false,
      "clicks": 15,
      "startDate": "2026-10-01T00:00:00.000Z",
      "endDate": "2026-10-31T23:59:59.000Z",
      "createdAt": "2026-09-22T09:30:00.000Z",
      "updatedAt": "2026-09-22T09:45:00.000Z"
    }
  }
  ```

---

### 1.6. Delete Advertisement

- **Route**: `/api/v1/advertisement/:id`
- **Method**: `DELETE`
- **Access Level**: `SUPER_ADMIN` only
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Example**:
  ```http
  DELETE /api/v1/advertisement/e8a93cb2-9d32-4fb2-a634-11fa6bb8c8e1
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Advertisement deleted successfully",
    "data": {
      "id": "e8a93cb2-9d32-4fb2-a634-11fa6bb8c8e1",
      "title": "Updated Autumn Campaign"
    }
  }
  ```

---

# Part 2: System Alerts API

---

### 2.1. Broadcast / Create Alert

- **Route**: `/api/v1/alert`
- **Method**: `POST`
- **Access Level**: `SUPER_ADMIN` only
- **Note**: Broadcasts live WebSocket event `newAlert` to connected clients automatically upon creation.
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "title": "Scheduled Maintenance Notice",
    "message": "Platform updates will occur tonight between 02:00 AM and 03:00 AM UTC.",
    "type": "WARNING",
    "targetRole": "USER",
    "targetUserId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "link": "/announcements/maintenance-schedule",
    "isActive": true
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "statusCode": 201,
    "success": true,
    "message": "Alert created and broadcasted successfully",
    "data": {
      "id": "3c84f1a2-e61b-4f81-807e-97ef9c8192a3",
      "title": "Scheduled Maintenance Notice",
      "message": "Platform updates will occur tonight between 02:00 AM and 03:00 AM UTC.",
      "type": "WARNING",
      "targetRole": "USER",
      "targetUserId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "link": "/announcements/maintenance-schedule",
      "isActive": true,
      "createdAt": "2026-09-22T09:50:00.000Z",
      "updatedAt": "2026-09-22T09:50:00.000Z"
    }
  }
  ```

---

### 2.2. Get User's Active Alerts (In-App Notifications)

- **Route**: `/api/v1/alert/my-alerts`
- **Method**: `GET`
- **Access Level**: `Authenticated` (`USER`, `AMBASSADOR`, `SUPER_ADMIN`)
- **Headers**:
  ```http
  Authorization: Bearer <USER_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Active alerts retrieved successfully",
    "data": [
      {
        "id": "3c84f1a2-e61b-4f81-807e-97ef9c8192a3",
        "title": "Scheduled Maintenance Notice",
        "message": "Platform updates will occur tonight between 02:00 AM and 03:00 AM UTC.",
        "type": "WARNING",
        "targetRole": "USER",
        "targetUserId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "link": "/announcements/maintenance-schedule",
        "isActive": true,
        "createdAt": "2026-09-22T09:50:00.000Z",
        "updatedAt": "2026-09-22T09:50:00.000Z"
      }
    ]
  }
  ```

---

### 2.3. Mark All Alerts as Read

- **Route**: `/api/v1/alert/mark-all-read`
- **Method**: `PATCH`
- **Access Level**: `Authenticated` (`USER`, `AMBASSADOR`, `SUPER_ADMIN`)
- **Headers**:
  ```http
  Authorization: Bearer <USER_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Alerts marked as read",
    "data": {
      "success": true,
      "message": "Alerts marked as read",
      "count": 3
    }
  }
  ```

---

### 2.4. Admin: Get All Alert History (With Filters)

- **Route**: `/api/v1/alert`
- **Method**: `GET`
- **Access Level**: `SUPER_ADMIN` only
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Query Parameters**:
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `type` | `string` | No | Filter by alert type (`INFO`, `WARNING`, `SUCCESS`, `URGENT`). |
  | `targetRole` | `string` | No | Filter by role (`USER`, `AMBASSADOR`, `SUPER_ADMIN`). |
  | `isActive` | `string` | No | Filter by active status (`true` or `false`). |

- **Request Example**:
  ```http
  GET /api/v1/alert?type=URGENT&isActive=true
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Alerts retrieved successfully",
    "data": [
      {
        "id": "5e17a3f0-bb82-411a-a829-843e93a70241",
        "title": "System Outage Resolved",
        "message": "All payment gateways are fully operational.",
        "type": "SUCCESS",
        "targetRole": null,
        "targetUserId": null,
        "link": null,
        "isActive": true,
        "createdAt": "2026-09-22T08:15:00.000Z",
        "updatedAt": "2026-09-22T08:15:00.000Z"
      }
    ]
  }
  ```

---

### 2.5. Admin: Update Alert

- **Route**: `/api/v1/alert/:id`
- **Method**: `PATCH`
- **Access Level**: `SUPER_ADMIN` only
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Body** (all fields optional):
  ```json
  {
    "title": "Updated Emergency Notice",
    "isActive": false
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Alert updated successfully",
    "data": {
      "id": "3c84f1a2-e61b-4f81-807e-97ef9c8192a3",
      "title": "Updated Emergency Notice",
      "message": "Platform updates will occur tonight between 02:00 AM and 03:00 AM UTC.",
      "type": "WARNING",
      "targetRole": "USER",
      "targetUserId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "link": "/announcements/maintenance-schedule",
      "isActive": false,
      "createdAt": "2026-09-22T09:50:00.000Z",
      "updatedAt": "2026-09-22T10:00:00.000Z"
    }
  }
  ```

---

### 2.6. Admin: Delete Alert

- **Route**: `/api/v1/alert/:id`
- **Method**: `DELETE`
- **Access Level**: `SUPER_ADMIN` only
- **Headers**:
  ```http
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Example**:
  ```http
  DELETE /api/v1/alert/3c84f1a2-e61b-4f81-807e-97ef9c8192a3
  Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
  ```
- **Response** (`200 OK`):
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Alert deleted successfully",
    "data": {
      "id": "3c84f1a2-e61b-4f81-807e-97ef9c8192a3",
      "title": "Updated Emergency Notice"
    }
  }
  ```

---

## 3. Error Responses Reference

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "success": false,
  "message": "You are not authorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Forbidden access! You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Advertisement not found"
}
```

### 400 Validation Error
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "title",
      "message": "Title is required"
    }
  ]
}
```
