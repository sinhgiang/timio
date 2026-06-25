"use client";
import { createContext, useContext } from "react";

type PlanContextValue = { plan: string; planExpires: string | null };
const PlanContext = createContext<PlanContextValue>({ plan: "starter", planExpires: null });

export function PlanProvider({
  plan,
  planExpires,
  children,
}: PlanContextValue & { children: React.ReactNode }) {
  return <PlanContext.Provider value={{ plan, planExpires }}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  return useContext(PlanContext);
}

export const PLAN_ORDER: Record<string, number> = { starter: 0, pro: 1, business: 2 };

export function hasPlanAccess(currentPlan: string, requiredPlan: "pro" | "business") {
  return (PLAN_ORDER[currentPlan] ?? 0) >= PLAN_ORDER[requiredPlan];
}
