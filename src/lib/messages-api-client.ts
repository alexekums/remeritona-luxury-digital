import { playNotificationPing } from "@/lib/orders-api-client";

export { playNotificationPing };

function authHeaders(token: string): HeadersInit {
  return {
    "X-Admin-Token": token,
    "Content-Type": "application/json",
  };
}

export async function fetchConversations(token: string) {
  const res = await fetch("/api/messages/conversations", { headers: authHeaders(token) });
  return res.json() as Promise<{ success: boolean; conversations?: any[]; error?: string }>;
}

export async function fetchThread(token: string, room: string) {
  const res = await fetch(`/api/messages/thread?room=${encodeURIComponent(room)}`, {
    headers: authHeaders(token),
  });
  return res.json() as Promise<{ success: boolean; messages?: any[]; error?: string }>;
}

export async function replyToGuest(token: string, room_number: string, message: string) {
  const res = await fetch("/api/messages/reply", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ room_number, message }),
  });
  return res.json() as Promise<{ success: boolean; message?: any; error?: string }>;
}

export async function markMessagesRead(token: string, room_number: string) {
  const res = await fetch("/api/messages/mark-read", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ room_number }),
  });
  return res.json() as Promise<{ success: boolean; error?: string }>;
}

export async function deleteConversation(token: string, room: string) {
  const res = await fetch(`/api/messages/conversation?room=${encodeURIComponent(room)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return res.json() as Promise<{ success: boolean; error?: string }>;
}

export async function deleteMessage(token: string, id: string) {
  const res = await fetch(`/api/messages/message?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return res.json() as Promise<{ success: boolean; error?: string }>;
}
