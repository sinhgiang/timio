/**
 * Data retention policy — Timio
 *
 * FREE (starter)  : rolling 90-day window + 90-day buffer before actual deletion
 * PAID (pro/biz)  : keep ALL data while plan is active (no rolling delete)
 *                   → after plan expires: 6-month grace period
 *                   → after grace period: permanently deleted
 */

export const STARTER_RETENTION_DAYS = 90;      // advertised to free users
export const STARTER_BUFFER_DAYS    = 90;      // hidden buffer (total 180 days before delete)
export const PAID_GRACE_DAYS        = 180;     // 6 months after plan expiry before delete

/**
 * Can a company on this plan view data from a given month?
 * Used by UI to decide whether to show "expired" gate.
 *
 * @param plan        company.plan
 * @param planExpires company.planExpires (null = never expires / always valid)
 * @param dataDate    the month/date the user is trying to view
 */
export function canViewData(
  plan: string,
  planExpires: Date | null,
  dataDate: Date
): boolean {
  if (plan === "starter") {
    // Free: rolling 90-day window
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STARTER_RETENTION_DAYS);
    return dataDate >= cutoff;
  }

  // Paid plan: check if plan is still active
  if (!planExpires || planExpires > new Date()) {
    // Active — can see everything
    return true;
  }

  // Plan expired — can still see data during 6-month grace period
  const gracePeriodEnd = new Date(planExpires);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + PAID_GRACE_DAYS);
  return new Date() <= gracePeriodEnd;
}

/**
 * Returns the earliest date a starter user can view in the UI.
 * Not used for paid plans (they see everything while active).
 */
export function getStarterCutoffDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - STARTER_RETENTION_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Human-readable retention label for UI display */
export function retentionLabel(plan: string): string {
  const map: Record<string, string> = {
    starter: "90 ngày",
    pro: "1 năm",
    business: "3 năm",
  };
  return map[plan] ?? "90 ngày";
}
