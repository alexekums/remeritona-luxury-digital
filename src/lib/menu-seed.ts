export type MenuSeedItem = {
  name: string;
  description: string;
  price: number;
  category: string;
  duration_mins?: number;
};

export const SPA_SEED_ITEMS: MenuSeedItem[] = [
  { name: "Swedish Massage", description: "Relaxing full-body massage", price: 15000, category: "Spa", duration_mins: 60 },
  { name: "Deep Tissue Massage", description: "Therapeutic deep pressure massage", price: 20000, category: "Spa", duration_mins: 90 },
  { name: "Facial Treatment", description: "Rejuvenating facial care", price: 12000, category: "Spa", duration_mins: 45 },
  { name: "Manicure + Pedicure", description: "Complete nail care package", price: 8000, category: "Spa", duration_mins: 60 },
];

export const FOOD_SEED_ITEMS: MenuSeedItem[] = [
  { name: "Amala & Ewedu", description: "Soft amala with ewedu and assorted meat", price: 4500, category: "Swallows" },
  { name: "Pounded Yam & Egusi", description: "Classic pounded yam with rich egusi soup", price: 5000, category: "Swallows" },
  { name: "Eba & Okro", description: "Eba served with okro soup", price: 4000, category: "Swallows" },
  { name: "Fufu & Bitterleaf", description: "Fufu with onugbu soup", price: 4800, category: "Swallows" },
  { name: "Jollof Rice", description: "Smoky party-style jollof with chicken", price: 3500, category: "Rice Dishes" },
  { name: "Fried Rice", description: "Nigerian fried rice with plantain", price: 3200, category: "Rice Dishes" },
  { name: "Coconut Rice", description: "Fragrant coconut rice with prawns", price: 3800, category: "Rice Dishes" },
  { name: "Ofada Rice & Ayamase", description: "Local ofada rice with pepper sauce", price: 4200, category: "Rice Dishes" },
  { name: "Suya Platter", description: "Spiced grilled beef skewers", price: 5500, category: "Grills & BBQ" },
  { name: "Grilled Chicken", description: "Half chicken with pepper sauce", price: 4800, category: "Grills & BBQ" },
  { name: "Pepper Soup (Goat)", description: "Spicy goat meat pepper soup", price: 4500, category: "Grills & BBQ" },
  { name: "Grilled Fish", description: "Whole croaker fish grilled", price: 6000, category: "Grills & BBQ" },
  { name: "Nkwobi", description: "Spiced cow foot delicacy", price: 4000, category: "Soups" },
  { name: "Pepper Soup (Catfish)", description: "Fresh catfish pepper soup", price: 5000, category: "Soups" },
  { name: "Isi Ewu", description: "Spiced goat head delicacy", price: 5500, category: "Soups" },
  { name: "Chicken Wings (6pc)", description: "Crispy fried chicken wings", price: 2800, category: "Light Bites" },
  { name: "Meat Pie", description: "Freshly baked meat pie", price: 1200, category: "Light Bites" },
  { name: "Spring Rolls (4pc)", description: "Crispy vegetable spring rolls", price: 2000, category: "Light Bites" },
  { name: "Chapman", description: "Signature Nigerian mocktail", price: 2500, category: "Drinks" },
  { name: "Fresh Orange Juice", description: "Freshly squeezed orange juice", price: 1800, category: "Drinks" },
  { name: "Zobo", description: "Hibiscus drink with spices", price: 1500, category: "Drinks" },
  { name: "Bottled Water", description: "500ml still water", price: 500, category: "Drinks" },
  { name: "Chin Chin", description: "Crunchy Nigerian snack", price: 1500, category: "Snacks" },
  { name: "Puff Puff (6pc)", description: "Sweet fried dough balls", price: 1200, category: "Snacks" },
  { name: "Plantain Chips", description: "Crispy plantain crisps", price: 1000, category: "Snacks" },
];

export async function ensureMenuSeeded(db: D1Database): Promise<void> {
  const countRow = await db.prepare(`SELECT COUNT(*) as count FROM menu_items`).first() as { count: number } | null;
  if ((countRow?.count ?? 0) > 0) return;

  const allItems = [...FOOD_SEED_ITEMS, ...SPA_SEED_ITEMS];
  for (const item of allItems) {
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO menu_items
        (id, hotel_id, name, description, price, category, available, duration_mins, created_at)
       VALUES (?, 'remeritona', ?, ?, ?, ?, 1, ?, datetime('now'))`
    ).bind(id, item.name, item.description, item.price, item.category, item.duration_mins ?? 0).run();
  }
}
