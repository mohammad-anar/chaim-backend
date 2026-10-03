# Admin Promotion & Yearly Listing Fee Setting API Integration Guide
> **API Specification:** Yearly Listing Fee Promotion Toggle & Status Endpoints  
> **Database Model:** `AppSetting` (`app_settings` table in PostgreSQL)  
> **Target Audience:** Frontend Developers & Admin Dashboard Integration

---

## 1. Overview & Database Architecture

The system-wide promotion toggle is stored in PostgreSQL using the `AppSetting` model:

- **Key**: `"yearly_fee_on_sale"`
- **Value**: `"true"` or `"false"`
- **Behavior**:
  - When **ON (`true`)**: The annual listing fee (₪28) is waived (₪0). First-time and renewing owners activate listings for free.
  - When **OFF (`false`)**: Standard ₪28 yearly listing fee applies via Nedarim Plus.

---

## 2. API Endpoints

### 2.1 Get Current Promotion / Listing Fee Status (Admin & Public)

Used by the Admin Dashboard settings page to load the current switch state, and by the owner activation page to display the pricing banner.

- **Method**: `GET`
- **Endpoints** *(both routes are supported)*:
  - `/api/v1/admin/settings/yearly-fee-sale`
  - `/api/v1/payment/listing-fee-status`

#### Request Headers
```http
Accept: application/json
Authorization: Bearer <JWT_TOKEN>
```
*(Note: `Authorization` is required for `/admin/settings/*` and optional for `/payment/listing-fee-status`)*

#### Request Body
*None (Query/GET request)*

#### Response — 200 OK (Promotion ON)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Listing fee status retrieved successfully",
  "data": {
    "standardFee": 28,
    "isOnSale": true,
    "effectiveFee": 0,
    "currency": "ILS"
  }
}
```

#### Response — 200 OK (Promotion OFF)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Listing fee status retrieved successfully",
  "data": {
    "standardFee": 28,
    "isOnSale": false,
    "effectiveFee": 28,
    "currency": "ILS"
  }
}
```

---

### 2.2 Toggle Yearly Listing Fee Promotion (Admin Only)

Called when the Super Admin flips the switch in the Admin Settings dashboard.

- **Method**: `PATCH`
- **Endpoints** *(both routes are supported)*:
  - `/api/v1/admin/settings/yearly-fee-sale`
  - `/api/v1/payment/admin/yearly-fee-sale`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
```

#### Request Body (Turn Promotion ON)
```json
{
  "isOnSale": true
}
```

#### Request Body (Turn Promotion OFF)
```json
{
  "isOnSale": false
}
```

#### Response — 200 OK (Promotion Enabled)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Yearly fee promotion enabled successfully",
  "data": {
    "isOnSale": true
  }
}
```

#### Response — 200 OK (Promotion Disabled)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Yearly fee promotion disabled successfully",
  "data": {
    "isOnSale": false
  }
}
```

#### Error Response — 401 Unauthorized
```json
{
  "statusCode": 401,
  "success": false,
  "message": "You are not authorized"
}
```

#### Error Response — 403 Forbidden (Non-Admin User)
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Forbidden access"
}
```

---

### 2.3 1-Click Free Listing Activation (Owner Flow)

Called by the listing owner when `isOnSale` is `true`. Activates the property for 365 days with status `CONFIRMED` without charging any fee.

- **Method**: `POST`
- **Endpoint**: `/api/v1/payment/activate-free-listing`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <USER_JWT_TOKEN>
```

#### Request Body
```json
{
  "apartmentId": "c6a6f1d2-38b4-467a-a63e-908316274029"
}
```

#### Response — 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Listing activated for free under current promotion",
  "data": {
    "success": true,
    "apartmentId": "c6a6f1d2-38b4-467a-a63e-908316274029",
    "expiresAt": "2027-09-27T10:38:00.000Z",
    "transactionId": "PROMO-FREE-1790483880000-c6a6f1d2"
  }
}
```

#### Error Response — 403 Forbidden (If Promotion is Turned OFF)
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Yearly fee promotion is not currently active. Please pay the standard listing fee."
}
```

#### Error Response — 404 Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Apartment not found or you do not own it"
}
```

---

## 3. Quick Reference Table

| Action | HTTP Method | Endpoint Path | Role Required | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| **Get Fee & Sale Status** | `GET` | `/api/v1/payment/listing-fee-status`<br/>`/api/v1/admin/settings/yearly-fee-sale` | Any / Admin | *None* |
| **Toggle Sale Promotion** | `PATCH` | `/api/v1/admin/settings/yearly-fee-sale`<br/>`/api/v1/payment/admin/yearly-fee-sale` | `SUPER_ADMIN` | `{ "isOnSale": boolean }` |
| **Activate Listing Free** | `POST` | `/api/v1/payment/activate-free-listing` | Authenticated User | `{ "apartmentId": string }` |
