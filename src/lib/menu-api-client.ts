function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchMenuItems(token: string, category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`/api/menu-items${qs}`, { headers: authHeaders(token) });
  return res.json() as Promise<{ success: boolean; items?: any[]; error?: string }>;
}

export async function patchMenuItem(
  token: string,
  id: string,
  body: {
    price?: number;
    name?: string;
    description?: string;
    available?: boolean;
    category?: string;
    duration_mins?: number;
    image_url?: string | null;
  }
) {
  const res = await fetch(`/api/menu-items/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ success: boolean; item?: any; error?: string }>;
}

export async function createMenuItem(
  token: string,
  body: {
    name: string;
    description?: string;
    price: number;
    category: string;
    duration_mins?: number;
    image_url?: string | null;
  }
) {
  const res = await fetch("/api/menu-items", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ success: boolean; item?: any; error?: string }>;
}

export async function deleteMenuItem(token: string, id: string) {
  const res = await fetch(`/api/menu-items/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return res.json() as Promise<{ success: boolean; error?: string }>;
}
