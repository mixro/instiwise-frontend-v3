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

/** The months of the mock expense seed (src/mocks/expense-seed.ts). */
const SEED_RANGE = "period=custom&from=2026-05-01&to=2026-10-25";

/** Switches every chart on the page to its table. */
const showChartsAsTables = async (page: Page, language: Language) => {
  const name = language === "sw" ? "Onyesha kama jedwali" : "Show as table";
  const toggles = page.getByRole("button", { name });
  await expect(toggles.first()).toBeVisible();
  for (const toggle of await toggles.all()) await toggle.click();
  await expect(page.locator("main [aria-pressed=false]")).toHaveCount(0);
};

/** The visible "Reset password" button of one account (table on desktop, card on phones). */
const resetButton = (page: Page, language: Language, name: string) =>
  page
    .locator("main button:visible")
    .filter({ hasText: language === "sw" ? "Weka upya nenosiri" : "Reset password" })
    .filter({ hasText: name })
    .first();

/** A session as the sign-in form stores it, for people the role switcher does not offer. */
const asPerson = (role: "CLIENT" | "OPERATOR", name: string, email: string) => ({
  "instiwise.mockRole": JSON.stringify({ role, name, email }),
});

/** Fills a new password and its confirmation (reset by code or by link). */
const fillNewPassword = async (page: Page, password: string) => {
  for (const field of await page.locator("input[autocomplete=new-password]").all()) {
    await field.fill(password);
  }
};

/** The emailed links of the demo data (src/mocks/demo-data.ts). */
const LINK = {
  verify: "/verify-email/demo-verify-daudi-valid-4Fq8Zr2LmN7xPw",
  verifyExpired: "/verify-email/demo-verify-juma-expired-9Kd3Vt6QsB1yHc",
  verifyUsed: "/verify-email/demo-verify-neema-used-2Wp5Gx8RnJ4mLa",
  reset: "/reset-password/demo-reset-neema-valid-8Mv2Ka5PxQ7cRe",
  resetExpired: "/reset-password/demo-reset-baraka-expired-5Nb9Wc2GtV6hJs",
  resetUsed: "/reset-password/demo-reset-rehema-used-1Qz4Xf7BdK3pMy",
  resetCancelled: "/reset-password/demo-reset-neema-cancelled-3Lr6Ds9FqZ2nTw",
};

/** Clicks the Confirm button on /verify-email/<token> and waits for the outcome. */
const confirmEmail = async (page: Page) => {
  await page.locator("main button").first().click();
  await expect(page.locator("main h1")).not.toHaveText(/Confirm your|Thibitisha barua/);
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
  // Expenses (src/mocks/expenses.ts): operator entries, admin approval and corrections.
  { name: "operator-finance", path: "/operator/finance", role: "OPERATOR" },
  {
    name: "operator-expense-errors",
    path: "/operator/finance/expenses/new",
    role: "OPERATOR",
    prepare: async (page) => {
      await page.locator("main form button[type=submit]").click();
      await expect(page.locator("main [aria-invalid=true]").first()).toBeVisible();
    },
  },
  {
    name: "operator-expense-confirm",
    path: "/operator/finance/expenses/new",
    role: "OPERATOR",
    prepare: async (page) => {
      await page.locator("main input[value=FIXED]").check();
      await page.locator("main input[inputmode=numeric]").fill("20000");
      // With a fixed cost there is no project: category, then payment method.
      await page.locator("main form [role=combobox]").nth(0).click();
      await page.getByRole("option").first().click();
      await page.locator("main input[name=description]").fill("Airtime for client calls");
      await page.locator("main form [role=combobox]").nth(1).click();
      await page.getByRole("option").first().click();
      await page.locator("main form button[type=submit]").click();
      await expect(page.locator("main #expense-confirm")).toBeVisible();
    },
  },
  { name: "admin-finance-expenses", path: "/admin/finance?tab=expenses", role: "ADMIN" },
  {
    name: "admin-expense-reject",
    path: "/admin/finance?tab=expenses&status=PENDING",
    role: "ADMIN",
    // :visible: the phone shows cards, the desktop a table, both are in the page.
    prepare: async (page, language) => {
      const reject = language === "sw" ? "Kataa" : "Reject";
      await page.locator("main button:visible", { hasText: reject }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    name: "admin-expense-history",
    path: "/admin/finance?tab=expenses&status=REVERSED",
    role: "ADMIN",
    prepare: async (page) => {
      await page.locator("main button:visible", { hasText: /EXP-/ }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  { name: "admin-expense-new", path: "/admin/finance/expenses/new", role: "ADMIN" },
  // Finance analytics (decided 2026-10-25). A fixed range, so the seed's months always show.
  {
    name: "admin-finance-analytics",
    path: `/admin/finance?tab=analytics&${SEED_RANGE}`,
    role: "ADMIN",
    // Keyboard: focus the trend chart and step to a month, so its tooltip is checked too.
    prepare: async (page) => {
      await page.locator("main svg.recharts-surface").first().focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator(".recharts-tooltip-wrapper").first()).toBeVisible();
    },
  },
  {
    name: "admin-finance-analytics-tables",
    path: `/admin/finance?tab=analytics&${SEED_RANGE}`,
    role: "ADMIN",
    prepare: showChartsAsTables,
  },
  {
    name: "admin-finance-analytics-empty",
    path: "/admin/finance?tab=analytics&period=custom&from=2025-01-01&to=2025-01-31",
    role: "ADMIN",
  },
  {
    name: "operator-finance-reports",
    path: `/operator/finance?tab=reports&${SEED_RANGE}`,
    role: "OPERATOR",
  },
  {
    name: "operator-finance-reports-tables",
    path: `/operator/finance?tab=reports&${SEED_RANGE}`,
    role: "OPERATOR",
    prepare: showChartsAsTables,
  },
  // New projects with a draft agreement v1 (src/mocks/projects.ts).
  {
    name: "operator-project-new-errors",
    path: "/operator/projects/new",
    role: "OPERATOR",
    prepare: async (page) => {
      await page.locator("main form button[type=submit]").click();
      await expect(page.locator("main [aria-invalid=true]").first()).toBeVisible();
    },
  },
  {
    name: "operator-project-draft",
    path: "/operator/projects/prj_stove/agreement",
    role: "OPERATOR",
  },
  { name: "admin-project-new", path: "/admin/projects/new", role: "ADMIN" },
  {
    name: "admin-project-sent",
    path: "/admin/projects/prj_attendance/agreement",
    role: "ADMIN",
  },
  // The operator's own profile, and its password form showing every inline error.
  { name: "operator-profile", path: "/operator/profile", role: "OPERATOR" },
  {
    name: "operator-profile-errors",
    path: "/operator/profile",
    role: "OPERATOR",
    prepare: async (page) => {
      const form = page.locator("section", { has: page.locator("#password-heading") });
      await form.locator("button[type=submit]").click();
      await expect(form.locator("[aria-invalid=true]").first()).toBeVisible();
    },
  },
  // Staff inbox (src/mocks/messages.ts): the list, then one conversation per role.
  { name: "operator-inbox", path: "/operator/messages", role: "OPERATOR" },
  {
    name: "operator-conversation",
    path: "/operator/messages/prj_irrigation",
    role: "OPERATOR",
  },
  { name: "admin-inbox", path: "/admin/messages", role: "ADMIN" },
  { name: "admin-conversation", path: "/admin/messages/prj_weather", role: "ADMIN" },
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
  // Password reset with admin-issued codes (ADR 0005, src/mocks/reset-codes.ts).
  { name: "reset-entry", path: "/reset", role: "SIGNED_OUT" },
  {
    name: "reset-entry-error",
    path: "/reset",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await page.locator("form input").fill("hello");
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("[aria-invalid=true]")).toBeVisible();
    },
  },
  { name: "reset-form", path: "/reset/RST2-NEMA", role: "SIGNED_OUT" },
  {
    name: "reset-form-errors",
    path: "/reset/RST2-NEMA",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await page.locator("input[autocomplete=new-password]").first().fill("short1");
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("[aria-invalid=true]")).toHaveCount(2);
    },
  },
  {
    name: "reset-done",
    path: "/reset/RST2-NEMA",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      for (const field of await page.locator("input[autocomplete=new-password]").all()) {
        await field.fill("Mpya2026pass");
      }
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("main a[href='/login']")).toBeVisible();
    },
  },
  { name: "reset-invalid", path: "/reset/ZZZZ-9999", role: "SIGNED_OUT" },
  { name: "reset-expired", path: "/reset/RST2-XPRD", role: "SIGNED_OUT" },
  { name: "reset-used", path: "/reset/RST2-USED", role: "SIGNED_OUT" },
  { name: "reset-cancelled", path: "/reset/RST2-CNCL", role: "SIGNED_OUT" },
  { name: "reset-locked", path: "/reset/RST2-LOCK", role: "SIGNED_OUT" },
  // Email verification and reset by email (ADR 0006, src/mocks/email.ts).
  { name: "forgot-password", path: "/forgot-password", role: "SIGNED_OUT" },
  {
    name: "forgot-password-error",
    path: "/forgot-password",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("[aria-invalid=true]")).toBeVisible();
    },
  },
  {
    name: "forgot-password-sent",
    path: "/forgot-password",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await page.locator("input[type=email]").fill("neema@example.com");
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("main a[href='/login']")).toBeVisible();
    },
  },
  { name: "reset-link-form", path: LINK.reset, role: "SIGNED_OUT" },
  {
    name: "reset-link-errors",
    path: LINK.reset,
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await page.locator("input[autocomplete=new-password]").first().fill("short1");
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("[aria-invalid=true]")).toHaveCount(2);
    },
  },
  {
    name: "reset-link-done",
    path: LINK.reset,
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await fillNewPassword(page, "Mpya2026pass");
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("main a[href='/login']")).toBeVisible();
    },
  },
  { name: "reset-link-expired", path: LINK.resetExpired, role: "SIGNED_OUT" },
  { name: "reset-link-used", path: LINK.resetUsed, role: "SIGNED_OUT" },
  { name: "reset-link-cancelled", path: LINK.resetCancelled, role: "SIGNED_OUT" },
  { name: "reset-link-invalid", path: "/reset-password/abc", role: "SIGNED_OUT" },
  { name: "verify-email", path: LINK.verify, role: "SIGNED_OUT" },
  { name: "verify-email-done", path: LINK.verify, role: "SIGNED_OUT", prepare: confirmEmail },
  {
    name: "verify-email-expired",
    path: LINK.verifyExpired,
    role: "SIGNED_OUT",
    prepare: confirmEmail,
  },
  { name: "verify-email-used", path: LINK.verifyUsed, role: "SIGNED_OUT", prepare: confirmEmail },
  {
    name: "check-email-client",
    path: "/invite/KX7P-M4Q2",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await page.locator("input[autocomplete=name]").fill("Amani Kweka");
      await page.locator("input[type=email]").fill("amani@example.com");
      await page.locator("input[autocomplete=new-password]").fill("mradi2026");
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("main a[href='/client']")).toBeVisible();
    },
  },
  {
    name: "check-email-operator",
    path: "/invite/OPR8-T2QW",
    role: "SIGNED_OUT",
    prepare: async (page) => {
      await page.locator("input[autocomplete=name]").fill("Musa Komba");
      await page.locator("input[type=email]").fill("musa.k@example.com");
      await page.locator("input[type=tel]").fill("0687 123 456");
      await page.locator("input[autocomplete=new-password]").fill("mradi2026");
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("main a[href='/login']")).toBeVisible();
    },
  },
  {
    name: "banner-client",
    path: "/client",
    role: "CLIENT",
    storage: asPerson("CLIENT", "Daudi Mrisho", "daudi@example.com"),
  },
  {
    name: "banner-operator",
    path: "/operator",
    role: "OPERATOR",
    storage: asPerson("OPERATOR", "Juma Kassim", "juma@example.com"),
  },
  { name: "account-email", path: "/client/account", role: "CLIENT" },
  {
    name: "account-email-pending",
    path: "/client/account",
    role: "CLIENT",
    prepare: async (page) => {
      const section = page.locator("section", { has: page.locator("#email-heading") });
      await section.locator("button").first().click();
      await section.locator("input[type=email]").fill("neema.m@example.com");
      await section.locator("input[autocomplete=current-password]").fill("Instiwise2026");
      await section.locator("button[type=submit]").click();
      await expect(section.locator("button")).toHaveCount(2);
    },
  },
  { name: "operator-profile-email", path: "/operator/profile", role: "OPERATOR" },
  {
    name: "mailbox",
    path: "/forgot-password",
    role: "SIGNED_OUT",
    prepare: async (page, language) => {
      const label = language === "sw" ? /^Sanduku la barua/ : /^Mailbox/;
      await page.getByRole("button", { name: label }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    name: "admin-reset-issued",
    path: "/admin/clients",
    role: "ADMIN",
    prepare: async (page, language) => {
      await resetButton(page, language, "Daudi Mrisho").click();
      const issue = language === "sw" ? "Toa msimbo wa kuweka upya" : "Issue reset code";
      await page.getByRole("dialog").getByRole("button", { name: issue }).click();
      await expect(page.getByRole("dialog").locator("input.tracking-widest")).toHaveValue(
        /^[A-Z0-9]{4}-[A-Z0-9]{4}$/,
      );
    },
  },
  {
    name: "admin-reset-active",
    path: "/admin/clients",
    role: "ADMIN",
    prepare: async (page, language) => {
      await resetButton(page, language, "Neema Mwakyusa").click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
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
