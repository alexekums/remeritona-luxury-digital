import { useState } from "react";
import { changeStaffPassword } from "@/functions/adminAuth";
import { ShieldCheck } from "lucide-react";

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

export function StaffProfileView({ token, colors, onToast }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <ShieldCheck size={48} color={colors.gold} style={{ marginBottom: 16 }} />
        <h2 style={{ color: colors.gold, fontSize: 24, fontWeight: 400, letterSpacing: "0.05em", margin: "0 0 8px" }}>
          Security Settings
        </h2>
        <p style={{ color: colors.textMuted, fontSize: 14 }}>
          Update your account password
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ display: "block", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{
              width: "100%", padding: 12, background: colors.surface,
              border: `1px solid ${colors.border}`, color: colors.text,
              fontSize: 14, outline: "none", fontFamily: "Georgia, serif"
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              width: "100%", padding: 12, background: colors.surface,
              border: `1px solid ${colors.border}`, color: colors.text,
              fontSize: 14, outline: "none", fontFamily: "Georgia, serif"
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              width: "100%", padding: 12, background: colors.surface,
              border: `1px solid ${colors.border}`, color: colors.text,
              fontSize: 14, outline: "none", fontFamily: "Georgia, serif"
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 12, background: colors.gold, color: "#0a0a0a",
            border: "none", padding: "14px 24px", fontSize: 12, cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif",
            opacity: loading ? 0.7 : 1, fontWeight: 600
          }}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
