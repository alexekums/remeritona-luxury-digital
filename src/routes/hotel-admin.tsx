import { createFileRoute, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  adminLogin, getDashboardStats, getActiveBookingForRoom, updateRoomStatus,
  checkInGuest, checkOutGuest, registerStaff, loginStaff, resetAdminPassword, getStaffList, getStaffActivity, getRevenueReport,
  getRoomRates, updateRoomRate, getOccupancyForecast,
} from "@/functions/adminAuth";
import { OrdersRequestsView } from "@/components/OrdersRequestsView";
import { SpaManagementView } from "@/components/SpaManagementView";
import { MenuManagementView } from "@/components/MenuManagementView";
import { fetchOrdersAndRequests, patchItemStatus } from "@/lib/orders-api-client";
import {
  formatOrderItemsSummary,
  getRequestSummary,
  getStatusBadgeColor,
  timeAgo,
} from "@/lib/orders-helpers";
import { saveGuestRegistration, getGuestRegistration } from "@/functions/saveRegistration";
import { formatNaira, rooms } from "@/data/rooms";
import {
  LogOut, Moon, Sun, Users, Hotel, TrendingUp,
  CheckCircle, XCircle, Clock, Search, RefreshCw,
  BedDouble, Sparkles, AlertCircle, ChevronDown, ChevronRight, X,
  LayoutDashboard, Calendar, Plus, Menu, Bell, MessageCircle, DollarSign, History, BarChart3
} from "lucide-react";
import logo from "@/assets/logo.png";

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
  { value: "reserved", label: "Reserved", color: "#a855f7" },
];

// Room type display order and labels
const ROOM_TYPE_ORDER = ["Classic", "Superior", "Executive", "Executive Twin", "Business Suite", "Executive Suite"];

const WALKIN_ROOM_CAP: Record<string, number> = {
  classic: 23,
  superior: 38,
  executive: 18,
  "executive-twin": 3,
  "business-suites": 11,
  "executive-suites": 4,
};

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

function escapeRegPrintHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function regPrintField(label: string, value: unknown): string {
  return `<div class="field"><div class="label">${escapeRegPrintHtml(label)}</div><div class="value">${escapeRegPrintHtml(value) || "&nbsp;"}</div></div>`;
}

function regPrintRow(left: string, leftVal: unknown, right: string, rightVal: unknown): string {
  return `<div class="row">${regPrintField(left, leftVal)}${regPrintField(right, rightVal)}</div>`;
}

function printRegistrationCard(form: Record<string, unknown>, onPopupBlocked: () => void) {
  const logoUrl = logo.startsWith("http") ? logo : `${window.location.origin}${logo}`;
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Guest Registration Card — ${escapeRegPrintHtml(form.roomNumber)}</title>
<style>
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
.header { text-align: center; margin-bottom: 14px; }
.header img { max-height: 80px; width: auto; display: block; margin: 0 auto 8px; }
.header h1 { margin: 0 0 6px; font-size: 15px; font-weight: 700; letter-spacing: 0.05em; }
.header .address { margin: 0 0 10px; font-size: 10px; }
.header .meta { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }
.title { text-align: center; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; margin: 0 0 14px; text-transform: uppercase; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 0; }
.fields { margin-bottom: 16px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 28px; margin-bottom: 10px; }
.field .label { font-size: 9px; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
.field .value { border-bottom: 1px solid #000; min-height: 20px; padding: 2px 0 4px; font-size: 11px; }
.terms { font-size: 8px; line-height: 1.55; margin: 16px 0 20px; text-align: justify; }
.signature { font-size: 11px; margin-top: 24px; }
</style>
</head>
<body>
  <div class="header">
    <img src="${logoUrl}" alt="Remeritona Hotel" />
    <h1>RE MERITONA HOTEL &amp; SUITES</h1>
    <p class="address">41 Igweliga Street, Abakaliki, Ebonyi State, Nigeria</p>
    <div class="meta">
      <span>RC: 1595090</span>
      <span>R/N: ${escapeRegPrintHtml(form.roomNumber)}</span>
    </div>
  </div>
  <p class="title">Guest Registration Card</p>
  <div class="fields">
    ${regPrintRow("Arrival Date", form.arrival, "Departure Date", form.departure)}
    ${regPrintRow("Surname", form.surname, "Other Names", form.otherNames)}
    ${regPrintRow("Residential Address", form.residentialAddress, "State", form.state)}
    ${regPrintRow("Company Address", form.companyAddress, "Occupation", form.occupation)}
    ${regPrintRow("Email", form.email, "Purpose of Visit", form.purpose)}
    ${regPrintRow("Tel", form.tel, "Nationality", form.nationality)}
    ${regPrintRow("Passport No", form.passportNo, "Date Issued", form.dateIssued)}
    ${regPrintRow("Visa / Permit No", form.visaPermitNo, "Next of Kin", form.nextOfKin)}
    ${regPrintRow("Next of Kin Phone", form.nextOfKinPhone, "Car Reg No", form.carReg)}
    ${regPrintRow("Room Type", form.roomType, "Tariff", form.tariff)}
    ${regPrintRow("Receptionist", form.receptionist, "Billing Instruction", form.billingInstruction)}
  </div>
  <p class="terms">Management is not responsible for loss of valuables not deposited at the front desk. Outside food and beverages are not permitted. Guests are jointly liable for all charges incurred during their stay. Personal cheques are not accepted. Visitors are not allowed after 22:00hrs. Checkout is at 12:00 noon. 50% charge applies between 12:00pm and 6:00pm. Smoking is strictly prohibited — violation attracts a ₦150,000 fine.</p>
  <p class="signature">Guest Signature: _________________________ &nbsp;&nbsp;&nbsp; Date: ____________</p>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    onPopupBlocked();
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  const triggerPrint = () => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
    setTimeout(() => {
      if (!printWindow.closed) printWindow.close();
    }, 1000);
  };
  const waitForLogoThenPrint = () => {
    const img = printWindow.document.querySelector("img");
    if (img && !img.complete) {
      img.onload = triggerPrint;
      img.onerror = triggerPrint;
      return;
    }
    triggerPrint();
  };
  if (printWindow.document.readyState === "complete") {
    waitForLogoThenPrint();
  } else {
    printWindow.onload = waitForLogoThenPrint;
  }
}

type AdminTab =
  | "dashboard" | "bookings" | "rooms" | "reports" | "room-rates" | "guest-history"
  | "occupancy-forecast" | "orders-requests" | "spa-management" | "menu-management";

const PMS_ROUTE_MAP: Partial<Record<AdminTab, string>> = {
  "orders-requests": "/orders-requests",
  "spa-management": "/spa-management",
  "menu-management": "/menu-management",
};

export function AdminPage({ initialTab }: { initialTab?: AdminTab } = {}) {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [token, setToken] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab ?? "dashboard");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isOrdersPage = pathname === "/orders-requests" || activeTab === "orders-requests";
  const isSpaPage = pathname === "/spa-management" || activeTab === "spa-management";
  const isMenuPage = pathname === "/menu-management" || activeTab === "menu-management";
  const isPmsSubPage = isOrdersPage || isSpaPage || isMenuPage;

  const navigateToTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setShowStaffManagement(false);
    if (window.innerWidth < 768) setMobileSidebarOpen(false);
    const targetRoute = PMS_ROUTE_MAP[tab];
    if (targetRoute && pathname !== targetRoute) {
      router.navigate({ to: targetRoute });
    } else if (!targetRoute && (pathname === "/orders-requests" || pathname === "/spa-management" || pathname === "/menu-management")) {
      router.navigate({ to: "/hotel-admin" });
    }
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("today");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // New staff authentication state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [staffRole, setStaffRole] = useState<string>("");
  const canManageMenu = staffRole === "admin" || staffRole === "manager";

  // Staff Management state (admin/manager only)
  const [showStaffManagement, setShowStaffManagement] = useState(false);
  const [newStaffFullName, setNewStaffFullName] = useState("");
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"front-desk" | "accountant" | "manager" | "admin" | "kitchen" | "housekeeping" | "spa">("front-desk");
  const [newStaffLoading, setNewStaffLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffListLoading, setStaffListLoading] = useState(false);
  const [activityModal, setActivityModal] = useState<{ staff: any; date: string } | null>(null);
  const [activityData, setActivityData] = useState<any>(null);

  // Sidebar state
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["front-desk", "rooms", "finance", "staff"]));
  const [activityLoading, setActivityLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reports tab state (admin/manager/accountant only)
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Room picker modal state
  const [roomPickerBooking, setRoomPickerBooking] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [additionalRooms, setAdditionalRooms] = useState<string[]>([]);
  const [primaryAssignedRoom, setPrimaryAssignedRoom] = useState<string | null>(null);
  const [multiRoomLoyaltyAwarded, setMultiRoomLoyaltyAwarded] = useState(false);

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

  // Reserve modal state
  const [reserveModal, setReserveModal] = useState<{ roomNumber: string; guestName: string; reservedUntil: string; reservedRef: string } | null>(null);

  // Room Rates state
  const [roomRates, setRoomRates] = useState<any[]>([]);
  const [roomRatesLoading, setRoomRatesLoading] = useState(false);
  const [editingRate, setEditingRate] = useState<{ roomType: string; currentPrice: number } | null>(null);
  const [newRatePrice, setNewRatePrice] = useState("");

  // Occupancy Forecast state
  const [occupancyForecast, setOccupancyForecast] = useState<any[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastDays, setForecastDays] = useState(7);

  // Notifications panel state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<any[]>([]);
  const [notificationPendingCount, setNotificationPendingCount] = useState(0);
  const lastCountRef = useRef<number>(0);
  const isFirstPollRef = useRef<boolean>(true);
  const [alertToast, setAlertToast] = useState<{ message: string } | null>(null);
  const [hoveredNotifId, setHoveredNotifId] = useState<string | null>(null);
  const [notifActionLoading, setNotifActionLoading] = useState<string | null>(null);

  // Messages notification state
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const messageLastCountRef = useRef<number>(0);
  const messageIsFirstPollRef = useRef<boolean>(true);

  // Booking notification state
  const [bookingPendingCount, setBookingPendingCount] = useState(0);
  const [bookingNotifications, setBookingNotifications] = useState<any[]>([]);
  const lastBookingCountRef = useRef<number>(0);
  const isFirstBookingPollRef = useRef<boolean>(true);

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
    const savedSession = localStorage.getItem("remeritona_staff_session");
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setStaffName(session.fullName ?? "");
        setStaffRole(session.role ?? "");
      } catch {
        // Invalid session data, ignore
      }
    }
  }, []);

  // Hide Tidio chat widget (and late-injected nodes) in PMS
  useEffect(() => {
    const matchesTidio = (el: Element) => {
      const id = el.id?.toLowerCase() ?? "";
      const cls = (el.getAttribute("class") ?? "").toLowerCase();
      return id.includes("tidio") || cls.includes("tidio");
    };

    const hideTidioElement = (el: HTMLElement) => {
      el.style.display = "none";
    };

    const hideTidioInTree = (root: Node) => {
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const el = root as HTMLElement;
      if (matchesTidio(el)) hideTidioElement(el);
      el.querySelectorAll<HTMLElement>('[id*="tidio"], [class*="tidio"]').forEach(hideTidioElement);
    };

    document.querySelectorAll<HTMLElement>('[id*="tidio"], [class*="tidio"]').forEach(hideTidioElement);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(hideTidioInTree);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
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
      else { showToast("Failed to load dashboard data", "error"); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadStats(token);
  }, [token, loadStats]);

  // Real-time notification polling (4s)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const adminToken =
          localStorage.getItem(TOKEN_KEY) ||
          localStorage.getItem("admin_token") ||
          sessionStorage.getItem("admin_token");
        if (!adminToken) return;

        const res = await fetch("/api/orders-and-requests", {
          headers: { "X-Admin-Token": adminToken },
        });
        if (!res.ok) return;

        const data = await res.json() as { results: any[] };
        const items = data.results || [];
        const pendingCount = items.filter((i: any) => i.status === "pending").length;

        setNotificationItems(items);
        setNotificationPendingCount(pendingCount);

        if (!isFirstPollRef.current && pendingCount > lastCountRef.current) {
          const newest = items.find((i: any) => i.status === "pending");
          const roomNumber = newest?.room_number ?? "";
          const isService = newest?.type === "service";

          try {
            const ctx = new (window.AudioContext ||
              (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = "sine";
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
          } catch (e) {}

          showToast(
            isService
              ? `New service request from Room ${roomNumber}`
              : `New food order from Room ${roomNumber}`
          );
        }

        lastCountRef.current = pendingCount;
        isFirstPollRef.current = false;
      } catch (e) {
        console.error("Notification poll error:", e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, []);

  // Poll for message notifications
  useEffect(() => {
    const fetchMessageNotifications = async () => {
      try {
        const adminToken =
          localStorage.getItem(TOKEN_KEY) ||
          localStorage.getItem("admin_token") ||
          sessionStorage.getItem("admin_token");
        if (!adminToken) return;

        const res = await fetch("/api/messages/conversations", {
          headers: { "X-Admin-Token": adminToken },
        });
        if (!res.ok) return;

        const data = await res.json() as { success: boolean; conversations?: any[] };
        const conversations = data.conversations || [];
        const unreadCount = conversations.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);

        setMessageUnreadCount(unreadCount);

        if (!messageIsFirstPollRef.current && unreadCount > messageLastCountRef.current) {
          try {
            const ctx = new (window.AudioContext ||
              (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = "sine";
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
          } catch (e) {}

          showToast("New message from guest");
        }

        messageLastCountRef.current = unreadCount;
        messageIsFirstPollRef.current = false;
      } catch (e) {
        console.error("Message notification poll error:", e);
      }
    };

    fetchMessageNotifications();
    const interval = setInterval(fetchMessageNotifications, 4000);
    return () => clearInterval(interval);
  }, []);

  // Poll for new bookings
  useEffect(() => {
    const checkNewBookings = async () => {
      try {
        const adminToken =
          localStorage.getItem(TOKEN_KEY) ||
          localStorage.getItem("admin_token") ||
          sessionStorage.getItem("admin_token");
        if (!adminToken) return;

        const res = await fetch("/api/new-bookings-count", {
          headers: { "X-Admin-Token": adminToken },
        });
        if (!res.ok) return;

        const data = await res.json() as { count: number; latest?: any };
        const count = data.count ?? 0;

        setBookingPendingCount(count);

        // Fetch recent bookings for the bell panel
        const bookingsRes = await fetch("/api/bookings-recent", {
          headers: { "X-Admin-Token": adminToken },
        });
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json() as { results: any[] };
          setBookingNotifications((bookingsData.results || []).map((b: any) => ({
            ...b,
            type: "booking",
            id: b.reference,
          })));
        }

        if (!isFirstBookingPollRef.current && count > lastBookingCountRef.current) {
          const booking = data.latest;

          // Play ping sound (slightly different pitch)
          try {
            const ctx = new (window.AudioContext ||
              (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 660;
            osc.type = "sine";
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
          } catch (e) {}

          // Toast notification
          showToast(
            `New booking: ${booking?.guest_name ?? 'Guest'} — ${booking?.room_name ?? ''}`
          );
        }

        lastBookingCountRef.current = count;
        isFirstBookingPollRef.current = false;
      } catch (e) {
        console.error("Booking poll error:", e);
      }
    };

    checkNewBookings();
    const interval = setInterval(checkNewBookings, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load room rates when tab changes to room-rates
  useEffect(() => {
    if (token && activeTab === "room-rates") loadRoomRates();
  }, [token, activeTab]);

  // Load occupancy forecast when tab changes to occupancy-forecast
  useEffect(() => {
    if (token && activeTab === "occupancy-forecast") loadOccupancyForecast(forecastDays);
  }, [token, activeTab, forecastDays]);

  useEffect(() => {
    if (token && showStaffManagement && (staffRole === "admin" || staffRole === "manager")) {
      loadStaffList(token);
    }
  }, [token, showStaffManagement, staffRole]);

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setReportDateFrom(firstDay.toISOString().split("T")[0]);
    setReportDateTo(lastDay.toISOString().split("T")[0]);
  }, []);

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

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const result = await loginStaff({ data: { username, password } });
      if (result.success && result.token) {
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem("remeritona_staff_session", JSON.stringify(result.session));
        setToken(result.token);
        setStaffName(result.session?.fullName ?? "");
        setStaffRole(result.session?.role ?? "");
        setUsername("");
        setPassword("");
      } else {
        setLoginError(result.error ?? "Invalid credentials");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      const result = await resetAdminPassword({ data: { username: "Devi", newPassword: "2468" } });
      alert(`Password reset. Hash: ${result.hash}`);
    } catch (error) {
      alert("Password reset failed");
    }
  };

  const handleOnboardStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setNewStaffLoading(true);
    try {
      const result = await registerStaff({ data: { username: newStaffUsername, password: newStaffPassword, fullName: newStaffFullName, role: newStaffRole } });
      if (result.success) {
        showToast("Staff onboarded successfully", "success");
        setNewStaffFullName("");
        setNewStaffUsername("");
        setNewStaffPassword("");
        setNewStaffRole("front-desk");
        if (token) await loadStaffList(token);
      } else {
        setLoginError(result.error ?? "Onboarding failed");
      }
    } finally {
      setNewStaffLoading(false);
    }
  };

  const loadStaffList = async (t: string) => {
    setStaffListLoading(true);
    try {
      const result = await getStaffList({ data: { token: t } }) as any;
      if (result.success) setStaffList(result.staff ?? []);
    } finally {
      setStaffListLoading(false);
    }
  };

  const handleViewActivity = async (staff: any) => {
    const today = new Date().toISOString().split("T")[0];
    setActivityModal({ staff, date: today });
    setActivityLoading(true);
    try {
      const result = await getStaffActivity({ data: { token: token!, staffName: staff.full_name, date: today } }) as any;
      if (result.success) setActivityData(result);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleLoadActivityForDate = async (date: string) => {
    if (!activityModal) return;
    setActivityLoading(true);
    try {
      const result = await getStaffActivity({ data: { token: token!, staffName: activityModal.staff.full_name, date } }) as any;
      if (result.success) {
        setActivityData(result);
        setActivityModal({ ...activityModal, date });
      }
    } finally {
      setActivityLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!token || !deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const { deleteStaff } = await import("@/functions/adminAuth");
      const result = await deleteStaff({ data: { token, staffId: deleteConfirm.id } });
      if (result.success) {
        showToast(`${deleteConfirm.full_name} removed from staff`);
        setDeleteConfirm(null);
        await loadStaffList(token);
      } else {
        showToast(result.error || "Failed to delete staff", "error");
      }
    } catch {
      showToast("Failed to delete staff", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!token || !reportDateFrom || !reportDateTo) return;
    setReportLoading(true);
    try {
      const result = await getRevenueReport({ data: { token, dateFrom: reportDateFrom, dateTo: reportDateTo } });
      if (result.success) {
        setReportData(result);
      } else {
        showToast("Failed to generate report", "error");
      }
    } catch {
      showToast("Failed to generate report", "error");
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrintReport = () => {
    if (!reportData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const now = new Date().toLocaleString();
    const staffName = localStorage.getItem("remeritona_staff_session") ? JSON.parse(localStorage.getItem("remeritona_staff_session")!).fullName : "Admin";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Revenue Statement - Re Meritona Hotel</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #c9a96e; padding-bottom: 20px; }
    .logo { max-width: 150px; margin-bottom: 10px; }
    h1 { font-size: 18px; margin: 5px 0; color: #c9a96e; text-transform: uppercase; letter-spacing: 2px; }
    h2 { font-size: 14px; margin: 5px 0; color: #333; }
    .meta { font-size: 10px; color: #666; margin-top: 10px; }
    .summary { display: flex; gap: 20px; margin-bottom: 30px; }
    .summary-card { flex: 1; border: 1px solid #ddd; padding: 15px; text-align: center; }
    .summary-card h3 { font-size: 12px; margin: 0 0 10px 0; color: #666; text-transform: uppercase; }
    .summary-card .value { font-size: 20px; font-weight: bold; color: #c9a96e; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <img src="/assets/logo.png" class="logo" alt="Re Meritona Hotel" />
    <h1>RE MERITONA HOTEL & SUITES</h1>
    <h2>REVENUE STATEMENT</h2>
    <div class="meta">
      <p>Period: ${reportDateFrom} to ${reportDateTo}</p>
      <p>Generated on: ${now}</p>
      <p>Generated by: ${staffName}</p>
    </div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <h3>Total Revenue</h3>
      <div class="value">${formatNaira(reportData.totalRevenue)}</div>
    </div>
    <div class="summary-card">
      <h3>Total Bookings</h3>
      <div class="value">${reportData.totalBookings}</div>
    </div>
    <div class="summary-card">
      <h3>Avg per Booking</h3>
      <div class="value">${formatNaira(reportData.avgPerBooking)}</div>
    </div>
  </div>

  <h3>By Room Type</h3>
  <table>
    <thead>
      <tr>
        <th>Room Type</th>
        <th>Bookings</th>
        <th>Revenue</th>
        <th>% of Total</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.byRoomType.map((item: any) => `
        <tr>
          <td>${item.roomType}</td>
          <td>${item.count}</td>
          <td>${formatNaira(item.revenue)}</td>
          <td>${item.percentage}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h3>By Payment Method</h3>
  <table>
    <thead>
      <tr>
        <th>Method</th>
        <th>Bookings</th>
        <th>Revenue</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.byPaymentMethod.map((item: any) => `
        <tr>
          <td>${item.method}</td>
          <td>${item.count}</td>
          <td>${formatNaira(item.revenue)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h3>Individual Bookings</h3>
  <table>
    <thead>
      <tr>
        <th>Ref</th>
        <th>Guest</th>
        <th>Room</th>
        <th>Check-in</th>
        <th>Check-out</th>
        <th>Nights</th>
        <th>Amount</th>
        <th>Payment</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.bookings.map((b: any) => `
        <tr>
          <td>${b.reference}</td>
          <td>${b.guest_name}</td>
          <td>${b.room_name}</td>
          <td>${new Date(b.check_in).toLocaleDateString()}</td>
          <td>${new Date(b.check_out).toLocaleDateString()}</td>
          <td>${b.nights}</td>
          <td>${formatNaira(b.total)}</td>
          <td>${b.gateway}</td>
          <td>${b.status}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>This is a computer generated statement — Re Meritona Hotel & Suites</p>
  </div>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // Room Rates handlers
  const loadRoomRates = async () => {
    if (!token) return;
    setRoomRatesLoading(true);
    try {
      const result = await getRoomRates({ data: { token } }) as any;
      if (result.success) setRoomRates(result.rates);
    } finally {
      setRoomRatesLoading(false);
    }
  };

  const handleSaveRate = async () => {
    if (!token || !editingRate) return;
    const price = parseFloat(newRatePrice);
    if (isNaN(price) || price <= 0) {
      showToast("Invalid price", "error");
      return;
    }
    try {
      const result = await updateRoomRate({ data: { token, roomType: editingRate.roomType, price } }) as any;
      if (result.success) {
        showToast("Rate updated successfully");
        setEditingRate(null);
        setNewRatePrice("");
        await loadRoomRates();
      } else {
        showToast(result.error || "Failed to update rate", "error");
      }
    } catch {
      showToast("Failed to update rate", "error");
    }
  };

  // Occupancy Forecast handlers
  const loadOccupancyForecast = async (days: number) => {
    if (!token) return;
    setForecastLoading(true);
    try {
      const result = await getOccupancyForecast({ data: { token, days } }) as any;
      if (result.success) setOccupancyForecast(result.forecast);
    } finally {
      setForecastLoading(false);
    }
  };

  const handleNotifStatusUpdate = async (item: any, status: string) => {
    if (!token) return;
    const key = `${item.type}-${item.id}`;
    setNotifActionLoading(key);
    try {
      const result = await patchItemStatus(token, item.id, item.type, status);
      if (result.success) {
        showToast("Status updated");
        const refreshed = await fetchOrdersAndRequests(token);
        if (refreshed.success) {
          const items = refreshed.items ?? refreshed.results ?? [];
          setNotificationItems(items);
          const pendingCount = items.filter((i: any) => i.status === "pending").length;
          setNotificationPendingCount(pendingCount);
          lastCountRef.current = pendingCount;
        }
        await loadStats(token);
      } else {
        showToast(result.error ?? "Failed to update", "error");
      }
    } catch {
      showToast("Failed to update status", "error");
    } finally {
      setNotifActionLoading(null);
    }
  };

  const bellPanelItems = [
    ...bookingNotifications.slice(0, 3),
    ...notificationItems.slice(0, 5)
  ].slice(0, 8);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("remeritona_staff_session");
    setToken(null);
    setStats(null);
    setStaffName("");
    setStaffRole("");
    setPin("");
  };

  const handleRoomStatus = async (roomNumber: string, status: string, reservedData?: { reserved_for: string; reserved_until: string; reserved_ref: string }) => {
    if (!token) return;
    setActionLoading(roomNumber);
    try {
      await updateRoomStatus({ data: { token, roomNumber, status, updatedBy: staffName, ...reservedData } });
      showToast("Room status updated");
      await loadStats(token);
    } catch {
      showToast("Failed to update room", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReserveRoom = async () => {
    if (!token || !reserveModal) return;
    setActionLoading(reserveModal.roomNumber);
    try {
      await handleRoomStatus(
        reserveModal.roomNumber,
        "reserved",
        {
          reserved_for: reserveModal.guestName,
          reserved_until: reserveModal.reservedUntil,
          reserved_ref: reserveModal.reservedRef
        }
      );
      setReserveModal(null);
    } catch {
      showToast("Failed to reserve room", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Look up active guest for an occupied room (live D1 query)
  const handleViewOccupiedRoom = async (room: any) => {
    if (!token) return;
    setOccupiedRoomLoading(true);
    try {
      const result = await getActiveBookingForRoom({
        data: { token, roomNumber: String(room.room_number) },
      }) as any;
      if (!result.success) {
        showToast(result.error ?? "Failed to load guest", "error");
        return;
      }
      setOccupiedRoomDetail({ room, booking: result.booking ?? null });
    } catch {
      showToast("Failed to load guest", "error");
    } finally {
      setOccupiedRoomLoading(false);
    }
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

  const resetRoomPickerMultiRoom = () => {
    setAdditionalRooms([]);
    setPrimaryAssignedRoom(null);
    setMultiRoomLoyaltyAwarded(false);
  };

  // Opens room picker modal instead of directly checking in
  const handleCheckIn = (booking: any) => {
    setSelectedRoom(null);
    resetRoomPickerMultiRoom();
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
    const numRooms = Number(roomPickerBooking.num_rooms) || 1;
    const assignedRoomNum = String(selectedRoom.room_number);
    const primaryRoom = primaryAssignedRoom ?? assignedRoomNum;
    const isMultiRoomContinuation = !isReassign && !!primaryAssignedRoom;
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
          roomNumber: isMultiRoomContinuation ? primaryRoom : assignedRoomNum,
          guestName: roomPickerBooking.guest_name,
          guestEmail: roomPickerBooking.guest_email,
          checkIn: effectiveCheckIn,
          checkOut: roomPickerBooking.check_out,
          additionalRooms: isMultiRoomContinuation ? [assignedRoomNum] : undefined,
          checkedInBy: staffName,
        }
      }) as any;
      if (result.success) {
        if (result.loyaltyAwarded) setMultiRoomLoyaltyAwarded(true);
        await loadStats(token);

        if (!isReassign && numRooms > 1) {
          if (!primaryAssignedRoom) {
            setPrimaryAssignedRoom(assignedRoomNum);
            setSelectedRoom(null);
            showToast(`Room ${assignedRoomNum} assigned. Now assign room 2 of ${numRooms}.`);
            return;
          }
          const nextAdditional = [...additionalRooms, assignedRoomNum];
          setAdditionalRooms(nextAdditional);
          setSelectedRoom(null);
          const totalAssigned = 1 + nextAdditional.length;
          if (totalAssigned < numRooms) {
            showToast(`Room ${assignedRoomNum} assigned. Now assign room ${totalAssigned + 1} of ${numRooms}.`);
            return;
          }
        }

        const finalAdditional = isMultiRoomContinuation
          ? [...additionalRooms, assignedRoomNum]
          : additionalRooms;
        const allAssignedRooms = primaryAssignedRoom
          ? [primaryAssignedRoom, ...finalAdditional]
          : [assignedRoomNum];
        if (!isReassign && numRooms > 1) {
          const loyaltyPart = multiRoomLoyaltyAwarded
            ? ` Loyalty points awarded to ${roomPickerBooking.guest_name}.`
            : "";
          showToast(
            `Check-in complete. Rooms assigned: ${allAssignedRooms.join(", ")}. Portal access created for each room.${loyaltyPart}`
          );
        } else {
          const msg = isReassign
            ? `${roomPickerBooking.guest_name} moved from Room ${reassigningOldRoom} to Room ${assignedRoomNum}`
            : `${roomPickerBooking.guest_name} checked in to Room ${assignedRoomNum}`;
          showToast(msg);
        }
        const completedBooking = { ...roomPickerBooking };
        setRoomPickerBooking(null);
        setSelectedRoom(null);
        setReassigningOldRoom(null);
        resetRoomPickerMultiRoom();
        // Auto-open registration card on new check-in (not reassign)
        if (!isReassign) openRegCard(completedBooking, allAssignedRooms[0]);
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
      await checkOutGuest({ data: { token, reference: booking.reference, roomSlug: booking.room_slug, roomNumber: booking.room_number, checkedOutBy: staffName } });
      showToast(`${booking.guest_name} checked out successfully`);
      setSelectedBooking(null);
      await loadStats(token);

      // Open printable checkout receipt
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const now = new Date().toLocaleString();
        const checkIn = new Date(booking.check_in).toLocaleDateString();
        const checkOut = new Date(booking.check_out).toLocaleDateString();
        const nights = Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24));

        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Checkout Receipt - Re Meritona Hotel</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    h1 { font-size: 18px; margin: 5px 0; color: #000; text-transform: uppercase; letter-spacing: 2px; }
    h2 { font-size: 14px; margin: 5px 0; color: #000; }
    .meta { font-size: 11px; color: #333; margin-top: 10px; }
    .receipt { margin: 30px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
    .label { font-weight: bold; color: #333; }
    .value { color: #000; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #000; font-size: 11px; color: #333; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RE MERITONA HOTEL & SUITES</h1>
    <h2>CHECKOUT RECEIPT</h2>
  </div>

  <div class="receipt">
    <div class="row">
      <span class="label">Guest Name:</span>
      <span class="value">${booking.guest_name}</span>
    </div>
    <div class="row">
      <span class="label">Room Number:</span>
      <span class="value">${booking.room_number}</span>
    </div>
    <div class="row">
      <span class="label">Room Type:</span>
      <span class="value">${booking.room_name}</span>
    </div>
    <div class="row">
      <span class="label">Check-in Date:</span>
      <span class="value">${checkIn}</span>
    </div>
    <div class="row">
      <span class="label">Check-out Date:</span>
      <span class="value">${checkOut}</span>
    </div>
    <div class="row">
      <span class="label">Number of Nights:</span>
      <span class="value">${nights}</span>
    </div>
    <div class="row">
      <span class="label">Total Amount Paid:</span>
      <span class="value">${formatNaira(booking.total)}</span>
    </div>
    <div class="row">
      <span class="label">Payment Method:</span>
      <span class="value">${booking.gateway}</span>
    </div>
    <div class="row">
      <span class="label">Booking Reference:</span>
      <span class="value">${booking.reference}</span>
    </div>
    <div class="row">
      <span class="label">Checked Out By:</span>
      <span class="value">${staffName}</span>
    </div>
    <div class="row">
      <span class="label">Date & Time:</span>
      <span class="value">${now}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for staying at Remeritona Hotel</p>
  </div>
</body>
</html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
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
    let matchStatus = true;
    if (statusFilter === "all") {
      matchStatus = true;
    } else if (statusFilter === "today") {
      const today = new Date().toISOString().split("T")[0];
      const checkInDate = (b.check_in ?? "").split("T")[0];
      const checkOutDate = (b.check_out ?? "").split("T")[0];
      matchStatus = checkInDate === today || checkOutDate === today;
    } else {
      matchStatus = b.status === statusFilter;
    }
    return matchSearch && matchStatus;
  }) ?? [];

  const todayArrivals = stats?.todayCheckIns?.length ?? 0;
  const todayDepartures = stats?.todayCheckOuts?.length ?? 0;
  const occupiedRooms = stats?.roomStatuses?.filter((r: any) => r.status === "occupied").length ?? 0;

  // Vacant clean rooms for the picker — filtered by booked type, grouped by floor
  const vacantRooms = stats?.roomStatuses?.filter((r: any) => r.status === "vacant_clean") ?? [];
  const pickerFilterType = reassignBooking
    ? getRoomTypeFromName(reassignBooking.room_name)
    : roomPickerBooking
      ? getRoomTypeFromName(roomPickerBooking.room_name)
      : null;
  const vacantByType = ROOM_TYPE_ORDER.reduce((acc: Record<string, any[]>, type) => {
    if (pickerFilterType && type !== pickerFilterType) return acc;
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

          <form onSubmit={handleStaffLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{
                  width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                  padding: "12px 16px", color: colors.text, fontSize: 16,
                  fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
                }}
                required
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                  padding: "12px 16px", color: colors.text, fontSize: 16,
                  fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
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

      {/* New-item alert toast */}
      {alertToast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 10000,
          background: "#141414", color: "#e8e0d0", padding: "14px 20px", fontSize: 13,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)", borderRadius: 4,
          borderLeft: `4px solid ${colors.gold}`, maxWidth: 320,
        }}>
          {alertToast.message}
        </div>
      )}

      {/* Notifications Panel */}
      {notificationsOpen && (
        <div style={{
          position: "fixed", top: 80, right: 20, zIndex: 1000,
          background: colors.surface, border: `1px solid ${colors.border}`,
          padding: 20, maxWidth: 420, width: "90%", maxHeight: "80vh",
          overflowY: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: colors.gold, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
              Notifications
            </h3>
            <button onClick={() => setNotificationsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}>
              <X size={16} />
            </button>
          </div>

          {bellPanelItems.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>No recent orders or requests</p>
          )}

          {bellPanelItems.map((item: any) => {
            const itemKey = `${item.type}-${item.id}`;
            const isBooking = item.type === "booking";
            const summary =
              item.type === "dining"
                ? formatOrderItemsSummary(item.items)
                : item.type === "service"
                ? getRequestSummary(item)
                : isBooking
                ? item.room_name || "Room"
                : "";
            const isHovered = hoveredNotifId === itemKey;
            return (
              <div
                key={itemKey}
                onMouseEnter={() => setHoveredNotifId(itemKey)}
                onMouseLeave={() => setHoveredNotifId(null)}
                style={{
                  background: colors.surface2, padding: 12,
                  marginBottom: 8, border: `1px solid ${colors.border}`,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>
                    {isBooking ? "📅" : item.type === "dining" ? "🍽️" : "🛎️"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: colors.text, fontWeight: 600 }}>
                      {isBooking
                        ? `${item.guest_name} — ${summary}`
                        : `Room ${item.room_number} — ${summary.length > 48 ? `${summary.slice(0, 48)}…` : summary}`
                      }
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: colors.textMuted }}>{timeAgo(item.created_at)}</span>
                      {!isBooking && (
                        <span style={{
                          fontSize: 9, padding: "2px 6px",
                          background: getStatusBadgeColor(item.status),
                          color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em",
                        }}>
                          {item.status}
                        </span>
                      )}
                      {isBooking && (
                        <span style={{
                          fontSize: 9, padding: "2px 6px",
                          background: "#c9a96e",
                          color: "#0a0a0a", textTransform: "uppercase", letterSpacing: "0.08em",
                        }}>
                          New Booking
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!isBooking && isHovered && (item.status === "pending" || item.status === "accepted") && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                    {item.status === "pending" && (
                      <button
                        onClick={() => handleNotifStatusUpdate(item, "accepted")}
                        disabled={notifActionLoading === itemKey}
                        style={{
                          background: "#3b82f6", color: "#fff", border: "none",
                          padding: "4px 10px", fontSize: 10, cursor: "pointer",
                          letterSpacing: "0.08em", opacity: notifActionLoading === itemKey ? 0.6 : 1,
                        }}
                      >
                        Accept
                      </button>
                    )}
                    {item.status === "accepted" && (
                      <button
                        onClick={() => handleNotifStatusUpdate(item, item.type === "dining" ? "delivered" : "completed")}
                        disabled={notifActionLoading === itemKey}
                        style={{
                          background: "#22c55e", color: "#fff", border: "none",
                          padding: "4px 10px", fontSize: 10, cursor: "pointer",
                          letterSpacing: "0.08em", opacity: notifActionLoading === itemKey ? 0.6 : 1,
                        }}
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <Link
            to="/orders-requests"
            onClick={() => setNotificationsOpen(false)}
            style={{
              display: "block", textAlign: "center", marginTop: 12,
              color: colors.gold, fontSize: 12, letterSpacing: "0.1em",
              textDecoration: "none", padding: "8px 0",
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            View All Orders →
          </Link>
        </div>
      )}

      {/* Suppress external chat widget in PMS */}
      <style>{`
        #tidio-chat, #tidio-chat-iframe, .tidio-1, [id*="tidio"], [class*="tidio"],
        #hubspot-messages-iframe-container, .intercom-launcher,
        [class*="chat-widget"], [id*="chat-widget"] { display: none !important; }
      `}</style>

      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div onClick={() => setMobileSidebarOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200,
          display: window.innerWidth < 768 ? "block" : "none"
        }} />
      )}

      {/* Sidebar */}
      <aside style={{
        position: "fixed", left: 0, top: 0, height: "100vh",
        background: colors.surface, borderRight: `1px solid ${colors.border}`,
        width: sidebarExpanded ? 220 : 56,
        transition: "width 0.25s ease",
        zIndex: 300,
        display: "flex", flexDirection: "column"
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: "16px", borderBottom: `1px solid ${colors.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 64, flexShrink: 0
        }}>
          {/* LEFT: hamburger only */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => {
              setSidebarExpanded(!sidebarExpanded);
              if (window.innerWidth < 768) setMobileSidebarOpen(false);
            }} style={{
              background: "none", border: "none", cursor: "pointer",
              color: colors.textMuted, padding: 4, position: "relative"
            }}>
              <Menu size={18} />
            </button>
            {sidebarExpanded && (
              <span style={{ color: colors.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.2em" }}>
                REMERITONA
              </span>
            )}
          </div>

          {/* RIGHT: bells always here */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setNotificationsOpen(!notificationsOpen)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: colors.textMuted, padding: 4, position: "relative"
            }}>
              <Bell size={18} />
              {notificationPendingCount > 0 && (
                <span style={{
                  position: "absolute", top: 0, right: 0,
                  background: "#ef4444", color: "#fff",
                  fontSize: 9, padding: "2px 5px", borderRadius: "10px",
                  fontWeight: 700
                }}>
                  {notificationPendingCount}
                </span>
              )}
            </button>
            <Link to="/chat-management" style={{
              background: "none", border: "none", cursor: "pointer",
              color: colors.textMuted, padding: 4, position: "relative",
              textDecoration: "none"
            }}>
              <MessageCircle size={18} />
              {messageUnreadCount > 0 && (
                <span style={{
                  position: "absolute", top: 0, right: 0,
                  background: "#ef4444", color: "#fff",
                  fontSize: 9, padding: "2px 5px", borderRadius: "10px",
                  fontWeight: 700
                }}>
                  {messageUnreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Navigation Groups */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {/* FRONT DESK Group */}
          {staffRole !== "spa" && (
            <div>
              <button onClick={() => {
                const newGroups = new Set(expandedGroups);
                if (newGroups.has("front-desk")) newGroups.delete("front-desk");
                else newGroups.add("front-desk");
                setExpandedGroups(newGroups);
              }} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 12px", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                color: colors.textMuted, fontSize: 10, letterSpacing: "0.15em",
                textTransform: "uppercase"
              }}>
                <span style={{ display: sidebarExpanded ? "inline" : "none" }}>Front Desk</span>
                {expandedGroups.has("front-desk") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedGroups.has("front-desk") && (
                <div style={{ marginLeft: 8 }}>
                  {/* Dashboard (admin, manager, front-desk only) */}
                  {(staffRole === "admin" || staffRole === "manager" || staffRole === "front-desk") && (
                    <button onClick={() => navigateToTab("dashboard")} style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "8px 12px", width: "100%",
                      display: "flex", alignItems: "center", gap: 8,
                      color: activeTab === "dashboard" ? colors.gold : colors.textMuted,
                      fontSize: 12, borderLeft: activeTab === "dashboard" ? `3px solid ${colors.gold}` : "3px solid transparent",
                      paddingLeft: activeTab === "dashboard" ? 9 : 12
                    }}>
                      <LayoutDashboard size={16} />
                      {sidebarExpanded && <span>Dashboard</span>}
                    </button>
                  )}
                  {/* All Bookings (admin, manager, front-desk only) */}
                  {(staffRole === "admin" || staffRole === "manager" || staffRole === "front-desk") && (
                    <button onClick={() => navigateToTab("bookings")} style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "8px 12px", width: "100%",
                      display: "flex", alignItems: "center", gap: 8,
                      color: activeTab === "bookings" ? colors.gold : colors.textMuted,
                      fontSize: 12, borderLeft: activeTab === "bookings" ? `3px solid ${colors.gold}` : "3px solid transparent",
                      paddingLeft: activeTab === "bookings" ? 9 : 12
                    }}>
                      <Calendar size={16} />
                      {sidebarExpanded && <span>All Bookings</span>}
                    </button>
                  )}
                  {/* Guest History (admin, manager, front-desk only) */}
                  {(staffRole === "admin" || staffRole === "manager" || staffRole === "front-desk") && (
                    <button onClick={() => navigateToTab("guest-history")} style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "8px 12px", width: "100%",
                      display: "flex", alignItems: "center", gap: 8,
                      color: activeTab === "guest-history" ? colors.gold : colors.textMuted,
                      fontSize: 12, borderLeft: activeTab === "guest-history" ? `3px solid ${colors.gold}` : "3px solid transparent",
                      paddingLeft: activeTab === "guest-history" ? 9 : 12
                    }}>
                      <History size={16} />
                      {sidebarExpanded && <span>Guest History</span>}
                    </button>
                  )}
                  {/* Walk-in (admin, manager, front-desk only) */}
                  {(staffRole === "admin" || staffRole === "manager" || staffRole === "front-desk") && (
                    <button onClick={() => {
                      const t = new Date().toISOString().split("T")[0];
                      const t2 = new Date(Date.now()+86400000).toISOString().split("T")[0];
                      setWalkIn({ name: "", email: "", phone: "", roomType: "classic", numRooms: 1, checkIn: t, checkOut: t2, paymentMethod: "cash", notes: "" });
                      setShowWalkIn(true);
                      if (window.innerWidth < 768) setMobileSidebarOpen(false);
                    }} style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "8px 12px", width: "100%",
                      display: "flex", alignItems: "center", gap: 8,
                      color: colors.textMuted, fontSize: 12
                    }}>
                      <Plus size={16} />
                      {sidebarExpanded && <span>Walk-in</span>}
                    </button>
                  )}
                  {/* Orders & Requests (kitchen, housekeeping, front-desk, admin, manager) */}
                  {staffRole !== "accountant" && staffRole !== "spa" && (
                    <Link
                      to="/orders-requests"
                      onClick={() => navigateToTab("orders-requests")}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", width: "100%",
                        textDecoration: "none",
                        color: isOrdersPage ? colors.gold : colors.textMuted,
                        fontSize: 12,
                        borderLeft: isOrdersPage ? `3px solid ${colors.gold}` : "3px solid transparent",
                        paddingLeft: isOrdersPage ? 9 : 12,
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>📋</span>
                      {sidebarExpanded && <span>Orders & Requests</span>}
                    </Link>
                  )}
                  {/* Guest Messages (not for accountant, kitchen, housekeeping, spa) */}
                  {staffRole !== "accountant" && staffRole !== "kitchen" && staffRole !== "housekeeping" && staffRole !== "spa" && (
                    <Link
                      to="/chat-management"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", width: "100%",
                        textDecoration: "none",
                        color: colors.textMuted,
                        fontSize: 12,
                        borderLeft: "3px solid transparent",
                        paddingLeft: 12,
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>💬</span>
                      {sidebarExpanded && <span>Guest Messages</span>}
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ROOMS Group (housekeeping, admin, manager, front-desk only) */}
          {staffRole !== "accountant" && staffRole !== "kitchen" && staffRole !== "spa" && (
            <div>
              <button onClick={() => {
                const newGroups = new Set(expandedGroups);
                if (newGroups.has("rooms")) newGroups.delete("rooms");
                else newGroups.add("rooms");
                setExpandedGroups(newGroups);
              }} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 12px", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                color: colors.textMuted, fontSize: 10, letterSpacing: "0.15em",
                textTransform: "uppercase"
              }}>
                <span style={{ display: sidebarExpanded ? "inline" : "none" }}>Rooms</span>
                {expandedGroups.has("rooms") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedGroups.has("rooms") && (
                <div style={{ marginLeft: 8 }}>
                  <button onClick={() => navigateToTab("rooms")} style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "8px 12px", width: "100%",
                    display: "flex", alignItems: "center", gap: 8,
                    color: activeTab === "rooms" ? colors.gold : colors.textMuted,
                    fontSize: 12, borderLeft: activeTab === "rooms" ? `3px solid ${colors.gold}` : "3px solid transparent",
                    paddingLeft: activeTab === "rooms" ? 9 : 12
                  }}>
                    <BedDouble size={16} />
                    {sidebarExpanded && <span>Room Status</span>}
                  </button>
                  {/* Occupancy Forecast (admin, manager, front-desk only) */}
                  {staffRole !== "housekeeping" && (
                    <button onClick={() => navigateToTab("occupancy-forecast")} style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "8px 12px", width: "100%",
                      display: "flex", alignItems: "center", gap: 8,
                      color: activeTab === "occupancy-forecast" ? colors.gold : colors.textMuted,
                      fontSize: 12, borderLeft: activeTab === "occupancy-forecast" ? `3px solid ${colors.gold}` : "3px solid transparent",
                      paddingLeft: activeTab === "occupancy-forecast" ? 9 : 12
                    }}>
                      <BarChart3 size={16} />
                      {sidebarExpanded && <span>Occupancy Forecast</span>}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SERVICES Group (spa, admin, manager, front-desk only) */}
          {staffRole !== "accountant" && staffRole !== "kitchen" && staffRole !== "housekeeping" && (
            <div>
              <button onClick={() => {
                const newGroups = new Set(expandedGroups);
                if (newGroups.has("services")) newGroups.delete("services");
                else newGroups.add("services");
                setExpandedGroups(newGroups);
              }} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 12px", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                color: colors.textMuted, fontSize: 10, letterSpacing: "0.15em",
                textTransform: "uppercase"
              }}>
                <span style={{ display: sidebarExpanded ? "inline" : "none" }}>Services</span>
                {expandedGroups.has("services") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedGroups.has("services") && (
                <div style={{ marginLeft: 8 }}>
                  <Link
                    to="/spa-management"
                    onClick={() => navigateToTab("spa-management")}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", width: "100%",
                      textDecoration: "none",
                      color: isSpaPage ? colors.gold : colors.textMuted,
                      fontSize: 12,
                      borderLeft: isSpaPage ? `3px solid ${colors.gold}` : "3px solid transparent",
                      paddingLeft: isSpaPage ? 9 : 12,
                      boxSizing: "border-box",
                    }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>💆</span>
                    {sidebarExpanded && <span>Spa & Wellness</span>}
                  </Link>
                  {canManageMenu && (
                    <Link
                      to="/menu-management"
                      onClick={() => navigateToTab("menu-management")}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", width: "100%",
                        textDecoration: "none",
                        color: isMenuPage ? colors.gold : colors.textMuted,
                        fontSize: 12,
                        borderLeft: isMenuPage ? `3px solid ${colors.gold}` : "3px solid transparent",
                        paddingLeft: isMenuPage ? 9 : 12,
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>🍽️</span>
                      {sidebarExpanded && <span>Menu & Pricing</span>}
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FINANCE Group (admin, manager, accountant) */}
          {(staffRole === "admin" || staffRole === "manager" || staffRole === "accountant") && (
            <div>
              <button onClick={() => {
                const newGroups = new Set(expandedGroups);
                if (newGroups.has("finance")) newGroups.delete("finance");
                else newGroups.add("finance");
                setExpandedGroups(newGroups);
              }} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 12px", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                color: colors.textMuted, fontSize: 10, letterSpacing: "0.15em",
                textTransform: "uppercase"
              }}>
                <span style={{ display: sidebarExpanded ? "inline" : "none" }}>Finance</span>
                {expandedGroups.has("finance") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedGroups.has("finance") && (
                <div style={{ marginLeft: 8 }}>
                  <button onClick={() => navigateToTab("reports")} style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "8px 12px", width: "100%",
                    display: "flex", alignItems: "center", gap: 8,
                    color: activeTab === "reports" ? colors.gold : colors.textMuted,
                    fontSize: 12, borderLeft: activeTab === "reports" ? `3px solid ${colors.gold}` : "3px solid transparent",
                    paddingLeft: activeTab === "reports" ? 9 : 12
                  }}>
                    <TrendingUp size={16} />
                    {sidebarExpanded && <span>Reports</span>}
                  </button>
                  <button onClick={() => navigateToTab("room-rates")} style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "8px 12px", width: "100%",
                    display: "flex", alignItems: "center", gap: 8,
                    color: activeTab === "room-rates" ? colors.gold : colors.textMuted,
                    fontSize: 12, borderLeft: activeTab === "room-rates" ? `3px solid ${colors.gold}` : "3px solid transparent",
                    paddingLeft: activeTab === "room-rates" ? 9 : 12
                  }}>
                    <DollarSign size={16} />
                    {sidebarExpanded && <span>Room Rates</span>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STAFF Group (admin, manager only) */}
          {(staffRole === "admin" || staffRole === "manager") && (
            <div>
              <button onClick={() => {
                const newGroups = new Set(expandedGroups);
                if (newGroups.has("staff")) newGroups.delete("staff");
                else newGroups.add("staff");
                setExpandedGroups(newGroups);
              }} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 12px", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                color: colors.textMuted, fontSize: 10, letterSpacing: "0.15em",
                textTransform: "uppercase"
              }}>
                <span style={{ display: sidebarExpanded ? "inline" : "none" }}>Staff</span>
                {expandedGroups.has("staff") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedGroups.has("staff") && (
                <div style={{ marginLeft: 8 }}>
                  <button onClick={() => { setShowStaffManagement(!showStaffManagement); if (window.innerWidth < 768) setMobileSidebarOpen(false); }} style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "8px 12px", width: "100%",
                    display: "flex", alignItems: "center", gap: 8,
                    color: showStaffManagement ? colors.gold : colors.textMuted,
                    fontSize: 12, borderLeft: showStaffManagement ? `3px solid ${colors.gold}` : "3px solid transparent",
                    paddingLeft: showStaffManagement ? 9 : 12
                  }}>
                    <Users size={16} />
                    {sidebarExpanded && <span>Staff Management</span>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: "12px", borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button onClick={() => token && loadStats(token)} style={{
              background: "none", border: `1px solid ${colors.border}`, padding: "6px",
              color: colors.textMuted, cursor: "pointer", fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <RefreshCw size={14} />
            </button>
            <button onClick={toggleTheme} style={{
              background: "none", border: `1px solid ${colors.border}`,
              borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: colors.gold
            }}>
              {isDark ? <Sun size={12} /> : <Moon size={12} />}
            </button>
          </div>
          {sidebarExpanded && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: colors.textMuted }}>{staffName}</span>
              <button onClick={handleLogout} style={{
                background: "none", border: "none", cursor: "pointer",
                color: colors.textMuted, padding: 4
              }}>
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        padding: 24, maxWidth: 1400, margin: "0 auto",
        marginLeft: window.innerWidth < 768 ? 0 : (sidebarExpanded ? 220 : 56),
        transition: "margin-left 0.25s ease"
      }}>
        {loading && !isPmsSubPage && (
          <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>Loading...</p>
        )}

        {/* ===== ORDERS & REQUESTS ===== */}
        {isOrdersPage && staffRole !== "accountant" && token && (
          <OrdersRequestsView token={token} colors={colors} onToast={showToast} staffRole={staffRole} />
        )}

        {isOrdersPage && staffRole === "accountant" && (
          <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>
            You do not have access to Orders & Requests.
          </p>
        )}

        {/* ===== SPA & WELLNESS ===== */}
        {isSpaPage && staffRole !== "accountant" && token && (
          <SpaManagementView token={token} colors={colors} onToast={showToast} />
        )}

        {isSpaPage && staffRole === "accountant" && (
          <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>
            You do not have access to Spa & Wellness.
          </p>
        )}

        {/* ===== MENU & PRICING ===== */}
        {isMenuPage && canManageMenu && token && (
          <MenuManagementView token={token} staffRole={staffRole} colors={colors} onToast={showToast} />
        )}

        {isMenuPage && !canManageMenu && (
          <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>
            You do not have access to Menu & Pricing.
          </p>
        )}

        {/* ===== STAFF MANAGEMENT TAB ===== */}
        {!loading && !isPmsSubPage && showStaffManagement && (staffRole === "admin" || staffRole === "manager") && (
          <div>
            {/* Onboard Staff Form */}
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 24, marginBottom: 32 }}>
              <h3 style={{ color: colors.gold, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={16} /> Onboard New Staff
              </h3>
              <form onSubmit={handleOnboardStaff}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newStaffFullName}
                      onChange={e => setNewStaffFullName(e.target.value)}
                      placeholder="Enter full name"
                      style={{
                        width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                        padding: "12px 16px", color: colors.text, fontSize: 14,
                        fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={newStaffUsername}
                      onChange={e => setNewStaffUsername(e.target.value)}
                      placeholder="Choose username"
                      style={{
                        width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                        padding: "12px 16px", color: colors.text, fontSize: 14,
                        fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={newStaffPassword}
                      onChange={e => setNewStaffPassword(e.target.value)}
                      placeholder="Choose password"
                      style={{
                        width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                        padding: "12px 16px", color: colors.text, fontSize: 14,
                        fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                      Role
                    </label>
                    <select
                      value={newStaffRole}
                      onChange={e => setNewStaffRole(e.target.value as any)}
                      style={{
                        width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                        padding: "12px 16px", color: colors.text, fontSize: 14,
                        fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
                      }}
                      required
                    >
                      <option value="front-desk">Front Desk</option>
                      <option value="accountant">Accountant</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="housekeeping">Housekeeping</option>
                      <option value="spa">Spa</option>
                      {staffRole === "admin" && <option value="manager">Manager</option>}
                      {staffRole === "admin" && <option value="admin">Admin</option>}
                    </select>
                  </div>
                </div>
                {loginError && (
                  <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{loginError}</p>
                )}
                <button type="submit" disabled={newStaffLoading} style={{
                  background: colors.gold, border: "none", padding: "12px 24px",
                  color: "#0a0a0a", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif",
                  opacity: newStaffLoading ? 0.7 : 1
                }}>
                  {newStaffLoading ? "Onboarding..." : "Onboard Staff"}
                </button>
              </form>
            </div>

            {/* Staff List */}
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 24 }}>
              <h3 style={{ color: colors.gold, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={16} /> Staff List
              </h3>
              {staffListLoading ? (
                <p style={{ color: colors.textMuted, fontSize: 13 }}>Loading...</p>
              ) : staffList.length === 0 ? (
                <p style={{ color: colors.textMuted, fontSize: 13 }}>No staff members</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {staffList.map((staff: any) => {
                    const roleColors: Record<string, string> = {
                      "front-desk": "#3b82f6",
                      "accountant": "#8b5cf6",
                      "manager": "#f59e0b",
                      "admin": "#ef4444",
                      "kitchen": "#f97316",
                      "housekeeping": "#14b8a6",
                      "spa": "#ec4899",
                    };
                    return (
                      <div
                        key={staff.id}
                        style={{
                          background: colors.surface2, padding: 20,
                          border: `1px solid ${colors.border}`,
                          transition: "all 0.2s"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <h4 style={{ margin: 0, fontSize: 15, color: colors.text, fontWeight: 600 }}>{staff.full_name}</h4>
                          <span style={{
                            background: roleColors[staff.role] || "#666",
                            color: "#fff", padding: "4px 10px",
                            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                            textTransform: "uppercase", borderRadius: 4
                          }}>
                            {staff.role}
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: colors.textMuted }}>
                          @{staff.username}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: colors.textMuted }}>
                          Joined: {new Date(staff.created_at).toLocaleDateString()}
                        </p>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button
                            onClick={() => handleViewActivity(staff)}
                            style={{
                              flex: 1, background: "none", border: `1px solid ${colors.border}`,
                              padding: "6px 12px", color: colors.text, cursor: "pointer",
                              fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                              fontFamily: "Georgia, serif"
                            }}
                          >
                            View Activity
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(staff); }}
                            style={{
                              background: "#ef4444", border: "none",
                              padding: "6px 12px", color: "#fff", cursor: "pointer",
                              fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                              fontFamily: "Georgia, serif"
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Modal */}
        {activityModal && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.7)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000
          }}>
            <div style={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              padding: 32, maxWidth: 600, width: "90%", maxHeight: "80vh",
              overflow: "auto", position: "relative"
            }}>
              <button
                onClick={() => setActivityModal(null)}
                style={{
                  position: "absolute", top: 16, right: 16,
                  background: "none", border: "none", color: colors.textMuted,
                  cursor: "pointer", fontSize: 20
                }}
              >
                <X size={24} />
              </button>
              <h3 style={{ color: colors.gold, fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 8" }}>
                {activityModal.staff.full_name}
              </h3>
              <p style={{ margin: "0 0 20", fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                {activityModal.staff.role}
              </p>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                  Activity Date
                </label>
                <input
                  type="date"
                  value={activityModal.date}
                  onChange={e => handleLoadActivityForDate(e.target.value)}
                  style={{
                    background: colors.surface2, border: `1px solid ${colors.border}`,
                    padding: "10px 14px", color: colors.text, fontSize: 14,
                    fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              {activityLoading ? (
                <p style={{ color: colors.textMuted, fontSize: 13 }}>Loading activity...</p>
              ) : activityData ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20, padding: 16, background: colors.surface2, border: `1px solid ${colors.border}` }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.15em" }}>First Action</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.text }}>
                        {activityData.firstAction ? new Date(activityData.firstAction).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Last Action</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.text }}>
                        {activityData.lastAction ? new Date(activityData.lastAction).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Total Actions</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.text }}>{activityData.totalCount}</p>
                    </div>
                  </div>

                  {activityData.activities.length === 0 ? (
                    <p style={{ color: colors.textMuted, fontSize: 13 }}>No activity for this date</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {activityData.activities.map((activity: any, idx: number) => (
                        <div key={idx} style={{
                          padding: 12, background: colors.surface2,
                          border: `1px solid ${colors.border}`,
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <div>
                            <span style={{ fontSize: 12, color: colors.textMuted }}>
                              {new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span style={{
                              marginLeft: 12, fontSize: 11, fontWeight: 700,
                              color: activity.type === "check-in" ? "#22c55e" : "#ef4444",
                              letterSpacing: "0.1em", textTransform: "uppercase"
                            }}>
                              {activity.type === "check-in" ? "CHECK-IN" : "CHECK-OUT"}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontSize: 13, color: colors.text }}>{activity.guest_name}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: colors.textMuted }}>Room {activity.room_number}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.7)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1001
          }}>
            <div style={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              padding: 32, maxWidth: 400, width: "90%", position: "relative"
            }}>
              <h3 style={{ color: colors.gold, fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 16" }}>
                Confirm Deletion
              </h3>
              <p style={{ margin: "0 0 24", fontSize: 13, color: colors.text }}>
                Remove {deleteConfirm.full_name} from staff? This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    background: "none", border: `1px solid ${colors.border}`,
                    padding: "10px 20px", color: colors.text, cursor: "pointer",
                    fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
                    fontFamily: "Georgia, serif"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStaff}
                  disabled={deleteLoading}
                  style={{
                    background: "#ef4444", border: "none",
                    padding: "10px 20px", color: "#fff", cursor: "pointer",
                    fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
                    fontFamily: "Georgia, serif", opacity: deleteLoading ? 0.7 : 1
                  }}
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== DASHBOARD TAB ===== */}
        {!loading && !isPmsSubPage && activeTab === "dashboard" && !showStaffManagement && stats && (
          <div>
            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Today's Arrivals", value: todayArrivals, icon: <Users size={20} />, color: "#3b82f6" },
                { label: "Today's Departures", value: todayDepartures, icon: <CheckCircle size={20} />, color: "#22c55e" },
                { label: "Occupied Rooms", value: `${occupiedRooms} / ${stats.roomStatuses?.length ?? 96}`, icon: <BedDouble size={20} />, color: "#ef4444" },
                ...(staffRole !== "front-desk" ? [{ label: "Monthly Revenue", value: formatNaira(stats.monthlyRevenue ?? 0), icon: <TrendingUp size={20} />, color: colors.gold }] : []),
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
                            {staffRole !== "accountant" && b.status === "confirmed" && section.action === "check-in" && (
                              <button onClick={() => handleCheckIn(b)} disabled={actionLoading === b.reference} style={{
                                background: "#3b82f6", color: "#fff", border: "none",
                                padding: "4px 12px", fontSize: 11, cursor: "pointer",
                                letterSpacing: "0.1em", textTransform: "uppercase"
                              }}>
                                {actionLoading === b.reference ? "..." : "Check In"}
                              </button>
                            )}
                            {staffRole !== "accountant" && b.status === "checked_in" && section.action === "check-out" && (
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
        {!loading && !isOrdersPage && activeTab === "bookings" && !showStaffManagement && stats && (
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
                <option value="today">Today</option>
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
                    {[
                      "Guest", "Room", "Check In", "Check Out",
                      ...(staffRole !== "front-desk" ? ["Total", "Gateway"] : []),
                      "Status", "Actions"
                    ].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr><td colSpan={staffRole === "front-desk" ? 6 : 8} style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>No bookings found</td></tr>
                  ) : filteredBookings.map((b: any) => {
                    const isReturningGuest = stats?.returningGuests?.some((g: any) => g.guest_email === b.guest_email);
                    return (
                    <tr key={b.reference} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, color: colors.text }}>{b.guest_name}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: colors.textMuted }}>{b.guest_email}</p>
                          </div>
                          {isReturningGuest && (
                            <span style={{
                              background: colors.gold, color: "#0a0a0a",
                              fontSize: 9, padding: "2px 6px", fontWeight: 700,
                              letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: 4
                            }}>
                              Returning Guest
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{b.room_name}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{new Date(b.check_in).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{new Date(b.check_out).toLocaleDateString()}</td>
                      {staffRole !== "front-desk" && (
                        <>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: colors.gold }}>{formatNaira(b.total)}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: colors.textMuted, textTransform: "capitalize" }}>{b.gateway}</td>
                        </>
                      )}
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
                          {staffRole !== "accountant" && b.status === "confirmed" && (
                            <button onClick={() => handleCheckIn(b)} style={{
                              background: "#3b82f6", color: "#fff", border: "none",
                              padding: "4px 10px", fontSize: 10, cursor: "pointer",
                              letterSpacing: "0.1em", textTransform: "uppercase"
                            }}>Check In</button>
                          )}
                          {staffRole !== "accountant" && b.status === "checked_in" && (
                            <button onClick={() => handleCheckOut(b)} style={{
                              background: "#22c55e", color: "#fff", border: "none",
                              padding: "4px 10px", fontSize: 10, cursor: "pointer",
                              letterSpacing: "0.1em", textTransform: "uppercase"
                            }}>Check Out</button>
                          )}
                          {staffRole !== "accountant" && (
                            <button onClick={() => setSelectedBooking(b)} style={{
                              background: "none", border: `1px solid ${colors.border}`,
                              padding: "4px 10px", fontSize: 10, cursor: "pointer",
                              color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase"
                            }}>View</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ROOMS TAB ===== */}
        {!loading && !isPmsSubPage && activeTab === "rooms" && !showStaffManagement && stats && (
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
                          border: `1px solid ${room.status === "occupied" ? "#ef444433" : room.status === "maintenance" ? "#8b5cf633" : room.status === "reserved" ? "#a855f733" : colors.border}`,
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
                                {room.status === "occupied" && room.dnd_active === 1 && (
                                  <span style={{
                                    fontSize: 9, padding: "2px 6px", background: "#ef4444",
                                    color: "#fff", fontWeight: 700, letterSpacing: "0.05em",
                                    textTransform: "uppercase", borderRadius: 4
                                  }}>
                                    🔴 DND
                                  </span>
                                )}
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
                          ) : room.status === "reserved" ? (
                            <div style={{
                              background: "#a855f711", border: "1px solid #a855f766",
                              padding: "8px", fontSize: 9, color: "#a855f7",
                              lineHeight: 1.6
                            }}>
                              <div style={{ marginBottom: 4 }}>
                                <span style={{ color: "#a855f7", fontSize: 9, letterSpacing: "0.06em" }}>
                                  📅 Reserved for:
                                </span><br />
                                <span style={{ color: colors.text, fontSize: 9, fontWeight: 600 }}>
                                  {room.reserved_for || "Unknown"}
                                </span>
                              </div>
                              <div style={{ marginBottom: 4 }}>
                                <span style={{ color: "#a855f7", fontSize: 9, letterSpacing: "0.06em" }}>
                                  Until:
                                </span><br />
                                <span style={{ color: colors.text, fontSize: 9 }}>
                                  {room.reserved_until ? new Date(room.reserved_until).toLocaleDateString() : "Not set"}
                                </span>
                              </div>
                              {room.reserved_ref && (
                                <div style={{ marginBottom: 4 }}>
                                  <span style={{ color: "#a855f7", fontSize: 9, letterSpacing: "0.06em" }}>
                                    Ref:
                                  </span><br />
                                  <span style={{ color: colors.text, fontSize: 9 }}>
                                    {room.reserved_ref}
                                  </span>
                                </div>
                              )}
                              <div style={{ marginTop: 6, textAlign: "center" }}>
                                <button onClick={() => handleRoomStatus(room.room_number, "vacant_clean")}
                                  disabled={actionLoading === room.room_number}
                                  style={{
                                    background: "none", border: "1px solid #22c55e", color: "#22c55e",
                                    padding: "3px 8px", fontSize: 8, cursor: "pointer",
                                    letterSpacing: "0.06em", textTransform: "uppercase"
                                  }}>Clear Reserve</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                              {ROOM_STATUSES.filter(s => s.value !== "reserved").map(s => (
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
                              <button onClick={() => setReserveModal({ roomNumber: room.room_number, guestName: "", reservedUntil: "", reservedRef: "" })}
                                disabled={actionLoading === room.room_number}
                                style={{
                                  background: "none", border: "1px solid #a855f7", color: "#a855f7",
                                  padding: "5px 4px", fontSize: 8, cursor: "pointer",
                                  letterSpacing: "0.06em", textTransform: "uppercase",
                                  opacity: actionLoading === room.room_number ? 0.5 : 1
                                }}>
                                Reserve
                              </button>
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

        {/* ===== REPORTS TAB ===== */}
        {!loading && !isPmsSubPage && activeTab === "reports" && !showStaffManagement && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ color: colors.gold, fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                Revenue Report
              </h2>
              {reportData && (
                <button onClick={handlePrintReport} style={{
                  background: colors.gold, color: "#0a0a0a", border: "none",
                  padding: "8px 16px", fontSize: 11, cursor: "pointer",
                  letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600
                }}>
                  Print
                </button>
              )}
            </div>

            {/* Date inputs */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>From</label>
                <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} style={{
                  background: colors.surface, border: `1px solid ${colors.border}`, padding: "8px 12px",
                  color: colors.text, fontSize: 13, fontFamily: "Georgia, serif", outline: "none"
                }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>To</label>
                <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} style={{
                  background: colors.surface, border: `1px solid ${colors.border}`, padding: "8px 12px",
                  color: colors.text, fontSize: 13, fontFamily: "Georgia, serif", outline: "none"
                }} />
              </div>
              <button onClick={handleGenerateReport} disabled={reportLoading} style={{
                background: colors.gold, color: "#0a0a0a", border: "none",
                padding: "8px 20px", fontSize: 11, cursor: "pointer",
                letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600,
                opacity: reportLoading ? 0.5 : 1
              }}>
                {reportLoading ? "..." : "Generate Report"}
              </button>
            </div>

            {reportData && (
              <>
                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                  <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                    <span style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Total Revenue</span>
                    <span style={{ fontSize: 28, color: colors.gold, fontWeight: 400 }}>{formatNaira(reportData.totalRevenue)}</span>
                  </div>
                  <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                    <span style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Total Bookings</span>
                    <span style={{ fontSize: 28, color: colors.text, fontWeight: 400 }}>{reportData.totalBookings}</span>
                  </div>
                  <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                    <span style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Avg per Booking</span>
                    <span style={{ fontSize: 28, color: colors.text, fontWeight: 400 }}>{formatNaira(reportData.avgPerBooking)}</span>
                  </div>
                </div>

                {/* By Room Type table */}
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 20, marginBottom: 24 }}>
                  <h3 style={{ color: colors.gold, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 16px" }}>
                    By Room Type
                  </h3>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Room Type</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Bookings</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Revenue</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.byRoomType.map((item: any) => (
                        <tr key={item.roomType} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{item.roomType}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{item.count}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: colors.gold }}>{formatNaira(item.revenue)}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{item.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* By Payment Method table */}
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 20, marginBottom: 24 }}>
                  <h3 style={{ color: colors.gold, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 16px" }}>
                    By Payment Method
                  </h3>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Method</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Bookings</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.byPaymentMethod.map((item: any) => (
                        <tr key={item.method} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{item.method}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{item.count}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: colors.gold }}>{formatNaira(item.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Individual bookings table */}
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 20 }}>
                  <h3 style={{ color: colors.gold, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 16px" }}>
                    Individual Bookings
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Ref</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Guest</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Room</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Check-in</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Check-out</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Nights</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Amount</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Payment</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.bookings.map((b: any) => (
                          <tr key={b.reference} style={{ borderBottom: `1px solid ${colors.border}` }}>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{b.reference}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{b.guest_name}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{b.room_name}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{new Date(b.check_in).toLocaleDateString()}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{new Date(b.check_out).toLocaleDateString()}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{b.nights}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: colors.gold }}>{formatNaira(b.total)}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{b.gateway}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{b.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== ROOM RATES TAB ===== */}
        {!loading && !isPmsSubPage && activeTab === "room-rates" && !showStaffManagement && (
          <div style={{ padding: 24 }}>
            <h2 style={{ color: colors.gold, fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 24px" }}>
              Room Rates
            </h2>
            {roomRatesLoading ? (
              <p style={{ color: colors.textMuted }}>Loading...</p>
            ) : (
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Room Type</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Price per Night</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRates.map((rate: any) => (
                      <tr key={rate.room_type} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{rate.room_type}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: colors.gold }}>
                          {editingRate?.roomType === rate.room_type ? (
                            <input
                              type="number"
                              value={newRatePrice}
                              onChange={e => setNewRatePrice(e.target.value)}
                              style={{
                                background: colors.surface2, border: `1px solid ${colors.border}`,
                                padding: "6px 10px", color: colors.text, fontSize: 13, width: 120,
                                fontFamily: "Georgia, serif", outline: "none"
                              }}
                            />
                          ) : (
                            formatNaira(rate.price_per_night)
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {editingRate?.roomType === rate.room_type ? (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={handleSaveRate} style={{
                                background: "#22c55e", color: "#fff", border: "none",
                                padding: "4px 10px", fontSize: 10, cursor: "pointer",
                                letterSpacing: "0.1em", textTransform: "uppercase"
                              }}>
                                Save
                              </button>
                              <button onClick={() => { setEditingRate(null); setNewRatePrice(""); }} style={{
                                background: "none", border: `1px solid ${colors.border}`,
                                padding: "4px 10px", fontSize: 10, cursor: "pointer",
                                color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase"
                              }}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (staffRole === "accountant") {
                                  showToast("Only admins and managers can edit rates", "error");
                                  return;
                                }
                                setEditingRate({ roomType: rate.room_type, currentPrice: rate.price_per_night });
                                setNewRatePrice(String(rate.price_per_night));
                              }}
                              disabled={staffRole === "accountant"}
                              style={{
                                background: staffRole === "accountant" ? "none" : colors.gold,
                                color: staffRole === "accountant" ? colors.textMuted : "#0a0a0a",
                                border: staffRole === "accountant" ? `1px solid ${colors.border}` : "none",
                                padding: "4px 10px", fontSize: 10, cursor: staffRole === "accountant" ? "not-allowed" : "pointer",
                                letterSpacing: "0.1em", textTransform: "uppercase",
                                opacity: staffRole === "accountant" ? 0.5 : 1
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== GUEST HISTORY TAB ===== */}
        {!loading && !isPmsSubPage && activeTab === "guest-history" && !showStaffManagement && stats && (
          <div style={{ padding: 24 }}>
            <h2 style={{ color: colors.gold, fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 24px" }}>
              Guest History
            </h2>
            {stats.returningGuests?.length === 0 ? (
              <p style={{ color: colors.textMuted }}>No returning guests found</p>
            ) : (
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Name</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Email</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Total Visits</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Total Spent</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>Last Visit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.returningGuests.map((guest: any) => (
                      <tr key={guest.guest_email} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{guest.guest_name}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{guest.guest_email}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{guest.visit_count}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: colors.gold }}>{formatNaira(guest.total_spent)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: colors.text }}>{new Date(guest.last_visit).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== OCCUPANCY FORECAST TAB ===== */}
        {!loading && !isPmsSubPage && activeTab === "occupancy-forecast" && !showStaffManagement && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ color: colors.gold, fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                Occupancy Forecast
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                {[7, 14, 30].map(days => (
                  <button
                    key={days}
                    onClick={() => setForecastDays(days)}
                    style={{
                      background: forecastDays === days ? colors.gold : "none",
                      color: forecastDays === days ? "#0a0a0a" : colors.textMuted,
                      border: forecastDays === days ? "none" : `1px solid ${colors.border}`,
                      padding: "6px 12px", fontSize: 11, cursor: "pointer",
                      letterSpacing: "0.1em", textTransform: "uppercase"
                    }}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>
            {forecastLoading ? (
              <p style={{ color: colors.textMuted }}>Loading...</p>
            ) : (
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
                {occupancyForecast.map((day: any) => {
                  const barColor = day.occupancyPercent < 50 ? "#22c55e" : day.occupancyPercent < 80 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={day.date} style={{ minWidth: 60, textAlign: "center" }}>
                      <div style={{
                        background: colors.surface2, border: `1px solid ${colors.border}`,
                        padding: 12, borderRadius: 8, height: 200, display: "flex",
                        flexDirection: "column", justifyContent: "flex-end", alignItems: "center"
                      }}>
                        <div style={{
                          width: 40, background: barColor,
                          height: `${Math.min(day.occupancyPercent, 100)}%`,
                          borderRadius: 4, transition: "height 0.3s ease"
                        }} />
                      </div>
                      <p style={{ margin: "8px 0 4px", fontSize: 10, color: colors.textMuted }}>
                        {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: barColor }}>
                        {day.occupancyPercent}%
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 9, color: colors.textMuted }}>
                        {day.bookedRooms}/{day.totalRooms}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
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
              <button onClick={() => { setRoomPickerBooking(null); setSelectedRoom(null); resetRoomPickerMultiRoom(); }} style={{
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

            {(() => {
              const numRooms = Number(roomPickerBooking.num_rooms) || 1;
              if (numRooms <= 1 || !primaryAssignedRoom) return null;
              const nextRoomIndex = 1 + additionalRooms.length + 1;
              return (
                <div style={{
                  background: "#22c55e22", border: "1px solid #22c55e66",
                  padding: "10px 16px", marginBottom: 12,
                  fontSize: 12, color: "#22c55e", lineHeight: 1.5
                }}>
                  Room {primaryAssignedRoom} assigned.
                  {additionalRooms.length > 0 && (
                    <> Additional: {additionalRooms.join(", ")}.</>
                  )}
                  {" "}Now assign room {nextRoomIndex} of {numRooms}.
                </div>
              );
            })()}

            {/* Room type + count */}
            {(() => {
              const { matchType, byFloor, total } = getPickerRooms(roomPickerBooking);
              const typeColor = getRoomTypeColor(matchType);
              const assignedRoomNumbers = new Set([
                ...(primaryAssignedRoom ? [primaryAssignedRoom] : []),
                ...additionalRooms,
              ]);
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
                              const isAlreadyAssigned = assignedRoomNumbers.has(String(room.room_number));
                              return (
                                <button
                                  key={room.room_number}
                                  onClick={() => !isAlreadyAssigned && setSelectedRoom(room)}
                                  disabled={isAlreadyAssigned}
                                  style={{
                                    background: isAlreadyAssigned ? colors.surface : isSelected ? typeColor : colors.surface2,
                                    border: `2px solid ${isSelected ? typeColor : colors.border}`,
                                    color: isAlreadyAssigned ? colors.textMuted : isSelected ? "#fff" : colors.text,
                                    padding: "14px 8px", cursor: isAlreadyAssigned ? "not-allowed" : "pointer", textAlign: "center",
                                    transition: "all 0.15s ease",
                                    boxShadow: isSelected ? `0 0 0 3px ${typeColor}33` : "none",
                                    opacity: isAlreadyAssigned ? 0.45 : 1
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
                                {(Number(roomPickerBooking.num_rooms) || 1) > 1 && primaryAssignedRoom && (
                                  <> (room {1 + additionalRooms.length + 1} of {roomPickerBooking.num_rooms})</>
                                )}
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: colors.textMuted }}>
                                {selectedRoom.room_name}
                                {!primaryAssignedRoom ? " · Welcome email will be sent" : ""}
                              </p>
                            </>
                          ) : (
                            <p style={{ margin: 0, fontSize: 13, color: colors.textMuted }}>
                              {primaryAssignedRoom
                                ? `Select room ${1 + additionalRooms.length + 1} of ${roomPickerBooking.num_rooms}`
                                : "Select a room above to proceed"}
                            </p>
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
                          {checkingIn
                            ? "Checking In..."
                            : primaryAssignedRoom
                              ? `Assign Room ${1 + additionalRooms.length + 1}`
                              : "Confirm Check In"}
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
      {staffRole !== "accountant" && regCard && (
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
                printRegistrationCard(regForm, () => {
                  showToast("Pop-up blocked — allow pop-ups to print", "error");
                });
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
                  const oldRoomStatus = finalReason.toLowerCase().includes("maintenance") ? "maintenance" : "vacant_dirty";
                  try {
                    await updateRoomStatus({ data: { token, roomNumber: reassignOldRoom, status: oldRoomStatus, updatedBy: `${staffName} — Reassign: ${finalReason}`, force: true } });
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
                <select value={walkIn.roomType} onChange={e => {
                    const cap = WALKIN_ROOM_CAP[e.target.value] ?? 10;
                    setWalkIn(w => ({ ...w, roomType: e.target.value, numRooms: Math.min(w.numRooms, cap) }));
                  }}
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
                  {Array.from({ length: WALKIN_ROOM_CAP[walkIn.roomType] ?? 10 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
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

                    // Look up price per night for selected room type
                    const room = rooms.find(r => r.slug === walkIn.roomType);
                    const pricePerNight = room?.price || 0;
                    const roomPrice = pricePerNight;
                    const subtotal = roomPrice * nights * walkIn.numRooms;
                    const total = subtotal;

                    // Save via saveBookingToDb-compatible structure
                    const { saveBookingToDb } = await import("@/functions/saveBookingToDb");
                    await saveBookingToDb({ data: {
                      reference, createdAt: new Date().toISOString(),
                      guest: { name: walkIn.name, email: walkIn.email || `walkin-${Date.now()}@remeritona.local`, phone: walkIn.phone, notes: walkIn.notes },
                      roomSlug: walkIn.roomType, roomName: walkIn.roomType.replace(/-/g," ").replace(/\b\w/g,(c:string)=>c.toUpperCase()),
                      roomPrice, checkIn: walkIn.checkIn, checkOut: walkIn.checkOut,
                      nights, numRooms: walkIn.numRooms, guests: walkIn.numRooms,
                      addons: [], subtotal, discount: 0, tax: 0, total,
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
      {staffRole !== "accountant" && selectedBooking && (
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

      {/* ==================== RESERVE ROOM MODAL ==================== */}
      {reserveModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: colors.surface, border: `1px solid #a855f7`,
            padding: 32, maxWidth: 400, width: "100%"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <p style={{ color: colors.gold, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>Reserve Room</p>
              <button onClick={() => setReserveModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>Room Number</p>
              <p style={{ margin: 0, fontSize: 16, color: colors.text, fontWeight: 600 }}>{reserveModal.roomNumber}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                Guest Name
              </label>
              <input
                type="text"
                value={reserveModal.guestName}
                onChange={e => setReserveModal({ ...reserveModal, guestName: e.target.value })}
                placeholder="Enter guest name"
                style={{
                  width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                  padding: "12px 16px", color: colors.text, fontSize: 14,
                  fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                Reserved Until
              </label>
              <input
                type="date"
                value={reserveModal.reservedUntil}
                onChange={e => setReserveModal({ ...reserveModal, reservedUntil: e.target.value })}
                style={{
                  width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                  padding: "12px 16px", color: colors.text, fontSize: 14,
                  fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: colors.gold, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                Booking Reference (Optional)
              </label>
              <input
                type="text"
                value={reserveModal.reservedRef}
                onChange={e => setReserveModal({ ...reserveModal, reservedRef: e.target.value })}
                placeholder="e.g. REF-12345"
                style={{
                  width: "100%", background: colors.surface2, border: `1px solid ${colors.border}`,
                  padding: "12px 16px", color: colors.text, fontSize: 14,
                  fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setReserveModal(null)} style={{
                background: "none", border: `1px solid ${colors.border}`,
                padding: "10px 20px", fontSize: 11, cursor: "pointer",
                color: colors.textMuted, letterSpacing: "0.15em", textTransform: "uppercase",
                fontFamily: "Georgia, serif"
              }}>Cancel</button>
              <button onClick={handleReserveRoom} disabled={!reserveModal.guestName || !reserveModal.reservedUntil} style={{
                background: "#a855f7", color: "#fff", border: "none",
                padding: "10px 20px", fontSize: 11, cursor: "pointer",
                letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700,
                fontFamily: "Georgia, serif", opacity: (!reserveModal.guestName || !reserveModal.reservedUntil) ? 0.5 : 1
              }}>Confirm Reserve</button>
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