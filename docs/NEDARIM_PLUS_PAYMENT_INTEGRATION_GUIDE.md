# Nedarim Plus (נדרים פלוס) — Full Frontend Payment Integration Guide

> **Gateway:** Nedarim Plus V6 — Israeli charity/payment processor  
> **Base URL:** `https://matara.pro/nedarimplus/V6/`  
> **Currency:** ILS (Israeli New Shekel ₪)  
> **Backend:** Chaim Backend — Node.js / Express / Prisma

---

## Table of Contents

1. [Overview & Flow](#1-overview--flow)
2. [Environment Variables & Config](#2-environment-variables--config)
3. [Test / Sandbox Mode](#3-test--sandbox-mode)
4. [Payment Types & Fees](#4-payment-types--fees)
5. [Step-by-Step Integration Flow](#5-step-by-step-integration-flow)
6. [Backend API Reference](#6-backend-api-reference)
7. [Iframe Integration (Primary Method)](#7-iframe-integration-primary-method)
8. [postMessage Callback Handling](#8-postmessage-callback-handling)
9. [Verify Payment After iframe Completion](#9-verify-payment-after-iframe-completion)
10. [Direct Card Payment (Fallback)](#10-direct-card-payment-fallback)
11. [Full React/TypeScript Example — Listing Payment](#11-full-reacttypescript-example--listing-payment)
12. [Full React/TypeScript Example — Swap Payment](#12-full-reacttypescript-example--swap-payment)
13. [Full React/TypeScript Example — Report Rented Payment](#13-full-reacttypescript-example--report-rented-payment)
14. [Nedarim Webhook / Server Callback](#14-nedarim-webhook--server-callback)
15. [Error Handling & Edge Cases](#15-error-handling--edge-cases)
16. [Checklist Before Going Live](#16-checklist-before-going-live)

---

## 1. Overview & Flow

```
Frontend                         Backend                     Nedarim Plus
   |                                |                              |
   |-- POST /payment/create-*-intent -->                           |
   |<-- { mosadId, amount, listingPaymentId, ... } --|             |
   |                                                               |
   |-- Embed iframe with URL params ----------------------->      |
   |<-- postMessage on payment success ----------------------     |
   |   { TransactionId, ... }                                      |
   |                                                               |
   |-- POST /payment/verify-nedarim ------> verifyNedarimTransaction()
   |                              |-- GET Nedarim API (Status check) -->
   |                              |<-- { Status: "1", Amount } --------|
   |<-- { success: true } --------|
```

**Two methods exist:**
| Method | When to use |
|--------|-------------|
| **iframe** | Primary. Nedarim handles card UI inside the iframe. Safest, PCI-compliant. |
| **direct-card** | Fallback for when iframe is blocked or for admin bypass. Card data sent to backend. |

---

## 2. Environment Variables & Config

### Backend `.env`
```env
# Nedarim Plus Credentials
NEDARIM_MOSAD_ID=YOUR_MOSAD_ID_HERE
NEDARIM_API_VALID=YOUR_API_VALID_KEY_HERE

# Fee Amounts (ILS)
APARTMENT_LISTING_FEE=28
SWAP_REQUEST_FEE=50
REPORT_RENTED_FEE=50
```

### Frontend `.env`
```env
NEXT_PUBLIC_API_URL=https://your-api.chaim.com
NEXT_PUBLIC_NEDARIM_MOSAD_ID=YOUR_MOSAD_ID_HERE   # Optional: can be fetched from backend intent response
```

> **Note:** The `mosadId` is always returned by the backend in the payment intent response — you don't need to hardcode it in the frontend.

---

## 3. Test / Sandbox Mode

Nedarim Plus does **NOT** have a separate sandbox environment like Stripe. However, the backend has a built-in **development bypass**:

```ts
// src/helpers/nedarim.ts — lines 33-42
if (!mosadId || !apiValid || mosadId === "your_nedarim_mosad_id") {
  // Dev fallback: accepts ANY transactionId as valid
  return {
    isSuccess: true,
    transactionId,
    confirmationNo: `DEV-${Date.now()}`,
    message: "Verified in local development mode",
  };
}
```

**In development:**
- Leave `NEDARIM_MOSAD_ID` and `NEDARIM_API_VALID` empty OR set them to placeholder values.
- The backend will auto-approve any `transactionId` you send to `/payment/verify-nedarim`.
- Use a fake `transactionId` like `TEST-12345` for local testing.

**For real testing with actual Nedarim credentials:**
- Get your `MosadId` and `ApiValid` from the Nedarim Plus admin dashboard.
- Test with a real (or Nedarim test) card in the iframe.
- The Nedarim Plus verification endpoint: `https://matara.pro/nedarimplus/V6/Files/Webservices/GetTransactionStatus.aspx`

---

## 4. Payment Types & Fees

| Payment Type | Backend Key | Fee (ILS) | What it unlocks |
|---|---|---|---|
| Apartment Listing | `APARTMENT_LISTING` | 28 | Activates apartment for 1 year |
| Swap Request | `SWAP_REQUEST` | 50 | Approves swap between two apartments |
| Report Rented | `REPORT_RENTED` | 50 | Confirms apartment was rented |

---

## 5. Step-by-Step Integration Flow

### For ALL payment types:

```
1. Call POST /payment/create-{type}-intent  ->  get { mosadId, amount, listingPaymentId/swapPaymentId/reportRentedPaymentId, ... }
2. Build the Nedarim iframe URL using the returned data
3. Show iframe to user — user fills in card details
4. Listen for window.postMessage from the iframe
5. On success: extract TransactionId from postMessage data
6. Call POST /payment/verify-nedarim with { transactionId, paymentType, paymentRecordId }
7. Backend verifies with Nedarim API + updates DB
8. Show success UI
```

---

## 6. Backend API Reference

### Base URL
```
https://your-api.chaim.com/api/v1/payment
```

All routes (except nedarim-callback) require `Authorization: Bearer <JWT_TOKEN>` header.

---

### 6.1 Create Listing Payment Intent
```http
POST /payment/create-listing-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "apartmentId": "clxyz123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mosadId": "12345",
    "amount": 28,
    "currency": "ILS",
    "paymentType": "APARTMENT_LISTING",
    "listingPaymentId": "payment-record-id",
    "apartmentId": "clxyz123...",
    "clientName": "Moshe Cohen",
    "clientEmail": "moshe@example.com",
    "clientPhone": "0501234567",
    "validityDuration": "1 Year"
  }
}
```

---

### 6.2 Create Swap Payment Intent
```http
POST /payment/create-swap-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "swapId": "swap-id-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mosadId": "12345",
    "amount": 50,
    "currency": "ILS",
    "paymentType": "SWAP_REQUEST",
    "swapPaymentId": "payment-record-id",
    "swapId": "swap-id-here",
    "clientName": "Moshe Cohen",
    "clientEmail": "moshe@example.com",
    "clientPhone": "0501234567"
  }
}
```

---

### 6.3 Create Report Rented Payment Intent
```http
POST /payment/create-report-rented-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportType": "RENT",
  "weekend": "2026-10-10",
  "targetApartmentId": "optional-target-apt-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mosadId": "12345",
    "amount": 50,
    "currency": "ILS",
    "paymentType": "REPORT_RENTED",
    "reportRentedPaymentId": "payment-record-id",
    "reportRentedId": "report-rented-id",
    "clientName": "Moshe Cohen",
    "clientEmail": "moshe@example.com",
    "clientPhone": "0501234567"
  }
}
```

---

### 6.4 Verify Nedarim Payment (Call AFTER iframe completes)
```http
POST /payment/verify-nedarim
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionId": "TX-FROM-IFRAME-POSTMESSAGE",
  "paymentType": "APARTMENT_LISTING",
  "paymentRecordId": "listingPaymentId-from-step-1"
}
```

**Possible `paymentType` values:**
- `"APARTMENT_LISTING"`
- `"SWAP_REQUEST"`
- `"REPORT_RENTED"`

**Response (success):**
```json
{
  "success": true,
  "message": "Apartment listing payment confirmed and apartment activated for 1 year successfully",
  "data": {
    "success": true,
    "apartmentId": "clxyz123...",
    "transactionId": "TX-FROM-NEDARIM",
    "paidAt": "2026-09-27T08:00:00.000Z",
    "expiresAt": "2027-09-27T08:00:00.000Z"
  }
}
```

---

### 6.5 Direct Card Payment (Fallback — No iframe)
```http
POST /payment/direct-card
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentType": "APARTMENT_LISTING",
  "apartmentId": "clxyz123...",
  "paymentRecordId": "optional-existing-record-id"
}
```

> WARNING: Direct card skips Nedarim verification entirely — it auto-completes the payment in the DB. Use only for admin override or test mode.

---

### 6.6 Nedarim Webhook Callback (Server-to-server, no auth needed)
```http
POST /payment/nedarim-callback
GET  /payment/nedarim-callback
```

> This is called automatically by Nedarim Plus servers when a payment is completed. Configure this URL in the Nedarim admin dashboard. No frontend action needed.

---

## 7. Iframe Integration (Primary Method)

### Nedarim Plus Iframe URL Structure

```
https://matara.pro/nedarimplus/V6/?
  mosadId=YOUR_MOSAD_ID
  &ApiValid=YOUR_API_VALID
  &Amount=28
  &Tashlumim=1
  &Currency=1
  &Param1=APARTMENT_LISTING
  &Param2=PAYMENT_RECORD_ID
  &Name=Client+Name
  &Email=client@email.com
  &Phone=0501234567
  &CallBack=https://your-api.chaim.com/api/v1/payment/nedarim-callback
```

### Key Parameters

| Parameter | Description | Example |
|---|---|---|
| `mosadId` | Your institution ID from Nedarim | `12345` |
| `ApiValid` | API validation key | `abc123xyz` |
| `Amount` | Payment amount in ILS | `28` |
| `Tashlumim` | Number of installments (1 = single payment) | `1` |
| `Currency` | 1 = ILS, 2 = USD | `1` |
| `Param1` | Custom field 1 — use for paymentType | `APARTMENT_LISTING` |
| `Param2` | Custom field 2 — use for paymentRecordId | `payment-record-id` |
| `Name` | Pre-fill client name | `Moshe Cohen` |
| `Email` | Pre-fill client email | `moshe@example.com` |
| `Phone` | Pre-fill client phone | `0501234567` |
| `CallBack` | Server webhook URL | `https://api/nedarim-callback` |

### Building the iframe URL (TypeScript)

```ts
function buildNedarimIframeUrl(intent: {
  mosadId: string;
  amount: number;
  paymentType: string;
  paymentRecordId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}): string {
  const callbackUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/nedarim-callback`;

  const params = new URLSearchParams({
    mosadId: intent.mosadId,
    Amount: String(intent.amount),
    Tashlumim: "1",
    Currency: "1",
    Param1: intent.paymentType,
    Param2: intent.paymentRecordId,
    Name: intent.clientName,
    Email: intent.clientEmail,
    Phone: intent.clientPhone,
    CallBack: callbackUrl,
  });

  return `https://matara.pro/nedarimplus/V6/?${params.toString()}`;
}
```

### HTML iframe embed example

```html
<iframe
  id="nedarim-payment-frame"
  src="https://matara.pro/nedarimplus/V6/?mosadId=12345&Amount=28&Tashlumim=1&Currency=1&Param1=APARTMENT_LISTING&Param2=payment-record-id&Name=Moshe+Cohen&Email=moshe%40example.com&Phone=0501234567&CallBack=https%3A%2F%2Fapi.chaim.com%2Fapi%2Fv1%2Fpayment%2Fnedarim-callback"
  width="100%"
  height="600"
  frameborder="0"
  scrolling="no"
  allow="payment"
  title="Nedarim Plus Payment"
></iframe>
```

---

## 8. postMessage Callback Handling

After a successful payment, Nedarim Plus sends a `window.postMessage` to the parent window.

```ts
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Verify origin for security
    if (typeof event.origin === "string" && !event.origin.includes("matara.pro")) {
      return;
    }

    const data = event.data;
    if (!data) return;

    // Nedarim sends various field names — handle all
    const transactionId =
      data?.TransactionId ||
      data?.transactionId ||
      data?.ConfirmationNo ||
      data?.confirmationNo ||
      data?.TransId ||
      data?.ConfirmationCode;

    if (transactionId) {
      handlePaymentSuccess(String(transactionId));
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []);
```

---

## 9. Verify Payment After iframe Completion

```ts
async function verifyPayment(
  transactionId: string,
  paymentType: "APARTMENT_LISTING" | "SWAP_REQUEST" | "REPORT_RENTED",
  paymentRecordId: string,
  authToken: string
) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/verify-nedarim`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        transactionId,
        paymentType,
        paymentRecordId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.message || "Payment verification failed");
  }

  return response.json();
}
```

---

## 10. Direct Card Payment (Fallback)

```ts
async function processDirectPayment(
  paymentType: string,
  authToken: string,
  options: {
    apartmentId?: string;
    swapId?: string;
    reportRentedId?: string;
    paymentRecordId?: string;
  }
) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/direct-card`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ paymentType, ...options }),
    }
  );

  return response.json();
}
```

> WARNING: This bypasses Nedarim entirely and marks the payment as COMPLETED in the database. Never expose this to regular users in production.

---

## 11. Full React/TypeScript Example — Listing Payment

```tsx
// components/ListingPaymentModal.tsx
import { useState, useEffect, useCallback } from "react";

interface PaymentIntent {
  mosadId: string;
  amount: number;
  listingPaymentId: string;
  apartmentId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

interface Props {
  apartmentId: string;
  authToken: string;
  onSuccess: (result: any) => void;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function ListingPaymentModal({ apartmentId, authToken, onSuccess, onClose }: Props) {
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  // Step 1: Create payment intent
  useEffect(() => {
    fetch(`${API_URL}/api/v1/payment/create-listing-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ apartmentId }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message);
        setIntent(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [apartmentId, authToken]);

  // Step 2: Build iframe URL
  const iframeUrl = intent
    ? `https://matara.pro/nedarimplus/V6/?${new URLSearchParams({
        mosadId: intent.mosadId,
        Amount: String(intent.amount),
        Tashlumim: "1",
        Currency: "1",
        Param1: "APARTMENT_LISTING",
        Param2: intent.listingPaymentId,
        Name: intent.clientName,
        Email: intent.clientEmail,
        Phone: intent.clientPhone,
        CallBack: `${API_URL}/api/v1/payment/nedarim-callback`,
      }).toString()}`
    : null;

  // Step 3: Verify payment after iframe success
  const handlePaymentSuccess = useCallback(
    async (transactionId: string) => {
      if (!intent || verifying) return;
      setVerifying(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/payment/verify-nedarim`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            transactionId,
            paymentType: "APARTMENT_LISTING",
            paymentRecordId: intent.listingPaymentId,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result?.message);
        setPaid(true);
        onSuccess(result.data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setVerifying(false);
      }
    },
    [intent, authToken, verifying, onSuccess]
  );

  // Step 4: Listen for postMessage from Nedarim iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (paid) return;
      // Allow both origin check variants
      if (
        typeof event.origin === "string" &&
        event.origin !== "" &&
        !event.origin.includes("matara.pro")
      ) {
        return;
      }
      const data = event.data;
      const txId =
        data?.TransactionId || data?.transactionId ||
        data?.ConfirmationNo || data?.confirmationNo ||
        data?.TransId || data?.ConfirmationCode;
      if (txId) handlePaymentSuccess(String(txId));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [handlePaymentSuccess, paid]);

  if (loading) return <div style={{ padding: 20 }}>Loading payment...</div>;

  if (paid) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h3>Payment Successful!</h3>
        <p>Your apartment listing is now active for 1 year.</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 520, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Apartment Listing Fee — {intent?.amount} ILS</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer" }}>x</button>
        </div>

        {error && <p style={{ color: "red", marginBottom: 12 }}>Error: {error}</p>}

        {verifying ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p>Verifying your payment, please wait...</p>
          </div>
        ) : iframeUrl ? (
          <div style={{ overflowY: "scroll", WebkitOverflowScrolling: "touch", height: 560 }}>
            <iframe
              src={iframeUrl}
              width="100%"
              height="560"
              frameBorder="0"
              scrolling="yes"
              allow="payment"
              title="Nedarim Plus Secure Payment"
              style={{ border: "none", borderRadius: 8 }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

---

## 12. Full React/TypeScript Example — Swap Payment

```tsx
// components/SwapPaymentModal.tsx
import { useState, useEffect, useCallback } from "react";

interface Props {
  swapId: string;
  authToken: string;
  onSuccess: (result: any) => void;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function SwapPaymentModal({ swapId, authToken, onSuccess, onClose }: Props) {
  const [intent, setIntent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/payment/create-swap-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ swapId }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message);
        setIntent(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [swapId, authToken]);

  const iframeUrl = intent
    ? `https://matara.pro/nedarimplus/V6/?${new URLSearchParams({
        mosadId: intent.mosadId,
        Amount: String(intent.amount),
        Tashlumim: "1",
        Currency: "1",
        Param1: "SWAP_REQUEST",
        Param2: intent.swapPaymentId,
        Name: intent.clientName,
        Email: intent.clientEmail,
        Phone: intent.clientPhone,
        CallBack: `${API_URL}/api/v1/payment/nedarim-callback`,
      }).toString()}`
    : null;

  const verify = useCallback(
    async (transactionId: string) => {
      if (!intent || verifying) return;
      setVerifying(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/payment/verify-nedarim`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            transactionId,
            paymentType: "SWAP_REQUEST",
            paymentRecordId: intent.swapPaymentId,
            swapId: intent.swapId,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result?.message);
        setPaid(true);
        onSuccess(result.data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setVerifying(false);
      }
    },
    [intent, authToken, verifying, onSuccess]
  );

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (paid) return;
      const data = e.data;
      const txId =
        data?.TransactionId || data?.transactionId ||
        data?.ConfirmationNo || data?.confirmationNo;
      if (txId) verify(String(txId));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [verify, paid]);

  if (loading) return <div>Loading...</div>;
  if (paid) return <div>Swap payment successful! Your swap has been approved.</div>;

  return (
    <div>
      <h2>Swap Request Fee — {intent?.amount} ILS</h2>
      <button onClick={onClose}>Close</button>
      {verifying ? (
        <p>Verifying payment...</p>
      ) : (
        <iframe
          src={iframeUrl!}
          width="100%"
          height="600"
          frameBorder="0"
          title="Nedarim Plus Swap Payment"
        />
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
```

---

## 13. Full React/TypeScript Example — Report Rented Payment

```tsx
// components/ReportRentedPaymentModal.tsx
import { useState, useEffect, useCallback } from "react";

interface Props {
  authToken: string;
  reportType?: "RENT" | "SWAP";
  weekend?: string;
  targetApartmentId?: string;
  onSuccess: (result: any) => void;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function ReportRentedPaymentModal({
  authToken, reportType = "RENT", weekend, targetApartmentId, onSuccess, onClose,
}: Props) {
  const [intent, setIntent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/payment/create-report-rented-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ reportType, weekend, targetApartmentId }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message);
        setIntent(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authToken, reportType, weekend, targetApartmentId]);

  const iframeUrl = intent
    ? `https://matara.pro/nedarimplus/V6/?${new URLSearchParams({
        mosadId: intent.mosadId,
        Amount: String(intent.amount),
        Tashlumim: "1",
        Currency: "1",
        Param1: "REPORT_RENTED",
        Param2: intent.reportRentedPaymentId,
        Name: intent.clientName,
        Email: intent.clientEmail,
        Phone: intent.clientPhone,
        CallBack: `${API_URL}/api/v1/payment/nedarim-callback`,
      }).toString()}`
    : null;

  const verify = useCallback(
    async (transactionId: string) => {
      if (!intent || verifying) return;
      setVerifying(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/payment/verify-nedarim`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            transactionId,
            paymentType: "REPORT_RENTED",
            paymentRecordId: intent.reportRentedPaymentId,
            reportRentedId: intent.reportRentedId,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result?.message);
        setPaid(true);
        onSuccess(result.data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setVerifying(false);
      }
    },
    [intent, authToken, verifying, onSuccess]
  );

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (paid) return;
      const data = e.data;
      const txId =
        data?.TransactionId || data?.transactionId ||
        data?.ConfirmationNo || data?.confirmationNo;
      if (txId) verify(String(txId));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [verify, paid]);

  if (loading) return <div>Loading payment...</div>;
  if (paid) return <div>Report rented confirmed! Your rental has been recorded.</div>;

  return (
    <div>
      <h2>Report Rented Fee — {intent?.amount} ILS</h2>
      <button onClick={onClose}>Close</button>
      {verifying ? (
        <p>Verifying payment...</p>
      ) : (
        <iframe
          src={iframeUrl!}
          width="100%"
          height="600"
          frameBorder="0"
          title="Nedarim Plus Report Rented Payment"
        />
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
```

---

## 14. Nedarim Webhook / Server Callback

The backend already handles this at `POST/GET /payment/nedarim-callback`. Nedarim Plus calls this URL server-to-server when a payment is completed.

**Configure this in the Nedarim Plus admin dashboard:**
```
Callback URL: https://your-api.chaim.com/api/v1/payment/nedarim-callback
```

The callback payload from Nedarim:
```json
{
  "TransactionId": "TXN123456",
  "Param1": "APARTMENT_LISTING",
  "Param2": "payment-record-id",
  "Amount": "28",
  "Status": "1"
}
```

The backend extracts `TransactionId`, `Param1` (paymentType), and `Param2` (paymentRecordId) and auto-verifies.

> Note: This is a safety net. The frontend must ALSO call `/verify-nedarim` directly after receiving the postMessage. Do not rely solely on the webhook.

---

## 15. Error Handling & Edge Cases

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| "Listing fee has already been paid" | Payment already completed | Redirect user, don't show form |
| "Apartment not found" | Invalid apartmentId | Verify ID before calling intent |
| "You do not own this apartment" | Wrong user | Frontend auth check |
| "Paid amount less than required" | User paid less | Show error, let user retry |
| "Transaction verification failed" | Nedarim API returned non-success | Check credentials, retry |
| iframe shows blank | mosadId missing or invalid | Check NEDARIM_MOSAD_ID env var |

### iOS Mobile iframe scrolling

```css
.iframe-wrapper {
  -webkit-overflow-scrolling: touch;
  overflow-y: scroll;
  height: 600px;
}

.iframe-wrapper iframe {
  width: 100%;
  height: 100%;
  border: none;
}
```

```tsx
<div className="iframe-wrapper">
  <iframe src={iframeUrl} scrolling="yes" />
</div>
```

### postMessage not firing — fallback

If postMessage does not arrive (e.g., browser blocks it), provide a manual option:

```tsx
// Show this after 2 minutes if paid === false
<div>
  <p>Payment completed but confirmation not received?</p>
  <input
    type="text"
    placeholder="Enter your Transaction ID from Nedarim"
    onChange={(e) => setManualTxId(e.target.value)}
  />
  <button onClick={() => handlePaymentSuccess(manualTxId)}>
    Verify Manually
  </button>
</div>
```

---

## 16. Checklist Before Going Live

- [ ] `NEDARIM_MOSAD_ID` is set in production `.env`
- [ ] `NEDARIM_API_VALID` is set in production `.env`
- [ ] Callback URL configured in Nedarim admin: `https://your-api.chaim.com/api/v1/payment/nedarim-callback`
- [ ] postMessage listener is cleaned up on unmount (`removeEventListener`)
- [ ] Double-payment UI handled (hide pay button after success)
- [ ] `APARTMENT_LISTING_FEE`, `SWAP_REQUEST_FEE`, `REPORT_RENTED_FEE` are set correctly
- [ ] iOS iframe scrolling CSS applied
- [ ] Manual transaction ID fallback provided
- [ ] Direct card endpoint is NOT exposed to regular users
- [ ] Full flow tested end-to-end with real Nedarim credentials in staging
- [ ] Admin dashboard tested: `GET /payment/admin/all-transactions`

---

## Quick Reference: Param1/paymentType Mapping

| Intent response field | iframe Param1 | verify paymentType | paymentRecordId field |
|---|---|---|---|
| `listingPaymentId` | `APARTMENT_LISTING` | `APARTMENT_LISTING` | `listingPaymentId` |
| `swapPaymentId` | `SWAP_REQUEST` | `SWAP_REQUEST` | `swapPaymentId` |
| `reportRentedPaymentId` | `REPORT_RENTED` | `REPORT_RENTED` | `reportRentedPaymentId` |

---

*Generated from actual Chaim backend code analysis — payment.service.ts, nedarim.ts, payment.routes.ts*
