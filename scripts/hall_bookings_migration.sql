CREATE TABLE IF NOT EXISTS hall_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id TEXT DEFAULT 'remeritona',
  hall_type TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  booking_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  amount INTEGER NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hall_bookings_date ON hall_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_hall_bookings_status ON hall_bookings(status);
