// @ts-ignore
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import {
  fetchConversations,
  fetchThread,
  replyToGuest,
  markMessagesRead,
  deleteConversation,
  deleteMessage,
} from "@/lib/messages-api-client";

export const Route = createFileRoute("/chat-management")({
  component: ChatManagement,
});

function ChatManagement() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const threadPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const TOKEN_KEY = "remeritona_admin_token";

  const getToken = () => {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
  };

  const fetchConversationsData = async () => {
    const token = getToken();
    console.log("chat-management: token =", token);
    if (!token) {
      console.log("chat-management: no token found");
      return;
    }
    try {
      const data = await fetchConversations(token);
      console.log("chat-management: API response =", data);
      if (data.success && data.conversations) {
        const sorted = [...data.conversations].sort((a, b) => {
          const aUnread = (a.unread_count || 0) > 0 ? -1 : 1;
          const bUnread = (b.unread_count || 0) > 0 ? -1 : 1;
          if (aUnread !== bUnread) return aUnread - bUnread;
          return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
        });
        setConversations(sorted);
        setTotalUnread(sorted.reduce((sum, c) => sum + (c.unread_count || 0), 0));
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

  const fetchThreadData = async (room: string, isNewMessage = false) => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await fetchThread(token, room);
      if (data.success && data.messages) {
        const wasNearBottom = isNearBottom();
        setMessages(data.messages);
        // Only auto-scroll if it's the first load or if user was near bottom when new message arrives
        if (!isNewMessage || wasNearBottom) {
          setTimeout(() => scrollToBottom(true), 100);
        }
      }
    } catch (error) {
      console.error("Failed to fetch thread:", error);
    }
  };

  const handleSelectConversation = async (room: string, guestName: string) => {
    setSelectedRoom(room);
    setSelectedGuest(guestName);
    const token = getToken();
    if (token) {
      await markMessagesRead(token, room);
    }
    await fetchThreadData(room);
    await fetchConversationsData();
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedRoom) return;
    const token = getToken();
    if (!token) return;
    try {
      await replyToGuest(token, selectedRoom, replyText.trim());
      setReplyText("");
      await fetchThreadData(selectedRoom);
      await fetchConversationsData();
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  const handleDeleteConversation = async (room: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await deleteConversation(token, room);
      if (selectedRoom === room) {
        setSelectedRoom(null);
        setSelectedGuest(null);
        setMessages([]);
      }
      await fetchConversationsData();
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const token = getToken();
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
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchThreadData(selectedRoom, false); // First load, always scroll
      threadPollIntervalRef.current = setInterval(() => fetchThreadData(selectedRoom, true), 4000);
    }
    return () => {
      if (threadPollIntervalRef.current) clearInterval(threadPollIntervalRef.current);
    };
  }, [selectedRoom]);

  return (
    <div className="min-h-screen flex flex-row bg-background">
      {/* LEFT PANEL */}
      <div className="w-80 flex-shrink-0 border-r overflow-y-auto bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-semibold">Guest Messages</span>
          {totalUnread > 0 && (
            <span className="bg-[#C9A84C] text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
        <div className="p-3">
          <input
            type="text"
            placeholder="Search by room or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
        <div className="divide-y">
          {filteredConversations.map((conv) => (
            <div
              key={conv.room_number}
              className={`cursor-pointer p-3 border-b hover:bg-muted/50 transition-colors ${
                selectedRoom === conv.room_number ? "bg-muted" : ""
              }`}
              onClick={() => handleSelectConversation(conv.room_number, conv.guest_name)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (confirm(`Delete conversation for Room ${conv.room_number}?`)) {
                  handleDeleteConversation(conv.room_number);
                }
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className={`font-bold ${conv.unread_count > 0 ? "text-[#C9A84C]" : "text-foreground"}`}>
                    Room {conv.room_number}
                  </div>
                  <div className="text-sm text-muted-foreground">{conv.guest_name}</div>
                  <div className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                    {conv.last_message}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">{formatTime(conv.last_at)}</span>
                  {conv.unread_count > 0 && (
                    <span className="bg-[#C9A84C] text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
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
      <div className="flex-1 flex flex-col bg-background">
        {!selectedRoom ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <div>Select a conversation to reply</div>
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="flex-shrink-0 p-4 border-b flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate({ to: "/hotel-admin" })}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-semibold">
                  Room {selectedRoom} — {selectedGuest}
                </span>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Delete conversation for Room ${selectedRoom}?`)) {
                    handleDeleteConversation(selectedRoom);
                  }
                }}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                🗑️
              </button>
            </div>

            {/* MESSAGE THREAD */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background min-h-0">
              {messages.map((msg) => {
                const isSystem = msg.sender === "system" ||
                  msg.message.startsWith("NEW_SESSION") ||
                  msg.message.startsWith("TIMEOUT:");

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border opacity-30" />
                      <span className="text-xs text-muted-foreground">
                        {msg.message.startsWith("NEW_SESSION") ? "New session" :
                         msg.message.startsWith("TIMEOUT") ? "Chat ended" :
                         msg.message}
                      </span>
                      <div className="flex-1 h-px bg-border opacity-30" />
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
                      <div className="flex justify-start">
                        <div className="max-w-[75%] bg-secondary text-foreground px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                          <p>{msg.message}</p>
                          <p className="text-[10px] opacity-60 mt-1">{formatMessageTime(msg.created_at)}</p>
                        </div>
                      </div>
                    )}
                    {msg.sender === "staff" && (
                      <div className="flex justify-end">
                        <div className="max-w-[75%] bg-[#C9A84C] text-black px-4 py-2.5 rounded-2xl rounded-br-sm text-sm">
                          <p>{msg.message}</p>
                          <p className="text-[10px] opacity-60 mt-1">{formatMessageTime(msg.created_at)}</p>
                        </div>
                      </div>
                    )}
                    {msg.sender === "ai" && (
                      <div>
                        <div className="text-[10px] text-muted-foreground mb-1">✨ AI Concierge</div>
                        <div className="flex justify-start">
                          <div className="max-w-[75%] bg-blue-500/10 border border-blue-500/20 text-foreground px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                            <p>{msg.message}</p>
                            <p className="text-[10px] opacity-60 mt-1">{formatMessageTime(msg.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.sender === "ai_flagged" && (
                      <div>
                        <div className="text-[10px] text-red-400 mb-1">🔴 Needs Staff Attention</div>
                        <div className="flex justify-start">
                          <div className="max-w-[75%] bg-red-500/10 border border-red-500/20 text-foreground px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                            <p>{msg.message}</p>
                            <p className="text-[10px] opacity-60 mt-1">{formatMessageTime(msg.created_at)}</p>
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
            <div className="flex-shrink-0 p-4 border-t bg-card">
              <div className="flex gap-2">
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
                  className="flex-1 px-4 py-2 border rounded-md bg-background"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                  className="px-4 py-2 bg-[#C9A84C] text-black font-semibold rounded-md hover:bg-[#b8963b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
