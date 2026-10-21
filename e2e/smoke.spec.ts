import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * Visits every layout and /dev/components in each theme × language, at the
 * viewport of the running project (phone, desktop). Each visit saves a full-page
 * screenshot to e2e/screenshots/<project>/ and runs axe.
 */

type Theme = "light" | "dark";
type Language = "en" | "sw";
type Project = "phone" | "desktop";

interface Visit {
  name: string;
  path: string;
  /** Mock role, or SIGNED_OUT. */
  role: "CLIENT" | "OPERATOR" | "ADMIN" | "SIGNED_OUT";
  /** Extra localStorage entries, e.g. a collapsed sidebar. */
  storage?: Record<string, string>;
  /** Only meaningful at one width (the drawer exists on phones only, and so on). */
  only?: Project;
  /** Brings the page into the state to capture, after it has loaded. */
  prepare?: (page: Page, language: Language) => Promise<void>;
  /** The page shows loading placeholders on purpose (the component gallery). */
  keepsBusy?: true;
}

/** Labels differ by language, so forms are filled by input type. */
const fillLogin = async (page: Page, email: string, password: string) => {
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[autocomplete=current-password]").fill(password);
  await page.locator("form button[type=submit]").click();
};

const VISITS: Visit[] = [
  // The client journey (phase 2.2), answered by src/mocks/client.ts.
  { name: "client-home", path: "/client", role: "CLIENT" },
  { name: "client-projects", path: "/client/projects", role: "CLIENT" },
  {
    name: "client-project-overview",
    path: "/client/projects/prj_irrigation/overview",
    role: "CLIENT",
  },
  {
    name: "client-project-agreement-awaiting",
    path: "/client/projects/prj_attendance/agreement",
    role: "CLIENT",
  },
  {
    name: "client-project-agreement-confirm",
    path: "/client/projects/prj_attendance/agreement",
    role: "CLIENT",
    prepare: async (page) => {
      await page.locator("main section button").last().click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    name: "client-project-agreement-history",
    path: "/client/projects/prj_irrigation/agreement",
    role: "CLIENT",
    prepare: async (page) => {
      await page.locator("main details summary").first().click();
    },
  },
  {
    name: "client-project-progress",
    path: "/client/projects/prj_irrigation/progress",
    role: "CLIENT",
  },
  {
    name: "client-project-messages",
    path: "/client/projects/prj_irrigation/messages",
    role: "CLIENT",
  },
  {
    name: "client-project-message-failed",
    path: "/client/projects/prj_solar/messages",
    role: "CLIENT",
    prepare: async (page) => {
      await page.locator("main form textarea").fill("Hello [fail]");
      await page.locator("main form button[type=submit]").click();
      await expect(page.locator("main [role=alert]")).toBeVisible();
    },
  },
  {
    name: "client-project-payments",
    path: "/client/projects/prj_irrigation/payments",
    role: "CLIENT",
  },
  {
    name: "client-project-documents",
    path: "/client/projects/prj_solar/documents",
    role: "CLIENT",
  },
  {
    name: "client-project-documents-empty",
    path: "/client/projects/prj_attendance/documents",
    role: "CLIENT",
  },
  { name: "client-payments", path: "/client/payments", role: "CLIENT" },
  {
    name: "client-receipt",
    path: "/client/payments",
    role: "CLIENT",
    prepare: async (page) => {
      await page.locator("main button[aria-label*='RC-2026-0047']:visible").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator("[role=dialog] [aria-busy=true]")).toHaveCount(0);
    },
  },
  { name: "client-account", path: "/client/account", role: "CLIENT" },

  // Change requests (phase 2.3), answered by src/mocks/changes.ts.
  {
    name: "client-changes-waiting",
    path: "/client/projects/prj_irrigation/changes",
    role: "CLIENT",
  },
  {
    name: "client-changes-reject-dialog",
    path: "/client/projects/prj_irrigation/changes",
    role: "CLIENT",
    prepare: async (page) => {
      await page.locator("main section button").nth(1).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    name: "client-changes-history-open",
    path: "/client/projects/prj_irrigation/changes",
    role: "CLIENT",
    prepare: async (page) => {
      await page.locator("main details > summary").first().click();
    },
  },
  {
    name: "client-changes-empty",
    path: "/client/projects/prj_solar/changes",
    role: "CLIENT",
  },
  { name: "operator-projects", path: "/operator/projects", role: "OPERATOR" },
  {
    name: "operator-propose-change",
    path: "/operator/projects/prj_solar/changes",
    role: "OPERATOR",
    prepare: async (page) => {
      await page.locator("main section button").last().click();
      await expect(page.locator("main form")).toBeVisible();
    },
  },
  {
    name: "operator-change-open",
    path: "/operator/projects/prj_irrigation/changes",
    role: "OPERATOR",
  },
  { name: "admin-change-queue", path: "/admin/projects/changes", role: "ADMIN" },

  // Operator screens (phase 2.4), answered by src/mocks/operator.ts.
  { name: "operator-clients", path: "/operator/clients", role: "OPERATOR" },
  { name: "operator-client-detail", path: "/operator/clients/cli_neema", role: "OPERATOR" },
  { name: "operator-payment-records", path: "/operator/payments", role: "OPERATOR" },
  {
    name: "operator-record-payment-errors",
    path: "/operator/payments/new",
    role: "OPERATOR",
    prepare: async (page) => {
      await page.locator("main form button[type=submit]").click();
      await expect(page.locator("main [aria-invalid=true]").first()).toBeVisible();
    },
  },
  {
    name: "operator-record-payment-confirm",
    path: "/operator/payments/new?client=cli_neema",
    role: "OPERATOR",
    prepare: async (page) => {
      const main = page.locator("main");
      await main.getByRole("combobox").nth(1).click();
      await page.getByRole("option").first().click();
      await main.locator("input[inputmode=numeric]").fill("300000");
      await main.getByRole("combobox").nth(2).click();
      await page.getByRole("option").first().click();
      await main.locator("form button[type=submit]").click();
      await expect(main.locator("section[aria-labelledby=confirm-heading]")).toBeVisible();
    },
  },
  {
    name: "operator-receipt",
    path: "/operator/payments/receipts/RC-2026-0047",
    role: "OPERATOR",
  },

  // Admin screens (phase 2.5), answered by src/mocks/admin.ts.
  { name: "admin-clients", path: "/admin/clients", role: "ADMIN" },
  {
    name: "admin-assign-dialog",
    path: "/admin/clients",
    role: "ADMIN",
    prepare: async (page) => {
      await page
        .getByRole("button", { name: /^(Assign operator|Kabidhi mhudumu)/ })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  { name: "admin-projects", path: "/admin/projects", role: "ADMIN" },
  { name: "admin-operators-pending", path: "/admin/operators", role: "ADMIN" },
  {
    name: "admin-operators-active",
    path: "/admin/operators",
    role: "ADMIN",
    prepare: async (page) => {
      await page.getByRole("tab").nth(1).click();
      await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
    },
  },
  { name: "admin-finance", path: "/admin/finance", role: "ADMIN" },
  {
    name: "admin-finance-history",
    path: "/admin/finance",
    role: "ADMIN",
    prepare: async (page) => {
      await page.locator("main button:visible", { hasText: "RC-2026-0044" }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    name: "admin-finance-reverse",
    path: "/admin/finance",
    role: "ADMIN",
    prepare: async (page) => {
      const row = page.locator("main tr", { hasText: "RC-2026-0047" });
      const card = page.locator("main li", { hasText: "RC-2026-0047" });
      await ((await row.isVisible()) ? row : card).locator("button").last().click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  { name: "admin-audit", path: "/admin/audit-logs", role: "ADMIN" },
  { name: "admin-settings", path: "/admin/settings", role: "ADMIN" },
  { name: "operator-dashboard", path: "/operator", role: "OPERATOR" },
  {
    name: "operator-drawer",
    path: "/operator/clients",
    role: "OPERATOR",
    only: "phone",
    prepare: async (page, language) => {
      await page
        .getByRole("button", { name: language === "en" ? "Open menu" : "Fungua menyu" })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  // Invitations (src/mocks/invitations.ts): the form, then the link and code to share.
  {
    name: "operator-invite-form",
    path: "/operator/clients",
    role: "OPERATOR",
    prepare: async (page, language) => {
      await page
        .getByRole("button", { name: language === "en" ? "Invite client" : "Alika mteja" })
        .click();
      await expect(page.getByRole("dialog").locator("form")).toBeVisible();
    },
  },
  {
    name: "operator-invite-share",
    path: "/operator/clients",
    role: "OPERATOR",
    prepare: async (page, language) => {
      await page
        .getByRole("button", { name: language === "en" ? "Invite client" : "Alika mteja" })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("input").first().fill("Mwanaisha Omari");
      await dialog.locator("form button[type=submit]").click();
      await expect(dialog.locator("input[readonly]")).toHaveCount(2);
    },
  },
  {
    name: "admin-invite-form",
    path: "/admin/clients",
    role: "ADMIN",
    prepare: async (page, language) => {
      await page
        .getByRole("button", { name: language === "en" ? "Send invitation" : "Tuma mwaliko" })
        .click();
      await expect(page.getByRole("dialog").locator("form")).toBeVisible();
    },
  },
  { name: "admin-overview", path: "/admin", role: "ADMIN" },
  {
    name: "admin-sidebar-collapsed",
    path: "/admin/finance",
    role: "ADMIN",
    only: "desktop",
    storage: { "instiwise.sidebar": "collapsed" },
  },
  { name: "no-access", path: "/no-access", role: "SIGNED_OUT" },
  { name: "not-found", path: "/this-page-does-not-exist", role: "CLIENT" },
  { name: "dev-components", path: "/dev/components", role: "CLIENT", keepsBusy: true },

  // Signed-out screens, answered by the MSW mock backend (src/mocks/auth.ts).
  { name: "login", path: "/login", role: "SIGNED_OUT" },
  {
    name: "login-empty-fields",
    path: "/login",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("[aria-invalid=true]").first()).toBeVisible();
    },
  },
  {
    name: "login-wrong-password",
    path: "/login",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await fillLogin(page, "neema@example.com", "wrong-password1");
      await expect(page.getByRole("alert")).toBeVisible();
    },
  },
  { name: "invite-entry", path: "/invite", role: "SIGNED_OUT" },
  { name: "invite-invalid", path: "/invite/ZZZZ-9999", role: "SIGNED_OUT" },
  { name: "invite-expired", path: "/invite/EXPD-2026", role: "SIGNED_OUT" },
  { name: "invite-revoked", path: "/invite/RVKD-2026", role: "SIGNED_OUT" },
  { name: "invite-used", path: "/invite/USED-2026", role: "SIGNED_OUT" },
  { name: "register-client", path: "/invite/KX7P-M4Q2", role: "SIGNED_OUT" },
  {
    name: "register-client-errors",
    path: "/invite/KX7P-M4Q2",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await page.locator("input[type=tel]").fill("12345");
      await page.locator("input[autocomplete=new-password]").fill("12345678");
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("[aria-invalid=true]").first()).toBeVisible();
    },
  },
  { name: "register-operator", path: "/invite/OPR8-T2QW", role: "SIGNED_OUT" },
  { name: "pending-approval", path: "/pending-approval", role: "SIGNED_OUT" },
];

const THEMES: Theme[] = ["light", "dark"];
const LANGUAGES: Language[] = ["en", "sw"];

/** axe rule sets: WCAG 2.1 A and AA. */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

for (const visit of VISITS) {
  for (const theme of THEMES) {
    for (const language of LANGUAGES) {
      test(`${visit.name} · ${theme} · ${language}`, async ({ page }, testInfo) => {
        const project = testInfo.project.name as Project;
        test.skip(visit.only !== undefined && visit.only !== project, `${visit.only} only`);

        await page.addInitScript(
          (entries) => {
            for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
          },
          {
            "instiwise.theme": theme,
            "instiwise.lang": language,
            "instiwise.mockRole": visit.role,
            ...visit.storage,
          },
        );
        // Stops skeleton pulses and spinners, so screenshots are stable.
        await page.emulateMedia({ reducedMotion: "reduce" });

        await page.goto(visit.path);
        // Generous: the dev server compiles modules on first request.
        await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("html")).toHaveAttribute("lang", language);
        if (theme === "dark") await expect(page.locator("html")).toHaveClass(/\bdark\b/);
        else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
        await page.waitForLoadState("networkidle");
        // Wait for loading states (e.g. the invitation check) to finish.
        if (!visit.keepsBusy) await expect(page.locator("main [aria-busy=true]")).toHaveCount(0);
        // Nothing may be wider than the screen: sideways scrolling breaks phone layouts.
        const widths = await page.evaluate(() => ({
          page: document.documentElement.scrollWidth,
          screen: document.documentElement.clientWidth,
        }));
        expect(widths.page, "page is wider than the screen").toBeLessThanOrEqual(widths.screen);
        await visit.prepare?.(page, language);

        // Sticky and fixed bars are drawn where the viewport is; start at the top so they sit there.
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `e2e/screenshots/${project}/${visit.name}-${theme}-${language}.png`,
          fullPage: true,
          animations: "disabled",
        });

        const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        await testInfo.attach("axe-violations.json", {
          body: JSON.stringify(results.violations, null, 2),
          contentType: "application/json",
        });

        const blocking = results.violations.filter((violation) =>
          BLOCKING_IMPACTS.has(violation.impact ?? ""),
        );
        const summary = blocking
          .map(
            (violation) =>
              `[${violation.impact}] ${violation.id}: ${violation.help}\n` +
              violation.nodes.map((node) => `    ${node.target.join(" ")}`).join("\n"),
          )
          .join("\n");
        expect(blocking, `Serious or critical accessibility violations:\n${summary}`).toEqual([]);
      });
    }
  }
}
