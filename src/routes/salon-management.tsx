import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "./hotel-admin";

// @ts-ignore
export const Route = createFileRoute("/salon-management")({
  head: () => ({ meta: [{ title: "Salon Management — Remeritona" }] }),
  component: () => <AdminPage initialTab="salon-management" />,
});
