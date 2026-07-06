import { useState, useEffect, useRef } from "react";
import {
  fetchConversations,
  fetchThread,
  replyToGuest,
  markMessagesRead,
  deleteConversation,
  deleteMessage,
} from "@/lib/messages-api-client";

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

export function ChatManagementView({ token, colors, onToast }: Props) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const threadPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConversationsData = async () => {
    if (!token) return;
    try {
      const data = await fetchConversations(token);
      if (data.success && data.conversations) {
        const sorted = [...data.conversations].sort((a: any, b: any) => {
          const aUnread = (a.unread_count || 0) > 0 ? -1 : 1;
          const bUnread = (b.unread_count || 0) > 0 ? -1 : 1;
          if (aUnread !== bUnread) return aUnread - bUnread;
          return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
        });
        setConversations(sorted);
        setTotalUnread(sorted.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0));
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const fetchThreadData = async (room: string, guestId: string | null = null, isNewMessage = false) => {
    if (!token) return;
    try {
      const url = guestId 
        ? `/api/messages/thread?room=${encodeURIComponent(room)}&guestId=${encodeURIComponent(guestId)}`
        : `/api/messages/thread?room=${encodeURIComponent(room)}`;
      const res = await fetch(url, { headers: { "X-Admin-Token": token, "Content-Type": "application/json" } });
      const data: any = await res.json();
      if (data.success && data.messages) {
        const wasNearBottom = isNearBottom();
        setMessages(data.messages);
        if (!isNewMessage || wasNearBottom) {
          setTimeout(() => scrollToBottom(true), 100);
        }
      }
    } catch (error) {
      console.error("Failed to fetch thread:", error);
    }
  };

  const handleSelectConversation = async (room: string, guestName: string, guestId: string | null = null) => {
    setSelectedRoom(room);
    setSelectedGuest(guestName);
    setSelectedGuestId(guestId);
    if (token) {
      await markMessagesRead(token, room);
    }
    await fetchThreadData(room, guestId);
    await fetchConversationsData();
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedRoom) return;
    if (!token) return;
    try {
      await replyToGuest(token, selectedRoom, replyText.trim(), selectedGuestId || undefined);
      setReplyText("");
      await fetchThreadData(selectedRoom, selectedGuestId);
      await fetchConversationsData();
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  const handleDeleteConversation = async (room: string) => {
    if (!token) return;
    try {
      await deleteConversation(token, room);
      if (selectedRoom === room) {
        setSelectedRoom(null);
        setSelectedGuest(null);
        setSelectedGuestId(null);
        setMessages([]);
      }
      await fetchConversationsData();
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!token) return;
    try {
      await deleteMessage(token, messageId);
      if (selectedRoom) {
        await fetchThreadData(selectedRoom);
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString + 'Z');
    return date.toLocaleTimeString('en-NG', {
      timeZone: 'Africa/Lagos',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredConversations = conversations.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.room_number?.toLowerCase().includes(query) ||
      c.guest_name?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    fetchConversationsData();
    pollIntervalRef.current = setInterval(fetchConversationsData, 4000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (threadPollIntervalRef.current) clearInterval(threadPollIntervalRef.current);
    };
  }, [token]);

  useEffect(() => {
    if (selectedRoom) {
      fetchThreadData(selectedRoom, selectedGuestId, false);
      threadPollIntervalRef.current = setInterval(() => fetchThreadData(selectedRoom, selectedGuestId, true), 4000);
    }
    return () => {
      if (threadPollIntervalRef.current) clearInterval(threadPollIntervalRef.current);
    };
  }, [selectedRoom, selectedGuestId, token]);

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "calc(100vh - 88px)", background: colors.surface }}>
      {/* LEFT PANEL */}
      <div style={{ width: 320, flexShrink: 0, borderRight: `1px solid ${colors.border}`, overflowY: "auto", background: colors.surface }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600, color: colors.text }}>Guest Messages</span>
          {totalUnread > 0 && (
            <span style={{ background: colors.gold, color: "#000", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>
              {totalUnread}
            </span>
          )}
        </div>
        <div style={{ padding: 12 }}>
          <input
            type="text"
            placeholder="Search by room or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", fontSize: 13,
              border: `1px solid ${colors.border}`, borderRadius: 6,
              background: colors.surface2, color: colors.text, outline: "none"
            }}
          />
        </div>
        <div>
          {filteredConversations.map((conv: any) => (
            <div
              key={conv.room_number}
              style={{
                cursor: "pointer", padding: 12, borderBottom: `1px solid ${colors.border}`,
                background: selectedRoom === conv.room_number ? colors.surface2 : "transparent",
                transition: "background 0.2s"
              }}
              onClick={() => handleSelectConversation(conv.room_number, conv.guest_name, conv.guest_id || null)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (confirm(`Delete conversation for Room ${conv.room_number}?`)) {
                  handleDeleteConversation(conv.room_number);
                }
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: conv.unread_count > 0 ? colors.gold : colors.text, fontSize: 13 }}>
                    Room {conv.room_number}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>{conv.guest_name}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                    {conv.last_message}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ fontSize: 10, color: colors.textMuted }}>{formatTime(conv.last_at)}</span>
                  {conv.unread_count > 0 && (
                    <span style={{ background: colors.gold, color: "#000", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8 }}>
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: colors.surface }}>
        {!selectedRoom ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textMuted }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>💬</div>
              <div>Select a conversation to reply</div>
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div style={{ flexShrink: 0, padding: 16, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: colors.surface }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 600, color: colors.text }}>
                  Room {selectedRoom} — {selectedGuest}
                </span>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Delete conversation for Room ${selectedRoom}?`)) {
                    handleDeleteConversation(selectedRoom);
                  }
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: 16 }}
              >
                🗑️
              </button>
            </div>

            {/* MESSAGE THREAD */}
            <div ref={containerRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, background: colors.surface, minHeight: 0 }}>
              {messages.map((msg: any) => {
                const isSystem = msg.sender === "system" ||
                  msg.message.startsWith("NEW_SESSION") ||
                  msg.message.startsWith("TIMEOUT:");

                if (isSystem) {
                  return (
                    <div key={msg.id} style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0" }}>
                      <div style={{ flex: 1, height: 1, background: colors.border, opacity: 0.3 }} />
                      <span style={{ fontSize: 10, color: colors.textMuted }}>
                        {msg.message.startsWith("NEW_SESSION") ? "New session" :
                         msg.message.startsWith("TIMEOUT") ? "Chat ended" :
                         msg.message}
                      </span>
                      <div style={{ flex: 1, height: 1, background: colors.border, opacity: 0.3 }} />
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (confirm("Delete this message?")) {
                        handleDeleteMessage(msg.id);
                      }
                    }}
                  >
                    {msg.sender === "guest" && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ maxWidth: "75%", background: colors.surface2, color: colors.text, padding: "10px 16px", borderRadius: 16, borderBottomLeftRadius: 4, fontSize: 13 }}>
                          <p style={{ margin: 0 }}>{msg.message}</p>
                          <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.6 }}>{formatMessageTime(msg.created_at)}</p>
                        </div>
                      </div>
                    )}
                    {msg.sender === "staff" && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ maxWidth: "75%", background: colors.gold, color: "#000", padding: "10px 16px", borderRadius: 16, borderBottomRightRadius: 4, fontSize: 13 }}>
                          <p style={{ margin: 0 }}>{msg.message}</p>
                          <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.6 }}>{formatMessageTime(msg.created_at)}</p>
                        </div>
                      </div>
                    )}
                    {msg.sender === "ai" && (
                      <div>
                        <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>✨ AI Concierge</div>
                        <div style={{ display: "flex", justifyContent: "flex-start" }}>
                          <div style={{ maxWidth: "75%", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", color: colors.text, padding: "10px 16px", borderRadius: 16, borderBottomLeftRadius: 4, fontSize: 13 }}>
                            <p style={{ margin: 0 }}>{msg.message}</p>
                            <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.6 }}>{formatMessageTime(msg.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.sender === "ai_flagged" && (
                      <div>
                        <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 4 }}>🔴 Needs Staff Attention</div>
                        <div style={{ display: "flex", justifyContent: "flex-start" }}>
                          <div style={{ maxWidth: "75%", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: colors.text, padding: "10px 16px", borderRadius: 16, borderBottomLeftRadius: 4, fontSize: 13 }}>
                            <p style={{ margin: 0 }}>{msg.message}</p>
                            <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.6 }}>{formatMessageTime(msg.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* REPLY INPUT */}
            <div style={{ flexShrink: 0, padding: 16, borderTop: `1px solid ${colors.border}`, background: colors.surface }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Reply to guest..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  style={{
                    flex: 1, padding: "10px 16px", fontSize: 13,
                    border: `1px solid ${colors.border}`, borderRadius: 6,
                    background: colors.surface2, color: colors.text, outline: "none"
                  }}
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                  style={{
                    padding: "10px 16px", background: colors.gold, color: "#000",
                    fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
                    opacity: !replyText.trim() ? 0.5 : 1
                  }}
                >
                  Send ↑
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
