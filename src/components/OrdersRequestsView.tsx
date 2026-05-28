import { useCallback, useEffect, useState } from "react";
import { formatNaira } from "@/data/rooms";
import { fetchOrdersAndRequests, patchItemStatus } from "@/lib/orders-api-client";
import {
  formatOrderItemsSummary,
  getCardBorderColor,
  getGuestRequestActionLabel,
  getNextGuestRequestStatus,
  getNextRoomOrderStatus,
  getRequestSummary,
  getRoomOrderActionLabel,
  getStatusBadgeColor,
  sortOrders,
  sortRequests,
  timeAgo,
} from "@/lib/orders-helpers";

type Colors = {
  bg: string;
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

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function OrdersRequestsView({ token, colors, onToast }: Props) {
  const [activeTab, setActiveTab] = useState<"dining" | "service">("dining");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const params: { status?: string; room?: string } = {};
      if (statusFilter !== "all") {
        params.status =
          statusFilter === "in_progress"
            ? activeTab === "dining"
              ? "preparing"
              : "in_progress"
            : statusFilter === "completed"
              ? activeTab === "dining"
                ? "delivered"
                : "completed"
              : statusFilter;
      }
      if (roomSearch.trim()) params.room = roomSearch.trim();
      const result = await fetchOrdersAndRequests(token, params);
      if (result.success) setItems(result.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, roomSearch, activeTab]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAdvance = async (item: any) => {
    const nextStatus =
      item.type === "dining"
        ? getNextRoomOrderStatus(item.status)
        : getNextGuestRequestStatus(item.status);
    if (!nextStatus) return;
    setActionLoading(String(item.id));
    try {
      const result = await patchItemStatus(token, item.id, item.type, nextStatus);
      if (result.success) {
        onToast?.("Status updated", "success");
        await loadData();
      } else {
        onToast?.(result.error ?? "Failed to update", "error");
      }
    } catch {
      onToast?.("Failed to update status", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const diningItems = sortOrders(items.filter((i) => i.type === "dining"));
  const serviceItems = sortRequests(items.filter((i) => i.type === "service"));
  const displayItems = activeTab === "dining" ? diningItems : serviceItems;

  const mapFilterLabel = (f: typeof STATUS_FILTERS[number]) => {
    if (activeTab === "dining" && f.value === "in_progress") return "Preparing";
    if (activeTab === "dining" && f.value === "completed") return "Delivered";
    if (activeTab === "service" && f.value === "in_progress") return "In Progress";
    return f.label;
  };

  return (
    <div>
      <h1 style={{ color: colors.gold, fontSize: 22, fontWeight: 400, margin: "0 0 24px", letterSpacing: "0.05em" }}>
        Orders & Requests
      </h1>

      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${colors.border}` }}>
        {(["dining", "service"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? `2px solid ${colors.gold}` : "2px solid transparent",
              padding: "10px 20px",
              cursor: "pointer",
              color: activeTab === tab ? colors.gold : colors.textMuted,
              fontSize: 13,
              letterSpacing: "0.1em",
              fontFamily: "Georgia, serif",
            }}
          >
            {tab === "dining" ? "Dining Orders" : "Service Requests"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              style={{
                background: statusFilter === f.value ? colors.gold : colors.surface2,
                color: statusFilter === f.value ? "#0a0a0a" : colors.textMuted,
                border: `1px solid ${colors.border}`,
                padding: "6px 14px",
                fontSize: 11,
                cursor: "pointer",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "Georgia, serif",
              }}
            >
              {mapFilterLabel(f)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search room number..."
          value={roomSearch}
          onChange={(e) => setRoomSearch(e.target.value)}
          style={{
            background: colors.surface2,
            border: `1px solid ${colors.border}`,
            padding: "8px 14px",
            color: colors.text,
            fontSize: 13,
            fontFamily: "Georgia, serif",
            outline: "none",
            minWidth: 180,
          }}
        />
      </div>

      {loading && displayItems.length === 0 && (
        <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>Loading orders...</p>
      )}

      {!loading && displayItems.length === 0 && (
        <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>No items found</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {activeTab === "dining" &&
          displayItems.map((order: any) => {
            const actionLabel = getRoomOrderActionLabel(order.status);
            const isDone = order.status === "delivered" || order.status === "done";
            return (
              <div
                key={`order-${order.id}`}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${getCardBorderColor(order.status)}`,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 24, color: colors.gold, fontWeight: 700 }}>
                      Room {order.room_number}
                    </span>
                    {order.guest_name && (
                      <span style={{ fontSize: 13, color: colors.textMuted, marginLeft: 12 }}>
                        {order.guest_name}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "4px 10px",
                      background: getStatusBadgeColor(order.status),
                      color: "#fff",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {order.status}
                  </span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  {formatOrderItemsSummary(order.items)
                    .split(", ")
                    .map((line: string, idx: number) => (
                      <p key={idx} style={{ margin: "4px 0", fontSize: 13, color: colors.text }}>
                        {line}
                      </p>
                    ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 15, color: colors.gold, fontWeight: 600 }}>
                      {formatNaira(order.total ?? order.total_amount ?? 0)}
                    </span>
                    <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 16 }}>
                      {timeAgo(order.created_at)}
                    </span>
                  </div>
                  {isDone ? (
                    <span style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.1em" }}>
                      Completed ✓
                    </span>
                  ) : actionLabel ? (
                    <button
                      onClick={() => handleAdvance(order)}
                      disabled={actionLoading === String(order.id)}
                      style={{
                        background: colors.gold,
                        color: "#0a0a0a",
                        border: "none",
                        padding: "8px 16px",
                        fontSize: 11,
                        cursor: "pointer",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        opacity: actionLoading === String(order.id) ? 0.6 : 1,
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      {actionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

        {activeTab === "service" &&
          displayItems.map((req: any) => {
            const actionLabel = getGuestRequestActionLabel(req.status);
            const isDone = req.status === "completed" || req.status === "done";
            return (
              <div
                key={`req-${req.id}`}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${getCardBorderColor(req.status)}`,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 24, color: colors.gold, fontWeight: 700 }}>
                      Room {req.room_number}
                    </span>
                    {req.guest_name && (
                      <span style={{ fontSize: 13, color: colors.textMuted, marginLeft: 12 }}>
                        {req.guest_name}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "4px 10px",
                      background: getStatusBadgeColor(req.status),
                      color: "#fff",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {req.status === "in_progress" ? "in progress" : req.status}
                  </span>
                </div>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: colors.text }}>
                  {getRequestSummary(req)}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <span style={{ fontSize: 11, color: colors.textMuted }}>{timeAgo(req.created_at)}</span>
                  {isDone ? (
                    <span style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.1em" }}>
                      Completed ✓
                    </span>
                  ) : actionLabel ? (
                    <button
                      onClick={() => handleAdvance(req)}
                      disabled={actionLoading === String(req.id)}
                      style={{
                        background: colors.gold,
                        color: "#0a0a0a",
                        border: "none",
                        padding: "8px 16px",
                        fontSize: 11,
                        cursor: "pointer",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        opacity: actionLoading === String(req.id) ? 0.6 : 1,
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      {actionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
