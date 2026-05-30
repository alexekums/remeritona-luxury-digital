import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "./hotel-admin";

// @ts-ignore
export const Route = createFileRoute("/spa-management")({
  head: () => ({ meta: [{ title: "Spa & Wellness — Remeritona" }] }),
  component: () => <AdminPage initialTab="spa-management" />,
});
