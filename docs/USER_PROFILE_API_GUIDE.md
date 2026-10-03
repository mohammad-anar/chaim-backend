# User Profile & Account Management API Documentation

This document outlines the API endpoints, TypeScript types, validation rules, enums, request/response formats, and integration instructions for **User Profile Management**, **Profile Picture Upload**, and **Password Management**.

---

## Table of Contents
1. [General Request Headers & Auth](#1-general-request-headers--auth)
2. [Relevant Enums & Types](#2-relevant-enums--types)
3. [API Endpoints Summary](#3-api-endpoints-summary)
4. [Endpoint Specifications](#4-endpoint-specifications)
   - [1. Get Current User Profile (`GET /api/v1/user/me`)](#1-get-current-user-profile-get-apiv1userme)
   - [2. Update Profile & Avatar (`PATCH /api/v1/user/update-me`)](#2-update-profile--avatar-patch-apiv1userupdate-me)
   - [3. Change Password (`POST /api/v1/auth/change-password`)](#3-change-password-post-apiv1authchange-password)
5. [Standard Response & Error Formats](#5-standard-response--error-formats)

---

## 1. General Request Headers & Auth

- **Base URL**: `/api/v1`
- **Authentication**: JWT Bearer Token in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Content-Type**:
  - `application/json` for standard JSON requests
  - `multipart/form-data` for file uploads (e.g., avatar / profile image)

---

## 2. Relevant Enums & Types

```typescript
export enum UserRole {
  USER = "USER",
  OWNER = "OWNER",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
  SUSPENDED = "SUSPENDED",
}
```

---

## 3. API Endpoints Summary

| # | Action | Method | Endpoint | Content-Type | Access |
|---|---|---|---|---|---|
| 1 | **Get My Profile** | `GET` | `/api/v1/user/me` | N/A | Logged-in User |
| 2 | **Update Profile & Avatar** | `PATCH` | `/api/v1/user/update-me` | `multipart/form-data` or `application/json` | Logged-in User |
| 3 | **Change Password** | `POST` | `/api/v1/auth/change-password` | `application/json` | Logged-in User |

---

## 4. Endpoint Specifications

### 1. Get Current User Profile (`GET /api/v1/user/me`)

Retrieves the authenticated user's profile information, apartment listings, and subscription status.

- **URL**: `/api/v1/user/me`
- **Method**: `GET`
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  ```

#### TypeScript Response Interface
```typescript
export interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

export interface IMarketingEmail {
  id: string;
  userId: string;
  email: string;
  isSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IUserProfile {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  profileImage: string | null;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  apartments: Array<{
    id: string;
    title: string;
    availabilities?: Array<any>;
    listingPayment?: any;
    [key: string]: any;
  }>;
  marketingEmail: IMarketingEmail | null;
}
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "c1f72c21-9989-4911-8ecb-99d82136d859",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "profileImage": "/image/avatar-1726372000.png",
    "role": "USER",
    "status": "ACTIVE",
    "isVerified": true,
    "isDeleted": false,
    "createdAt": "2026-09-01T10:00:00.000Z",
    "updatedAt": "2026-09-15T03:00:00.000Z",
    "apartments": [],
    "marketingEmail": null
  }
}
```

---

### 2. Update Profile & Avatar (`PATCH /api/v1/user/update-me`)

Allows the authenticated user to update their username, email, phone, and upload a profile picture / avatar.

- **URL**: `/api/v1/user/update-me`
- **Method**: `PATCH`
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Accepted File Field Names**: `image`, `profileImage`, `avatar` (Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`, `.gif`, `.heic`)

#### Validation Rules (Zod)
- `username` *(optional)*: string, minimum 3 characters. Must be unique if changed.
- `email` *(optional)*: string, valid email format. Must be unique if changed.
- `phone` *(optional)*: string. Must be unique if changed.
- `marketingPlatformId` *(optional)*: string

#### TypeScript Request Type
```typescript
export interface IUpdateProfilePayload {
  username?: string;
  email?: string;
  phone?: string;
  marketingPlatformId?: string;
}
```

#### Frontend Integration Examples

**A. Form Data with Profile Image / Avatar:**
```typescript
const formData = new FormData();
if (username) formData.append("username", username);
if (email) formData.append("email", email);
if (phone) formData.append("phone", phone);
if (imageFile) formData.append("image", imageFile); // or 'avatar' or 'profileImage'

const response = await fetch("/api/v1/user/update-me", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

**B. Standard JSON (without file upload):**
```http
PATCH /api/v1/user/update-me
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "username": "new_username",
  "email": "new_email@example.com",
  "phone": "+1234567890"
}
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "id": "c1f72c21-9989-4911-8ecb-99d82136d859",
    "username": "new_username",
    "email": "new_email@example.com",
    "phone": "+1234567890",
    "profileImage": "/image/file-1726372800000.png",
    "role": "USER",
    "status": "ACTIVE",
    "isVerified": true,
    "createdAt": "2026-09-01T10:00:00.000Z",
    "updatedAt": "2026-09-15T04:00:00.000Z"
  }
}
```

---

### 3. Change Password (`POST /api/v1/auth/change-password`)

Allows an authenticated user to change their password by providing their current password.

- **URL**: `/api/v1/auth/change-password`
- **Method**: `POST`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <access_token>
  ```

#### TypeScript Request Type
```typescript
export interface IChangePasswordReq {
  oldPassword: string; // Required (min 1 char)
  newPassword: string; // Required (min 6 chars)
}
```

#### Sample Request Body
```json
{
  "oldPassword": "CurrentPassword123!",
  "newPassword": "NewSecretPassword123!"
}
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

---

## 5. Standard Response & Error Formats

### Standard Success Response Envelope
```json
{
  "success": true,
  "message": "Action message here",
  "data": { ... }
}
```

### Standard Error Response Envelope
```json
{
  "success": false,
  "message": "Error description",
  "errorMessages": [
    {
      "path": "fieldName",
      "message": "Specific validation issue"
    }
  ]
}
```

### Common HTTP Status Codes
- `200 OK`: Request succeeded.
- `400 Bad Request`: Validation error (e.g. invalid email format, passwords too short).
- `401 Unauthorized`: Missing or invalid JWT Bearer token.
- `403 Forbidden`: Insufficient role permissions.
- `404 Not Found`: User record does not exist or has been deleted.
- `409 Conflict`: Username, email, or phone number already taken by another account.
- `500 Internal Server Error`: Server encountered an unexpected error.
