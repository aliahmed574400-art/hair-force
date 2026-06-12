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

/**
 * Group conversations by a shared key (e.g. vendorSlug for clients, clientId for vendors).
 * Returns one representative conversation per group (the most recent) plus the ids of
 * every raw conversation in the group and the aggregated unread count.
 */
export function groupConversations(conversations, keyFn, unreadKey) {
  const groups = new Map();

  for (const conversation of conversations || []) {
    const key = keyFn(conversation) || conversation.id;
    if (!groups.has(key)) {
      groups.set(key, {
        conversation,
        ids: [conversation.id],
        unread: Number(conversation[unreadKey] || 0)
      });
      continue;
    }

    const group = groups.get(key);
    group.ids.push(conversation.id);
    group.unread += Number(conversation[unreadKey] || 0);

    const currentTime = new Date(
      conversation.lastMessageAt || conversation.createdAt || 0
    ).getTime();
    const existingTime = new Date(
      group.conversation.lastMessageAt || group.conversation.createdAt || 0
    ).getTime();

    if (currentTime > existingTime) {
      group.conversation = conversation;
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group.conversation,
    relatedIds: group.ids,
    aggregatedUnread: group.unread
  }));
}

export function getConversationGroupById(displayedConversations, conversationId) {
  return (
    displayedConversations.find((conversation) => conversation.id === conversationId) || null
  );
}

export function isInConversationGroup(displayedConversations, activeId, incomingId) {
  const active = getConversationGroupById(displayedConversations, activeId);
  if (!active || !active.relatedIds) return activeId === incomingId;
  return active.relatedIds.includes(incomingId);
}
