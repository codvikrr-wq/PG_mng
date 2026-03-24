// @ts-check
const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "codvikrr@gmail.com";
const ADMIN_PASS = "hi@codvik123.";

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

// ──────────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────────
test.describe("Authentication", () => {
  test("Login page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("Login with valid credentials redirects to dashboard", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test("Signup page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await expect(page.locator("h1, h2")).toBeVisible();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────────────────────────────────
test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Dashboard loads with stats cards", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("networkidle");
    // Check at least one stat card or heading is visible
    const cards = page.locator(".card, [class*='card']");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test("Sidebar is visible with navigation items", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    const sidebar = page.locator("aside, [data-sidebar]");
    await expect(sidebar.first()).toBeVisible();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Rooms
// ──────────────────────────────────────────────────────────────────────────
test.describe("Rooms", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Rooms page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/rooms`);
    await page.waitForLoadState("networkidle");
    // Should show rooms table or empty state
    const content = page.locator("table, [class*='empty'], h1, h2");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Add room dialog opens", async ({ page }) => {
    await page.goto(`${BASE_URL}/rooms`);
    await page.waitForLoadState("networkidle");
    const addBtn = page.getByRole("button", { name: /add room/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Tenants
// ──────────────────────────────────────────────────────────────────────────
test.describe("Tenants", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Tenants page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/tenants`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("table, [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("New tenant page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/tenants/new`);
    await page.waitForLoadState("networkidle");
    // Page uses Input components with placeholder="First name"
    const input = page.locator("input[placeholder='First name']");
    await expect(input).toBeVisible({ timeout: 15000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Payments
// ──────────────────────────────────────────────────────────────────────────
test.describe("Payments", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Invoices page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/payments/invoices`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("table, [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Payment records page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/payments/records`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("table, [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Expenses page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/payments/expenses`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("table, [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Finance reports page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/payments/reports`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Complaints & Absences
// ──────────────────────────────────────────────────────────────────────────
test.describe("Complaints & Absences", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Complaints page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/complaints`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("table, [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Absences page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/absences`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("table, [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Notices & Events
// ──────────────────────────────────────────────────────────────────────────
test.describe("Notices & Events", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Notices page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/notices`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Events page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Food Management
// ──────────────────────────────────────────────────────────────────────────
test.describe("Food Management", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Food plans page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/food/plans`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Daily menus page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/food/menus`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Kitchen dashboard loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/food/kitchen`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Housekeeping
// ──────────────────────────────────────────────────────────────────────────
test.describe("Housekeeping", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Cleaning schedules page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/housekeeping/schedules`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Maintenance tickets page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/housekeeping/maintenance`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Inventory page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/housekeeping/inventory`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────────────────────────────────
test.describe("Analytics", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Occupancy analytics page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/occupancy`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Revenue analytics page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/revenue`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Tenant analytics page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/tenants`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Audit log page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/audit`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], table, h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────────────────────────────────
test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Organization settings loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/organization`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("form, input, [class*='card']");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Users settings loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/users`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("table, [class*='card'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("Roles settings loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/roles`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("table, [class*='card'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PGs
// ──────────────────────────────────────────────────────────────────────────
test.describe("PG Management", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("PGs list page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/pgs`);
    await page.waitForLoadState("networkidle");
    const content = page.locator("[class*='card'], [class*='empty'], h1");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// No hydration errors on key pages
// ──────────────────────────────────────────────────────────────────────────
test.describe("No Console Errors", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("Dashboard has no hydration errors", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("networkidle");
    const hydrationErrors = errors.filter(
      (e) => e.includes("Hydration") || e.includes("hydration") || e.includes("button cannot")
    );
    expect(hydrationErrors).toHaveLength(0);
  });

  test("Tenants page has no hydration errors", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(`${BASE_URL}/tenants`);
    await page.waitForLoadState("networkidle");
    const hydrationErrors = errors.filter(
      (e) => e.includes("Hydration") || e.includes("hydration") || e.includes("button cannot")
    );
    expect(hydrationErrors).toHaveLength(0);
  });
});
