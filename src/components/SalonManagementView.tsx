import { useCallback, useEffect, useState } from "react";
import { fetchMenuItems } from "@/lib/menu-api-client";
import { fetchSpaBookings, patchSpaBookingStatus } from "@/lib/spa-api-client";
import {
  formatSpaDateTime,
  getSpaBadgeColor,
  getSpaBorderColor,
  lookupSpaPrice,
  sortSpaBookings,
  SPA_TIME_SLOTS,
} from "@/lib/spa-helpers";

type Colors = {
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  gold: string;
};

type Props = {
  token: string;
  colors: Colors;
  onToast?: (message: string, type?: "success" | "error") => void;
};

const STATUS_TABS = ["all", "pending", "confirmed", "completed", "cancelled"] as const;

export function SalonManagementView({ token, colors, onToast }: Props) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [spaMenuItems, setSpaMenuItems] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00 AM");

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [bookingsRes, menuRes] = await Promise.all([
        fetchSpaBookings(token),
        fetchMenuItems(token, "Spa"),
      ]);
      if (bookingsRes.success) setBookings(bookingsRes.bookings ?? []);
      if (menuRes.success) setSpaMenuItems(menuRes.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const today = new Date().toISOString().split("T")[0];
  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    today: bookings.filter((b) => String(b.preferred_date).split("T")[0] === today).length,
  };

  let filtered = bookings;
  if (statusFilter !== "all") filtered = filtered.filter((b) => b.status === statusFilter);
  if (dateFilter) filtered = filtered.filter((b) => String(b.preferred_date).split("T")[0] === dateFilter);
  if (roomSearch.trim()) {
    filtered = filtered.filter((b) => String(b.room_number).includes(roomSearch.trim()));
  }
  const displayBookings = sortSpaBookings(filtered);

  const handleStatus = async (
    id: string | number,
    status: string,
    extra?: { preferred_date?: string; preferred_time?: string }
  ) => {
    setActionLoading(String(id));
    try {
      const result = await patchSpaBookingStatus(token, id, { status, ...extra });
      if (result.success) {
        onToast?.("Booking updated", "success");
        setRescheduleId(null);
        await loadData();
      } else {
        onToast?.(result.error ?? "Failed to update", "error");
      }
    } catch {
      onToast?.("Failed to update booking", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const startReschedule = (booking: any) => {
    setRescheduleId(String(booking.id));
    setRescheduleDate(String(booking.preferred_date).split("T")[0]);
    setRescheduleTime(booking.preferred_time ?? "09:00 AM");
  };

  return (
    <div>
      <h1 style={{ color: colors.gold, fontSize: 22, fontWeight: 400, margin: "0 0 24px", letterSpacing: "0.05em" }}>
        Salon Management
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Bookings", value: stats.total },
          { label: "Pending", value: stats.pending },
          { label: "Confirmed", value: stats.confirmed },
          { label: "Today's Appointments", value: stats.today },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              padding: 20,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, color: colors.gold, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                background: statusFilter === s ? colors.gold : colors.surface2,
                color: statusFilter === s ? "#0a0a0a" : colors.textMuted,
                border: `1px solid ${colors.border}`,
                padding: "6px 14px",
                fontSize: 11,
                cursor: "pointer",
                textTransform: "capitalize",
                fontFamily: "Georgia, serif",
              }}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            background: colors.surface2,
            border: `1px solid ${colors.border}`,
            padding: "8px 12px",
            color: colors.text,
            fontFamily: "Georgia, serif",
          }}
        />
        <input
          type="text"
          placeholder="Search room…"
          value={roomSearch}
          onChange={(e) => setRoomSearch(e.target.value)}
          style={{
            background: colors.surface2,
            border: `1px solid ${colors.border}`,
            padding: "8px 14px",
            color: colors.text,
            fontFamily: "Georgia, serif",
            minWidth: 140,
          }}
        />
      </div>

      {loading && displayBookings.length === 0 && (
        <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>Loading salon bookings…</p>
      )}
      {!loading && displayBookings.length === 0 && (
        <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>No salon bookings found</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {displayBookings.map((booking) => {
          const isRescheduling = rescheduleId === String(booking.id);
          return (
            <div
              key={booking.id}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderLeft: `4px solid ${getSpaBorderColor(booking.status)}`,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 24, color: colors.gold, fontWeight: 700 }}>Room {booking.room_number}</span>
                  {booking.guest_name && (
                    <span style={{ fontSize: 13, color: colors.textMuted, marginLeft: 12 }}>{booking.guest_name}</span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    padding: "4px 10px",
                    background: getSpaBadgeColor(booking.status),
                    color: "#fff",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {booking.status}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 8 }}>{booking.service_name}</div>
              <div style={{ fontSize: 13, color: colors.text, marginBottom: 8 }}>
                {formatSpaDateTime(booking.preferred_date, booking.preferred_time)}
              </div>
              {booking.notes && (
                <p style={{ fontSize: 12, color: colors.textMuted, margin: "0 0 12px" }}>{booking.notes}</p>
              )}
              <div style={{ fontSize: 14, color: colors.gold, marginBottom: 16 }}>
                {lookupSpaPrice(booking.service_name, spaMenuItems)}
              </div>

              {isRescheduling && (
                <div
                  style={{
                    background: colors.surface2,
                    padding: 16,
                    marginBottom: 16,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "flex-end",
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>Date</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: "8px", color: colors.text }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>Time</label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: "8px", color: colors.text }}
                    >
                      {SPA_TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() =>
                      handleStatus(booking.id, booking.status, {
                        preferred_date: rescheduleDate,
                        preferred_time: rescheduleTime,
                      })
                    }
                    disabled={actionLoading === String(booking.id)}
                    style={{
                      background: colors.gold,
                      color: "#0a0a0a",
                      border: "none",
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setRescheduleId(null)}
                    style={{ background: "none", border: `1px solid ${colors.border}`, color: colors.textMuted, padding: "8px 16px", cursor: "pointer", fontSize: 11 }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {booking.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleStatus(booking.id, "confirmed")}
                      disabled={actionLoading === String(booking.id)}
                      style={{ background: "#22c55e", color: "#fff", border: "none", padding: "8px 14px", fontSize: 11, cursor: "pointer" }}
                    >
                      Confirm Booking
                    </button>
                    <button
                      onClick={() => handleStatus(booking.id, "cancelled")}
                      disabled={actionLoading === String(booking.id)}
                      style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef4444", padding: "8px 14px", fontSize: 11, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {booking.status === "confirmed" && (
                  <>
                    <button
                      onClick={() => handleStatus(booking.id, "completed")}
                      disabled={actionLoading === String(booking.id)}
                      style={{ background: "#888", color: "#fff", border: "none", padding: "8px 14px", fontSize: 11, cursor: "pointer" }}
                    >
                      Mark Completed
                    </button>
                    <button
                      onClick={() => startReschedule(booking)}
                      style={{ background: "transparent", color: colors.gold, border: `1px solid ${colors.gold}`, padding: "8px 14px", fontSize: 11, cursor: "pointer" }}
                    >
                      Reschedule
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
