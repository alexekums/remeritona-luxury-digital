import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  adminLogin, getDashboardStats, updateRoomStatus,
  checkInGuest, checkOutGuest
} from "@/functions/adminAuth";
import { formatNaira } from "@/data/rooms";
import {
  LogOut, Moon, Sun, Users, Hotel, TrendingUp,
  CheckCircle, XCircle, Clock, Search, RefreshCw,
  BedDouble, Sparkles, AlertCircle, ChevronDown, X
} from "lucide-react";

// @ts-ignore
export const Route = createFileRoute("/hotel-admin")({
  head: () => ({ meta: [{ title: "Admin — Remeritona" }] }),
  component: AdminPage,
});

const HOTEL_ID = "remeritona";
const TOKEN_KEY = "remeritona_admin_token";
const THEME_KEY = "remeritona_admin_theme";

const ROOM_STATUSES = [
  { value: "vacant_clean", label: "Vacant — Clean", color: "#22c55e" },
  { value: "vacant_dirty", label: "Vacant — Dirty", color: "#f59e0b" },
  { value: "occupied", label: "Occupied", color: "#ef4444" },
  { value: "maintenance", label: "Maintenance", color: "#8b5cf6" },
];

function getStatusColor(status: string) {
  return ROOM_STATUSES.find(s => s.value === status)?.color ?? "#888";
}

function getStatusLabel(status: string) {
  return ROOM_STATUSES.find(s => s.value === status)?.label ?? status;
}

function getBookingStatusColor(status: string) {
  switch (status) {
    case "confirmed": return "#22c55e";
    case "checked_in": return "#3b82f6";
    case "checked_out": return "#888";
    case "cancelled": return "#ef4444";
    case "scheduled": return "#f59e0b";
    default: return "#888";
  }
}

function AdminPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [token, setToken] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "bookings" | "rooms">("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isDark = theme === "dark";

  const colors = {
    bg: isDark ? "#0a0a0a" : "#f5f5f0",
    surface: isDark ? "#141414" : "#ffffff",
    surface2: isDark ? "#1a1a1a" : "#f0ede8",
    border: isDark ? "#2a2a2a" : "#e0dbd0",
    text: isDark ? "#e8e0d0" : "#1a1a1a",
    textMuted: isDark ? "#888" : "#666",
    gold: "#c9a96e",
    goldSoft: "#b8935a",
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as "dark" | "light" | null;
    if (savedTheme) setTheme(savedTheme);
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) setToken(savedToken);
  }, []);

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
  };

  const loadStats = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const result = await getDashboardStats({ data: { token: t } }) as any;
      if (result.success) setStats(result);
      else { localStorage.removeItem(TOKEN_KEY); setToken(null); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadStats(token);
  }, [token, loadStats]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const result = await adminLogin({ data: { pin, hotelId: HOTEL_ID } });
      if (result.success && result.token) {
        localStorage.setItem(TOKEN_KEY, result.token);
        setToken(result.token);
        setStaffName(result.name ?? "");
      } else {
        setLoginError(result.error ?? "Invalid PIN");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setStats(null);
    setPin("");
  };

  const handleRoomStatus = async (roomSlug: string, status: string) => {
    if (!token) return;
    setActionLoading(roomSlug);
    try {
      await updateRoomStatus({ data: { token, roomSlug, status, updatedBy: staffName } });
      showToast("Room status updated");
      await loadStats(token);
    } catch {
      showToast("Failed to update room", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckIn = async (booking: any) => {
    if (!token) return;
    setActionLoading(booking.reference);
    try {
      await checkInGuest({ data: { token, reference: booking.reference, roomSlug: booking.room_slug } });
      showToast(`${booking.guest_name} checked in successfully`);
      setSelectedBooking(null);
      await loadStats(token);
    } catch {
      showToast("Check-in failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (booking: any) => {
    if (!token) return;
    setActionLoading(booking.reference);
    try {
      await checkOutGuest({ data: { token, reference: booking.reference, roomSlug: booking.room_slug } });
      showToast(`${booking.guest_name} checked out successfully`);
      setSelectedBooking(null);
      await loadStats(token);
    } catch {
      showToast("Check-out failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBookings = stats?.allBookings?.filter((b: any) => {
    const matchSearch = search === "" ||
      b.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.reference?.toLowerCase().includes(search.toLowerCase()) ||
      b.guest_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  }) ?? [];

  const todayArrivals = stats?.todayCheckIns?.length ?? 0;
  const todayDepartures = stats?.todayCheckOuts?.length ?? 0;
  const occupiedRooms = stats?.roomStatuses?.filter((r: any) => r.status === "occupied").length ?? 0;

  // ==================== LOGIN PAGE ====================
  if (!token) {
    return (
      <div style={{
        minHeight: "100vh", background: isDark ? "#0a0a0a" : "#f5f5f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Georgia, serif", padding: "20px"
      }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}>
          <button onClick={toggleTheme} style={{
            background: "none", border: `1px solid ${colors.border}`,
            borderRadius: "50%", width: 40, height: 40, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: colors.gold
          }}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div style={{
          background: colors.surface, border: `1px solid ${colors.border}`,
          padding: "48px", maxWidth: 400, width: "100%"
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={{ color: colors.gold, fontSize: 11, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 8 }}>
              Staff Portal
            </p>
            <h1 style={{ color: colors.text, fontSize: 28, fontWeight: 400, margin: 0 }}>Remeritona</h1>
            <p style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>Hotel Management System</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                Staff PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter your PIN"
                maxLength={10}
                style={{
                  width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                  padding: "12px 16px", color: colors.text, fontSize: 16,
                  fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box",
                  letterSpacing: "0.3em"
                }}
                required
              />
            </div>
            {loginError && (
              <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{loginError}</p>
            )}
            <button type="submit" disabled={loginLoading} style={{
              width: "100%", background: colors.gold, color: "#0a0a0a",
              border: "none", padding: "14px", fontSize: 12,
              letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700,
              cursor: loginLoading ? "not-allowed" : "pointer", opacity: loginLoading ? 0.7 : 1,
              fontFamily: "Georgia, serif"
            }}>
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== MAIN DASHBOARD ====================
  return (
    <div style={{ minHeight: "100vh", background: colors.bg, fontFamily: "Georgia, serif", color: colors.text }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "success" ? "#22c55e" : "#ef4444",
          color: "#fff", padding: "12px 20px", fontSize: 13,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)", borderRadius: 4
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: colors.surface, borderBottom: `1px solid ${colors.border}`,
        padding: "0 24px", height: 64, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ color: colors.gold, fontSize: 18, fontWeight: 400, margin: 0, letterSpacing: "0.1em" }}>
            REMERITONA
          </h1>
          <span style={{ color: colors.textMuted, fontSize: 12 }}>Hotel Management</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => token && loadStats(token)} style={{
            background: "none", border: `1px solid ${colors.border}`, padding: "6px 12px",
            color: colors.textMuted, cursor: "pointer", fontSize: 12, display: "flex",
            alignItems: "center", gap: 6
          }}>
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={toggleTheme} style={{
            background: "none", border: `1px solid ${colors.border}`,
            borderRadius: "50%", width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: colors.gold
          }}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: colors.textMuted }}>{staffName}</span>
            <button onClick={handleLogout} style={{
              background: "none", border: `1px solid ${colors.border}`, padding: "6px 12px",
              color: colors.textMuted, cursor: "pointer", fontSize: 12,
              display: "flex", alignItems: "center", gap: 6
            }}>
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, padding: "0 24px", display: "flex", gap: 0 }}>
        {(["dashboard", "bookings", "rooms"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: "none", border: "none", borderBottom: activeTab === tab ? `2px solid ${colors.gold}` : "2px solid transparent",
            padding: "16px 20px", color: activeTab === tab ? colors.gold : colors.textMuted,
            cursor: "pointer", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase",
            fontFamily: "Georgia, serif"
          }}>
            {tab === "dashboard" ? "Dashboard" : tab === "bookings" ? "All Bookings" : "Room Status"}
          </button>
        ))}
      </div>

      <main style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
        {loading && (
          <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>Loading...</p>
        )}

        {/* ===== DASHBOARD TAB ===== */}
        {!loading && activeTab === "dashboard" && stats && (
          <div>
            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Today's Arrivals", value: todayArrivals, icon: <Users size={20} />, color: "#3b82f6" },
                { label: "Today's Departures", value: todayDepartures, icon: <CheckCircle size={20} />, color: "#22c55e" },
                { label: "Occupied Rooms", value: `${occupiedRooms} / ${stats.roomStatuses?.length ?? 5}`, icon: <BedDouble size={20} />, color: "#ef4444" },
                { label: "Monthly Revenue", value: formatNaira(stats.monthlyRevenue ?? 0), icon: <TrendingUp size={20} />, color: colors.gold },
              ].map(card => (
                <div key={card.label} style={{
                  background: colors.surface, border: `1px solid ${colors.border}`,
                  padding: 20, display: "flex", flexDirection: "column", gap: 12
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>{card.label}</span>
                    <span style={{ color: card.color }}>{card.icon}</span>
                  </div>
                  <span style={{ fontSize: 28, color: card.color, fontWeight: 400 }}>{card.value}</span>
                </div>
              ))}
            </div>

            {/* Today's Check-ins */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
              {[
                { title: "Today's Arrivals", data: stats.todayCheckIns, action: "check-in" },
                { title: "Today's Departures", data: stats.todayCheckOuts, action: "check-out" },
              ].map(section => (
                <div key={section.title} style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 20 }}>
                  <h3 style={{ color: colors.gold, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 16px" }}>
                    {section.title}
                  </h3>
                  {section.data?.length === 0 ? (
                    <p style={{ color: colors.textMuted, fontSize: 13 }}>None today</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {section.data?.map((b: any) => (
                        <div key={b.reference} style={{
                          background: colors.surface2, padding: 12,
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 14, color: colors.text }}>{b.guest_name}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: colors.textMuted }}>{b.room_name} · {b.reference}</p>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <span style={{
                              fontSize: 10, padding: "3px 8px", letterSpacing: "0.1em",
                              textTransform: "uppercase", border: `1px solid`,
                              borderColor: getBookingStatusColor(b.status),
                              color: getBookingStatusColor(b.status)
                            }}>
                              {b.status}
                            </span>
                            {b.status === "confirmed" && section.action === "check-in" && (
                              <button onClick={() => handleCheckIn(b)} disabled={actionLoading === b.reference} style={{
                                background: "#3b82f6", color: "#fff", border: "none",
                                padding: "4px 12px", fontSize: 11, cursor: "pointer",
                                letterSpacing: "0.1em", textTransform: "uppercase"
                              }}>
                                {actionLoading === b.reference ? "..." : "Check In"}
                              </button>
                            )}
                            {b.status === "checked_in" && section.action === "check-out" && (
                              <button onClick={() => handleCheckOut(b)} disabled={actionLoading === b.reference} style={{
                                background: "#22c55e", color: "#fff", border: "none",
                                padding: "4px 12px", fontSize: 11, cursor: "pointer",
                                letterSpacing: "0.1em", textTransform: "uppercase"
                              }}>
                                {actionLoading === b.reference ? "..." : "Check Out"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== BOOKINGS TAB ===== */}
        {!loading && activeTab === "bookings" && stats && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: colors.surface, border: `1px solid ${colors.border}`, padding: "8px 12px", flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ color: colors.textMuted }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or reference..."
                  style={{ background: "none", border: "none", outline: "none", color: colors.text, fontSize: 13, width: "100%", fontFamily: "Georgia, serif" }} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
                background: colors.surface, border: `1px solid ${colors.border}`, padding: "8px 12px",
                color: colors.text, fontSize: 13, fontFamily: "Georgia, serif", outline: "none", cursor: "pointer"
              }}>
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {/* Bookings Table */}
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {["Guest", "Room", "Check In", "Check Out", "Total", "Gateway", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>No bookings found</td></tr>
                  ) : filteredBookings.map((b: any) => (
                    <tr key={b.reference} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ margin: 0, fontSize: 13, color: colors.text }}>{b.guest_name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: colors.textMuted }}>{b.guest_email}</p>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{b.room_name}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{new Date(b.check_in).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{new Date(b.check_out).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: colors.gold }}>{formatNaira(b.total)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: colors.textMuted, textTransform: "capitalize" }}>{b.gateway}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          fontSize: 10, padding: "3px 8px", letterSpacing: "0.1em",
                          textTransform: "uppercase", border: `1px solid`,
                          borderColor: getBookingStatusColor(b.status),
                          color: getBookingStatusColor(b.status)
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {b.status === "confirmed" && (
                            <button onClick={() => handleCheckIn(b)} style={{
                              background: "#3b82f6", color: "#fff", border: "none",
                              padding: "4px 10px", fontSize: 10, cursor: "pointer",
                              letterSpacing: "0.1em", textTransform: "uppercase"
                            }}>Check In</button>
                          )}
                          {b.status === "checked_in" && (
                            <button onClick={() => handleCheckOut(b)} style={{
                              background: "#22c55e", color: "#fff", border: "none",
                              padding: "4px 10px", fontSize: 10, cursor: "pointer",
                              letterSpacing: "0.1em", textTransform: "uppercase"
                            }}>Check Out</button>
                          )}
                          <button onClick={() => setSelectedBooking(b)} style={{
                            background: "none", border: `1px solid ${colors.border}`,
                            padding: "4px 10px", fontSize: 10, cursor: "pointer",
                            color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase"
                          }}>View</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ROOMS TAB ===== */}
        {!loading && activeTab === "rooms" && stats && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {stats.roomStatuses?.map((room: any) => (
                <div key={room.room_slug} style={{
                  background: colors.surface, border: `1px solid ${colors.border}`, padding: 20
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, color: colors.text }}>{room.room_name}</h3>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: colors.textMuted }}>
                        Last updated: {new Date(room.updated_at).toLocaleString()}
                      </p>
                      {room.updated_by && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: colors.textMuted }}>By: {room.updated_by}</p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, padding: "4px 10px", letterSpacing: "0.1em",
                      textTransform: "uppercase", border: `1px solid`,
                      borderColor: getStatusColor(room.status),
                      color: getStatusColor(room.status)
                    }}>
                      {getStatusLabel(room.status)}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {ROOM_STATUSES.map(s => (
                      <button key={s.value} onClick={() => handleRoomStatus(room.room_slug, s.value)}
                        disabled={room.status === s.value || actionLoading === room.room_slug}
                        style={{
                          background: room.status === s.value ? s.color : "none",
                          border: `1px solid ${s.color}`,
                          color: room.status === s.value ? "#fff" : s.color,
                          padding: "6px 8px", fontSize: 10, cursor: room.status === s.value ? "default" : "pointer",
                          letterSpacing: "0.08em", textTransform: "uppercase",
                          opacity: actionLoading === room.room_slug ? 0.5 : 1
                        }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: colors.surface, border: `1px solid ${colors.border}`,
            padding: 32, maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <p style={{ color: colors.gold, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>Booking Details</p>
              <button onClick={() => setSelectedBooking(null)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}>
                <X size={18} />
              </button>
            </div>
            {[
              ["Reference", selectedBooking.reference],
              ["Guest Name", selectedBooking.guest_name],
              ["Email", selectedBooking.guest_email],
              ["Phone", selectedBooking.guest_phone],
              ["Room", selectedBooking.room_name],
              ["Check In", new Date(selectedBooking.check_in).toLocaleDateString()],
              ["Check Out", new Date(selectedBooking.check_out).toLocaleDateString()],
              ["Nights", selectedBooking.nights],
              ["Rooms", selectedBooking.num_rooms],
              ["Guests", selectedBooking.guests],
              ["Gateway", selectedBooking.gateway],
              ["Payment Mode", selectedBooking.payment_mode],
              ["Subtotal", formatNaira(selectedBooking.subtotal)],
              ["Discount", formatNaira(selectedBooking.discount)],
              ["Tax", formatNaira(selectedBooking.tax)],
              ["Total", formatNaira(selectedBooking.total)],
              ["Status", selectedBooking.status],
              ["Special Requests", selectedBooking.guest_notes || "None"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
                <span style={{ color: colors.textMuted }}>{label}</span>
                <span style={{ color: label === "Total" ? colors.gold : colors.text, textAlign: "right", maxWidth: "60%" }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              {selectedBooking.status === "confirmed" && (
                <button onClick={() => handleCheckIn(selectedBooking)} style={{
                  flex: 1, background: "#3b82f6", color: "#fff", border: "none",
                  padding: "12px", fontSize: 11, cursor: "pointer",
                  letterSpacing: "0.15em", textTransform: "uppercase"
                }}>Check In Guest</button>
              )}
              {selectedBooking.status === "checked_in" && (
                <button onClick={() => handleCheckOut(selectedBooking)} style={{
                  flex: 1, background: "#22c55e", color: "#fff", border: "none",
                  padding: "12px", fontSize: 11, cursor: "pointer",
                  letterSpacing: "0.15em", textTransform: "uppercase"
                }}>Check Out Guest</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}