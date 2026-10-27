import type { AdminOperator, AuditEntry, Settings } from "@/features/admin/api";
import {
  seedAudit,
  seedClients,
  seedInvitations,
  seedOperators,
  seedSettings,
  type MockClient,
  type MockInvitation,
} from "./staff-seed";
import { seedResetCodes, type MockResetCode } from "./reset-seed";
import {
  seedExpenseCategories,
  seedExpenses,
  type MockExpense,
  type MockExpenseCategory,
} from "./expense-seed";

/*
 * Who works with whom, the audit log and the settings, shared by every mock
 * handler (client, operator, admin, auth). In memory; tests reset it.
 */

export const MOCK_ADMIN = "Rehema Said";

/** An operator account; its clients come from the assignments, its reset code from resetCodes. */
export type MockOperator = Omit<AdminOperator, "clients" | "resetCode" | "emailVerified">;

interface StaffState {
  operators: MockOperator[];
  clients: MockClient[];
  audit: AuditEntry[];
  settings: Settings;
  invitations: MockInvitation[];
  expenses: MockExpense[];
  expenseCategories: MockExpenseCategory[];
  /** Password reset codes, every one ever issued (ADR 0005). */
  resetCodes: MockResetCode[];
  /** When this browser last failed a reset code check or completion (the per-client limit). */
  resetFailures: number[];
}

function seed(): StaffState {
  return {
    operators: seedOperators(),
    clients: seedClients(),
    audit: seedAudit(),
    settings: seedSettings(),
    invitations: seedInvitations(),
    expenses: seedExpenses(),
    expenseCategories: seedExpenseCategories(),
    resetCodes: seedResetCodes(),
    resetFailures: [],
  };
}

let staff = seed();

export function staffState(): StaffState {
  return staff;
}

export function resetMockStaff(): void {
  staff = seed();
}

export function operatorById(id: string | null | undefined): MockOperator | undefined {
  return staff.operators.find((operator) => operator.id === id);
}

/** Appends to the audit log. History is only ever added to. */
export function addAudit(entry: Omit<AuditEntry, "id" | "at"> & { at?: string }): void {
  staff.audit.push({
    ...entry,
    id: `aud_${staff.audit.length + 1}`,
    at: entry.at ?? new Date().toISOString(),
  });
}
