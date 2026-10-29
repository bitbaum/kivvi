import { expect, test } from "@playwright/test";

test("ChatKit renders the shared thread and sends from the composer on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/smoke/chatkit");

  const composer = page.getByRole("textbox", { name: "Ask Kivvi anything..." });
  await expect(composer).toBeVisible();
  await composer.fill("Find the repair queue");
  await composer.press("Enter");

  await expect(page.getByText("Find the repair queue", { exact: true })).toBeVisible();
  await expect(page.getByText("Kivvi received: Find the repair queue")).toBeVisible();
  await expect(composer).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
