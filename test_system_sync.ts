import http from "http";
import app from "./src/app.js";

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/v1`;
  console.log(`🚀 Test server started at ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  async function test(title: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${title}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${title} ->`, err?.message || err);
      failed++;
    }
  }

  let adminToken = "";
  let userToken = "";
  let ambassadorToken = "";
  let weekendId = "";
  let apartmentId = "";

  // 1. Test Demo Logins
  await test("POST /auth/demo-login (Admin)", async () => {
    const res = await fetch(`${baseUrl}/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    const data = await res.json();
    if (!data.success || !data.data.accessToken) throw new Error(JSON.stringify(data));
    adminToken = data.data.accessToken;
  });

  await test("POST /auth/demo-login (User)", async () => {
    const res = await fetch(`${baseUrl}/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user" }),
    });
    const data = await res.json();
    if (!data.success || !data.data.accessToken) throw new Error(JSON.stringify(data));
    userToken = data.data.accessToken;
  });

  await test("POST /auth/demo-login (Ambassador)", async () => {
    const res = await fetch(`${baseUrl}/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "ambassador" }),
    });
    const data = await res.json();
    if (!data.success || !data.data.accessToken) throw new Error(JSON.stringify(data));
    ambassadorToken = data.data.accessToken;
  });

  // 2. Test Real Phone & Email Logins
  await test("POST /auth/login with phone number identifier", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "0501112233", password: "password123" }),
    });
    const data = await res.json();
    if (!data.success || !data.data.accessToken) throw new Error(JSON.stringify(data));
  });

  await test("POST /auth/login with email identifier", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin@shabosrent.com", password: "password123" }),
    });
    const data = await res.json();
    if (!data.success || !data.data.accessToken) throw new Error(JSON.stringify(data));
  });

  // 3. Test Apartment Listing & City Search Log
  await test("GET /apartment with city filter (triggers CitySearchLog)", async () => {
    const res = await fetch(`${baseUrl}/apartment?searchTerm=Jerusalem`);
    const data = await res.json();
    if (!data.success) throw new Error(JSON.stringify(data));
    if (Array.isArray(data.data) && data.data.length > 0) {
      apartmentId = data.data[0].id;
    }
  });

  // 4. Test Weekend Calendars
  await test("GET /apartment/availability/weekends", async () => {
    const res = await fetch(`${baseUrl}/apartment/availability/weekends`);
    const data = await res.json();
    if (!data.success || !data.data.length) throw new Error(JSON.stringify(data));
    weekendId = data.data[0].id;
  });

  // 5. Test Weekend Special Price
  await test("POST /apartment/availability/special-price", async () => {
    if (!apartmentId || !weekendId) throw new Error("Missing apartmentId or weekendId");
    const res = await fetch(`${baseUrl}/apartment/availability/special-price`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        apartmentId,
        weekendId,
        isSpecial: true,
        specialPrice: 950,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(JSON.stringify(data));
    if (data.data.specialPrice !== 950) throw new Error("Special price mismatch");
  });

  // 6. Test Direct Card Payment
  await test("POST /payment/direct-card (Apartment Listing Payment)", async () => {
    if (!apartmentId) throw new Error("Missing apartmentId");
    const res = await fetch(`${baseUrl}/payment/direct-card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        paymentType: "APARTMENT_LISTING",
        apartmentId,
        cardNumber: "4532111122223333",
        cardHolder: "Test User",
        expirationDate: "12/28",
        cvv: "123",
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(JSON.stringify(data));
  });

  // 7. Test Admin Endpoints
  await test("GET /admin/dashboard-stats", async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(JSON.stringify(data));
    if (typeof data.data.totalApartments !== "number") throw new Error("Invalid stats shape");
  });

  await test("GET /admin/revenue-analytics", async () => {
    const res = await fetch(`${baseUrl}/admin/revenue-analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data.weeks)) throw new Error(JSON.stringify(data));
  });

  await test("GET /admin/search-demand", async () => {
    const res = await fetch(`${baseUrl}/admin/search-demand`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error(JSON.stringify(data));
    if (data.data.length === 0) throw new Error("Expected search demand cities");
  });

  await test("GET /admin/recent-activities", async () => {
    const res = await fetch(`${baseUrl}/admin/recent-activities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error(JSON.stringify(data));
  });

  await test("GET /ambassador/admin/stats", async () => {
    const res = await fetch(`${baseUrl}/ambassador/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!data.success || typeof data.data.activeAmbassadors !== "number") throw new Error(JSON.stringify(data));
  });

  await test("GET /user/admin/owners", async () => {
    const res = await fetch(`${baseUrl}/user/admin/owners`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error(JSON.stringify(data));
  });

  await test("GET /swap/admin/all", async () => {
    const res = await fetch(`${baseUrl}/swap/admin/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error(JSON.stringify(data));
  });

  // 8. Test Alerts
  await test("GET /alert/my-alerts", async () => {
    const res = await fetch(`${baseUrl}/alert/my-alerts`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(JSON.stringify(data));
  });

  await test("PATCH /alert/mark-all-read", async () => {
    const res = await fetch(`${baseUrl}/alert/mark-all-read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(JSON.stringify(data));
  });

  console.log("\n=================================");
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("=================================");

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
