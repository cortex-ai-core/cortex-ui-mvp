export function getUserFromToken() {
  // 🛡️ SSR HARD GUARD
  if (typeof window === "undefined") return null;

  try {
    const token = window.localStorage.getItem("token");
    if (!token) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // 🛡️ Safe base64 decode (handles unicode + avoids SSR edge issues)
    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(decoded);

    return payload;
  } catch (err) {
    console.error("❌ Failed to decode token:", err);
    return null;
  }
}
