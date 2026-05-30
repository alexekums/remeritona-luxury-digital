import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "./hotel-admin";

// @ts-ignore
export const Route = createFileRoute("/menu-management")({
  head: () => ({ meta: [{ title: "Menu & Pricing — Remeritona" }] }),
  component: () => <AdminPage initialTab="menu-management" />,
});
