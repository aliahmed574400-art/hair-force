export function parseMediaUrl(text) {
  const url = String(text || "").trim();
  if (!url.startsWith("http") && !url.startsWith("/uploads/")) return null;
  const cleanUrl = url.split("?")[0];
  const ext = cleanUrl.split(".").pop()?.toLowerCase();
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp"];
  const videoExts = ["mp4", "webm", "mov", "mkv", "m4v"];
  if (imageExts.includes(ext)) return { type: "image", url };
  if (videoExts.includes(ext)) return { type: "video", url };
  return null;
}

export function formatMessageTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

export function formatMessageDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function getInitials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("");
}
