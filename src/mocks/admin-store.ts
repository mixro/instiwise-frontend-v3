import type { AuditEntry, Settings } from "@/features/admin/api";
import type { OperatorStatus } from "@/lib/status";
import { seedAudit, seedClients, seedOperators, seedSettings, type MockClient } from "./staff-seed";

/*
 * Who works with whom, the audit log and the settings, shared by every mock
 * handler (client, operator, admin, auth). In memory; tests reset it.
 */

export const MOCK_ADMIN = "Rehema Said";

export interface MockOperator {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: OperatorStatus;
  registeredAt: string;
  reason?: string;
}

interface StaffState {
  operators: MockOperator[];
  clients: MockClient[];
  audit: AuditEntry[];
  settings: Settings;
}

function seed(): StaffState {
  return {
    operators: seedOperators(),
    clients: seedClients(),
    audit: seedAudit(),
    settings: seedSettings(),
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
