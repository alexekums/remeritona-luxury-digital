export async function resolveGuestProfile(
  db: any,
  name: string,
  email: string,
  phone: string
): Promise<number> {
  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim();
  const normalizedPhone = String(phone || "").trim();

  if (!normalizedName) return 0;

  // Try to find a match on ANY 2 out of 3 fields
  const fuzzyMatch = await db.prepare(`
    SELECT id FROM hotel_guests
    WHERE 
      (LOWER(full_name) = LOWER(?) AND LOWER(email) = LOWER(?))
      OR (LOWER(full_name) = LOWER(?) AND phone = ?)
      OR (LOWER(email) = LOWER(?) AND phone = ?)
    LIMIT 1
  `).bind(
    normalizedName, normalizedEmail,
    normalizedName, normalizedPhone,
    normalizedEmail, normalizedPhone
  ).first() as { id: number } | null;

  if (fuzzyMatch) {
    return fuzzyMatch.id;
  }

  // To prevent UNIQUE constraint violations on email, check if email is already in use
  if (normalizedEmail) {
    const emailMatch = await db.prepare(`
      SELECT id FROM hotel_guests WHERE LOWER(email) = LOWER(?) LIMIT 1
    `).bind(normalizedEmail).first() as { id: number } | null;

    if (emailMatch) {
      return emailMatch.id;
    }
  }

  // Create new record in hotel_guests
  const safeEmail = normalizedEmail || `guest-${Date.now()}@remeritona.local`;
  await db.prepare(`
    INSERT INTO hotel_guests (email, phone, full_name, current_points, lifetime_points, tier)
    VALUES (?, ?, ?, 0, 0, 'SILVER')
  `).bind(safeEmail, normalizedPhone, normalizedName).run();

  // Retrieve the generated ID
  const lastRow = await db.prepare(`
    SELECT id FROM hotel_guests WHERE LOWER(full_name) = LOWER(?) AND phone = ? LIMIT 1
  `).bind(normalizedName, normalizedPhone).first() as { id: number } | null;

  return lastRow ? lastRow.id : 0;
}

export async function evaluateGuestTier(db: any, profileId: number | string): Promise<string> {
  const guest = await db.prepare(`
    SELECT lifetime_points FROM hotel_guests WHERE id = ? LIMIT 1
  `).bind(profileId).first() as { lifetime_points: number } | null;

  if (!guest) return 'SILVER';

  const pts = guest.lifetime_points || 0;
  let newTier = 'SILVER';
  let tierNum = 1;

  if (pts >= 100) {
    newTier = 'PLATINUM';
    tierNum = 3;
  } else if (pts >= 50) {
    newTier = 'GOLD';
    tierNum = 2;
  }

  // Update master profile
  await db.prepare(`
    UPDATE hotel_guests SET tier = ? WHERE id = ?
  `).bind(newTier, profileId).run();

  // Cascade update to active sessions in guests table
  await db.prepare(`
    UPDATE guests 
    SET tier = ?
    WHERE booking_ref IN (
      SELECT reference FROM bookings WHERE guest_profile_id = ? AND status = 'checked_in'
    )
  `).bind(tierNum, profileId).run();

  return newTier;
}
