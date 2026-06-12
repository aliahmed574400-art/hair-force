"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export default function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [forcePolling, setForcePolling] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Prefer WebSocket for low latency, but allow fallback to HTTP long-polling.
    // On http://localhost the WebSocket handshake may not carry our SameSite=Strict
    // session cookie, so if auth fails we recreate the client with polling only.
    const transports = forcePolling ? ["polling"] : ["websocket", "polling"];

    const socket = io({
      path: "/api/socket",
      transports,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setConnected(false);

      if (err.message === "Unauthorized" && !forcePolling) {
        console.warn("WebSocket auth failed; falling back to HTTP long-polling.");
        setForcePolling(true);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [forcePolling]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
