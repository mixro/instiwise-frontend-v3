import { lazy } from "react";
import type { ReactElement } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { AdminAuditPage } from "@/features/admin/AdminAuditPage";
import { AdminClientsPage } from "@/features/admin/AdminClientsPage";
import { AdminFinancePage } from "@/features/admin/AdminFinancePage";
import { AdminOperatorsPage } from "@/features/admin/AdminOperatorsPage";
import { AdminOverviewPage } from "@/features/admin/AdminOverviewPage";
import { AdminProjectsPage } from "@/features/admin/AdminProjectsPage";
import { AdminSettingsPage } from "@/features/admin/AdminSettingsPage";
import { ChangeReviewPage } from "@/features/admin/ChangeReviewPage";
import { GuestOnly } from "@/features/auth/GuestOnly";
import { InvitationEntryPage } from "@/features/auth/InvitationEntryPage";
import { InvitationPage } from "@/features/auth/InvitationPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { PendingApprovalPage } from "@/features/auth/PendingApprovalPage";
import { AccountPage } from "@/features/client/AccountPage";
import { AgreementTab } from "@/features/client/AgreementTab";
import { ChangesTab } from "@/features/client/ChangesTab";
import { DocumentsTab } from "@/features/client/DocumentsTab";
import { HomePage } from "@/features/client/HomePage";
import { MessagesTab } from "@/features/client/MessagesTab";
import { OverviewTab } from "@/features/client/OverviewTab";
import { PaymentsPage } from "@/features/client/PaymentsPage";
import { ProgressTab } from "@/features/client/ProgressTab";
import { ProjectLayout } from "@/features/client/ProjectLayout";
import { ProjectPaymentsTab } from "@/features/client/ProjectPaymentsTab";
import { ProjectsPage } from "@/features/client/ProjectsPage";
import { ClientLayout } from "@/features/shell/ClientLayout";
import { NoAccessPage } from "@/features/shell/NoAccessPage";
import { NotFound } from "@/features/shell/NotFound";
import { OperatorChangesPage } from "@/features/operator/OperatorChangesPage";
import { OperatorClientPage } from "@/features/operator/OperatorClientPage";
import { OperatorClientsPage } from "@/features/operator/OperatorClientsPage";
import { OperatorDashboardPage } from "@/features/operator/OperatorDashboardPage";
import { OperatorReceiptPage } from "@/features/operator/OperatorReceiptPage";
import { PaymentRecordsPage } from "@/features/operator/PaymentRecordsPage";
import { RecordPaymentPage } from "@/features/operator/RecordPaymentPage";
import { OperatorProjectsPage } from "@/features/operator/OperatorProjectsPage";
import { InboxPage } from "@/features/messages/InboxPage";
import { OperatorProfilePage } from "@/features/operator/OperatorProfilePage";
import { PlaceholderPage } from "@/features/shell/PlaceholderPage";
import { RequireRole } from "@/features/shell/RequireRole";
import { RoleHomeRedirect } from "@/features/shell/RoleHomeRedirect";
import { SidebarLayout } from "@/features/shell/SidebarLayout";
import { StandalonePage } from "@/features/shell/StandalonePage";
import { NAVIGATION, ROLE_HOME, type NavItem } from "@/features/shell/navigation";
import type { Role } from "@/lib/roles";

// Development-only pages. Not linked from anywhere and left out of production builds.
const DevComponentsPage = import.meta.env.DEV
  ? lazy(() =>
      import("@/features/dev/ComponentsPage").then((module) => ({
        default: module.ComponentsPage,
      })),
    )
  : null;

const devRoutes: RouteObject[] = DevComponentsPage
  ? [{ path: "/dev/components", element: <DevComponentsPage /> }]
  : [];

/** The client area: real screens (phase 2.2). Each project tab is its own URL. */
const clientArea: RouteObject = {
  path: ROLE_HOME.CLIENT,
  element: (
    <RequireRole role="CLIENT">
      <ClientLayout />
    </RequireRole>
  ),
  children: [
    { index: true, element: <HomePage /> },
    { path: "projects", element: <ProjectsPage /> },
    {
      path: "projects/:projectId",
      element: <ProjectLayout />,
      children: [
        { index: true, element: <Navigate to="overview" replace /> },
        { path: "overview", element: <OverviewTab /> },
        { path: "agreement", element: <AgreementTab /> },
        { path: "changes", element: <ChangesTab /> },
        { path: "progress", element: <ProgressTab /> },
        { path: "messages", element: <MessagesTab /> },
        { path: "payments", element: <ProjectPaymentsTab /> },
        { path: "documents", element: <DocumentsTab /> },
        { path: "*", element: <NotFound /> },
      ],
    },
    { path: "payments", element: <PaymentsPage /> },
    { path: "account", element: <AccountPage /> },
    { path: "*", element: <NotFound /> },
  ],
};

/**
 * Staff areas. Nav items without a real screen yet are placeholders titled after
 * the item; `screens` replaces them, `extra` adds deeper pages.
 */
function staffArea(
  role: Exclude<Role, "CLIENT">,
  screens: Record<string, ReactElement> = {},
  extra: RouteObject[] = [],
): RouteObject {
  const items: readonly NavItem[] = NAVIGATION[role];
  return {
    path: ROLE_HOME[role],
    element: (
      <RequireRole role={role}>
        <SidebarLayout role={role} />
      </RequireRole>
    ),
    children: [
      ...items.map((item) =>
        item.to === ROLE_HOME[role]
          ? { index: true, element: screens[item.to] ?? <PlaceholderPage label={item.label} /> }
          : {
              path: item.to.slice(ROLE_HOME[role].length + 1),
              element: screens[item.to] ?? <PlaceholderPage label={item.label} />,
            },
      ),
      ...extra,
      { path: "*", element: <NotFound /> },
    ],
  };
}

export const routes: RouteObject[] = [
  { path: "/", element: <RoleHomeRedirect /> },
  // Signed-out pages: sign-in, invitations, waiting for operator approval.
  {
    path: "/login",
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  {
    path: "/invite",
    element: (
      <GuestOnly>
        <InvitationEntryPage />
      </GuestOnly>
    ),
  },
  {
    path: "/invite/:code",
    element: (
      <GuestOnly>
        <InvitationPage />
      </GuestOnly>
    ),
  },
  {
    path: "/pending-approval",
    element: (
      <GuestOnly>
        <PendingApprovalPage />
      </GuestOnly>
    ),
  },
  clientArea,
  staffArea(
    "OPERATOR",
    {
      "/operator": <OperatorDashboardPage />,
      "/operator/clients": <OperatorClientsPage />,
      "/operator/projects": <OperatorProjectsPage />,
      "/operator/payments": <PaymentRecordsPage />,
      "/operator/messages": <InboxPage role="OPERATOR" />,
      "/operator/profile": <OperatorProfilePage />,
    },
    [
      { path: "messages/:projectId", element: <InboxPage role="OPERATOR" /> },
      { path: "clients/:clientId", element: <OperatorClientPage /> },
      { path: "projects/:projectId/changes", element: <OperatorChangesPage /> },
      { path: "payments/new", element: <RecordPaymentPage /> },
      { path: "payments/receipts/:receiptNumber", element: <OperatorReceiptPage /> },
    ],
  ),
  staffArea(
    "ADMIN",
    {
      "/admin": <AdminOverviewPage />,
      "/admin/clients": <AdminClientsPage />,
      "/admin/projects": <AdminProjectsPage />,
      "/admin/operators": <AdminOperatorsPage />,
      "/admin/finance": <AdminFinancePage />,
      "/admin/audit-logs": <AdminAuditPage />,
      "/admin/settings": <AdminSettingsPage />,
      "/admin/messages": <InboxPage role="ADMIN" />,
    },
    [
      { path: "projects/changes", element: <ChangeReviewPage /> },
      { path: "messages/:projectId", element: <InboxPage role="ADMIN" /> },
    ],
  ),
  { path: "/no-access", element: <NoAccessPage /> },
  ...devRoutes,
  {
    path: "*",
    element: (
      <StandalonePage>
        <NotFound />
      </StandalonePage>
    ),
  },
];
