import { useCallback, useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import {
  fetchConversations,
  fetchThread,
  markMessagesRead,
  playNotificationPing,
  replyToGuest,
} from "@/lib/messages-api-client";
import { timeAgo } from "@/lib/orders-helpers";

type Props = {
  token: string;
  isDark?: boolean;
  colors: {
    surface: string;
    surface2: string;
    border: string;
    text: string;
    textMuted: string;
    gold: string;
  };
};

type Conversation = {
  room_number: string;
  last_message: string;
  last_at: string;
  last_sender: string;
  unread_count: number;
  guest_name?: string;
};

export function FloatingChatWidget({ token, isDark = true, colors }: Props) {
  const { isOpen, setIsOpen, setTotalUnread, totalUnread } = useChatWidget();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeRoom, setActiveRoom] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const lastUnreadRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unreadCount = totalUnread;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = useCallback(async () => {
    if (!token) return;
    const result = await fetchConversations(token);
    if (!result.success) return;
    const convs = (result.conversations ?? []) as Conversation[];
    const total = convs.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0);
    setTotalUnread(total);

    const prev = lastUnreadRef.current;
    if (prev !== null && total > prev) {
      playNotificationPing();
    }
    lastUnreadRef.current = total;

    const sorted = [...convs].sort((a, b) => {
      const ua = Number(a.unread_count) || 0;
      const ub = Number(b.unread_count) || 0;
      if (ua > 0 && ub === 0) return -1;
      if (ub > 0 && ua === 0) return 1;
      return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
    });
    setConversations(sorted);
  }, [token, setTotalUnread]);

  const loadThread = useCallback(async (room: string) => {
    if (!token) return;
    const result = await fetchThread(token, room);
    if (result.success) setMessages(result.messages ?? []);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadConversations();
    const interval = setInterval(loadConversations, 4000);
    return () => clearInterval(interval);
  }, [token, loadConversations]);

  useEffect(() => {
    if (!token || !activeRoom) return;
    const poll = () => loadThread(activeRoom.room_number);
    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [token, activeRoom, loadThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeRoom]);

  const openThread = async (conv: Conversation) => {
    setActiveRoom(conv);
    await markMessagesRead(token, conv.room_number);
    await loadThread(conv.room_number);
    await loadConversations();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const result = await replyToGuest(token, activeRoom.room_number, replyText.trim());
      if (result.success) {
        setReplyText("");
        await loadThread(activeRoom.room_number);
        await loadConversations();
      }
    } finally {
      setSending(false);
    }
  };

  const truncate = (text: string, len: number) =>
    text.length > len ? `${text.slice(0, len)}…` : text;

  const panelThemeClass = isDark ? "" : "pms-light";

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen && (
        <div
          className={`absolute bottom-[72px] right-0 w-[360px] max-h-[480px] bg-card border border-border text-foreground rounded-2xl shadow-2xl flex flex-col overflow-hidden font-serif ${panelThemeClass}`}
        >
          {!activeRoom ? (
            <>
              <div className="flex justify-between items-center px-4 py-3.5 border-b border-border">
                <span className="font-bold text-foreground text-sm">Guest Messages</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-transparent border-none cursor-pointer text-muted-foreground p-0"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[400px]">
                {conversations.length === 0 && (
                  <p className="text-muted-foreground text-center py-8 text-[13px]">
                    No guest messages yet
                  </p>
                )}
                {conversations.map((conv) => {
                  const unread = Number(conv.unread_count) || 0;
                  return (
                    <button
                      key={conv.room_number}
                      type="button"
                      onClick={() => openThread(conv)}
                      className={`block w-full text-left border-none border-b border-border px-4 py-3 cursor-pointer font-serif ${
                        unread > 0 ? "bg-muted/50" : "bg-transparent"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-semibold"
                            style={{ color: colors.gold, fontWeight: unread > 0 ? 700 : 600 }}
                          >
                            Room {conv.room_number}
                          </div>
                          {conv.guest_name && (
                            <div className="text-muted-foreground text-[11px] mt-0.5">
                              {conv.guest_name}
                            </div>
                          )}
                          <div
                            className={`text-foreground text-xs mt-1 ${unread > 0 ? "font-semibold" : "font-normal"}`}
                          >
                            {truncate(conv.last_message ?? "", 40)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <span className="text-[10px] text-muted-foreground">{timeAgo(conv.last_at)}</span>
                          {unread > 0 && (
                            <span
                              className="text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                              style={{ background: colors.gold, color: "#0a0a0a" }}
                            >
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <button
                  type="button"
                  onClick={() => setActiveRoom(null)}
                  className="bg-transparent border-none cursor-pointer text-lg p-0"
                  style={{ color: colors.gold }}
                >
                  ←
                </button>
                <span className="font-semibold text-foreground text-[13px] flex-1">
                  Room {activeRoom.room_number}
                  {activeRoom.guest_name ? ` — ${activeRoom.guest_name}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-transparent border-none cursor-pointer text-muted-foreground p-0"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[340px] px-4 py-3 flex flex-col gap-2.5">
                {messages.map((msg) => {
                  const isStaff = msg.sender === "staff";
                  return (
                    <div
                      key={msg.id}
                      className={`max-w-[80%] ${isStaff ? "self-end" : "self-start"}`}
                    >
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug ${
                          isStaff
                            ? "text-black rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                        style={
                          isStaff
                            ? { background: "#C9A84C" }
                            : undefined
                        }
                      >
                        {msg.message}
                      </div>
                      <div
                        className={`text-[10px] text-muted-foreground mt-1 ${
                          isStaff ? "text-right" : "text-left"
                        }`}
                      >
                        {timeAgo(msg.created_at)}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form
                onSubmit={handleSend}
                className="flex gap-2 px-4 py-3 border-t border-border"
              >
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply to guest…"
                  className="flex-1 bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground text-[13px] outline-none font-serif"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="border-none rounded-xl px-3.5 py-2.5 cursor-pointer flex items-center disabled:opacity-60"
                  style={{ background: colors.gold, color: "#0a0a0a" }}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setActiveRoom(null);
        }}
        className={`
          relative w-14 h-14 rounded-full flex items-center justify-center
          shadow-lg transition-all text-2xl border-none cursor-pointer
          ${unreadCount > 0
            ? "animate-pulse shadow-[0_0_20px_rgba(201,168,76,0.6)]"
            : ""}
        `}
        style={{ background: "#C9A84C" }}
        aria-label="Guest messages"
      >
        💬
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
