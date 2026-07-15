import { useState } from "react";
import { changeStaffPassword } from "@/functions/adminAuth";
import { ShieldCheck, Settings } from "lucide-react";

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
  onlySecurity?: boolean;
  onlyDisplay?: boolean;
  username?: string;
};

export function StaffProfileView({ token, colors, onToast, onlySecurity, onlyDisplay, username = "admin" }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // User custom preferences
  const [themeMode, setThemeMode] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("remeritona_admin_theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("pms_time_format") as "12h" | "24h") || "12h";
    }
    return "12h";
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      onToast("Please fill out all fields", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      onToast("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 4) {
      onToast("Password must be at least 4 characters", "error");
      return;
    }

    setLoading(true);
    try {
      const result = await changeStaffPassword({
        data: { token, currentPassword, newPassword }
      });

      if (result.success) {
        onToast("Password updated successfully", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        onToast(result.error || "Failed to update password", "error");
      }
    } catch (err) {
      onToast("An unexpected error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Save locally first
      localStorage.setItem("remeritona_admin_theme", themeMode);
      localStorage.setItem("pms_time_format", timeFormat);

      // Save to D1 database key-value store
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          [`user_pref_${username}_theme`]: themeMode,
          [`user_pref_${username}_time_format`]: timeFormat,
        }),
      });

      const data = await res.json() as any;
      if (data.success) {
        onToast("Display preferences updated successfully", "success");
        // Trigger window storage event
        window.dispatchEvent(new Event("storage"));
      } else {
        onToast(data.error || "Failed to update preferences", "error");
      }
    } catch (err) {
      onToast("Error saving preferences", "error");
    }
  };

  const showSecurity = onlySecurity || (!onlySecurity && !onlyDisplay);
  const showDisplay = onlyDisplay || (!onlySecurity && !onlyDisplay);

  return (
    <div style={{ 
      maxWidth: (onlySecurity || onlyDisplay) ? 600 : 1000, 
      margin: "0 auto", 
      padding: (onlySecurity || onlyDisplay) ? 0 : 40, 
      display: "grid", 
      gridTemplateColumns: (onlySecurity || onlyDisplay) ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))", 
      gap: 40 
    }}>
      
      {/* CARD 1: SECURITY SETTINGS */}
      {showSecurity && (
        <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: 32, borderRadius: 8 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <ShieldCheck size={36} color={colors.gold} style={{ marginBottom: 12 }} />
            <h2 style={{ color: colors.gold, fontSize: 20, fontWeight: 400, letterSpacing: "0.05em", margin: "0 0 6px" }}>
              Security Settings
            </h2>
            <p style={{ color: colors.textMuted, fontSize: 13 }}>
              Update your account password
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: "100%", padding: 10, background: colors.surface,
                  border: `1px solid ${colors.border}`, color: colors.text,
                  fontSize: 13, outline: "none", fontFamily: "Georgia, serif"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: "100%", padding: 10, background: colors.surface,
                  border: `1px solid ${colors.border}`, color: colors.text,
                  fontSize: 13, outline: "none", fontFamily: "Georgia, serif"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%", padding: 10, background: colors.surface,
                  border: `1px solid ${colors.border}`, color: colors.text,
                  fontSize: 13, outline: "none", fontFamily: "Georgia, serif"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 10, background: colors.gold, color: "#0a0a0a",
                border: "none", padding: "12px 20px", fontSize: 11, cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif",
                opacity: loading ? 0.7 : 1, fontWeight: 600
              }}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      )}

      {/* CARD 2: WORKSPACE PREFERENCES */}
      {showDisplay && (
        <div style={{ background: colors.surface2, border: `1px solid ${colors.border}`, padding: 32, borderRadius: 8 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Settings size={36} color={colors.gold} style={{ marginBottom: 12 }} />
            <h2 style={{ color: colors.gold, fontSize: 20, fontWeight: 400, letterSpacing: "0.05em", margin: "0 0 6px" }}>
              Workspace Preferences
            </h2>
            <p style={{ color: colors.textMuted, fontSize: 13 }}>
              Customize your layout and display style
            </p>
          </div>

          <form onSubmit={handleSavePreferences} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* System Theme Mode */}
            <div>
              <label style={{ display: "block", color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                System Theme Mode
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["dark", "light"] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setThemeMode(mode)}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
                      background: themeMode === mode ? colors.gold : colors.surface,
                      color: themeMode === mode ? "#0a0a0a" : colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {mode === "dark" ? "Dark Mode" : "Light Mode"}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Display Format */}
            <div>
              <label style={{ display: "block", color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Time Display Format
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["12h", "24h"] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTimeFormat(fmt)}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
                      background: timeFormat === fmt ? colors.gold : colors.surface,
                      color: timeFormat === fmt ? "#0a0a0a" : colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {fmt === "12h" ? "12-Hour (AM/PM)" : "24-Hour"}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: 10, background: colors.gold, color: "#0a0a0a",
                border: "none", padding: "12px 20px", fontSize: 11, cursor: "pointer",
                letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif",
                fontWeight: 600
              }}
            >
              Save Preferences
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
