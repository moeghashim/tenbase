import { expect, test } from "@playwright/test";

test("renders the markdown workspace and updates preview", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Tenbase")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Welcome\.md/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Welcome to Tenbase" }),
  ).toBeVisible();

  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+End" : "Control+End",
  );
  await page.keyboard.type(
    "\n\n## Browser Smoke\n\nThis appeared from Playwright.\n",
  );

  await expect(
    page.getByRole("heading", { name: "Browser Smoke" }),
  ).toBeVisible();

  await page.getByPlaceholder("Search files or content").fill("launch");
  await expect(page.getByText("Launch Plan.md").first()).toBeVisible();

  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ePub" })).toBeVisible();
});
