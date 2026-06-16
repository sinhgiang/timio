// Role hierarchy: owner > manager > accountant
// Owner: full access
// Manager: manage employees, approve leave, view reports — no settings/billing/team
// Accountant: view reports + export only, receive leave emails optionally

export type AdminRole = "owner" | "manager" | "accountant";

// Max sub-users (excluding owner) per plan
export const PLAN_SUBUSER_LIMITS: Record<string, number> = {
  starter: 0,
  pro: 2,
  business: Infinity,
};

const PERMISSIONS = {
  // Reports & attendance
  viewReports: ["owner", "manager", "accountant"],
  exportReports: ["owner", "manager", "accountant"],
  viewEmployees: ["owner", "manager", "accountant"],

  // Employee management
  manageEmployees: ["owner", "manager"],   // add/edit
  deleteEmployees: ["owner"],
  registerFace: ["owner", "manager"],

  // Leave requests
  manageLeave: ["owner", "manager"],       // approve/reject

  // Settings & billing
  manageSettings: ["owner"],
  manageBilling: ["owner"],

  // Team (sub-users)
  manageTeam: ["owner"],
} as const;

type Permission = keyof typeof PERMISSIONS;

export function can(role: string, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly string[];
  return allowed.includes(role);
}

export function requireOwner(role: string): boolean {
  return role === "owner";
}
