import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { ensureMenuSeeded } from "@/lib/menu-seed";

const db = () => (env as unknown as { remeritona_bookings: D1Database }).remeritona_bookings;

export const getMenuItems = createServerFn({ method: "GET" }).handler(async (): Promise<any> => {
  const database = db();
  await ensureMenuSeeded(database);
  const result = await database.prepare(
    `SELECT * FROM menu_items
     WHERE hotel_id = 'remeritona'
     AND category != 'Spa'
     AND available = 1
     ORDER BY category ASC, name ASC`
  ).all();
  return { success: true, items: result.results ?? [] };
});

export const getSpaServices = createServerFn({ method: "GET" }).handler(async (): Promise<any> => {
  const database = db();
  await ensureMenuSeeded(database);
  const result = await database.prepare(
    `SELECT * FROM menu_items
     WHERE hotel_id = 'remeritona'
     AND category = 'Spa'
     AND available = 1
     ORDER BY name ASC`
  ).all();
  return { success: true, items: result.results ?? [] };
});
