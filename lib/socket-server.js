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
