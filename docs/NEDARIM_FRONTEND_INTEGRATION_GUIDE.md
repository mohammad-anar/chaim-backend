# Nedarim Plus — Full Next.js Frontend Payment Guide

> **Stack:** Next.js 14+ (App Router) · TypeScript · Nedarim Plus V6  
> **Backend:** Chaim Backend API  
> **Currency:** ILS (₪)

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [Environment Variables](#2-environment-variables)
3. [API Utility Layer](#3-api-utility-layer)
4. [Custom Hooks](#4-custom-hooks)
   - [useListingPayment](#41-uselistingpayment)
   - [useSwapPayment](#42-useswappayment)
   - [useReportRentedPayment](#43-usereportrentedpayment)
   - [useListingStatus](#44-uselistingstatus)
5. [NedarimPaymentModal Component](#5-nedarimpaymentmodal-component)
6. [Listing Payment Page](#6-listing-payment-page)
7. [Swap Payment Usage](#7-swap-payment-usage)
8. [Report Rented Payment Usage](#8-report-rented-payment-usage)
9. [Listing Expiry Banner](#9-listing-expiry-banner)
10. [Payment Success / Redirect Page](#10-payment-success--redirect-page)
11. [Error Handling Reference](#11-error-handling-reference)
12. [Full Payment Flow Diagram](#12-full-payment-flow-diagram)

---

## 1. Folder Structure

```
src/
├── lib/
│   └── payment/
│       ├── api.ts               ← API calls to backend
│       ├── types.ts             ← Shared types
│       └── helpers.ts           ← iframe URL builder
├── hooks/
│   ├── useListingPayment.ts
│   ├── useSwapPayment.ts
│   ├── useReportRentedPayment.ts
│   └── useListingStatus.ts
├── components/
│   └── payment/
│       ├── NedarimPaymentModal.tsx   ← Main reusable modal
│       ├── ListingExpiryBanner.tsx   ← Expiry warning banner
│       └── PaymentStatusBadge.tsx    ← UI badge
└── app/
    ├── my-apartment/
    │   └── page.tsx              ← Shows listing status + pay button
    └── payment/
        └── success/
            └── page.tsx          ← Post-payment confirmation
```

---

## 2. Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=https://your-api.chaim.com
NEXT_PUBLIC_APP_URL=https://your-frontend.vercel.app
NEXT_PUBLIC_NEDARIM_CALLBACK_PATH=/api/v1/payment/nedarim-callback
```

---

## 3. API Utility Layer

### `src/lib/payment/types.ts`

```ts
export type PaymentType =
  | "APARTMENT_LISTING"
  | "SWAP_REQUEST"
  | "REPORT_RENTED";

export interface ListingPaymentIntent {
  mosadId: string;
  amount: number;
  currency: string;
  paymentType: "APARTMENT_LISTING";
  listingPaymentId: string;
  apartmentId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  validityDuration: string;
}

export interface SwapPaymentIntent {
  mosadId: string;
  amount: number;
  currency: string;
  paymentType: "SWAP_REQUEST";
  swapPaymentId: string;
  swapId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

export interface ReportRentedPaymentIntent {
  mosadId: string;
  amount: number;
  currency: string;
  paymentType: "REPORT_RENTED";
  reportRentedPaymentId: string;
  reportRentedId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

export type PaymentIntent =
  | ListingPaymentIntent
  | SwapPaymentIntent
  | ReportRentedPaymentIntent;

export interface VerifyPayload {
  transactionId: string;
  paymentType: PaymentType;
  paymentRecordId: string;
  apartmentId?: string;
  swapId?: string;
  reportRentedId?: string;
}

export interface VerifyResult {
  success: boolean;
  message: string;
  transactionId?: string;
  apartmentId?: string;
  swapId?: string;
  reportRentedId?: string;
  paidAt?: string;
  expiresAt?: string;
}

export interface ListingStatus {
  isPaid: boolean;
  isExpired: boolean;
  isActive: boolean;
  daysRemaining: number | null;
  expiresAt: string | null;
  paidAt: string | null;
}
```

---

### `src/lib/payment/api.ts`

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch<T>(
  path: string,
  options: RequestInit,
  token: string
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.message ?? `Request failed: ${res.status}`);
  }

  return json.data as T;
}

// ── Intent creators ──────────────────────────────────────────────────────────

export async function createListingIntent(
  apartmentId: string,
  token: string
) {
  return apiFetch<import("./types").ListingPaymentIntent>(
    "/payment/create-listing-intent",
    { method: "POST", body: JSON.stringify({ apartmentId }) },
    token
  );
}

export async function createSwapIntent(swapId: string, token: string) {
  return apiFetch<import("./types").SwapPaymentIntent>(
    "/payment/create-swap-intent",
    { method: "POST", body: JSON.stringify({ swapId }) },
    token
  );
}

export async function createReportRentedIntent(
  payload: {
    reportType?: "RENT" | "SWAP";
    weekend?: string;
    targetApartmentId?: string;
    reportRentedId?: string;
  },
  token: string
) {
  return apiFetch<import("./types").ReportRentedPaymentIntent>(
    "/payment/create-report-rented-intent",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

// ── Verification ─────────────────────────────────────────────────────────────

export async function verifyNedarimPayment(
  payload: import("./types").VerifyPayload,
  token: string
) {
  return apiFetch<import("./types").VerifyResult>(
    "/payment/verify-nedarim",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
```

---

### `src/lib/payment/helpers.ts`

```ts
import type { PaymentIntent, PaymentType } from "./types";

const NEDARIM_BASE = "https://matara.pro/nedarimplus/V6/";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Maps each PaymentIntent type to the right record ID field.
 */
export function getPaymentRecordId(intent: PaymentIntent): string {
  if (intent.paymentType === "APARTMENT_LISTING") {
    return intent.listingPaymentId;
  }
  if (intent.paymentType === "SWAP_REQUEST") {
    return intent.swapPaymentId;
  }
  return intent.reportRentedPaymentId;
}

/**
 * Builds the Nedarim Plus hosted payment iframe URL.
 */
export function buildNedarimIframeUrl(intent: PaymentIntent): string {
  const recordId = getPaymentRecordId(intent);
  const callbackUrl = `${API_URL}/api/v1/payment/nedarim-callback`;

  const params = new URLSearchParams({
    mosadId: intent.mosadId,
    Amount: String(intent.amount),
    Tashlumim: "1",          // 1 = single payment (no installments)
    Currency: "1",           // 1 = ILS
    Param1: intent.paymentType,
    Param2: recordId,
    Name: intent.clientName,
    Email: intent.clientEmail,
    Phone: intent.clientPhone,
    CallBack: callbackUrl,
  });

  return `${NEDARIM_BASE}?${params.toString()}`;
}

/**
 * Extracts the transactionId from a Nedarim postMessage event payload.
 * Nedarim uses several different field names — this handles all variants.
 */
export function extractTransactionId(data: any): string | null {
  if (!data || typeof data !== "object") return null;

  return (
    data.TransactionId ??
    data.transactionId ??
    data.ConfirmationNo ??
    data.confirmationNo ??
    data.TransId ??
    data.ConfirmationCode ??
    null
  );
}

/**
 * Returns true if the postMessage origin is from matara.pro (Nedarim domain).
 * Falls through if origin is empty string (some browsers send '' for same-origin iframes).
 */
export function isNedarimOrigin(origin: string): boolean {
  return origin === "" || origin.includes("matara.pro");
}

/**
 * Formats ILS amount as a display string.
 */
export function formatILS(amount: number): string {
  return `₪${amount.toFixed(0)}`;
}
```

---

## 4. Custom Hooks

### 4.1 `useListingPayment`

```ts
// src/hooks/useListingPayment.ts
"use client";

import { useState, useCallback } from "react";
import { createListingIntent, verifyNedarimPayment } from "@/lib/payment/api";
import { buildNedarimIframeUrl, getPaymentRecordId } from "@/lib/payment/helpers";
import type { ListingPaymentIntent, VerifyResult } from "@/lib/payment/types";

interface UseListingPaymentOptions {
  apartmentId: string;
  token: string;
  onSuccess?: (result: VerifyResult) => void;
  onError?: (error: string) => void;
}

export function useListingPayment({
  apartmentId,
  token,
  onSuccess,
  onError,
}: UseListingPaymentOptions) {
  const [intent, setIntent] = useState<ListingPaymentIntent | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Create intent and open iframe
  const initiatePayment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await createListingIntent(apartmentId, token);
      setIntent(data);
      setIframeUrl(buildNedarimIframeUrl(data));
    } catch (err: any) {
      const msg = err.message ?? "Failed to create payment intent";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [apartmentId, token, onError]);

  // Step 2 — Called by NedarimPaymentModal when postMessage arrives
  const handlePaymentSuccess = useCallback(
    async (transactionId: string) => {
      if (!intent || verifying || paid) return;
      setVerifying(true);
      setError(null);
      try {
        const result = await verifyNedarimPayment(
          {
            transactionId,
            paymentType: "APARTMENT_LISTING",
            paymentRecordId: getPaymentRecordId(intent),
            apartmentId: intent.apartmentId,
          },
          token
        );
        setPaid(true);
        onSuccess?.(result);
      } catch (err: any) {
        const msg = err.message ?? "Payment verification failed";
        setError(msg);
        onError?.(msg);
      } finally {
        setVerifying(false);
      }
    },
    [intent, token, verifying, paid, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setIntent(null);
    setIframeUrl(null);
    setLoading(false);
    setVerifying(false);
    setPaid(false);
    setError(null);
  }, []);

  return {
    intent,
    iframeUrl,
    loading,
    verifying,
    paid,
    error,
    initiatePayment,
    handlePaymentSuccess,
    reset,
  };
}
```

---

### 4.2 `useSwapPayment`

```ts
// src/hooks/useSwapPayment.ts
"use client";

import { useState, useCallback } from "react";
import { createSwapIntent, verifyNedarimPayment } from "@/lib/payment/api";
import { buildNedarimIframeUrl, getPaymentRecordId } from "@/lib/payment/helpers";
import type { SwapPaymentIntent, VerifyResult } from "@/lib/payment/types";

interface UseSwapPaymentOptions {
  swapId: string;
  token: string;
  onSuccess?: (result: VerifyResult) => void;
  onError?: (error: string) => void;
}

export function useSwapPayment({
  swapId,
  token,
  onSuccess,
  onError,
}: UseSwapPaymentOptions) {
  const [intent, setIntent] = useState<SwapPaymentIntent | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await createSwapIntent(swapId, token);
      setIntent(data);
      setIframeUrl(buildNedarimIframeUrl(data));
    } catch (err: any) {
      // 402 = listing expired / not paid for one of the apartments
      const msg = err.message ?? "Failed to create swap payment intent";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [swapId, token, onError]);

  const handlePaymentSuccess = useCallback(
    async (transactionId: string) => {
      if (!intent || verifying || paid) return;
      setVerifying(true);
      setError(null);
      try {
        const result = await verifyNedarimPayment(
          {
            transactionId,
            paymentType: "SWAP_REQUEST",
            paymentRecordId: getPaymentRecordId(intent),
            swapId: intent.swapId,
          },
          token
        );
        setPaid(true);
        onSuccess?.(result);
      } catch (err: any) {
        const msg = err.message ?? "Payment verification failed";
        setError(msg);
        onError?.(msg);
      } finally {
        setVerifying(false);
      }
    },
    [intent, token, verifying, paid, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setIntent(null);
    setIframeUrl(null);
    setLoading(false);
    setVerifying(false);
    setPaid(false);
    setError(null);
  }, []);

  return {
    intent,
    iframeUrl,
    loading,
    verifying,
    paid,
    error,
    initiatePayment,
    handlePaymentSuccess,
    reset,
  };
}
```

---

### 4.3 `useReportRentedPayment`

```ts
// src/hooks/useReportRentedPayment.ts
"use client";

import { useState, useCallback } from "react";
import { createReportRentedIntent, verifyNedarimPayment } from "@/lib/payment/api";
import { buildNedarimIframeUrl, getPaymentRecordId } from "@/lib/payment/helpers";
import type { ReportRentedPaymentIntent, VerifyResult } from "@/lib/payment/types";

interface UseReportRentedPaymentOptions {
  token: string;
  reportType?: "RENT" | "SWAP";
  weekend?: string;           // ISO date e.g. "2026-10-10"
  targetApartmentId?: string;
  onSuccess?: (result: VerifyResult) => void;
  onError?: (error: string) => void;
}

export function useReportRentedPayment({
  token,
  reportType = "RENT",
  weekend,
  targetApartmentId,
  onSuccess,
  onError,
}: UseReportRentedPaymentOptions) {
  const [intent, setIntent] = useState<ReportRentedPaymentIntent | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await createReportRentedIntent(
        { reportType, weekend, targetApartmentId },
        token
      );
      setIntent(data);
      setIframeUrl(buildNedarimIframeUrl(data));
    } catch (err: any) {
      // 402 = listing expired or not paid
      const msg = err.message ?? "Failed to create report-rented payment intent";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [token, reportType, weekend, targetApartmentId, onError]);

  const handlePaymentSuccess = useCallback(
    async (transactionId: string) => {
      if (!intent || verifying || paid) return;
      setVerifying(true);
      setError(null);
      try {
        const result = await verifyNedarimPayment(
          {
            transactionId,
            paymentType: "REPORT_RENTED",
            paymentRecordId: getPaymentRecordId(intent),
            reportRentedId: intent.reportRentedId,
          },
          token
        );
        setPaid(true);
        onSuccess?.(result);
      } catch (err: any) {
        const msg = err.message ?? "Payment verification failed";
        setError(msg);
        onError?.(msg);
      } finally {
        setVerifying(false);
      }
    },
    [intent, token, verifying, paid, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setIntent(null);
    setIframeUrl(null);
    setLoading(false);
    setVerifying(false);
    setPaid(false);
    setError(null);
  }, []);

  return {
    intent,
    iframeUrl,
    loading,
    verifying,
    paid,
    error,
    initiatePayment,
    handlePaymentSuccess,
    reset,
  };
}
```

---

### 4.4 `useListingStatus`

```ts
// src/hooks/useListingStatus.ts
"use client";

import { useState, useEffect } from "react";
import type { ListingStatus } from "@/lib/payment/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function useListingStatus(apartmentId: string | null, token: string) {
  const [status, setStatus] = useState<ListingStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apartmentId || !token) return;

    let cancelled = false;
    setLoading(true);

    fetch(`${API_URL}/api/v1/apartment/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        // Find matching apartment in my apartments list
        const apt = (json.data ?? []).find((a: any) => a.id === apartmentId);
        if (!apt) return;

        const lp = apt.listingPayment;
        const now = new Date();

        setStatus({
          isPaid: lp?.status === "COMPLETED",
          isExpired:
            lp?.status === "COMPLETED" &&
            lp.expiresAt != null &&
            new Date(lp.expiresAt) <= now,
          isActive:
            lp?.status === "COMPLETED" &&
            (lp.expiresAt == null || new Date(lp.expiresAt) > now),
          daysRemaining: apt.daysRemaining ?? null,
          expiresAt: lp?.expiresAt ?? null,
          paidAt: lp?.paidAt ?? null,
        });
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apartmentId, token]);

  return { status, loading };
}
```

---

## 5. NedarimPaymentModal Component

> This is the **single reusable modal** used by all three payment types.

```tsx
// src/components/payment/NedarimPaymentModal.tsx
"use client";

import { useEffect, useRef } from "react";
import { extractTransactionId, isNedarimOrigin, formatILS } from "@/lib/payment/helpers";

interface NedarimPaymentModalProps {
  /** Nedarim iframe URL built by buildNedarimIframeUrl() */
  iframeUrl: string;
  /** Amount in ILS — shown in the modal header */
  amount: number;
  /** Human-readable title */
  title: string;
  /** Called with the transactionId after successful payment in the iframe */
  onSuccess: (transactionId: string) => void;
  /** Called when user manually closes the modal */
  onClose: () => void;
  /** True while the backend verify call is in progress */
  verifying?: boolean;
  /** Backend error message, if any */
  error?: string | null;
}

export default function NedarimPaymentModal({
  iframeUrl,
  amount,
  title,
  onSuccess,
  onClose,
  verifying = false,
  error = null,
}: NedarimPaymentModalProps) {
  const calledRef = useRef(false); // Prevent double-firing

  // Listen for postMessage from Nedarim Plus iframe
  useEffect(() => {
    calledRef.current = false; // reset when modal opens with new URL

    const handler = (event: MessageEvent) => {
      if (!isNedarimOrigin(event.origin)) return;

      const txId = extractTransactionId(event.data);
      if (txId && !calledRef.current) {
        calledRef.current = true;
        onSuccess(txId);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [iframeUrl, onSuccess]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Amount: <span className="font-bold text-green-600">{formatILS(amount)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            aria-label="Close payment"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* Content area */}
        <div className="relative" style={{ height: 560 }}>
          {verifying ? (
            /* Verifying overlay */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white gap-3">
              <div className="h-10 w-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
              <p className="text-gray-600 font-medium">Verifying your payment…</p>
              <p className="text-sm text-gray-400">This will only take a moment</p>
            </div>
          ) : (
            /* Nedarim Plus iframe */
            <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              <iframe
                src={iframeUrl}
                title="Nedarim Plus Secure Payment"
                width="100%"
                height="560"
                frameBorder="0"
                scrolling="yes"
                allow="payment"
                style={{ border: "none", display: "block" }}
              />
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="border-t px-5 py-3 flex items-center gap-2 bg-gray-50">
          <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-gray-500">
            Secured by <strong>Nedarim Plus</strong> · PCI-compliant · ILS payments only
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Listing Payment Page

> Complete page: shows listing status → opens payment modal → confirms activation.

```tsx
// src/app/my-apartment/page.tsx  (or wherever you manage apartments)
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react"; // or your auth method
import { useListingPayment } from "@/hooks/useListingPayment";
import NedarimPaymentModal from "@/components/payment/NedarimPaymentModal";
import ListingExpiryBanner from "@/components/payment/ListingExpiryBanner";
import type { VerifyResult } from "@/lib/payment/types";

interface Props {
  apartment: {
    id: string;
    title: string;
    status: string;
    listingPayment?: {
      status: string;
      expiresAt?: string;
      paidAt?: string;
    } | null;
    daysRemaining?: number | null;
  };
}

export default function ApartmentListingPaymentSection({ apartment }: Props) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken ?? "";

  const [modalOpen, setModalOpen] = useState(false);
  const [successResult, setSuccessResult] = useState<VerifyResult | null>(null);

  const {
    iframeUrl,
    intent,
    loading,
    verifying,
    paid,
    error,
    initiatePayment,
    handlePaymentSuccess,
    reset,
  } = useListingPayment({
    apartmentId: apartment.id,
    token,
    onSuccess: (result) => {
      setSuccessResult(result);
      setModalOpen(false);
    },
    onError: (err) => {
      console.error("[ListingPayment] Error:", err);
    },
  });

  const lp = apartment.listingPayment;
  const now = new Date();
  const isActive =
    lp?.status === "COMPLETED" &&
    (lp.expiresAt == null || new Date(lp.expiresAt) > now);
  const isExpired =
    lp?.status === "COMPLETED" &&
    lp.expiresAt != null &&
    new Date(lp.expiresAt) <= now;
  const isPending = !lp || lp.status !== "COMPLETED";

  const handleOpenModal = async () => {
    await initiatePayment();
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    reset();
  };

  // ── Success State ────────────────────────────────────────────────────────
  if (successResult || paid) {
    const expiresAt = successResult?.expiresAt
      ? new Date(successResult.expiresAt).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })
      : "1 year from now";

    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="text-lg font-semibold text-green-800">Listing Activated!</h3>
        <p className="text-green-700 mt-1 text-sm">
          Your apartment is now active and visible to all users until{" "}
          <strong>{expiresAt}</strong>.
        </p>
        {successResult?.transactionId && (
          <p className="text-xs text-gray-400 mt-2">
            Transaction ID: {successResult.transactionId}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Expiry warning banner */}
      {(isExpired || (apartment.daysRemaining != null && apartment.daysRemaining <= 30)) && (
        <ListingExpiryBanner
          daysRemaining={apartment.daysRemaining}
          isExpired={isExpired}
          onRenew={handleOpenModal}
          loading={loading}
        />
      )}

      {/* Listing status card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Listing Subscription</h3>
            <p className="text-sm text-gray-500 mt-0.5">Annual fee · ₪28 / year</p>
          </div>
          <StatusBadge active={isActive} expired={isExpired} pending={isPending} />
        </div>

        {/* Payment info */}
        {lp?.paidAt && (
          <p className="mt-3 text-xs text-gray-400">
            Paid: {new Date(lp.paidAt).toLocaleDateString()}
            {lp.expiresAt && (
              <> · Expires: {new Date(lp.expiresAt).toLocaleDateString()}</>
            )}
            {apartment.daysRemaining != null && (
              <> · <strong>{apartment.daysRemaining} days remaining</strong></>
            )}
          </p>
        )}

        {/* CTA */}
        <div className="mt-5">
          {isPending && (
            <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              ⚠️ Your listing is not yet active. Pay the listing fee to make your apartment
              visible for rent and swap.
            </div>
          )}
          {isExpired && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              🔴 Your listing has expired and is hidden from search. Renew to reactivate.
            </div>
          )}

          <button
            onClick={handleOpenModal}
            disabled={loading || isActive}
            className="w-full rounded-lg bg-green-600 px-4 py-3 text-white font-semibold text-sm
                       hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading
              ? "Preparing payment…"
              : isActive
              ? "✓ Listing Active"
              : isExpired
              ? "Renew Listing — ₪28"
              : "Activate Listing — ₪28"}
          </button>
        </div>
      </div>

      {/* Payment modal */}
      {modalOpen && iframeUrl && intent && (
        <NedarimPaymentModal
          iframeUrl={iframeUrl}
          amount={intent.amount}
          title={isExpired ? "Renew Apartment Listing" : "Activate Apartment Listing"}
          onSuccess={handlePaymentSuccess}
          onClose={handleClose}
          verifying={verifying}
          error={error}
        />
      )}
    </div>
  );
}

// ── Small helper badge ───────────────────────────────────────────────────────
function StatusBadge({
  active, expired, pending,
}: { active: boolean; expired: boolean; pending: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active
      </span>
    );
  }
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Inactive
    </span>
  );
}
```

---

## 7. Swap Payment Usage

```tsx
// src/components/swap/SwapPayButton.tsx
"use client";

import { useState } from "react";
import { useSwapPayment } from "@/hooks/useSwapPayment";
import NedarimPaymentModal from "@/components/payment/NedarimPaymentModal";

interface Props {
  swapId: string;
  token: string;
  onPaid?: () => void;
}

export default function SwapPayButton({ swapId, token, onPaid }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const { iframeUrl, intent, loading, verifying, paid, error, initiatePayment, handlePaymentSuccess, reset } =
    useSwapPayment({
      swapId,
      token,
      onSuccess: () => {
        setModalOpen(false);
        onPaid?.();
      },
      onError: (msg) => {
        // If 402 → listing expired for one of the apartments
        console.warn("[SwapPayment]", msg);
      },
    });

  if (paid) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 text-center">
        ✅ Swap payment confirmed! Your swap has been approved.
      </div>
    );
  }

  const handleOpen = async () => {
    await initiatePayment();
    if (!error) setModalOpen(true); // only open if intent was created (no 402 error)
  };

  return (
    <>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 mb-3">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleOpen}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-white text-sm font-semibold
                   hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? "Loading…" : "Pay Swap Fee — ₪50"}
      </button>

      {modalOpen && iframeUrl && intent && (
        <NedarimPaymentModal
          iframeUrl={iframeUrl}
          amount={intent.amount}
          title="Swap Request Fee"
          onSuccess={handlePaymentSuccess}
          onClose={() => { setModalOpen(false); reset(); }}
          verifying={verifying}
          error={error}
        />
      )}
    </>
  );
}
```

> **Key error case:** If either apartment's listing is expired, the backend returns `402 PAYMENT_REQUIRED` with a message like:  
> `"Your apartment listing subscription has expired. Please renew the annual listing fee (₪28) before proceeding with a swap."`  
> Display this error prominently above the swap button.

---

## 8. Report Rented Payment Usage

```tsx
// src/components/reportRented/ReportRentedPayButton.tsx
"use client";

import { useState } from "react";
import { useReportRentedPayment } from "@/hooks/useReportRentedPayment";
import NedarimPaymentModal from "@/components/payment/NedarimPaymentModal";

interface Props {
  token: string;
  reportType: "RENT" | "SWAP";
  weekend: string;                    // ISO date e.g. "2026-10-10"
  targetApartmentId?: string;
  onPaid?: (reportRentedId: string) => void;
}

export default function ReportRentedPayButton({
  token,
  reportType,
  weekend,
  targetApartmentId,
  onPaid,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const { iframeUrl, intent, loading, verifying, paid, error, initiatePayment, handlePaymentSuccess, reset } =
    useReportRentedPayment({
      token,
      reportType,
      weekend,
      targetApartmentId,
      onSuccess: (result) => {
        setModalOpen(false);
        if (result.reportRentedId) onPaid?.(result.reportRentedId);
      },
      onError: (msg) => {
        console.warn("[ReportRentedPayment]", msg);
      },
    });

  if (paid) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
        ✅ Rental reported successfully! Admin has been notified.
      </div>
    );
  }

  const handleOpen = async () => {
    await initiatePayment();
    if (!error) setModalOpen(true);
  };

  return (
    <>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 mb-3">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleOpen}
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-white text-sm font-semibold
                   hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {loading
          ? "Loading…"
          : reportType === "SWAP"
          ? "Report Swap — ₪50"
          : "Report Rental — ₪50"}
      </button>

      {modalOpen && iframeUrl && intent && (
        <NedarimPaymentModal
          iframeUrl={iframeUrl}
          amount={intent.amount}
          title={reportType === "SWAP" ? "Report Apartment Swap" : "Report Apartment Rented"}
          onSuccess={handlePaymentSuccess}
          onClose={() => { setModalOpen(false); reset(); }}
          verifying={verifying}
          error={error}
        />
      )}
    </>
  );
}
```

---

## 9. Listing Expiry Banner

> Show this banner on the owner's apartment page when days remaining ≤ 30.

```tsx
// src/components/payment/ListingExpiryBanner.tsx
"use client";

interface Props {
  daysRemaining: number | null;
  isExpired: boolean;
  onRenew: () => void;
  loading?: boolean;
}

export default function ListingExpiryBanner({
  daysRemaining,
  isExpired,
  onRenew,
  loading,
}: Props) {
  if (isExpired) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-300 px-4 py-4">
        <span className="text-2xl">🔴</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800">Listing Expired</p>
          <p className="text-sm text-red-700 mt-0.5">
            Your listing is currently hidden from search results and disabled for rent/swap.
            Renew now to reactivate.
          </p>
        </div>
        <button
          onClick={onRenew}
          disabled={loading}
          className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white
                     hover:bg-red-700 disabled:opacity-50 transition"
        >
          {loading ? "…" : "Renew ₪28"}
        </button>
      </div>
    );
  }

  if (daysRemaining !== null && daysRemaining <= 30) {
    const urgency = daysRemaining <= 7 ? "amber" : "yellow";
    const emoji = daysRemaining <= 1 ? "🚨" : daysRemaining <= 7 ? "⚠️" : "⏳";

    return (
      <div
        className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-4 ${
          urgency === "amber"
            ? "bg-amber-50 border-amber-300"
            : "bg-yellow-50 border-yellow-300"
        }`}
      >
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${urgency === "amber" ? "text-amber-800" : "text-yellow-800"}`}>
            Listing expires in {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
          </p>
          <p className={`text-sm mt-0.5 ${urgency === "amber" ? "text-amber-700" : "text-yellow-700"}`}>
            Renew your annual listing subscription to avoid interruption.
          </p>
        </div>
        <button
          onClick={onRenew}
          disabled={loading}
          className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white
                     hover:bg-amber-600 disabled:opacity-50 transition"
        >
          {loading ? "…" : "Renew ₪28"}
        </button>
      </div>
    );
  }

  return null;
}
```

---

## 10. Payment Success / Redirect Page

```tsx
// src/app/payment/success/page.tsx
import Link from "next/link";

interface PageProps {
  searchParams: {
    type?: string;    // APARTMENT_LISTING | SWAP_REQUEST | REPORT_RENTED
    txId?: string;
  };
}

export default function PaymentSuccessPage({ searchParams }: PageProps) {
  const { type, txId } = searchParams;

  const messages: Record<string, { title: string; body: string; link: string; cta: string }> = {
    APARTMENT_LISTING: {
      title: "Listing Activated!",
      body: "Your apartment is now live and visible to all users for 1 year.",
      link: "/my-apartment",
      cta: "View My Apartment",
    },
    SWAP_REQUEST: {
      title: "Swap Confirmed!",
      body: "Your swap payment is complete. Your swap request has been approved.",
      link: "/swaps",
      cta: "View Swaps",
    },
    REPORT_RENTED: {
      title: "Rental Reported!",
      body: "Your rental has been recorded and admin has been notified.",
      link: "/my-apartment",
      cta: "Back to My Apartment",
    },
  };

  const msg = messages[type ?? ""] ?? {
    title: "Payment Successful!",
    body: "Your payment was processed successfully.",
    link: "/",
    cta: "Go Home",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-lg p-8">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900">{msg.title}</h1>
        <p className="text-gray-600 mt-2">{msg.body}</p>
        {txId && (
          <p className="text-xs text-gray-400 mt-4">Transaction ID: {txId}</p>
        )}
        <Link
          href={msg.link}
          className="mt-6 inline-block rounded-lg bg-green-600 px-6 py-3 text-white font-semibold
                     hover:bg-green-700 transition"
        >
          {msg.cta}
        </Link>
      </div>
    </div>
  );
}
```

---

## 11. Error Handling Reference

### HTTP Error Code Mapping

| HTTP Status | Backend message pattern | What to show |
|---|---|---|
| `402 Payment Required` | `"...listing fee expired"` | "Your listing has expired. Renew (₪28) first." |
| `402 Payment Required` | `"...listing subscription has expired"` | Same — link to renewal |
| `400 Bad Request` | `"already been paid"` | "Payment already complete" — reload page |
| `403 Forbidden` | `"not a participant"` | "You are not part of this swap" |
| `404 Not Found` | `"Apartment not found"` | "Apartment not found" |
| `500` | Any server error | "Something went wrong. Try again." |

### Handling 402 in `useSwapPayment` / `useReportRentedPayment`

```tsx
onError: (msg) => {
  // Check if it's a listing expiry error
  if (msg.includes("expired") || msg.includes("listing fee")) {
    // Redirect user to renew their listing first
    router.push("/my-apartment?action=renew");
    toast.error("Your listing has expired. Please renew to continue.");
  } else {
    toast.error(msg);
  }
}
```

### postMessage doesn't fire (user completed payment but closed iframe)

Add a manual fallback input:

```tsx
const [showManual, setShowManual] = useState(false);
const [manualTxId, setManualTxId] = useState("");

// Show after 3 minutes of inactivity
useEffect(() => {
  const t = setTimeout(() => setShowManual(true), 3 * 60 * 1000);
  return () => clearTimeout(t);
}, []);

// In the modal JSX:
{showManual && (
  <div className="border-t p-4">
    <p className="text-sm text-gray-600 mb-2">
      Payment done but not confirmed?
    </p>
    <div className="flex gap-2">
      <input
        className="flex-1 rounded-lg border px-3 py-2 text-sm"
        placeholder="Enter Nedarim Transaction ID"
        value={manualTxId}
        onChange={(e) => setManualTxId(e.target.value)}
      />
      <button
        onClick={() => manualTxId && onSuccess(manualTxId)}
        className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white"
      >
        Verify
      </button>
    </div>
  </div>
)}
```

---

## 12. Full Payment Flow Diagram

```
Owner clicks "Pay Listing Fee"
        │
        ▼
POST /payment/create-listing-intent
 ← { mosadId, amount, listingPaymentId, ... }
        │
        ▼
Build iframe URL with URLSearchParams
 mosadId + Amount + Param1=APARTMENT_LISTING + Param2=listingPaymentId
        │
        ▼
Open NedarimPaymentModal → renders <iframe src={url} />
        │
        ▼ (user fills card details in iframe)
        │
Nedarim server calls:
  POST /payment/nedarim-callback (server webhook, auto-verifies)
        │
        ▼ (also simultaneously)
window.postMessage → { TransactionId: "TXN123" }
        │
        ▼
extractTransactionId(event.data) → "TXN123"
        │
        ▼
POST /payment/verify-nedarim
  { transactionId: "TXN123", paymentType: "APARTMENT_LISTING", paymentRecordId: listingPaymentId }
        │
        ▼
Backend: GET Nedarim API → { Status: "1", Amount: "28" }
 → apartmentListingPayment.status = COMPLETED
 → apartment.status = CONFIRMED
 → expiresAt = now + 365 days
        │
        ▼
onSuccess({ success: true, expiresAt: "2027-09-27T..." })
        │
        ▼
Close modal → show "✅ Listing Activated!" UI
```

---

## Quick Reference

### Param1/paymentType/record ID mapping

| Flow | `create-*-intent` | iframe `Param1` | `verify-nedarim` `paymentType` | `paymentRecordId` field |
|---|---|---|---|---|
| Listing | `create-listing-intent` | `APARTMENT_LISTING` | `APARTMENT_LISTING` | `listingPaymentId` |
| Swap | `create-swap-intent` | `SWAP_REQUEST` | `SWAP_REQUEST` | `swapPaymentId` |
| Report Rented | `create-report-rented-intent` | `REPORT_RENTED` | `REPORT_RENTED` | `reportRentedPaymentId` |

### Listing expiry guard errors (402)

Both **swap** and **report-rented** creation will return `402` if the apartment's listing is expired:

```ts
// In the hook error handler — detect this and redirect to renewal:
if (err.message?.includes("expired") || err.message?.includes("listing fee")) {
  // Push user to renew their listing first
}
```

---

*Generated from Chaim Backend — payment.service.ts · listingExpiryCron.ts · nedarim.ts*
