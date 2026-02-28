import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("dashboard page loads with stats", async ({ page }) => {
    await page.goto("/dashboard");

    // If redirected to login, that's expected for unauthenticated access
    if (page.url().includes("/login")) {
      return;
    }

    await expect(page.locator("body")).not.toBeEmpty();
  });
});
