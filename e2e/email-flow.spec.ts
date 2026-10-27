import { expect, test, type Page } from "@playwright/test";

/*
 * The demo journey of ADR 0006 on a phone, in each theme and language: register,
 * confirm the address from the Mailbox panel, ask for a password reset, open
 * that link, set a new password and sign in with it. Labels differ by language,
 * so controls are found by type and the Mailbox by its first link of a kind.
 */

const THEMES = ["light", "dark"] as const;
const LANGUAGES = ["en", "sw"] as const;
const NEW_PASSWORD = "Mpya2026pass";

/** Opens the Mailbox and follows the newest link that goes to this kind of page. */
async function openNewestMail(page: Page, path: "/verify-email/" | "/reset-password/") {
  await page.getByRole("button", { name: /^(Mailbox|Sanduku la barua)/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.locator(`a[href^="${path}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(path));
}

for (const theme of THEMES) {
  for (const language of LANGUAGES) {
    test(`register, confirm, reset and sign in · ${theme} · ${language}`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "phone", "phone only");
      await page.addInitScript(
        (entries) => {
          for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
        },
        {
          "instiwise.theme": theme,
          "instiwise.lang": language,
          "instiwise.mockRole": "SIGNED_OUT",
        },
      );
      const email = `amani.${theme}.${language}@example.com`;

      // Register with an invitation: signed in, then "check your email".
      await page.goto("/invite/KX7P-M4Q2");
      await page.locator("input[autocomplete=name]").fill("Amani Kweka", { timeout: 30_000 });
      await page.locator("input[type=email]").fill(email);
      await page.locator("input[autocomplete=new-password]").fill("mradi2026");
      await page.locator("form button[type=submit]").click();
      await expect(page).toHaveURL(/\/check-email$/);
      await expect(page.locator("main")).toContainText(email);

      // Confirm the address with the link from the Mailbox; opening it changes nothing.
      await openNewestMail(page, "/verify-email/");
      await page.locator("main button").first().click();
      await expect(page.locator("main h1")).toHaveText(
        language === "sw" ? "Barua pepe imethibitishwa" : "Email address confirmed",
      );
      await page.locator("main a").first().click();
      await expect(page).toHaveURL(/\/client$/);
      await expect(page.locator("section[aria-label]")).toHaveCount(0);

      // Sign out, then ask for a reset by email.
      await page.locator("a[href='/client/account']:visible").first().click();
      await page.locator("main button", { hasText: /Sign out|Toka/ }).click();
      await page.locator("a[href='/forgot-password']").click();
      await page.locator("input[type=email]").fill(email);
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("main")).toContainText(email);

      // Open the reset link, choose a new password, and sign in with it.
      await openNewestMail(page, "/reset-password/");
      await expect(page.locator("input[autocomplete=new-password]")).toHaveCount(2);
      for (const field of await page.locator("input[autocomplete=new-password]").all()) {
        await field.fill(NEW_PASSWORD);
      }
      await page.locator("form button[type=submit]").click();
      await page.locator("main a[href='/login']").click();
      await page.locator("input[type=email]").fill(email);
      await page.locator("input[autocomplete=current-password]").fill(NEW_PASSWORD);
      await page.locator("form button[type=submit]").click();
      await expect(page).toHaveURL(/\/client$/);
      await page.screenshot({
        path: `e2e/screenshots/phone/email-flow-signed-in-${theme}-${language}.png`,
      });
    });
  }
}
