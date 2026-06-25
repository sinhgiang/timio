// Data retention policy
// ADVERTISED = what users see on the pricing page
// BUFFER = hidden grace period after advertised limit, before actual deletion
// Data becomes "inaccessible" in UI after ADVERTISED days.
// Data is permanently deleted from DB after ADVERTISED + BUFFER days.

export const ADVERTISED_DAYS: Record<string, number> = {
  starter: 90,
  pro: 365,       // 1 year
  business: 1095, // 3 years
};

export const BUFFER_DAYS: Record<string, number> = {
  starter: 90,   // 3 months grace (6 months total)
  pro: 180,      // 6 months grace (18 months total)
  business: 548, // 18 months grace (4.5 years total)
};

/**
 * Returns the earliest date a user on this plan can VIEW in the UI.
 * Data older than this is shown as "expired" even if it's still in DB.
 */
export function getRetentionCutoffDate(plan: string): Date {
  const days = ADVERTISED_DAYS[plan] ?? ADVERTISED_DAYS.starter;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the earliest date used by the cron job to ACTUALLY DELETE records.
 * This is advertised + buffer — invisible to users.
 */
export function getDeletionCutoffDate(plan: string): Date {
  const days = (ADVERTISED_DAYS[plan] ?? ADVERTISED_DAYS.starter)
              + (BUFFER_DAYS[plan] ?? BUFFER_DAYS.starter);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Human-readable retention label, e.g. "1 năm" */
export function retentionLabel(plan: string): string {
  const map: Record<string, string> = {
    starter: "90 ngày",
    pro: "1 năm",
    business: "3 năm",
  };
  return map[plan] ?? "90 ngày";
}
