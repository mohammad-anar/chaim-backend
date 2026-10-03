# Auth, Roles & User Onboarding Integration Guide

This guide details the complete authentication, role-based onboarding (`USER` / Renter vs. `OWNER` / Property Owner), public listing browsing, contact landlord flows, and password recovery mechanisms for **Shabbos Rent**.

---

## Table of Contents
1. [Overview & Role Model](#1-overview--role-model)
2. [Client Feedback Fixes Summary](#2-client-feedback-fixes-summary)
3. [API Endpoints Reference](#3-api-endpoints-reference)
   - [1. User Registration (`POST /api/v1/auth/register`)](#1-user-registration-post-apiv1authregister)
   - [2. User Login (`POST /api/v1/auth/login`)](#2-user-login-post-apiv1authlogin)
   - [3. Forgot Password (`POST /api/v1/auth/forgot-password`)](#3-forgot-password-post-apiv1authforgot-password)
   - [4. Reset Password (`POST /api/v1/auth/reset-password`)](#4-reset-password-post-apiv1authreset-password)
   - [5. Public Apartment Details (`GET /api/v1/apartment/:id`)](#5-public-apartment-details-get-apiv1apartmentid)
   - [6. Contact Landlord via Call / WhatsApp (`POST /api/v1/call/...`)](#6-contact-landlord-via-call--whatsapp)
   - [7. Listing Creation with Role Auto-Upgrade (`POST /api/v1/apartment`)](#7-listing-creation-with-role-auto-upgrade)
4. [Frontend Onboarding & Routing Patterns](#4-frontend-onboarding--routing-patterns)
5. [TypeScript Types & Enums](#5-typescript-types--enums)

---

## 1. Overview & Role Model

The backend supports 3 user roles:
- `USER`: **Renter** / Guest exploring and booking Shabbat rentals.
- `OWNER`: **Property Owner** / Host listing apartments and managing bookings.
- `SUPER_ADMIN`: Platform Administrator.

```typescript
export enum UserRole {
  USER = "USER",
  OWNER = "OWNER",
  SUPER_ADMIN = "SUPER_ADMIN",
}
```

---

## 2. Client Feedback Fixes Summary

| # | Issue / Requirement | Backend Solution & Frontend Handling |
|---|---|---|
| **1** | **Auto-login after signup** | `POST /api/v1/auth/register` returns `accessToken`, `refreshToken`, and full `user` object. Frontend stores the token immediately and auto-logs the user in without sending them to the login page. |
| **2** | **Role-specific landing** | Based on `user.role`: <br>• `OWNER` $\rightarrow$ Navigate to Owner Dashboard (`/dashboard`) <br>• `USER` $\rightarrow$ Navigate to Home Page (`/`) signed in as renter. |
| **3** | **Apartment details public access** | `GET /api/v1/apartment/:id` is 100% public (no token needed). When an unauthenticated visitor clicks **"Contact Landlord"**, prompt login modal or redirect to login with return URL (e.g. `?redirect=/apartments/123`), then return them to the apartment page. |
| **4** | **Forgot Password & Network Error (`ENETUNREACH`)** | Node.js DNS is configured with IPv4 priority (`dns.setDefaultResultOrder('ipv4first')`), resolving Gmail/SMTP IPv6 connection drops. Email failures return clean, user-friendly error messages rather than raw internal error codes. |

---

## 3. API Endpoints Reference

### 1. User Registration (`POST /api/v1/auth/register`)

Registers a new user (renter or owner) and immediately returns authentication tokens.

- **URL**: `/api/v1/auth/register`
- **Method**: `POST`
- **Access**: Public
- **Content-Type**: `application/json` (or `multipart/form-data` with avatar `image`)

#### Request Body
```json
{
  "username": "chaim_cohen",
  "email": "chaim@example.com",
  "phone": "+972501234567",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "role": "OWNER", // Optional: "OWNER" or "USER" (defaults to "USER")
  "referralCode": "AMBASSADOR123", // Optional
  "marketingPlatformId": null // Optional
}
```

#### Response (`201 Created`)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "User registered successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "u-4521-8899",
      "username": "chaim_cohen",
      "email": "chaim@example.com",
      "phone": "+972501234567",
      "profileImage": null,
      "role": "OWNER",
      "status": "ACTIVE",
      "isVerified": true,
      "createdAt": "2026-09-24T08:30:00.000Z",
      "updatedAt": "2026-09-24T08:30:00.000Z"
    }
  }
}
```

---

### 2. User Login (`POST /api/v1/auth/login`)

Authenticates an existing user via email, phone, or username.

- **URL**: `/api/v1/auth/login`
- **Method**: `POST`
- **Access**: Public
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "identifier": "chaim@example.com", // email, phone, or username
  "password": "Password123!"
}
```

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "u-4521-8899",
      "username": "chaim_cohen",
      "email": "chaim@example.com",
      "phone": "+972501234567",
      "role": "OWNER",
      "status": "ACTIVE",
      "isVerified": true
    }
  }
}
```

---

### 3. Forgot Password (`POST /api/v1/auth/forgot-password`)

Sends a secure password reset link to the user's email.

- **URL**: `/api/v1/auth/forgot-password`
- **Method**: `POST`
- **Access**: Public
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "email": "chaim@example.com"
}
```

#### Success Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Password reset OTP generated and stored successfully",
  "data": {
    "message": "Password reset OTP sent successfully",
    "email": "chaim@example.com"
  }
}
```

---

### 4. Verify OTP (`POST /api/v1/auth/verify-otp`)

Verifies the 6-digit OTP received via email and issues a temporary `resetToken`.

- **URL**: `/api/v1/auth/verify-otp`
- **Method**: `POST`
- **Access**: Public
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### Request Body
```json
{
  "identifier": "chaim@example.com",
  "otp": 583921
}
```

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "message": "OTP verified successfully",
    "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 5. Reset Password (`POST /api/v1/auth/reset-password`)

Sets the new password using the `resetToken` received from OTP verification.

- **URL**: `/api/v1/auth/reset-password`
- **Method**: `POST`
- **Headers**:
  ```http
  Authorization: Bearer <resetToken>
  Content-Type: application/json
  ```

#### Request Body
```json
{
  "newPassword": "NewSecurePassword123!",
  "confirmNewPassword": "NewSecurePassword123!"
}
```

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Password reset successfully",
  "data": null
}
```

---

### 6. Public Apartment Details (`GET /api/v1/apartment/:id`)

Fetches apartment listing details. **No login is required.**

- **URL**: `/api/v1/apartment/:id`
- **Method**: `GET`
- **Access**: Public
- **Response**: Full apartment card object, reviews, amenities, and availability.

---

### 6. Contact Landlord via Call / WhatsApp

Initiates direct voice connection or WhatsApp conversation with the listing owner. Requires authentication.

#### A. WhatsApp Contact (`POST /api/v1/call/initiate-whatsapp`)
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "apartmentId": "apart-003",
    "message": "Shalom! I would like to inquire about availability for Shabbat."
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "WhatsApp contact link generated successfully",
    "data": {
      "whatsappUrl": "https://wa.me/972501234567?text=...",
      "targetPhone": "972501234567"
    }
  }
  ```

---

### 7. Listing Creation with Role Auto-Upgrade

If a renter (`USER`) creates an apartment listing via `POST /api/v1/apartment`, the backend **automatically upgrades their account role to `OWNER`**.

- **URL**: `/api/v1/apartment`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Behavior**:
  1. Creates the apartment listing.
  2. If the user's role was `USER`, updates `User.role` in the database to `OWNER`.
  3. Returns the newly created apartment.

---

## 4. Frontend Onboarding & Routing Patterns

### Sign-up Screen Logic

```typescript
import { useRouter } from "next/router";

// 1. Account type selection
export function SignupChoicePage() {
  const router = useRouter();

  const handleSelectType = (role: "USER" | "OWNER") => {
    router.push(`/signup/form?role=${role}`);
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold mb-2">Welcome to Shabos Rent</h1>
      <p className="text-gray-600 mb-6">Choose an account type to get started.</p>

      {/* Renter Card */}
      <button 
        onClick={() => handleSelectType("USER")}
        className="w-full p-4 mb-4 border rounded-xl text-left hover:border-blue-500 transition"
      >
        <h3 className="font-semibold text-lg">Sign up as a renter</h3>
        <p className="text-sm text-gray-500">Find and book weekend rentals.</p>
      </button>

      {/* Owner Card */}
      <button 
        onClick={() => handleSelectType("OWNER")}
        className="w-full p-4 border rounded-xl text-left hover:border-blue-500 transition"
      >
        <h3 className="font-semibold text-lg">Sign up as an owner</h3>
        <p className="text-sm text-gray-500">List your property and host guests for Shabbatot.</p>
      </button>
    </div>
  );
}
```

### Auto-Login & Navigation Handler

```typescript
async function handleSignupSubmit(formData: any, selectedRole: "USER" | "OWNER") {
  const response = await fetch("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...formData,
      role: selectedRole,
    }),
  });

  const resJson = await response.json();

  if (resJson.success) {
    // 1. Store tokens immediately
    localStorage.setItem("accessToken", resJson.data.accessToken);
    localStorage.setItem("refreshToken", resJson.data.refreshToken);
    localStorage.setItem("user", JSON.stringify(resJson.data.user));

    // 2. Redirect based on role
    if (resJson.data.user.role === "OWNER") {
      router.push("/dashboard"); // Owner dashboard
    } else {
      router.push("/"); // Renter lands on homepage signed in
    }
  } else {
    alert(resJson.message || "Registration failed");
  }
}
```

### Apartment Page "Contact Landlord" Login Redirect

```typescript
function handleContactLandlord(apartmentId: string) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    // Save current apartment page URL and open login
    const currentPath = window.location.pathname;
    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    return;
  }

  // User is logged in: initiate WhatsApp or voice call
  initiateWhatsAppContact(apartmentId);
}
```

---

## 5. TypeScript Types & Enums

```typescript
export enum UserRole {
  USER = "USER",
  OWNER = "OWNER",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export interface IAuthUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  profileImage: string | null;
  role: UserRole;
  status: "ACTIVE" | "BLOCKED" | "SUSPENDED";
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: IAuthUser;
}
```
