"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export default function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
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
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
