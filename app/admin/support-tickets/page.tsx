import type { Metadata } from "next";
import SupportTicketsClient from "./SupportTicketsClient";

export const metadata: Metadata = { title: "Support Tickets" };

export default function SupportTicketsPage() {
  return <SupportTicketsClient />;
}
