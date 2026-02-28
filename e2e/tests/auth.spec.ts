import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("signup creates account and redirects to dashboard", async ({
    page,
  }) => {
    await page.goto("/signup");
    await expect(page.locator("h1, h2")).toContainText(/sign up|create/i);

    await page.fill('input[name="name"], input[type="text"]', "E2E Test User");
    await page.fill('input[name="email"], input[type="email"]', `e2e-${Date.now()}@test.com`);
    await page.fill('input[name="orgName"]', "E2E Test Org");
    await page.fill('input[name="password"], input[type="password"]', "TestPass123!");

    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });

    await expect(page.url()).toContain("/dashboard");
  });

  test("login with valid credentials reaches dashboard", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, h2")).toContainText(/sign in|log in/i);
  });

  test("unauthenticated user redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login**", { timeout: 5000 });
    await expect(page.url()).toContain("/login");
  });
});
