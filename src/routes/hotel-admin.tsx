import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  adminLogin, getDashboardStats, updateRoomStatus,
  checkInGuest, checkOutGuest
} from "@/functions/adminAuth";
import { saveGuestRegistration, getGuestRegistration } from "@/functions/saveRegistration";
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

// Room type display order and labels
const ROOM_TYPE_ORDER = ["Classic", "Superior", "Executive", "Executive Twin", "Business Suite", "Executive Suite"];

function getRoomTypeFromName(roomName: string): string {
  if (roomName.includes("Executive Suite")) return "Executive Suite";
  if (roomName.includes("Business Suite")) return "Business Suite";
  if (roomName.includes("Executive Twin")) return "Executive Twin";
  if (roomName.includes("Executive")) return "Executive";
  if (roomName.includes("Superior")) return "Superior";
  return "Classic";
}

function getRoomTypeColor(type: string): string {
  switch (type) {
    case "Classic": return "#888";
    case "Superior": return "#3b82f6";
    case "Executive": return "#c9a96e";
    case "Executive Twin": return "#c9a96e";
    case "Business Suite": return "#8b5cf6";
    case "Executive Suite": return "#ef4444";
    default: return "#888";
  }
}

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

  // Room picker modal state
  const [roomPickerBooking, setRoomPickerBooking] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Early checkout confirmation state
  const [earlyCheckoutBooking, setEarlyCheckoutBooking] = useState<any>(null);
  // Room search
  const [roomSearch, setRoomSearch] = useState("");
  // Collapsible floors
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(new Set());
  const toggleFloor = (floor: string) => setCollapsedFloors(prev => {
    const next = new Set(prev);
    if (next.has(floor)) next.delete(floor); else next.add(floor);
    return next;
  });
  const allFloors = stats?.roomStatuses
    ? [...new Set((stats.roomStatuses as any[]).map((r: any) => `Floor ${r.room_number?.toString()[0]}`))]
    : [];

  // Walk-in booking modal
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkIn, setWalkIn] = useState({ name: "", email: "", phone: "", roomType: "classic", numRooms: 1, checkIn: "", checkOut: "", paymentMethod: "cash", notes: "" });
  const [walkInLoading, setWalkInLoading] = useState(false);



  // Guest registration card
  const [regCard, setRegCard] = useState<any>(null); // booking that needs registration
  const [regForm, setRegForm] = useState<any>({});
  const [regSaving, setRegSaving] = useState(false);
  const [regPrinting, setRegPrinting] = useState(false);

  const openRegCard = (booking: any, assignedRoom?: string) => {
    const nameParts = (booking.guest_name ?? "").trim().split(" ");
    const surname = nameParts[nameParts.length - 1] ?? "";
    const otherNames = nameParts.slice(0, -1).join(" ");
    setRegForm({
      bookingRef: booking.reference,
      roomNumber: assignedRoom ?? booking.room_number ?? "",
      roomType: booking.room_name ?? "",
      tariff: booking.total ? `₦${Number(booking.total).toLocaleString()}` : "",
      arrival: (booking.check_in ?? "").split("T")[0],
      departure: (booking.check_out ?? "").split("T")[0],
      surname, otherNames,
      residentialAddress: "", state: "", companyAddress: "", occupation: "",
      email: booking.guest_email ?? "", address: "", purpose: "Leisure",
      tel: booking.guest_phone ?? "", nationality: "Nigerian",
      passportNo: "", dateIssued: "", visaPermitNo: "",
      nextOfKin: "", nextOfKinPhone: "", carReg: "",
      receptionist: staffName, billingInstruction: "Room Only",
      signatureObtained: false,
    });
    setRegCard(booking);
  };
  // Occupied room guest detail popup
  const [occupiedRoomDetail, setOccupiedRoomDetail] = useState<any>(null);
  const [occupiedRoomLoading, setOccupiedRoomLoading] = useState(false);
  // Reassign room
  const [reassignBooking, setReassignBooking] = useState<any>(null);
  const [reassignOldRoom, setReassignOldRoom] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);
  // Reassign reason
  const [reassignReason, setReassignReason] = useState("");
  const [reassignReasonOther, setReassignReasonOther] = useState("");
  const [showReassignReason, setShowReassignReason] = useState(false);
  const [pendingReassignRoom, setPendingReassignRoom] = useState<any>(null);
  // Idle timer
  const [idleWarning, setIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);
  // Reassign room
  const [reassigningOldRoom, setReassigningOldRoom] = useState<string | null>(null);

  // Room status tab filter
  const [roomStatusFilter, setRoomStatusFilter] = useState<string | null>(null);

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

  // ── Idle timer: 10min warning → 60sec countdown → auto logout ──
  useEffect(() => {
    if (!token) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    let countdownInterval: ReturnType<typeof setInterval>;
    let countdown = 60;

    const resetIdle = () => {
      clearTimeout(idleTimer);
      clearInterval(countdownInterval);
      setIdleWarning(false);
      setIdleCountdown(60);
      countdown = 60;
      idleTimer = setTimeout(() => {
        setIdleWarning(true);
        countdownInterval = setInterval(() => {
          countdown -= 1;
          setIdleCountdown(countdown);
          if (countdown <= 0) {
            clearInterval(countdownInterval);
            handleLogout();
          }
        }, 1000);
      }, 10 * 60 * 1000); // 10 minutes
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetIdle));
    resetIdle();

    // Logout on browser close/tab close
    const handleUnload = () => {
      localStorage.removeItem(TOKEN_KEY);
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearTimeout(idleTimer);
      clearInterval(countdownInterval);
      events.forEach(e => window.removeEventListener(e, resetIdle));
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [token]);

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

  const handleRoomStatus = async (roomNumber: string, status: string) => {
    if (!token) return;
    setActionLoading(roomNumber);
    try {
      await updateRoomStatus({ data: { token, roomNumber, status, updatedBy: staffName } });
      showToast("Room status updated");
      await loadStats(token);
    } catch {
      showToast("Failed to update room", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Look up active guest for an occupied room
  const handleViewOccupiedRoom = async (room: any) => {
    if (!stats?.allBookings) return;
    setOccupiedRoomLoading(true);
    // Find checked_in booking matching this room number
    const activeBooking = stats.allBookings.find((b: any) =>
      b.status === "checked_in" && b.room_number === room.room_number
    );
    setOccupiedRoomDetail({ room, booking: activeBooking ?? null });
    setOccupiedRoomLoading(false);
  };

  // Reassign room for a checked-in guest
;

  // Reassign guest to a different room
  const handleReassignRoom = async () => {
    if (!token || !reassignBooking || !selectedRoom || !reassignOldRoom) return;
    setReassigning(true);
    try {
      // Free old room → vacant_dirty
      await updateRoomStatus({ data: { token, roomNumber: reassignOldRoom, status: "vacant_dirty", updatedBy: staffName } });
      // Check in to new room (reuses checkInGuest which sets occupied + updates booking)
      const result = await checkInGuest({
        data: {
          token,
          reference: reassignBooking.reference,
          roomSlug: `room-${selectedRoom.room_number}`,
          roomNumber: selectedRoom.room_number,
          guestName: reassignBooking.guest_name,
          guestEmail: reassignBooking.guest_email,
          checkIn: reassignBooking.check_in,
          checkOut: reassignBooking.check_out,
        }
      }) as any;
      if (result.success) {
        showToast(`Room reassigned to ${selectedRoom.room_number} successfully`);
        setReassignBooking(null);
        setReassignOldRoom(null);
        setSelectedRoom(null);
        await loadStats(token);
      } else {
        showToast(result.error ?? "Reassignment failed", "error");
      }
    } catch {
      showToast("Reassignment failed", "error");
    } finally {
      setReassigning(false);
    }
  };

  // Opens room picker modal instead of directly checking in
  const handleCheckIn = (booking: any) => {
    setSelectedRoom(null);
    setRoomPickerBooking(booking);
    // Close booking detail modal if open
    setSelectedBooking(null);
  };

  // Called after admin picks a room in the modal (handles both check-in and reassign)
  const handleCheckInWithRoom = async () => {
    if (!token || !roomPickerBooking || !selectedRoom) return;
    setCheckingIn(true);
    const today = new Date().toISOString().split("T")[0];
    const bookingCheckIn = (roomPickerBooking.check_in ?? "").split("T")[0];
    const effectiveCheckIn = today < bookingCheckIn ? today : bookingCheckIn;
    const isReassign = !!reassigningOldRoom;
    try {
      // If reassigning, free the old room first
      if (isReassign && reassigningOldRoom) {
        await updateRoomStatus({ data: { token, roomNumber: reassigningOldRoom, status: "vacant_dirty", updatedBy: staffName } });
      }
      const result = await checkInGuest({
        data: {
          token,
          reference: roomPickerBooking.reference,
          roomSlug: selectedRoom.room_slug,
          roomNumber: selectedRoom.room_number,
          guestName: roomPickerBooking.guest_name,
          guestEmail: roomPickerBooking.guest_email,
          checkIn: effectiveCheckIn,
          checkOut: roomPickerBooking.check_out,
        }
      }) as any;
      if (result.success) {
        const msg = isReassign
          ? `${roomPickerBooking.guest_name} moved from Room ${reassigningOldRoom} to Room ${selectedRoom.room_number}`
          : `${roomPickerBooking.guest_name} checked in to Room ${selectedRoom.room_number}`;
        showToast(msg);
        const completedBooking = { ...roomPickerBooking };
        const assignedRoomNum = selectedRoom?.room_number;
        setRoomPickerBooking(null);
        setSelectedRoom(null);
        setReassigningOldRoom(null);
        await loadStats(token);
        // Auto-open registration card on new check-in (not reassign)
        if (!isReassign) openRegCard(completedBooking, assignedRoomNum);
      } else {
        showToast(result.error ?? "Operation failed", "error");
      }
    } catch {
      showToast(isReassign ? "Room reassignment failed" : "Check-in failed", "error");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = (booking: any) => {
    const today = new Date().toISOString().split("T")[0];
    const checkoutDate = (booking.check_out ?? "").split("T")[0];
    if (checkoutDate && today < checkoutDate) {
      setEarlyCheckoutBooking(booking);
      setSelectedBooking(null);
    } else {
      confirmCheckOut(booking);
    }
  };

  const confirmCheckOut = async (booking: any) => {
    if (!token) return;
    setEarlyCheckoutBooking(null);
    setActionLoading(booking.reference);
    try {
      await checkOutGuest({ data: { token, reference: booking.reference, roomSlug: booking.room_slug, roomNumber: booking.room_number } });
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

  // Vacant clean rooms for the picker — filtered by booked type, grouped by floor
  const vacantRooms = stats?.roomStatuses?.filter((r: any) => r.status === "vacant_clean") ?? [];
  const vacantByType = ROOM_TYPE_ORDER.reduce((acc: Record<string, any[]>, type) => {
    const rooms = vacantRooms.filter((r: any) => getRoomTypeFromName(r.room_name) === type);
    if (rooms.length > 0) acc[type] = rooms;
    return acc;
  }, {});

  // For room picker: get booked type from booking, filter matching rooms, group by floor
  const getPickerRooms = (booking: any) => {
    const bookedType = booking?.room_name ?? "";
    // Determine which room types match the booked category
    let matchType = "Classic";
    if (bookedType.toLowerCase().includes("executive suite")) matchType = "Executive Suite";
    else if (bookedType.toLowerCase().includes("business suite")) matchType = "Business Suite";
    else if (bookedType.toLowerCase().includes("executive twin")) matchType = "Executive Twin";
    else if (bookedType.toLowerCase().includes("executive")) matchType = "Executive";
    else if (bookedType.toLowerCase().includes("superior")) matchType = "Superior";

    const matching = vacantRooms.filter((r: any) => getRoomTypeFromName(r.room_name) === matchType);
    // Group by floor (first digit of room number)
    const byFloor: Record<string, any[]> = {};
    matching.forEach((r: any) => {
      const floor = r.room_number ? `Floor ${r.room_number[0]}` : "Other";
      if (!byFloor[floor]) byFloor[floor] = [];
      byFloor[floor].push(r);
    });
    return { matchType, byFloor, total: matching.length };
  };

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

      {/* Suppress external chat widget in PMS */}
      <style>{`
        #tidio-chat, #tidio-chat-iframe, .tidio-1, [id*="tidio"], [class*="tidio"],
        #hubspot-messages-iframe-container, .intercom-launcher,
        [class*="chat-widget"], [id*="chat-widget"] { display: none !important; }
      `}</style>

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
          <button onClick={() => {
            const t = new Date().toISOString().split("T")[0];
            const t2 = new Date(Date.now()+86400000).toISOString().split("T")[0];
            setWalkIn({ name: "", email: "", phone: "", roomType: "classic", numRooms: 1, checkIn: t, checkOut: t2, paymentMethod: "cash", notes: "" });
            setShowWalkIn(true);
          }} style={{
            background: colors.gold, border: "none", padding: "6px 14px",
            color: "#0a0a0a", cursor: "pointer", fontSize: 11, display: "flex",
            alignItems: "center", gap: 6, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", fontFamily: "Georgia, serif"
          }}>
            + Walk-in
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
                { label: "Occupied Rooms", value: `${occupiedRooms} / ${stats.roomStatuses?.length ?? 96}`, icon: <BedDouble size={20} />, color: "#ef4444" },
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

            {/* Today's Check-ins / Check-outs */}
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
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
                              <span style={{
                                fontSize: 10, padding: "3px 8px", letterSpacing: "0.1em",
                                textTransform: "uppercase", border: `1px solid`,
                                borderColor: getBookingStatusColor(b.status),
                                color: getBookingStatusColor(b.status)
                              }}>
                                {b.status}
                              </span>
                              {b.early_checkin && (
                                <span style={{
                                  fontSize: 9, padding: "2px 6px", letterSpacing: "0.08em",
                                  textTransform: "uppercase", background: "#f59e0b22",
                                  border: "1px solid #f59e0b", color: "#f59e0b"
                                }}>Early</span>
                              )}
                            </div>
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
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          <span style={{
                            fontSize: 10, padding: "3px 8px", letterSpacing: "0.1em",
                            textTransform: "uppercase", border: `1px solid`,
                            borderColor: getBookingStatusColor(b.status),
                            color: getBookingStatusColor(b.status)
                          }}>
                            {b.status}
                          </span>
                          {b.early_checkin && (
                            <span style={{
                              fontSize: 9, padding: "2px 6px", letterSpacing: "0.08em",
                              textTransform: "uppercase", background: "#f59e0b22",
                              border: "1px solid #f59e0b", color: "#f59e0b"
                            }}>Early check-in</span>
                          )}
                        </div>
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
            {/* Collapse All / Expand All */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => {
                if (collapsedFloors.size === allFloors.length) {
                  setCollapsedFloors(new Set());
                } else {
                  setCollapsedFloors(new Set(allFloors));
                }
              }} style={{
                background: "none", border: `1px solid ${colors.border}`, padding: "6px 14px",
                color: colors.textMuted, cursor: "pointer", fontSize: 11,
                letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif"
              }}>
                {collapsedFloors.size === allFloors.length ? "▶ Expand All" : "▼ Collapse All"}
              </button>
            </div>

            {/* Room search */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: colors.surface, border: `1px solid ${colors.border}`, padding: "10px 14px", marginBottom: 12, maxWidth: 320 }}>
              <Search size={14} style={{ color: colors.textMuted, flexShrink: 0 }} />
              <input
                value={roomSearch}
                onChange={e => setRoomSearch(e.target.value)}
                placeholder="Search room number or type..."
                style={{ background: "none", border: "none", outline: "none", color: colors.text, fontSize: 13, width: "100%", fontFamily: "Georgia, serif" }}
              />
              {roomSearch && (
                <button onClick={() => setRoomSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, padding: 0, display: "flex" }}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Clickable filter badges */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              {ROOM_STATUSES.map(s => {
                const count = stats.roomStatuses?.filter((r: any) => r.status === s.value).length ?? 0;
                const isActive = roomStatusFilter === s.value;
                return (
                  <button key={s.value} onClick={() => setRoomStatusFilter(isActive ? null : s.value)} style={{
                    background: isActive ? s.color : colors.surface,
                    border: `1px solid ${isActive ? s.color : colors.border}`,
                    padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
                    cursor: "pointer", transition: "all 0.15s ease",
                    boxShadow: isActive ? `0 0 0 3px ${s.color}33` : "none"
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "#fff" : s.color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: isActive ? "#fff" : colors.textMuted }}>{s.label}</span>
                    <span style={{ fontSize: 15, color: isActive ? "#fff" : s.color, fontWeight: 600, minWidth: 20 }}>{count}</span>
                  </button>
                );
              })}
              {roomStatusFilter && (
                <button onClick={() => setRoomStatusFilter(null)} style={{
                  background: "none", border: `1px solid ${colors.border}`, padding: "10px 14px",
                  cursor: "pointer", color: colors.textMuted, fontSize: 11,
                  letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6
                }}>
                  <X size={12} /> Clear filter
                </button>
              )}
            </div>

            {/* Rooms grouped by floor */}
            {(() => {
              const allRooms = stats.roomStatuses ?? [];
              const filtered = allRooms.filter((r: any) => {
                const matchStatus = !roomStatusFilter || r.status === roomStatusFilter;
                const matchSearch = !roomSearch || 
                  r.room_number?.includes(roomSearch) || 
                  r.room_name?.toLowerCase().includes(roomSearch.toLowerCase());
                return matchStatus && matchSearch;
              });
              // Group by floor
              const byFloor: Record<string, any[]> = {};
              filtered.forEach((r: any) => {
                const floor = r.room_number ? `Floor ${r.room_number[0]}` : "Other";
                if (!byFloor[floor]) byFloor[floor] = [];
                byFloor[floor].push(r);
              });
              if (filtered.length === 0) {
                return <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>No rooms match this filter</p>;
              }
              return Object.entries(byFloor).sort().map(([floor, rooms]) => {
                const isCollapsed = collapsedFloors.has(floor);
                return (
                <div key={floor} style={{ marginBottom: 24 }}>
                  {/* Clickable floor header */}
                  <button onClick={() => toggleFloor(floor)} style={{
                    width: "100%", background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12, marginBottom: isCollapsed ? 0 : 12,
                    padding: "6px 0"
                  }}>
                    <h3 style={{ margin: 0, fontSize: 13, color: colors.gold, letterSpacing: "0.2em", textTransform: "uppercase" }}>{floor}</h3>
                    <div style={{ flex: 1, height: 1, background: colors.border }} />
                    <span style={{ fontSize: 11, color: colors.textMuted }}>{(rooms as any[]).length} room{rooms.length !== 1 ? "s" : ""}</span>
                    <span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 4 }}>{isCollapsed ? "▶" : "▼"}</span>
                  </button>
                  {!isCollapsed && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                    {(rooms as any[]).sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number)).map((room: any) => {
                      const roomType = getRoomTypeFromName(room.room_name);
                      const typeColor = getRoomTypeColor(roomType);
                      return (
                        <div key={room.room_slug} style={{
                          background: colors.surface,
                          border: `1px solid ${room.status === "occupied" ? "#ef444433" : room.status === "maintenance" ? "#8b5cf633" : colors.border}`,
                          padding: 14
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <span style={{ fontSize: 16, color: colors.text, fontWeight: 400 }}>
                                  {room.room_name.split(" - ")[0]}
                                </span>
                                <span style={{ fontSize: 9, padding: "2px 5px", border: `1px solid ${typeColor}`, color: typeColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                  {roomType}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: 9, color: colors.textMuted }}>
                                {new Date(room.updated_at).toLocaleString()}
                              </p>
                            </div>
                            <span style={{
                              fontSize: 9, padding: "3px 7px", letterSpacing: "0.08em",
                              textTransform: "uppercase", border: `1px solid`,
                              borderColor: getStatusColor(room.status),
                              color: getStatusColor(room.status), whiteSpace: "nowrap", flexShrink: 0
                            }}>
                              {getStatusLabel(room.status)}
                            </span>
                          </div>
                          {room.status === "occupied" ? (
                            <div style={{
                              background: "#ef444411", border: "1px solid #ef444466",
                              padding: "8px", fontSize: 9, color: "#ef4444",
                              lineHeight: 1.6
                            }}>
                              <button
                                onClick={() => handleViewOccupiedRoom(room)}
                                style={{
                                  width: "100%", background: "none", border: "none",
                                  cursor: "pointer", textAlign: "center", padding: "4px 0"
                                }}
                              >
                                <span style={{ color: "#ef4444", fontSize: 9, letterSpacing: "0.06em" }}>
                                  👤 Guest checked in
                                </span><br />
                                <span style={{ color: "#888", fontSize: 8 }}>Tap to view guest details</span>
                              </button>
                              <div style={{ marginTop: 6, textAlign: "center" }}>
                                <button onClick={() => handleRoomStatus(room.room_number, "maintenance")}
                                  disabled={actionLoading === room.room_number}
                                  style={{
                                    background: "none", border: "1px solid #8b5cf6", color: "#8b5cf6",
                                    padding: "3px 8px", fontSize: 8, cursor: "pointer",
                                    letterSpacing: "0.06em", textTransform: "uppercase"
                                  }}>Maintenance</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                              {ROOM_STATUSES.map(s => (
                                <button key={s.value} onClick={() => handleRoomStatus(room.room_number, s.value)}
                                  disabled={room.status === s.value || actionLoading === room.room_number}
                                  style={{
                                    background: room.status === s.value ? s.color : "none",
                                    border: `1px solid ${s.color}`,
                                    color: room.status === s.value ? "#fff" : s.color,
                                    padding: "5px 4px", fontSize: 8, cursor: room.status === s.value ? "default" : "pointer",
                                    letterSpacing: "0.06em", textTransform: "uppercase",
                                    opacity: actionLoading === room.room_number ? 0.5 : 1
                                  }}>
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>}
                </div>
                );
              });
            })()}
          </div>
        )}
      </main>

      {/* ==================== ROOM PICKER MODAL ==================== */}
      {roomPickerBooking && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: colors.surface, border: `1px solid ${colors.border}`,
            padding: 32, maxWidth: 620, width: "100%", maxHeight: "90vh", overflowY: "auto"
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <p style={{ color: colors.gold, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 6px" }}>
                  Assign Room — Check In
                </p>
                <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 400, margin: 0 }}>
                  {roomPickerBooking.guest_name}
                </h2>
                <p style={{ color: colors.textMuted, fontSize: 12, margin: "4px 0 0" }}>
                  {roomPickerBooking.reference} · Booked: {roomPickerBooking.room_name}
                </p>
              </div>
              <button onClick={() => { setRoomPickerBooking(null); setSelectedRoom(null); }} style={{
                background: "none", border: "none", cursor: "pointer", color: colors.textMuted, padding: 4
              }}>
                <X size={20} />
              </button>
            </div>

            {/* Early check-in warning */}
            {(() => {
              const today = new Date().toISOString().split("T")[0];
              const bookingDate = (roomPickerBooking.check_in ?? "").split("T")[0];
              if (today < bookingDate) {
                return (
                  <div style={{
                    background: "#f59e0b22", border: "1px solid #f59e0b",
                    padding: "10px 16px", marginBottom: 12,
                    display: "flex", alignItems: "center", gap: 10
                  }}>
                    <AlertCircle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#f59e0b" }}>
                      Early check-in — booking date is {new Date(bookingDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Check-in will be backdated to today.
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Room type + count */}
            {(() => {
              const { matchType, byFloor, total } = getPickerRooms(roomPickerBooking);
              const typeColor = getRoomTypeColor(matchType);
              return (
                <>
                  <div style={{
                    background: colors.surface2, border: `1px solid ${colors.border}`,
                    padding: "10px 16px", marginBottom: 20,
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                      <span style={{ fontSize: 12, color: colors.textMuted }}>
                        {total} <span style={{ color: typeColor }}>{matchType}</span> room{total !== 1 ? "s" : ""} available
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.1em" }}>
                      Showing matching room type only
                    </span>
                  </div>

                  {total === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: colors.textMuted }}>
                      <BedDouble size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                      <p style={{ fontSize: 14 }}>No vacant {matchType} rooms available</p>
                      <p style={{ fontSize: 12, marginTop: 4 }}>Mark a {matchType} room as Vacant — Clean in the Room Status tab first</p>
                    </div>
                  ) : (
                    <>
                      {/* Rooms grouped by floor */}
                      {Object.entries(byFloor).sort().map(([floor, rooms]) => (
                        <div key={floor} style={{ marginBottom: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: 10, color: typeColor, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
                              {floor}
                            </span>
                            <div style={{ flex: 1, height: 1, background: colors.border }} />
                            <span style={{ fontSize: 10, color: colors.textMuted }}>{(rooms as any[]).length} available</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
                            {(rooms as any[]).sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number)).map((room: any) => {
                              const isSelected = selectedRoom?.room_number === room.room_number;
                              return (
                                <button
                                  key={room.room_number}
                                  onClick={() => setSelectedRoom(room)}
                                  style={{
                                    background: isSelected ? typeColor : colors.surface2,
                                    border: `2px solid ${isSelected ? typeColor : colors.border}`,
                                    color: isSelected ? "#fff" : colors.text,
                                    padding: "14px 8px", cursor: "pointer", textAlign: "center",
                                    transition: "all 0.15s ease",
                                    boxShadow: isSelected ? `0 0 0 3px ${typeColor}33` : "none"
                                  }}
                                >
                                  <div style={{ fontSize: 20, fontWeight: 400, marginBottom: 2 }}>
                                    {room.room_number}
                                  </div>
                                  <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                    {matchType}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Selected room summary + confirm */}
                      <div style={{
                        borderTop: `1px solid ${colors.border}`, paddingTop: 20, marginTop: 8,
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16
                      }}>
                        <div>
                          {selectedRoom ? (
                            <>
                              <p style={{ margin: 0, fontSize: 13, color: colors.text }}>
                                Assigning <span style={{ color: colors.gold }}>Room {selectedRoom.room_number}</span> to {roomPickerBooking.guest_name}
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: colors.textMuted }}>
                                {selectedRoom.room_name} · Welcome email will be sent
                              </p>
                            </>
                          ) : (
                            <p style={{ margin: 0, fontSize: 13, color: colors.textMuted }}>Select a room above to proceed</p>
                          )}
                        </div>
                        <button
                          onClick={handleCheckInWithRoom}
                          disabled={!selectedRoom || checkingIn}
                          style={{
                            background: selectedRoom ? colors.gold : colors.surface2,
                            color: selectedRoom ? "#0a0a0a" : colors.textMuted,
                            border: "none", padding: "12px 24px", fontSize: 11,
                            letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700,
                            cursor: selectedRoom && !checkingIn ? "pointer" : "not-allowed",
                            whiteSpace: "nowrap", fontFamily: "Georgia, serif",
                            opacity: checkingIn ? 0.7 : 1
                          }}
                        >
                          {checkingIn ? "Checking In..." : "Confirm Check In"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================== GUEST REGISTRATION CARD ==================== */}
      {regCard && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          zIndex: 500, display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "20px", overflowY: "auto"
        }}>
          <div style={{
            background: "#fff", color: "#111", width: "100%", maxWidth: 680,
            fontFamily: "Arial, sans-serif", fontSize: 12, marginTop: 10
          }} id="reg-card-print">
            {/* Print Header */}
            <div style={{ padding: "16px 20px", borderBottom: "2px solid #111", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 36, height: 36, border: "2px solid #111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>RC</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 9, color: "#555" }}>41 Igweliga Street, Abakaliki, Ebonyi State.</p>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>REMERITONA</h2>
                    <p style={{ margin: 0, fontSize: 10, letterSpacing: 3 }}>HOTEL</p>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700 }}>RC: 1595090</p>
                <p style={{ margin: "4px 0 0", fontSize: 11 }}>R/N: <strong>{regForm.roomNumber}</strong></p>
              </div>
            </div>

            <div style={{ padding: "8px 20px", background: "#f0f0f0", textAlign: "center", borderBottom: "1px solid #ccc" }}>
              <strong style={{ fontSize: 13, letterSpacing: 2 }}>GUEST REGISTRATION CARD</strong>
            </div>

            <div style={{ padding: "12px 20px" }}>
              {/* Row 1: Arrival/Departure + Name */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", width: 90, fontWeight: 700, fontSize: 10, background: "#f9f9f9" }}>ARRIVAL</td>
                    <td colSpan={2} style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="SURNAME" value={regForm.surname} onChange={v => setRegForm((f:any) => ({ ...f, surname: v }))} />
                    </td>
                    <td style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="OTHER NAMES" value={regForm.otherNames} onChange={v => setRegForm((f:any) => ({ ...f, otherNames: v }))} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", background: "#f9f9f9" }}>
                      <input type="date" value={regForm.arrival} onChange={e => setRegForm((f:any) => ({ ...f, arrival: e.target.value }))}
                        style={{ border: "none", outline: "none", fontSize: 11, width: "100%", background: "transparent" }} />
                    </td>
                    <td colSpan={3} style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="RESIDENTIAL ADDRESS" value={regForm.residentialAddress} onChange={v => setRegForm((f:any) => ({ ...f, residentialAddress: v }))} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", fontWeight: 700, fontSize: 10, background: "#f9f9f9" }}>DEPARTURE</td>
                    <td colSpan={2} style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="COMPANY ADDRESS" value={regForm.companyAddress} onChange={v => setRegForm((f:any) => ({ ...f, companyAddress: v }))} />
                    </td>
                    <td style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="STATE" value={regForm.state} onChange={v => setRegForm((f:any) => ({ ...f, state: v }))} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", background: "#f9f9f9" }}>
                      <input type="date" value={regForm.departure} onChange={e => setRegForm((f:any) => ({ ...f, departure: e.target.value }))}
                        style={{ border: "none", outline: "none", fontSize: 11, width: "100%", background: "transparent" }} />
                    </td>
                    <td colSpan={2} style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="E-MAIL" value={regForm.email} onChange={v => setRegForm((f:any) => ({ ...f, email: v }))} />
                    </td>
                    <td style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="OCCUPATION" value={regForm.occupation} onChange={v => setRegForm((f:any) => ({ ...f, occupation: v }))} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", background: "#f9f9f9" }}></td>
                    <td colSpan={2} style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="ADDRESS" value={regForm.address} onChange={v => setRegForm((f:any) => ({ ...f, address: v }))} />
                    </td>
                    <td style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="PURPOSE" value={regForm.purpose} onChange={v => setRegForm((f:any) => ({ ...f, purpose: v }))} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", fontWeight: 700, fontSize: 10, background: "#f9f9f9" }}>ROOM TYPE</td>
                    <td colSpan={3} style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="TEL" value={regForm.tel} onChange={v => setRegForm((f:any) => ({ ...f, tel: v }))} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", fontSize: 11, background: "#f9f9f9" }}>{regForm.roomType}</td>
                    <td style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="NATIONALITY" value={regForm.nationality} onChange={v => setRegForm((f:any) => ({ ...f, nationality: v }))} />
                    </td>
                    <td style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="PASSPORT NO" value={regForm.passportNo} onChange={v => setRegForm((f:any) => ({ ...f, passportNo: v }))} />
                    </td>
                    <td style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="DATE ISSUED" value={regForm.dateIssued} onChange={v => setRegForm((f:any) => ({ ...f, dateIssued: v }))} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", background: "#f9f9f9" }}></td>
                    <td colSpan={2} style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="NEXT OF KIN" value={regForm.nextOfKin} onChange={v => setRegForm((f:any) => ({ ...f, nextOfKin: v }))} />
                    </td>
                    <td style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="VISA/RESIDENTIAL PERMIT NO" value={regForm.visaPermitNo} onChange={v => setRegForm((f:any) => ({ ...f, visaPermitNo: v }))} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", fontWeight: 700, fontSize: 10, background: "#f9f9f9" }}>ROOM NO</td>
                    <td colSpan={3} style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <RegInput label="PHONE NO" value={regForm.nextOfKinPhone} onChange={v => setRegForm((f:any) => ({ ...f, nextOfKinPhone: v }))} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", fontSize: 13, fontWeight: 700, background: "#f9f9f9" }}>{regForm.roomNumber}</td>
                    <td colSpan={3} style={{ border: "1px solid #999", padding: "4px 8px", fontWeight: 700, fontSize: 10 }}>BILLING INSTRUCTION</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", fontWeight: 700, fontSize: 10, background: "#f9f9f9" }}>CAR REG NO</td>
                    <td colSpan={3} style={{ border: "1px solid #999", padding: "4px 8px" }}>
                      <input value={regForm.billingInstruction} onChange={e => setRegForm((f:any) => ({ ...f, billingInstruction: e.target.value }))}
                        style={{ border: "none", outline: "none", fontSize: 11, width: "100%", background: "transparent" }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", background: "#f9f9f9" }}>
                      <input value={regForm.carReg} onChange={e => setRegForm((f:any) => ({ ...f, carReg: e.target.value }))}
                        style={{ border: "none", outline: "none", fontSize: 11, width: "100%", background: "transparent" }} />
                    </td>
                    <td colSpan={3} style={{ border: "1px solid #999", padding: "4px 8px", fontWeight: 700, fontSize: 11 }}>ON SIGNING THIS REGISTRATION CARD</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", fontWeight: 700, fontSize: 10, background: "#f9f9f9" }}>TARIFF</td>
                    <td colSpan={3} rowSpan={4} style={{ border: "1px solid #999", padding: "8px", fontSize: 10, lineHeight: 1.7, verticalAlign: "top", color: "#333" }}>
                      I/We agree that the hotel will not be responsible for any valuables kept in the rooms or public place at any time by myself or my visitor.<br /><br />
                      Food and beverages from outside are not allowed into the hotel. This application is subject to the hotel's display rules and regulation.<br /><br />
                      The guest acknowledges joint and several liabilities for all service rendered until full payment of the bill. Personal cheque is not accepted.<br /><br />
                      Access to room is limited to hotel guest. Visitors are allowed subject to communication of the visitor's name to receptionist.<br /><br />
                      Visitors are not allowed after 22:00hrs<br /><br />
                      <strong>Checkout time is 12noon. Between checkout time and 6:00pm extra 50% of the room rate will be charged.</strong><br /><br />
                      Our rooms are non smoking rooms, any default on this attract the fine of 150,000 for fumigation of the room.<br /><br />
                      Signature.......................................................
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", background: "#f9f9f9" }}>{regForm.tariff}</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", fontWeight: 700, fontSize: 10, background: "#f9f9f9" }}>RECEPTIONIST</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px 8px", background: "#f9f9f9" }}>
                      <input value={regForm.receptionist} onChange={e => setRegForm((f:any) => ({ ...f, receptionist: e.target.value }))}
                        style={{ border: "none", outline: "none", fontSize: 11, width: "100%", background: "transparent" }} />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} style={{ border: "1px solid #999", padding: "6px 8px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11 }}>
                        <input type="checkbox" checked={regForm.signatureObtained}
                          onChange={e => setRegForm((f:any) => ({ ...f, signatureObtained: e.target.checked }))}
                          style={{ width: 14, height: 14 }} />
                        Physical signature obtained from guest ✓
                      </label>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action buttons — hidden on print */}
            <div className="no-print" style={{
              padding: "12px 20px", background: "#f5f5f5", borderTop: "1px solid #ddd",
              display: "flex", gap: 10, justifyContent: "flex-end"
            }}>
              <button onClick={() => setRegCard(null)} style={{
                background: "none", border: "1px solid #ccc", padding: "8px 16px",
                fontSize: 11, cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase"
              }}>Close</button>
              <button onClick={async () => {
                if (!token) return;
                setRegSaving(true);
                try {
                  await saveGuestRegistration({ data: { token, ...regForm } });
                  showToast("Registration card saved");
                } catch { showToast("Save failed", "error"); }
                finally { setRegSaving(false); }
              }} style={{
                background: "#1a1a1a", color: "#fff", border: "none",
                padding: "8px 16px", fontSize: 11, cursor: "pointer",
                letterSpacing: "0.1em", textTransform: "uppercase"
              }}>{regSaving ? "Saving..." : "Save"}</button>
              <button onClick={() => {
                // Inject print styles and trigger print
                const style = document.createElement("style");
                style.id = "reg-print-style";
                style.innerHTML = `@media print { body > *:not(#reg-card-print-wrapper) { display: none !important; } #reg-card-print-wrapper { position: fixed; inset: 0; z-index: 9999; } .no-print { display: none !important; } }`;
                document.head.appendChild(style);
                window.print();
                setTimeout(() => document.getElementById("reg-print-style")?.remove(), 1000);
              }} style={{
                background: "#c9a96e", color: "#0a0a0a", border: "none",
                padding: "8px 20px", fontSize: 11, cursor: "pointer",
                letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700
              }}>🖨 Print Card</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== IDLE WARNING MODAL ==================== */}
      {idleWarning && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: colors.surface, border: `2px solid ${colors.gold}`,
            padding: 40, maxWidth: 380, width: "100%", textAlign: "center"
          }}>
            <p style={{ color: colors.gold, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 12px" }}>
              Session Expiring
            </p>
            <h2 style={{ color: colors.text, fontSize: 22, fontWeight: 400, margin: "0 0 12px" }}>
              Are you still there?
            </h2>
            <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 8px", lineHeight: 1.6 }}>
              You've been inactive. This session will automatically log out in
            </p>
            <div style={{ fontSize: 52, color: colors.gold, fontFamily: "Georgia, serif", margin: "12px 0" }}>
              {idleCountdown}
            </div>
            <p style={{ color: colors.textMuted, fontSize: 11, margin: "0 0 24px" }}>seconds</p>
            <button onClick={() => { setIdleWarning(false); setIdleCountdown(60); }} style={{
              background: colors.gold, color: "#0a0a0a", border: "none",
              padding: "13px 32px", fontSize: 12, cursor: "pointer",
              letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700,
              fontFamily: "Georgia, serif", width: "100%"
            }}>I'm still here</button>
          </div>
        </div>
      )}

      {/* ==================== REASSIGN REASON MODAL ==================== */}
      {showReassignReason && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: colors.surface, border: `1px solid #f59e0b`,
            padding: 32, maxWidth: 440, width: "100%"
          }}>
            <p style={{ color: "#f59e0b", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 8px" }}>
              Reassign Room — Reason Required
            </p>
            <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 400, margin: "0 0 20px" }}>
              Why is this room being reassigned?
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {[
                "Guest is not satisfied with the room",
                "Guest wants another room for personal reasons",
                "Room needs maintenance",
                "Management decision",
                "Other",
              ].map(reason => (
                <label key={reason} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  border: `1px solid ${reassignReason === reason ? "#f59e0b" : colors.border}`,
                  background: reassignReason === reason ? "#f59e0b11" : colors.surface2,
                  cursor: "pointer"
                }}>
                  <input type="radio" name="reassignReason" value={reason}
                    checked={reassignReason === reason}
                    onChange={() => setReassignReason(reason)}
                    style={{ accentColor: "#f59e0b" }} />
                  <span style={{ fontSize: 13, color: colors.text }}>{reason}</span>
                </label>
              ))}
            </div>
            {reassignReason === "Other" && (
              <textarea
                value={reassignReasonOther}
                onChange={e => setReassignReasonOther(e.target.value)}
                placeholder="Please describe the reason..."
                rows={2}
                style={{
                  width: "100%", background: colors.surface2, border: `1px solid #f59e0b`,
                  padding: "10px 12px", color: colors.text, fontSize: 13,
                  fontFamily: "Georgia, serif", outline: "none", resize: "none",
                  marginBottom: 16, boxSizing: "border-box"
                }}
              />
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => { setShowReassignReason(false); setPendingReassignRoom(null); }} style={{
                background: "none", border: `1px solid ${colors.border}`, padding: "10px 20px",
                color: colors.textMuted, cursor: "pointer", fontSize: 11,
                letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif"
              }}>Cancel</button>
              <button
                disabled={!reassignReason || (reassignReason === "Other" && !reassignReasonOther.trim()) || reassigning}
                onClick={async () => {
                  if (!token || !reassignBooking || !pendingReassignRoom || !reassignOldRoom) return;
                  setShowReassignReason(false);
                  setReassigning(true);
                  const finalReason = reassignReason === "Other" ? reassignReasonOther : reassignReason;
                  try {
                    await updateRoomStatus({ data: { token, roomNumber: reassignOldRoom, status: "vacant_dirty", updatedBy: `${staffName} — Reassign: ${finalReason}` } });
                    const result = await checkInGuest({
                      data: {
                        token, reference: reassignBooking.reference,
                        roomSlug: `room-${pendingReassignRoom.room_number}`,
                        roomNumber: pendingReassignRoom.room_number,
                        guestName: reassignBooking.guest_name,
                        guestEmail: reassignBooking.guest_email,
                        checkIn: reassignBooking.check_in,
                        checkOut: reassignBooking.check_out,
                      }
                    }) as any;
                    if (result.success) {
                      showToast(`Room reassigned to ${pendingReassignRoom.room_number} — ${finalReason}`);
                      setReassignBooking(null); setReassignOldRoom(null);
                      setSelectedRoom(null); setPendingReassignRoom(null);
                      await loadStats(token);
                    } else {
                      showToast(result.error ?? "Reassignment failed", "error");
                    }
                  } catch { showToast("Reassignment failed", "error"); }
                  finally { setReassigning(false); }
                }}
                style={{
                  background: reassignReason && !(reassignReason === "Other" && !reassignReasonOther.trim()) ? "#f59e0b" : colors.surface2,
                  color: reassignReason ? "#0a0a0a" : colors.textMuted,
                  border: "none", padding: "10px 24px", fontSize: 11,
                  letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700,
                  cursor: "pointer", fontFamily: "Georgia, serif"
                }}
              >{reassigning ? "Reassigning..." : "Confirm Reassign"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== WALK-IN BOOKING MODAL ==================== */}
      {showWalkIn && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: colors.surface, border: `1px solid ${colors.gold}`,
            padding: 32, maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <p style={{ color: colors.gold, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 4px" }}>Front Desk</p>
                <h2 style={{ color: colors.text, fontSize: 22, fontWeight: 400, margin: 0 }}>Walk-in Booking</h2>
              </div>
              <button onClick={() => setShowWalkIn(false)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}><X size={20} /></button>
            </div>

            {/* Guest Info */}
            <p style={{ color: colors.gold, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 10px" }}>Guest Information</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Full Name *", key: "name", type: "text", placeholder: "e.g. John Doe" },
                { label: "Phone *", key: "phone", type: "tel", placeholder: "e.g. 08012345678" },
                { label: "Email", key: "email", type: "email", placeholder: "guest@email.com" },
              ].map(f => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={(walkIn as any)[f.key]}
                    placeholder={f.placeholder}
                    onChange={e => {
                      let val = e.target.value;
                      if (f.key === "name") val = val.replace(/(^|\s)\S/g, c => c.toUpperCase());
                      setWalkIn(w => ({ ...w, [f.key]: val }));
                    }}
                    style={{
                      background: colors.surface2, border: `1px solid ${colors.border}`,
                      padding: "9px 12px", color: colors.text, fontSize: 13,
                      fontFamily: "Georgia, serif", outline: "none"
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Stay Details */}
            <p style={{ color: colors.gold, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", margin: "16px 0 10px" }}>Stay Details</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Check-in *</label>
                <input type="date" value={walkIn.checkIn} min={new Date().toISOString().split("T")[0]}
                  onChange={e => setWalkIn(w => ({ ...w, checkIn: e.target.value }))}
                  style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: "9px 12px", color: colors.text, fontSize: 13, fontFamily: "Georgia, serif", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Check-out *</label>
                <input type="date" value={walkIn.checkOut} min={walkIn.checkIn}
                  onChange={e => setWalkIn(w => ({ ...w, checkOut: e.target.value }))}
                  style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: "9px 12px", color: colors.text, fontSize: 13, fontFamily: "Georgia, serif", outline: "none" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Room Type *</label>
                <select value={walkIn.roomType} onChange={e => setWalkIn(w => ({ ...w, roomType: e.target.value }))}
                  style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: "9px 12px", color: colors.text, fontSize: 12, fontFamily: "Georgia, serif", outline: "none", cursor: "pointer" }}>
                  {[
                    { value: "classic", label: "Classic" },
                    { value: "superior", label: "Superior" },
                    { value: "executive", label: "Executive" },
                    { value: "executive-twin", label: "Executive Twin" },
                    { value: "business-suites", label: "Business Suite" },
                    { value: "executive-suites", label: "Executive Suite" },
                  ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>No. of Rooms</label>
                <select value={walkIn.numRooms} onChange={e => setWalkIn(w => ({ ...w, numRooms: Number(e.target.value) }))}
                  style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: "9px 12px", color: colors.text, fontSize: 13, fontFamily: "Georgia, serif", outline: "none", cursor: "pointer" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Payment</label>
                <select value={walkIn.paymentMethod} onChange={e => setWalkIn(w => ({ ...w, paymentMethod: e.target.value }))}
                  style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: "9px 12px", color: colors.text, fontSize: 13, fontFamily: "Georgia, serif", outline: "none", cursor: "pointer" }}>
                  <option value="cash">Cash</option>
                  <option value="pos">POS</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="complimentary">Complimentary</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Notes / Special Requests</label>
              <textarea value={walkIn.notes} onChange={e => setWalkIn(w => ({ ...w, notes: e.target.value }))} rows={2}
                style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: "9px 12px", color: colors.text, fontSize: 13, fontFamily: "Georgia, serif", outline: "none", resize: "none" }} />
            </div>

            {/* Nights summary */}
            {walkIn.checkIn && walkIn.checkOut && (
              <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 16, fontSize: 12, color: colors.textMuted }}>
                <span>Nights: <strong style={{ color: colors.text }}>{Math.max(1, Math.round((new Date(walkIn.checkOut).getTime() - new Date(walkIn.checkIn).getTime()) / 86400000))}</strong></span>
                <span>Rooms: <strong style={{ color: colors.text }}>{walkIn.numRooms}</strong></span>
                <span>Type: <strong style={{ color: colors.gold }}>{walkIn.roomType}</strong></span>
                <span>Payment: <strong style={{ color: colors.text, textTransform: "capitalize" }}>{walkIn.paymentMethod}</strong></span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowWalkIn(false)} style={{
                background: "none", border: `1px solid ${colors.border}`, padding: "10px 20px",
                color: colors.textMuted, cursor: "pointer", fontSize: 11,
                letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif"
              }}>Cancel</button>
              <button
                disabled={walkInLoading || !walkIn.name || !walkIn.phone || !walkIn.checkIn || !walkIn.checkOut}
                onClick={async () => {
                  if (!token) return;
                  setWalkInLoading(true);
                  try {
                    const nights = Math.max(1, Math.round((new Date(walkIn.checkOut).getTime() - new Date(walkIn.checkIn).getTime()) / 86400000));
                    const refNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
                    const codes: Record<string, string> = { "classic":"C","superior":"S","executive":"E","executive-twin":"E","business-suites":"BS","executive-suites":"ES" };
                    const reference = `REM${refNum}${codes[walkIn.roomType] ?? "C"}`;
                    const db = (window as any).__D1;

                    // Save via saveBookingToDb-compatible structure
                    const { saveBookingToDb } = await import("@/functions/saveBookingToDb");
                    await saveBookingToDb({ data: {
                      reference, createdAt: new Date().toISOString(),
                      guest: { name: walkIn.name, email: walkIn.email || `walkin-${Date.now()}@remeritona.local`, phone: walkIn.phone, notes: walkIn.notes },
                      roomSlug: walkIn.roomType, roomName: walkIn.roomType.replace(/-/g," ").replace(/\b\w/g,(c:string)=>c.toUpperCase()),
                      roomPrice: 0, checkIn: walkIn.checkIn, checkOut: walkIn.checkOut,
                      nights, numRooms: walkIn.numRooms, guests: walkIn.numRooms,
                      addons: [], subtotal: 0, discount: 0, tax: 0, total: 0,
                      gateway: walkIn.paymentMethod, paymentMode: "pay_now",
                      status: "confirmed",
                    }});
                    showToast(`Walk-in booking created — ${reference}`);
                    setShowWalkIn(false);
                    await loadStats(token);
                  } catch(e) {
                    console.error(e);
                    showToast("Failed to create walk-in booking", "error");
                  } finally {
                    setWalkInLoading(false);
                  }
                }}
                style={{
                  background: walkIn.name && walkIn.phone && walkIn.checkIn && walkIn.checkOut ? colors.gold : colors.surface2,
                  color: walkIn.name && walkIn.phone ? "#0a0a0a" : colors.textMuted,
                  border: "none", padding: "10px 24px", fontSize: 11,
                  letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700,
                  cursor: !walkInLoading && walkIn.name && walkIn.phone ? "pointer" : "not-allowed",
                  fontFamily: "Georgia, serif"
                }}
              >{walkInLoading ? "Creating..." : "Create Booking"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REASSIGN ROOM MODAL ==================== */}
      {reassignBooking && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          zIndex: 350, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: colors.surface, border: `1px solid #f59e0b`,
            padding: 32, maxWidth: 620, width: "100%", maxHeight: "90vh", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <p style={{ color: "#f59e0b", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 6px" }}>
                  Reassign Room
                </p>
                <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 400, margin: 0 }}>
                  {reassignBooking.guest_name}
                </h2>
                <p style={{ color: colors.textMuted, fontSize: 12, margin: "4px 0 0" }}>
                  Moving from Room {reassignOldRoom} · {reassignBooking.reference}
                </p>
              </div>
              <button onClick={() => { setReassignBooking(null); setReassignOldRoom(null); setSelectedRoom(null); }} style={{
                background: "none", border: "none", cursor: "pointer", color: colors.textMuted
              }}><X size={20} /></button>
            </div>

            <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b55", padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <AlertCircle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#f59e0b" }}>
                Room {reassignOldRoom} will be marked Vacant — Dirty. Select a new room below.
              </span>
            </div>

            <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: "10px 16px", marginBottom: 20, display: "flex", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", marginTop: 3, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: colors.textMuted }}>
                {vacantRooms.length} vacant clean room{vacantRooms.length !== 1 ? "s" : ""} available
              </span>
            </div>

            {vacantRooms.length === 0 ? (
              <p style={{ color: colors.textMuted, textAlign: "center", padding: "32px 0", fontSize: 13 }}>No vacant clean rooms available</p>
            ) : (
              <>
                {Object.entries(vacantByType).map(([type, rooms]) => (
                  <div key={type} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 10, color: getRoomTypeColor(type), letterSpacing: "0.2em", textTransform: "uppercase" }}>{type}</span>
                      <span style={{ fontSize: 10, color: colors.textMuted }}>({rooms.length} available)</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
                      {rooms.map((room: any) => {
                        const isSelected = selectedRoom?.room_number === room.room_number;
                        const typeColor = getRoomTypeColor(type);
                        return (
                          <button key={room.room_number} onClick={() => setSelectedRoom(room)} style={{
                            background: isSelected ? typeColor : colors.surface2,
                            border: `2px solid ${isSelected ? typeColor : colors.border}`,
                            color: isSelected ? "#fff" : colors.text,
                            padding: "10px 6px", cursor: "pointer", textAlign: "center",
                            boxShadow: isSelected ? `0 0 0 3px ${typeColor}33` : "none"
                          }}>
                            <div style={{ fontSize: 17, fontWeight: 400 }}>{room.room_number}</div>
                            <div style={{ fontSize: 9, opacity: 0.6 }}>Room</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    {selectedRoom ? (
                      <p style={{ margin: 0, fontSize: 13, color: colors.text }}>
                        Move to <span style={{ color: "#f59e0b" }}>Room {selectedRoom.room_number}</span>
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: 13, color: colors.textMuted }}>Select a new room above</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (!selectedRoom) return;
                      setPendingReassignRoom(selectedRoom);
                      setReassignReason("");
                      setReassignReasonOther("");
                      setShowReassignReason(true);
                    }}
                    disabled={!selectedRoom || reassigning}
                    style={{
                      background: selectedRoom ? "#f59e0b" : colors.surface2,
                      color: selectedRoom ? "#0a0a0a" : colors.textMuted,
                      border: "none", padding: "12px 24px", fontSize: 11,
                      letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700,
                      cursor: selectedRoom && !reassigning ? "pointer" : "not-allowed",
                      fontFamily: "Georgia, serif", whiteSpace: "nowrap"
                    }}
                  >{reassigning ? "Reassigning..." : "Confirm Reassign"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== OCCUPIED ROOM GUEST DETAIL ==================== */}
      {occupiedRoomDetail && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 350, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }} onClick={() => setOccupiedRoomDetail(null)}>
          <div style={{
            background: colors.surface, border: `1px solid #ef444466`,
            padding: 28, maxWidth: 400, width: "100%", borderRadius: 2
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 10, color: "#ef4444", letterSpacing: "0.25em", textTransform: "uppercase" }}>
                  Occupied — {occupiedRoomDetail.room.room_name}
                </p>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 400, color: colors.text }}>
                  Room {occupiedRoomDetail.room.room_number}
                </h2>
              </div>
              <button onClick={() => setOccupiedRoomDetail(null)} style={{
                background: "none", border: "none", cursor: "pointer", color: colors.textMuted, padding: 4
              }}><X size={18} /></button>
            </div>

            {occupiedRoomDetail.booking ? (
              <>
                {/* Guest info */}
                <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: 16, marginBottom: 12 }}>
                  <p style={{ margin: "0 0 12px", fontSize: 10, color: colors.gold, letterSpacing: "0.2em", textTransform: "uppercase" }}>Guest</p>
                  <p style={{ margin: "0 0 4px", fontSize: 16, color: colors.text }}>{occupiedRoomDetail.booking.guest_name}</p>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: colors.textMuted }}>{occupiedRoomDetail.booking.guest_email}</p>
                  {occupiedRoomDetail.booking.guest_phone && (
                    <p style={{ margin: 0, fontSize: 12, color: colors.textMuted }}>{occupiedRoomDetail.booking.guest_phone}</p>
                  )}
                </div>

                {/* Stay info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[
                    { label: "Guests", value: occupiedRoomDetail.booking.guests ?? 1 },
                    { label: "Check-in", value: new Date(occupiedRoomDetail.booking.check_in).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) },
                    { label: "Check-out", value: new Date(occupiedRoomDetail.booking.check_out).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) },
                  ].map(item => (
                    <div key={item.label} style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: "10px 12px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 4px", fontSize: 9, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: 15, color: colors.text }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Reference */}
                <p style={{ margin: "0 0 16px", fontSize: 10, color: colors.textMuted, textAlign: "center" }}>
                  Ref: {occupiedRoomDetail.booking.reference}
                  {occupiedRoomDetail.booking.early_checkin ? (
                    <span style={{ marginLeft: 8, color: "#f59e0b", border: "1px solid #f59e0b", padding: "1px 5px", fontSize: 8 }}>EARLY CHECK-IN</span>
                  ) : null}
                </p>

                {/* Actions */}
                {occupiedRoomDetail.booking.status === "checked_in" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => {
                      setOccupiedRoomDetail(null);
                      handleCheckOut(occupiedRoomDetail.booking);
                    }} style={{
                      width: "100%", background: "#22c55e", color: "#0a0a0a", border: "none",
                      padding: "12px", fontSize: 11, cursor: "pointer",
                      letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700,
                      fontFamily: "Georgia, serif"
                    }}>Check Out Guest</button>
                    <button onClick={() => {
                      const oldRoom = occupiedRoomDetail.room.room_number;
                      setOccupiedRoomDetail(null);
                      setSelectedRoom(null);
                      setReassignOldRoom(oldRoom);
                      setReassignBooking(occupiedRoomDetail.booking);
                    }} style={{
                      width: "100%", background: "none", border: `1px solid #f59e0b`, color: "#f59e0b",
                      padding: "11px", fontSize: 11, cursor: "pointer",
                      letterSpacing: "0.15em", textTransform: "uppercase",
                      fontFamily: "Georgia, serif"
                    }}>Reassign Room</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0", color: colors.textMuted }}>
                <p style={{ fontSize: 13 }}>No active booking found for this room.</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>The room may have been manually set to Occupied.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== EARLY CHECKOUT CONFIRMATION ==================== */}
      {earlyCheckoutBooking && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: colors.surface, border: `1px solid #f59e0b`,
            padding: 32, maxWidth: 440, width: "100%"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
              <AlertCircle size={24} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 400, color: colors.text }}>Early Check-out</h3>
                <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>
                  <strong style={{ color: colors.text }}>{earlyCheckoutBooking.guest_name}</strong> is checking out early.
                  Scheduled checkout is <strong style={{ color: "#f59e0b" }}>
                    {new Date((earlyCheckoutBooking.check_out ?? "").split("T")[0]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </strong>. Are you sure you want to proceed?
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setEarlyCheckoutBooking(null)} style={{
                background: "none", border: `1px solid ${colors.border}`,
                padding: "10px 20px", fontSize: 11, cursor: "pointer",
                color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase",
                fontFamily: "Georgia, serif"
              }}>Cancel</button>
              <button onClick={() => confirmCheckOut(earlyCheckoutBooking)} style={{
                background: "#f59e0b", color: "#0a0a0a", border: "none",
                padding: "10px 20px", fontSize: 11, cursor: "pointer",
                letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700,
                fontFamily: "Georgia, serif"
              }}>Confirm Early Check-out</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BOOKING DETAIL MODAL ==================== */}
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
                }}>Assign Room & Check In</button>
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

function RegInput({ label, value, onChange, span }: { label: string; value: string; onChange: (v: string) => void; span?: boolean }) {
  return (
    <div style={{ gridColumn: span ? "1 / -1" : undefined, display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", color: "#888", fontFamily: "Arial, sans-serif" }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: "none", borderBottom: "1px solid #999", outline: "none",
          padding: "3px 0", fontSize: 11, fontFamily: "Arial, sans-serif",
          background: "transparent", width: "100%", color: "#000"
        }}
      />
    </div>
  );
}