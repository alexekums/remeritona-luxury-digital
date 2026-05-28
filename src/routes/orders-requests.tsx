import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "./hotel-admin";

// @ts-ignore
export const Route = createFileRoute("/orders-requests")({
  head: () => ({ meta: [{ title: "Orders & Requests — Remeritona" }] }),
  component: () => <AdminPage initialTab="orders-requests" />,
});
