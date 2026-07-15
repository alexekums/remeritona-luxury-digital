import React, { useState, useMemo, useEffect } from "react";
import { Search, ShieldAlert, Award, Star, RefreshCw, ShoppingCart, Trash2, Plus, Minus, Check, UserCheck, Tag, Settings, Printer } from "lucide-react";

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
  onToast: (message: string, type?: "success" | "error") => void;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image: string;
};

export function BarPosView({ token, colors, onToast }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<"all" | "drinks" | "food">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dynamic Inventory States
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Guest Link States
  const [roomNumber, setRoomNumber] = useState("");
  const [linkingGuest, setLinkingGuest] = useState(false);
  const [linkedGuest, setLinkedGuest] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Transaction state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [zReportData, setZReportData] = useState<any | null>(null);
  const [zReportLoading, setZReportLoading] = useState(false);

  const handlePrintZReport = async () => {
    setZReportLoading(true);
    try {
      const res = await fetch("/api/pms/shift-cashout", {
        headers: { "X-Admin-Token": token, Authorization: `Bearer ${token}` }
      });
      const data = await res.json() as any;
      if (data.success) {
        setZReportData(data);
        setTimeout(() => {
          window.print();
          setZReportData(null); // Clear after printing
        }, 500);
      } else {
        onToast(data.error || "Failed to fetch shift cashout", "error");
      }
    } catch (err) {
      onToast("Error fetching shift cashout", "error");
    } finally {
      setZReportLoading(false);
    }
  };

  // Last transaction details for printing receipts
  const [lastTransaction, setLastTransaction] = useState<{
    cart: CartItem[];
    linkedGuest: any | null;
    roomNumber: string;
    subtotal: number;
    discountRate: number;
    discountAmount: number;
    total: number;
    loyaltyPointsEarned: number;
  } | null>(null);

  // Fetch Menu Items from Database
  const fetchMenuItems = async () => {
    setMenuLoading(true);
    try {
      const res = await fetch("/api/menu-items", {
        headers: {
          "X-Admin-Token": token,
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json() as any;
      if (data.results) {
        const filtered = data.results.filter((item: any) => item.category === "drinks" || item.category === "food");
        setMenuItems(filtered);
      }
    } catch (err) {
      onToast("Failed to fetch menu items", "error");
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMenuItems();
    }
  }, [token]);

  const getCategoryIcon = (category: string) => {
    if (category === "drinks") return "🍹";
    return "🍢";
  };

  // Convert menu items to POS format
  const products = useMemo(() => {
    return menuItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      image: item.image_url || getCategoryIcon(item.category),
      available: item.available !== 0
    }));
  }, [menuItems]);

  // Filter products based on search & category tab
  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      // Must be available for POS sales
      if (!prod.available) return false;
      
      const matchesCategory = activeCategory === "all" || prod.category === activeCategory;
      const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // Cart operations
  const addToCart = (product: typeof products[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Subtotal calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // Determine loyalty details based on tier
  const getTierDetails = (tierName: string) => {
    const name = String(tierName || "").trim().toLowerCase();
    if (name === "platinum" || name === "tier 4" || name === "4") {
      return {
        label: "Platinum Elite",
        discount: 5,
        color: "linear-gradient(135deg, #e5e5e5 0%, #737373 100%)",
        textColor: "#000",
        message: "Platinum: 5% Discount Applied",
        icon: <Award size={14} />
      };
    }
    if (name === "gold" || name === "tier 3" || name === "3") {
      return {
        label: "Gold Privilege",
        discount: 3,
        color: "linear-gradient(135deg, #FFE082 0%, #FFB300 100%)",
        textColor: "#000",
        message: "Gold: 3% Discount Applied",
        icon: <Star size={14} />
      };
    }
    if (name === "silver" || name === "tier 2" || name === "2") {
      return {
        label: "Silver",
        discount: 2,
        color: "linear-gradient(135deg, #cfd8dc 0%, #90a4ae 100%)",
        textColor: "#000",
        message: "Silver: 2% Discount Applied",
        icon: <Award size={14} />
      };
    }
    return null;
  };

  const tier = linkedGuest ? getTierDetails(linkedGuest.tier) : null;
  const discountRate = tier ? tier.discount : 0;
  const discountAmount = Math.round((subtotal * discountRate) / 100);
  const total = subtotal - discountAmount;

  // loyalty points: 1 point per 1000 Naira spent after discounts
  const loyaltyPointsEarned = Math.floor(total / 1000);

  // Link Guest Room Verification call
  const handleVerifyGuest = async () => {
    const queryRoom = roomNumber.trim();
    if (!queryRoom) return;

    setLinkingGuest(true);
    setVerificationError(null);

    try {
      const res = await fetch(`/api/pms/room-status?roomNumber=${encodeURIComponent(queryRoom)}`, {
        headers: {
          "X-Admin-Token": token,
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json() as any;
      if (data.success && data.guest) {
        setLinkedGuest(data.guest);
        onToast(`Room ${queryRoom} verified: ${data.guest.name}`, "success");
      } else {
        setLinkedGuest(null);
        setVerificationError(data.error || "Room is vacant or guest not found");
        onToast(data.error || "Guest not found", "error");
      }
    } catch (err) {
      setLinkedGuest(null);
      setVerificationError("Error checking room status");
      onToast("Error checking room status", "error");
    } finally {
      setLinkingGuest(false);
    }
  };

  // Unlink Guest
  const handleUnlinkGuest = () => {
    setLinkedGuest(null);
    setRoomNumber("");
    setVerificationError(null);
    onToast("Guest room unlinked", "success");
  };

  // Complete POS Transaction
  const handleCompleteTransaction = async (paymentMethod?: string) => {
    if (cart.length === 0) {
      onToast("Cannot complete transaction with an empty cart", "error");
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/pms/room-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomNumber: linkedGuest ? roomNumber.trim() : undefined,
          totalAmount: total,
          pointsEarned: linkedGuest ? loyaltyPointsEarned : 0,
          paymentMethod: paymentMethod || "ROOM_CHARGE",
          subtotal: subtotal,
          discount: discountAmount,
          cartItems: JSON.stringify(cart)
        }),
      });

      const data = await res.json() as any;
      if (data.success) {
        setLastTransaction({
          cart: [...cart],
          linkedGuest: linkedGuest ? { ...linkedGuest } : null,
          roomNumber: roomNumber.trim(),
          subtotal,
          discountRate: discountRate,
          discountAmount: discountAmount,
          total,
          loyaltyPointsEarned: linkedGuest ? loyaltyPointsEarned : 0,
        });

        onToast(
          linkedGuest 
            ? `Transaction Completed! ${loyaltyPointsEarned} Loyalty Points credited to ${linkedGuest.name}.`
            : "Walk-in sale completed successfully",
          "success"
        );
        
        clearCart();
        setRoomNumber("");
        setLinkedGuest(null);
        setVerificationError(null);

        setTimeout(() => {
          window.print();
        }, 100);
      } else {
        onToast(data.error || "Failed to complete transaction", "error");
      }
    } catch (err) {
      onToast("Error completing transaction", "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatNaira = (amount: number) => {
    return "₦" + amount.toLocaleString("en-US");
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 0", color: colors.text }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ color: colors.gold, fontSize: 22, fontWeight: 400, margin: "0 0 4px", letterSpacing: "0.05em" }}>
            Point of Sale Terminal
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 12 }}>
            Bar & F&B service order manager with integrated guest room checks and loyalty discount engines.
          </p>
        </div>
        {linkedGuest && (
          <div style={{
            background: tier?.color, color: tier?.textColor,
            padding: "6px 12px", borderRadius: 4, display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 600, textTransform: "uppercase"
          }}>
            <UserCheck size={14} />
            <span>Room {roomNumber} Linked</span>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 24, alignItems: "flex-start" }}>
        
        {/* LEFT COLUMN: PRODUCT CATALOG */}
        <div>
          
          {/* Filters & Search Row */}
          <div style={{ 
            background: colors.surface, border: `1px solid ${colors.border}`, 
            padding: 16, borderRadius: 8, marginBottom: 20,
            display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center"
          }}>
            
            {/* Category tabs */}
            <div style={{ display: "flex", gap: 8 }}>
              {(["all", "drinks", "food"] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    background: activeCategory === cat ? colors.gold : colors.surface2,
                    color: activeCategory === cat ? "#0a0a0a" : colors.text,
                    border: `1px solid ${colors.border}`,
                    padding: "8px 16px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input & Manage Inventory Button */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", maxWidth: 400 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  style={{
                    width: "100%", padding: "8px 12px 8px 36px", background: colors.surface2,
                    border: `1px solid ${colors.border}`, color: colors.text,
                    borderRadius: 6, fontSize: 13, outline: "none"
                  }}
                />
                <Search size={14} color={colors.textMuted} style={{ position: "absolute", left: 12, top: 11 }} />
              </div>
              
              <button
                type="button"
                onClick={handlePrintZReport}
                disabled={zReportLoading}
                style={{
                  background: colors.surface2, color: colors.text,
                  border: `1px solid ${colors.border}`, padding: "8px 12px", borderRadius: 6,
                  fontSize: 12, cursor: zReportLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
                  fontWeight: 600, opacity: zReportLoading ? 0.7 : 1
                }}
              >
                {zReportLoading ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} />} 
                Z-Report
              </button>
              
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                style={{
                  background: colors.surface2, color: colors.text,
                  border: `1px solid ${colors.border}`, padding: "8px 12px", borderRadius: 6,
                  fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  fontWeight: 600
                }}
              >
                <Settings size={14} /> Inventory
              </button>
            </div>

          </div>

          {/* Product Grid */}
          {menuLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: colors.textMuted }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
              <span>Loading POS products...</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
              {filteredProducts.map(prod => (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  style={{
                    background: colors.surface, border: `1px solid ${colors.border}`,
                    borderRadius: 8, padding: 16, textAlign: "left", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 12, position: "relative",
                    transition: "transform 0.2s, border-color 0.2s",
                    outline: "none"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.gold;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div style={{ 
                    fontSize: 28, width: 48, height: 48, background: colors.surface2,
                    borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" 
                  }}>
                    {prod.image}
                  </div>

                  <div>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 500, color: colors.text, lineHeight: "1.4" }}>
                      {prod.name}
                    </h3>
                    <span style={{ display: "block", marginTop: 4, fontSize: 14, color: colors.gold, fontWeight: 600 }}>
                      {formatNaira(prod.price)}
                    </span>
                  </div>
                  
                  <div style={{ 
                    position: "absolute", right: 12, bottom: 12, width: 24, height: 24,
                    borderRadius: "50%", background: colors.surface2, border: `1px solid ${colors.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: colors.textMuted
                  }}>
                    <Plus size={12} />
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: CART & CHECKOUT */}
        <div>
          
          <div style={{ 
            background: colors.surface, border: `1px solid ${colors.border}`, 
            borderRadius: 8, padding: 20, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            position: "sticky", top: 84
          }}>
            
            {/* Cart Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${colors.border}`, paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShoppingCart size={16} color={colors.gold} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Active Cart ({cart.length})</span>
              </div>
              {cart.length > 0 && (
                <button 
                  onClick={clearCart}
                  style={{ background: "none", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>

            {/* Cart List Items */}
            <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: colors.textMuted, fontSize: 13 }}>
                  Cart is empty. Tap items to add.
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {item.name}
                      </p>
                      <span style={{ fontSize: 11, color: colors.textMuted }}>{formatNaira(item.price)}</span>
                    </div>

                    {/* Quantity Controls */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 4, padding: "2px 6px" }}>
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{ background: "none", border: "none", color: colors.text, cursor: "pointer", padding: 2 }}
                      >
                        <Minus size={10} />
                      </button>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 16, textAlign: "center" }}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{ background: "none", border: "none", color: colors.text, cursor: "pointer", padding: 2 }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* OPTIONAL: LINK GUEST ROOM */}
            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 16, marginBottom: 20 }}>
              <span style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: colors.textMuted, marginBottom: 10 }}>
                Link Guest Room (Optional Discount)
              </span>

              {!linkedGuest ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={e => setRoomNumber(e.target.value)}
                    placeholder="Room Num (e.g. 104)"
                    style={{
                      flex: 1, padding: "8px 12px", background: colors.surface2,
                      border: `1px solid ${colors.border}`, color: colors.text,
                      borderRadius: 4, fontSize: 12, outline: "none"
                    }}
                  />
                  <button
                    onClick={handleVerifyGuest}
                    disabled={linkingGuest || !roomNumber}
                    style={{
                      background: colors.gold, color: "#0a0a0a",
                      border: "none", padding: "8px 14px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                      fontWeight: 600, textTransform: "uppercase", opacity: (linkingGuest || !roomNumber) ? 0.6 : 1
                    }}
                  >
                    {linkingGuest ? <RefreshCw size={12} className="animate-spin" /> : "Link"}
                  </button>
                </div>
              ) : (
                <div style={{ 
                  background: colors.surface2, border: `1px solid ${colors.border}`, 
                  padding: 12, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" 
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{linkedGuest.name}</p>
                    <span style={{ fontSize: 11, color: colors.gold }}>
                      {tier?.label} (Points: {linkedGuest.points})
                    </span>
                  </div>
                  <button 
                    onClick={handleUnlinkGuest}
                    style={{ background: "none", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer" }}
                  >
                    Unlink
                  </button>
                </div>
              )}

              {verificationError && (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                  <ShieldAlert size={12} /> {verificationError}
                </p>
              )}
            </div>

            {/* BILLING CALCULATIONS */}
            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: colors.textMuted }}>Cart Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </div>

              {discountRate > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#22c55e" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Tag size={12} /> Loyalty Discount ({discountRate}%)
                  </span>
                  <span>-{formatNaira(discountAmount)}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, borderTop: `1px solid ${colors.border}44`, paddingTop: 10 }}>
                <span>Total Charge</span>
                <span style={{ color: colors.gold }}>{formatNaira(total)}</span>
              </div>

              {linkedGuest && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: colors.textMuted, borderTop: `1px dashed ${colors.border}44`, paddingTop: 8 }}>
                  <span>Loyalty Points Earned</span>
                  <span style={{ color: colors.gold, fontWeight: 600 }}>+{loyaltyPointsEarned} pts</span>
                </div>
              )}

            </div>

            {/* CHECKOUT BUTTONS */}
            {linkedGuest ? (
                <button
                onClick={() => handleCompleteTransaction("ROOM_CHARGE")}
                disabled={checkoutLoading || cart.length === 0}
                style={{
                    background: cart.length === 0 ? colors.border : colors.gold,
                    color: "#0a0a0a",
                    border: "none", width: "100%", padding: "14px", borderRadius: 6,
                    fontSize: 12, fontWeight: 700, cursor: (checkoutLoading || cart.length === 0) ? "not-allowed" : "pointer",
                    letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif",
                    opacity: checkoutLoading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
                >
                {checkoutLoading ? (
                    <>
                    <RefreshCw size={14} className="animate-spin" />
                    Processing Checkout...
                    </>
                ) : (
                    <>
                    <Check size={14} />
                    Charge Room & Save Points
                    </>
                )}
                </button>
            ) : (
                <div style={{ display: "flex", gap: 12 }}>
                    <button
                        onClick={() => handleCompleteTransaction("CASH")}
                        disabled={checkoutLoading || cart.length === 0}
                        style={{
                            background: cart.length === 0 ? colors.border : colors.gold,
                            color: "#0a0a0a",
                            border: "none", flex: 1, padding: "14px", borderRadius: 6,
                            fontSize: 12, fontWeight: 700, cursor: (checkoutLoading || cart.length === 0) ? "not-allowed" : "pointer",
                            letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "Georgia, serif",
                            opacity: checkoutLoading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                        }}
                    >
                        {checkoutLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        Cash
                    </button>
                    <button
                        onClick={() => handleCompleteTransaction("CARD")}
                        disabled={checkoutLoading || cart.length === 0}
                        style={{
                            background: cart.length === 0 ? colors.border : colors.text,
                            color: colors.surface,
                            border: "none", flex: 1, padding: "14px", borderRadius: 6,
                            fontSize: 12, fontWeight: 700, cursor: (checkoutLoading || cart.length === 0) ? "not-allowed" : "pointer",
                            letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "Georgia, serif",
                            opacity: checkoutLoading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                        }}
                    >
                        {checkoutLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        Card
                    </button>
                </div>
            )}

          </div>

        </div>

      </div>

      {/* LOCAL SETTINGS MODAL */}
      {showSettings && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "flex-end", zIndex: 1000
        }}>
          <div style={{
            width: "100%", maxWidth: 480, background: colors.surface,
            borderLeft: `1px solid ${colors.border}`, height: "100%",
            display: "flex", flexDirection: "column", boxSizing: "border-box"
          }}>
            {/* Header */}
            <div style={{
              padding: 24, borderBottom: `1px solid ${colors.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: 0, color: colors.gold, fontSize: 18, fontWeight: 400, letterSpacing: "0.05em" }}>
                  POS Inventory Manager
                </h3>
                <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: 11 }}>
                  Create and manage bar POS products.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                style={{
                  background: "none", border: "none", color: colors.textMuted,
                  fontSize: 20, cursor: "pointer"
                }}
              >
                &times;
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Form 1: Add New Product */}
              <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16 }}>
                <h4 style={{ margin: "0 0 16px", color: colors.text, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Add New Item
                </h4>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const name = fd.get("name") as string;
                  const price = Number(fd.get("price"));
                  const category = fd.get("category") as string;
                  
                  if (!name || !price) {
                    onToast("Name and price are required", "error");
                    return;
                  }

                  try {
                    const res = await fetch("/api/menu-items", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Admin-Token": token,
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({ name, price, category, available: 1 })
                    });
                    const data = await res.json() as any;
                    if (data.success) {
                      onToast("Product created successfully", "success");
                      (e.target as HTMLFormElement).reset();
                      fetchMenuItems();
                    } else {
                      onToast(data.error || "Failed to create product", "error");
                    }
                  } catch (err) {
                    onToast("Error saving product", "error");
                  }
                }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>Item Name</label>
                    <input name="name" type="text" placeholder="e.g. Chapman Cocktail" required style={{ width: "100%", padding: 8, background: colors.surface, border: `1px solid ${colors.border}`, color: colors.text, fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>Price (₦)</label>
                      <input name="price" type="number" placeholder="4000" required style={{ width: "100%", padding: 8, background: colors.surface, border: `1px solid ${colors.border}`, color: colors.text, fontSize: 13, outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>Category</label>
                      <select name="category" required style={{ width: "100%", padding: 8, background: colors.surface, border: `1px solid ${colors.border}`, color: colors.text, fontSize: 13, outline: "none" }}>
                        <option value="drinks">Drinks</option>
                        <option value="food">Food</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" style={{ background: colors.gold, border: "none", color: "#000", fontWeight: 600, padding: 10, cursor: "pointer", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Create Item
                  </button>
                </form>
              </div>

              {/* List of Products (Editable) */}
              <div>
                <h4 style={{ margin: "0 0 16px", color: colors.text, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Existing Products
                </h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {products.map(prod => (
                    <div key={prod.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: colors.surface2, border: `1px solid ${colors.border}`, padding: "12px 16px", borderRadius: 6 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {prod.name} ({prod.category})
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <input
                            type="number"
                            defaultValue={prod.price}
                            onBlur={async (e) => {
                              const newPrice = Number(e.target.value);
                              if (newPrice !== prod.price) {
                                try {
                                  const res = await fetch(`/api/menu-items/${prod.id}`, {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                      "X-Admin-Token": token,
                                      Authorization: `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ price: newPrice })
                                  });
                                  const data = await res.json() as any;
                                  if (data.success) {
                                    onToast("Price updated", "success");
                                    fetchMenuItems();
                                  } else {
                                    onToast(data.error || "Failed to update price", "error");
                                  }
                                } catch (err) {
                                  onToast("Error saving price", "error");
                                }
                              }
                            }}
                            style={{ width: 80, padding: 4, background: colors.surface, border: `1px solid ${colors.border}`, color: colors.text, fontSize: 11, textAlign: "right" }}
                          />
                          <span style={{ fontSize: 11, color: colors.textMuted }}>₦</span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/menu-items/${prod.id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                "X-Admin-Token": token,
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ available: prod.available ? 0 : 1 })
                            });
                            const data = await res.json() as any;
                            if (data.success) {
                              onToast(`Product marked as ${prod.available ? "unavailable" : "available"}`, "success");
                              fetchMenuItems();
                            } else {
                              onToast(data.error || "Failed to update status", "error");
                            }
                          } catch (err) {
                            onToast("Error saving status", "error");
                          }
                        }}
                        style={{
                          background: prod.available ? "#22c55e22" : "#ef444422",
                          border: `1px solid ${prod.available ? "#22c55e55" : "#ef444455"}`,
                          color: prod.available ? "#22c55e" : "#ef4444",
                          padding: "6px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                          cursor: "pointer", textTransform: "uppercase"
                        }}
                      >
                        {prod.available ? "Active" : "Disabled"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Hidden print receipt for 80mm thermal printer */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-receipt-area, #print-receipt-area * {
            visibility: visible !important;
          }
          #print-receipt-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            background: white !important;
            color: black !important;
            padding: 16px;
            font-family: monospace;
          }
        }
      `}} />

      {zReportData && (
        <div id="print-receipt-area" className="hidden print:block bg-white text-black p-4 w-[80mm] font-mono text-[11px] leading-snug">
          <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">RE MERITONA HOTEL</h2>
            <p className="text-[10px] text-gray-500">Z-REPORT (SHIFT CASHOUT)</p>
            <p className="text-[10px] text-gray-500">{new Date().toLocaleString()}</p>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between font-bold">
              <span>CASH SALES:</span>
              <span>{formatNaira(zReportData.totals?.cash || 0)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>CARD SALES:</span>
              <span>{formatNaira(zReportData.totals?.card || 0)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>ROOM CHARGES:</span>
              <span>{formatNaira(zReportData.totals?.roomCharge || 0)}</span>
            </div>
          </div>
          
          <div className="border-t border-dashed border-gray-400 pt-3 mb-4">
            <div className="flex justify-between font-bold text-[13px]">
              <span>TOTAL SHIFT:</span>
              <span>{formatNaira(zReportData.totals?.grandTotal || 0)}</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-500 mt-6 border-t border-dashed border-gray-400 pt-3">
            End of Shift Report
          </div>
        </div>
      )}

      {lastTransaction && !zReportData && (
        <div id="print-receipt-area" className="hidden print:block bg-white text-black p-4 w-[80mm] font-mono text-[11px] leading-snug">
          <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">RE MERITONA HOTEL</h2>
            <p className="text-[10px] text-gray-500">41 Igweliga Street, Abakaliki</p>
            <p className="text-[10px] text-gray-500">Tel: +234 801 234 5678</p>
            <p className="text-[10px] font-bold mt-1">BAR RECEIPT</p>
          </div>

          <div className="space-y-1 mb-3">
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Bill Type:</span>
              <span>{lastTransaction.linkedGuest ? "Charge to Room" : "Cash / Card POS"}</span>
            </div>
            {lastTransaction.linkedGuest && (
              <>
                <div className="flex justify-between">
                  <span>Room Linked:</span>
                  <span>{lastTransaction.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guest Name:</span>
                  <span className="truncate max-w-[150px]">{lastTransaction.linkedGuest.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Loyalty Tier:</span>
                  <span className="uppercase">{lastTransaction.linkedGuest.tier}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-b border-dashed border-gray-400 pb-1 mb-2 font-bold flex justify-between">
            <span>Item Description</span>
            <span className="w-12 text-right font-bold">Qty</span>
            <span className="w-16 text-right font-bold">Total</span>
          </div>

          <div className="space-y-1 border-b border-dashed border-gray-400 pb-2 mb-2">
            {lastTransaction.cart.map(item => (
              <div key={item.id} className="flex justify-between">
                <span className="truncate max-w-[160px]">{item.name}</span>
                <span className="w-12 text-right">x{item.quantity}</span>
                <span className="w-16 text-right">{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 mb-3 text-right">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₦{lastTransaction.subtotal.toLocaleString()}</span>
            </div>
            {lastTransaction.discountAmount > 0 && (
              <div className="flex justify-between text-green-700 font-bold">
                <span>Discount ({lastTransaction.discountRate}%):</span>
                <span>-₦{lastTransaction.discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-300">
              <span>GRAND TOTAL:</span>
              <span>₦{lastTransaction.total.toLocaleString()}</span>
            </div>
            {lastTransaction.linkedGuest && (
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>Loyalty Points Gained:</span>
                <span>+{lastTransaction.loyaltyPointsEarned} pts</span>
              </div>
            )}
          </div>

          <div className="text-center pt-3 border-t border-dashed border-gray-400">
            <p className="font-bold">Thank you for your patronage!</p>
            <p className="text-[8px] text-gray-400 mt-1">Powered by Remeritona PMS v2</p>
          </div>
        </div>
      )}

    </div>
  );
}
