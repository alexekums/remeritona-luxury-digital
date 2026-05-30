import { useCallback, useEffect, useState } from "react";
import { formatNaira } from "@/data/rooms";
import { createMenuItem, deleteMenuItem, fetchMenuItems, patchMenuItem } from "@/lib/menu-api-client";

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
  staffRole: string;
  colors: Colors;
  onToast?: (message: string, type?: "success" | "error") => void;
};

export function MenuManagementView({ token, staffRole, colors, onToast }: Props) {
  const [activeTab, setActiveTab] = useState<"food" | "spa">("food");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [modalItem, setModalItem] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    duration_mins: "",
  });
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [fileSizeWarning, setFileSizeWarning] = useState(false);

  const isAdmin = staffRole === "admin";

  const loadItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await fetchMenuItems(token);
      if (result.success) setItems(result.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const foodItems = items.filter((i) => i.category !== "Spa");
  const spaItems = items.filter((i) => i.category === "Spa");
  const displayItems = activeTab === "food" ? foodItems : spaItems;

  const categories = [...new Set(foodItems.map((i) => i.category).filter(Boolean))].sort();
  const filteredFood =
    categoryFilter === "all" ? foodItems : foodItems.filter((i) => i.category === categoryFilter);
  const listItems = activeTab === "food" ? filteredFood : spaItems;

  const savePrice = async (item: any) => {
    const price = parseFloat(priceDraft);
    if (Number.isNaN(price)) return;
    const result = await patchMenuItem(token, item.id, { price });
    if (result.success) {
      onToast?.("Price updated");
      setEditingPriceId(null);
      await loadItems();
    } else {
      onToast?.(result.error ?? "Failed to update", "error");
    }
  };

  const toggleAvailable = async (item: any) => {
    const result = await patchMenuItem(token, item.id, { available: !item.available });
    if (result.success) await loadItems();
    else onToast?.(result.error ?? "Failed to update", "error");
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const result = await deleteMenuItem(token, item.id);
    if (result.success) {
      onToast?.("Item deleted");
      await loadItems();
    } else {
      onToast?.(result.error ?? "Failed to delete", "error");
    }
  };

  const resetImageFields = () => {
    setImageUrl("");
    setImagePreview("");
    setFileSizeWarning(false);
    setImageMode("url");
  };

  const openEditModal = (item: any) => {
    setModalItem(item);
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      price: String(item.price ?? ""),
      category: item.category ?? "",
      duration_mins: String(item.duration_mins ?? ""),
    });
    const url = item.image_url ?? "";
    setImageUrl(url);
    setImagePreview(url);
    setImageMode(url.startsWith("data:") ? "upload" : "url");
    setFileSizeWarning(false);
  };

  const saveModal = async () => {
    if (!modalItem) return;
    const result = await patchMenuItem(token, modalItem.id, {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category,
      duration_mins: activeTab === "spa" ? parseInt(form.duration_mins, 10) || 0 : undefined,
      image_url: imageUrl || null,
    });
    if (result.success) {
      onToast?.("Item updated");
      setModalItem(null);
      resetImageFields();
      await loadItems();
    } else {
      onToast?.(result.error ?? "Failed to update", "error");
    }
  };

  const handleAdd = async () => {
    const result = await createMenuItem(token, {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category || (activeTab === "spa" ? "Spa" : "Light Bites"),
      duration_mins: activeTab === "spa" ? parseInt(form.duration_mins, 10) || 60 : 0,
      image_url: imageUrl || undefined,
    });
    if (result.success) {
      onToast?.("Item added");
      setShowAddModal(false);
      setForm({ name: "", description: "", price: "", category: "", duration_mins: "" });
      resetImageFields();
      await loadItems();
    } else {
      onToast?.(result.error ?? "Failed to add", "error");
    }
  };

  const renderItemRow = (item: any) => (
    <div
      key={item.id}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        padding: 16,
        marginBottom: 12,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, color: colors.text, fontSize: 15 }}>{item.name}</div>
        {item.description && (
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{item.description}</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, padding: "2px 8px", background: colors.surface2, color: colors.gold, border: `1px solid ${colors.border}` }}>
            {item.category}
          </span>
          {activeTab === "spa" && item.duration_mins > 0 && (
            <span style={{ fontSize: 10, color: colors.textMuted }}>{item.duration_mins} min</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {editingPriceId === item.id ? (
          <input
            autoFocus
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            onBlur={() => savePrice(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter") savePrice(item);
              if (e.key === "Escape") setEditingPriceId(null);
            }}
            style={{ width: 100, padding: "6px 8px", background: colors.surface2, border: `1px solid ${colors.gold}`, color: colors.text }}
          />
        ) : (
          <button
            onClick={() => {
              setEditingPriceId(item.id);
              setPriceDraft(String(item.price));
            }}
            style={{ background: "none", border: "none", color: colors.gold, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}
          >
            {formatNaira(item.price)}
          </button>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: colors.textMuted, cursor: "pointer" }}>
          <input type="checkbox" checked={!!item.available} onChange={() => toggleAvailable(item)} />
          Available
        </label>
        <button
          onClick={() => openEditModal(item)}
          style={{ background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.text, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}
        >
          Edit
        </button>
        {activeTab === "food" && isAdmin && (
          <button
            onClick={() => handleDelete(item)}
            style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", padding: "6px 12px", fontSize: 11, cursor: "pointer" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ color: colors.gold, fontSize: 22, fontWeight: 400, margin: 0, letterSpacing: "0.05em" }}>
          Menu & Pricing
        </h1>
        <button
          onClick={() => {
            setShowAddModal(true);
            setForm({ name: "", description: "", price: "", category: activeTab === "spa" ? "Spa" : categories[0] ?? "", duration_mins: "60" });
            resetImageFields();
          }}
          style={{ background: colors.gold, color: "#0a0a0a", border: "none", padding: "10px 18px", fontSize: 12, cursor: "pointer", letterSpacing: "0.08em" }}
        >
          + Add {activeTab === "spa" ? "Service" : "Item"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${colors.border}` }}>
        {(["food", "spa"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCategoryFilter("all"); }}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? `2px solid ${colors.gold}` : "2px solid transparent",
              padding: "10px 20px",
              cursor: "pointer",
              color: activeTab === tab ? colors.gold : colors.textMuted,
              fontFamily: "Georgia, serif",
            }}
          >
            {tab === "food" ? "Food Menu" : "Spa Services"}
          </button>
        ))}
      </div>

      {activeTab === "food" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          <button onClick={() => setCategoryFilter("all")} style={{ padding: "6px 12px", fontSize: 11, cursor: "pointer", background: categoryFilter === "all" ? colors.gold : colors.surface2, border: `1px solid ${colors.border}`, color: categoryFilter === "all" ? "#0a0a0a" : colors.textMuted }}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategoryFilter(c)} style={{ padding: "6px 12px", fontSize: 11, cursor: "pointer", background: categoryFilter === c ? colors.gold : colors.surface2, border: `1px solid ${colors.border}`, color: categoryFilter === c ? "#0a0a0a" : colors.textMuted }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {loading && <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>Loading menu…</p>}
      {!loading && listItems.length === 0 && (
        <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>No items found</p>
      )}
      {listItems.map(renderItemRow)}

      {(modalItem || showAddModal) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: 24, maxWidth: 440, width: "100%" }}>
            <h3 style={{ color: colors.gold, margin: "0 0 16px", fontSize: 14, letterSpacing: "0.1em" }}>
              {showAddModal ? "Add Item" : "Edit Item"}
            </h3>
            {["name", "description", "price"].map((field) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 10, color: colors.textMuted, marginBottom: 4, textTransform: "capitalize" }}>{field}</label>
                <input
                  value={(form as any)[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  style={{ width: "100%", padding: "10px", background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.text, boxSizing: "border-box" }}
                />
              </div>
            ))}
            {activeTab === "food" && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>Category</label>
                <input
                  list="menu-categories"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{ width: "100%", padding: "10px", background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.text, boxSizing: "border-box" }}
                />
                <datalist id="menu-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            )}
            {activeTab === "spa" && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>Duration (mins)</label>
                <input
                  type="number"
                  value={form.duration_mins}
                  onChange={(e) => setForm({ ...form, duration_mins: e.target.value })}
                  style={{ width: "100%", padding: "10px", background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.text, boxSizing: "border-box" }}
                />
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>Image</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  style={{
                    padding: "6px 12px",
                    fontSize: 11,
                    cursor: "pointer",
                    background: imageMode === "url" ? colors.gold : colors.surface2,
                    color: imageMode === "url" ? "#0a0a0a" : colors.textMuted,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  Paste URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  style={{
                    padding: "6px 12px",
                    fontSize: 11,
                    cursor: "pointer",
                    background: imageMode === "upload" ? colors.gold : colors.surface2,
                    color: imageMode === "upload" ? "#0a0a0a" : colors.textMuted,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  Upload Image
                </button>
              </div>
              {imageMode === "url" ? (
                <input
                  value={imageUrl}
                  placeholder="https://images.unsplash.com/..."
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreview(e.target.value);
                    setFileSizeWarning(false);
                  }}
                  style={{ width: "100%", padding: "10px", background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.text, boxSizing: "border-box" }}
                />
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setFileSizeWarning(file.size > 400000);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        setImageUrl(base64);
                        setImagePreview(base64);
                      };
                      reader.readAsDataURL(file);
                    }}
                    style={{ width: "100%", fontSize: 12, color: colors.text }}
                  />
                  {fileSizeWarning && (
                    <p style={{ fontSize: 11, color: "#f59e0b", margin: "8px 0 0" }}>
                      Image over 400KB — consider using a URL for better performance
                    </p>
                  )}
                </>
              )}
              <div
                style={{
                  marginTop: 12,
                  width: 160,
                  height: 120,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: `1px solid ${colors.border}`,
                  background: colors.surface2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {imageUrl ? (
                  <img src={imagePreview || imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 11, color: colors.textMuted }}>No image</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => { setModalItem(null); setShowAddModal(false); resetImageFields(); }} style={{ padding: "8px 16px", background: "none", border: `1px solid ${colors.border}`, color: colors.textMuted, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={showAddModal ? handleAdd : saveModal}
                style={{ padding: "8px 16px", background: colors.gold, color: "#0a0a0a", border: "none", cursor: "pointer" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
