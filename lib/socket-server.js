import { authenticateSocket } from "./socket-auth.mjs";

let ioInstance = null;

export function initSocketServer(io) {
  ioInstance = io;

  io.use(async (socket, next) => {
    const user = await authenticateSocket(socket.handshake);
    if (!user) {
      return next(new Error("Unauthorized"));
    }
    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    if (!user) return;

    // Join user-specific room for notifications
    socket.join(`user:${user.id}`);

    if (user.role === "vendor" && user.vendorSlug) {
      socket.join(`vendor:${user.vendorSlug}`);
    }

    socket.on("join_conversation", (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    // ── WebRTC voice call signaling ───────────────────────────────────────────

    socket.on("call:initiate", (payload) => {
      if (!payload?.recipientId) return;
      const targetRoom = payload.recipientType === "vendor" ? `vendor:${payload.recipientId}` : `user:${payload.recipientId}`;
      ioInstance.to(targetRoom).emit("call:incoming", {
        callerId: payload.callerId || user.id,
        callerName: payload.callerName || user.name || "Caller",
        callerAvatar: payload.callerAvatar || "",
        callerRole: payload.callerRole || user.role,
        signal: payload.signal,
        conversationId: payload.conversationId
      });
    });

    socket.on("call:accept", (payload) => {
      if (!payload?.callerId) return;
      ioInstance.to(`user:${payload.callerId}`).emit("call:accepted", {
        signal: payload.signal,
        recipientId: user.id
      });
    });

    socket.on("call:reject", (payload) => {
      if (!payload?.callerId) return;
      ioInstance.to(`user:${payload.callerId}`).emit("call:rejected", {
        recipientId: user.id
      });
    });

    socket.on("call:end", (payload) => {
      if (!payload?.recipientId) return;
      const targetRoom = payload.recipientType === "vendor" ? `vendor:${payload.recipientId}` : `user:${payload.recipientId}`;
      ioInstance.to(targetRoom).emit("call:ended", {
        duration: payload.duration || 0,
        endedBy: user.id
      });
    });

    socket.on("call:ice-candidate", (payload) => {
      if (!payload?.recipientId || !payload.candidate) return;
      const targetRoom = payload.recipientType === "vendor" ? `vendor:${payload.recipientId}` : `user:${payload.recipientId}`;
      ioInstance.to(targetRoom).emit("call:ice-candidate", {
        candidate: payload.candidate,
        senderId: user.id
      });
    });

    // ── Vendor availability status ────────────────────────────────────────────

    socket.on("vendor:status_change", (payload) => {
      if (user.role !== "vendor" || !user.vendorSlug || !payload?.status) return;
      ioInstance
        .to(`vendor:${user.vendorSlug}`)
        .emit("vendor:status_updated", {
          vendorId: user.vendorSlug,
          status: payload.status
        });
    });

    socket.on("disconnect", () => {
      // Rooms are cleaned up automatically by Socket.IO
    });
  });
}

export function broadcastMessage(conversationId, messagePayload) {
  if (!ioInstance || !conversationId) return;
  ioInstance.to(`conversation:${conversationId}`).emit("message:new", {
    conversationId,
    ...messagePayload
  });
}

export function broadcastNotification(targetUserId, notificationPayload) {
  if (!ioInstance || !targetUserId) return;
  ioInstance.to(`user:${targetUserId}`).emit("notification:new", notificationPayload);
}

export function broadcastVendorNotification(vendorSlug, notificationPayload) {
  if (!ioInstance || !vendorSlug) return;
  ioInstance.to(`vendor:${vendorSlug}`).emit("notification:new", notificationPayload);
}

export function broadcastAppointmentConfirmed(userId, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit("appointment:confirmed", payload);
}

export function broadcastAppointmentCancelled(userId, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit("appointment:cancelled", payload);
}

export function broadcastAppointmentReminder(userId, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit("appointment:reminder", payload);
}

export function broadcastIncomingCall(recipientId, payload) {
  if (!ioInstance || !recipientId) return;
  ioInstance.to(`user:${recipientId}`).emit("call:incoming", payload);
}

export function broadcastCallAccepted(callerId, payload) {
  if (!ioInstance || !callerId) return;
  ioInstance.to(`user:${callerId}`).emit("call:accepted", payload);
}

export function broadcastCallRejected(callerId, payload) {
  if (!ioInstance || !callerId) return;
  ioInstance.to(`user:${callerId}`).emit("call:rejected", payload);
}

export function broadcastCallEnded(recipientId, payload) {
  if (!ioInstance || !recipientId) return;
  ioInstance.to(`user:${recipientId}`).emit("call:ended", payload);
}

export function broadcastVendorStatus(vendorSlug, payload) {
  if (!ioInstance || !vendorSlug) return;
  ioInstance.to(`vendor:${vendorSlug}`).emit("vendor:status_updated", payload);
}
