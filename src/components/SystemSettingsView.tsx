import React, { useState, useEffect } from "react";
import { Save, Settings } from "lucide-react";

export function SystemSettingsView({
  token,
  colors,
  onToast,
  initialSettings,
}: {
  token: string;
  colors: Record<string, string>;
  onToast: (msg: string, type?: "success" | "error") => void;
  initialSettings: any;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    escalation_warning_mins: 10,
    escalation_critical_mins: 20,
    loyalty_multiplier_tier1: 1.0,
    loyalty_multiplier_tier2: 1.5,
    loyalty_multiplier_tier3: 2.0,
    loyalty_multiplier_tier4: 3.0,
    loyalty_multiplier_tier5: 4.0,
  });

  // Admin feature preferences (stored in localStorage for persistence)
  const [toggleSystemActivities, setToggleSystemActivities] = useState(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("pms_toggle_system_activities");
      return v !== null ? v === "true" : true;
    }
    return true;
  });
  const [dashboardCardDensity, setDashboardCardDensity] = useState(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("pms_dashboard_card_density");
      return v || "glance";
    }
    return "glance";
  });
  const [chatNotificationSound, setChatNotificationSound] = useState(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("pms_chat_notification_sound");
      return v !== null ? v === "true" : true;
    }
    return true;
  });

  useEffect(() => {
    if (initialSettings) {
      setFormData((prev) => ({
        ...prev,
        ...initialSettings,
      }));

      // Sync admin preferences from database settings
      if (initialSettings.admin_show_activities !== undefined) {
        const val = initialSettings.admin_show_activities;
        setToggleSystemActivities(val === true || val === 1 || val === "true" || val === "1");
      }
      if (initialSettings.admin_dashboard_density) {
        setDashboardCardDensity(initialSettings.admin_dashboard_density);
      }
      if (initialSettings.admin_chat_sound !== undefined) {
        const val = initialSettings.admin_chat_sound;
        setChatNotificationSound(val === true || val === 1 || val === "true" || val === "1");
      }
    }
  }, [initialSettings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save local preferences
      localStorage.setItem("pms_toggle_system_activities", String(toggleSystemActivities));
      localStorage.setItem("pms_dashboard_card_density", dashboardCardDensity);
      localStorage.setItem("pms_chat_notification_sound", String(chatNotificationSound));

      // Build payload for D1 settings (including the preferences so they sync if needed)
      const payload = {
        ...formData,
        admin_show_activities: toggleSystemActivities ? 1 : 0,
        admin_dashboard_density: dashboardCardDensity,
        admin_chat_sound: chatNotificationSound ? 1 : 0,
      };

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as any;
      if (data.success) {
        onToast("System configurations saved successfully", "success");
      } else {
        onToast(data.error || "Failed to save settings", "error");
      }
    } catch (error) {
      onToast("An error occurred while saving", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value),
    }));
  };

  return (
    <div style={{ padding: 24, background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Settings size={24} color={colors.gold} />
        <h2 style={{ margin: 0, fontSize: 24, color: colors.text }}>System Configuration</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {/* Escalation Timers */}
        <div style={{ padding: 20, background: colors.surface2, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <h3 style={{ margin: "0 0 16px", color: colors.text, fontSize: 16 }}>Escalation Timers</h3>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: "0 0 20px", lineHeight: 1.5 }}>
            Configure how long (in minutes) before a pending order or request changes status colors.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                Warning Threshold (mins)
              </label>
              <input
                type="number"
                name="escalation_warning_mins"
                value={formData.escalation_warning_mins}
                onChange={handleChange}
                style={{
                  width: "100%", padding: "10px 12px", background: colors.background,
                  border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 6,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                Critical Threshold (mins)
              </label>
              <input
                type="number"
                name="escalation_critical_mins"
                value={formData.escalation_critical_mins}
                onChange={handleChange}
                style={{
                  width: "100%", padding: "10px 12px", background: colors.background,
                  border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 6,
                }}
              />
            </div>
          </div>
        </div>

        {/* Loyalty Multipliers */}
        <div style={{ padding: 20, background: colors.surface2, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <h3 style={{ margin: "0 0 16px", color: colors.text, fontSize: 16 }}>Loyalty Point Multipliers</h3>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: "0 0 20px", lineHeight: 1.5 }}>
            Adjust the multiplier applied to the base loyalty point calculation based on room tier.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                Tier 1 (Classic)
              </label>
              <input
                type="number"
                step="0.1"
                name="loyalty_multiplier_tier1"
                value={formData.loyalty_multiplier_tier1}
                onChange={handleChange}
                style={{
                  width: "100%", padding: "10px 12px", background: colors.background,
                  border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 6,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                Tier 2 (Superior)
              </label>
              <input
                type="number"
                step="0.1"
                name="loyalty_multiplier_tier2"
                value={formData.loyalty_multiplier_tier2}
                onChange={handleChange}
                style={{
                  width: "100%", padding: "10px 12px", background: colors.background,
                  border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 6,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                Tier 3 (Executive)
              </label>
              <input
                type="number"
                step="0.1"
                name="loyalty_multiplier_tier3"
                value={formData.loyalty_multiplier_tier3}
                onChange={handleChange}
                style={{
                  width: "100%", padding: "10px 12px", background: colors.background,
                  border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 6,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                Tier 4 (Business Suite)
              </label>
              <input
                type="number"
                step="0.1"
                name="loyalty_multiplier_tier4"
                value={formData.loyalty_multiplier_tier4}
                onChange={handleChange}
                style={{
                  width: "100%", padding: "10px 12px", background: colors.background,
                  border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 6,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                Tier 5 (Executive Suite)
              </label>
              <input
                type="number"
                step="0.1"
                name="loyalty_multiplier_tier5"
                value={formData.loyalty_multiplier_tier5}
                onChange={handleChange}
                style={{
                  width: "100%", padding: "10px 12px", background: colors.background,
                  border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 6,
                }}
              />
            </div>
          </div>
        </div>

        {/* Interface & Sound Preferences */}
        <div style={{ padding: 20, background: colors.surface2, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <h3 style={{ margin: "0 0 16px", color: colors.text, fontSize: 16 }}>Interface & Sound Preferences</h3>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: "0 0 20px", lineHeight: 1.5 }}>
            Configure dashboard display components, layout density, and auditory alert behaviors.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* Toggle System Activities */}
            <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between", justifyContent: "space-between" }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: colors.text }}>System Activities Panel</label>
                <span style={{ fontSize: 11, color: colors.textMuted }}>Show recent activities log on dashboard</span>
              </div>
              <input
                type="checkbox"
                checked={toggleSystemActivities}
                onChange={e => setToggleSystemActivities(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: colors.gold }}
              />
            </div>

            {/* Dashboard Card Density */}
            <div>
              <label style={{ display: "block", fontSize: 13, color: colors.text, marginBottom: 6 }}>
                Dashboard Card Density
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["glance", "compact"] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDashboardCardDensity(mode)}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
                      background: dashboardCardDensity === mode ? colors.gold : colors.surface,
                      color: dashboardCardDensity === mode ? "#0a0a0a" : colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {mode === "glance" ? "Glance Mode" : "Compact"}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Notification Sound Alerts */}
            <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between", justifyContent: "space-between" }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: colors.text }}>Auditory Chat Alerts</label>
                <span style={{ fontSize: 11, color: colors.textMuted }}>Play alert sound on new guest messages</span>
              </div>
              <input
                type="checkbox"
                checked={chatNotificationSound}
                onChange={e => setChatNotificationSound(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: colors.gold }}
              />
            </div>

          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            background: colors.gold,
            color: "#000",
            border: "none",
            padding: "12px 24px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: loading ? 0.7 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <Save size={18} />
          {loading ? "Saving..." : "Save Configurations"}
        </button>
      </div>
    </div>
  );
}
