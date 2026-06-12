"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/providers/SocketProvider";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject"
  }
];

const CALL_TIMEOUT_MS = 30000;

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter((p) => p)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function useWebRTCCall({ currentUser, onCallLog }) {
  const { socket } = useSocket();
  const [callState, setCallState] = useState("idle");
  const [callMeta, setCallMeta] = useState(null);
  const [duration, setDuration] = useState(0);
  const [durationLabel, setDurationLabel] = useState("00:00");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [error, setError] = useState("");

  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const startTimeRef = useRef(null);
  const SimplePeerRef = useRef(null);
  const metaRef = useRef(null);
  const stateRef = useRef("idle");

  stateRef.current = callState;
  metaRef.current = callMeta;

  const cleanupPeer = useCallback(() => {
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch {
        // ignore
      }
      peerRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const finalizeEndedState = useCallback((errorMessage = "") => {
    setCallState("ended");
    if (errorMessage) setError(errorMessage);
    setTimeout(() => {
      setCallState("idle");
      setCallMeta(null);
      setDuration(0);
      setDurationLabel("00:00");
      setError("");
      metaRef.current = null;
    }, 3000);
  }, []);

  const emitCallLog = useCallback(
    (finalDuration, missed = false) => {
      const meta = metaRef.current;
      if (!onCallLog || !meta?.conversationId) return;
      onCallLog({
        conversationId: meta.conversationId,
        duration: finalDuration,
        durationLabel: formatDuration(finalDuration),
        missed
      });
    },
    [onCallLog]
  );

  const endCall = useCallback(
    (reason = "ended") => {
      const meta = metaRef.current;
      const finalDuration = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;

      if (meta?.recipientId && stateRef.current !== "idle") {
        socket?.emit("call:end", {
          recipientId: meta.recipientId,
          recipientType: meta.recipientType,
          duration: finalDuration
        });
      }

      cleanupPeer();
      cleanupStream();
      clearTimers();
      startTimeRef.current = null;

      const errorMap = {
        rejected: "Call declined",
        "no-answer": "No answer",
        lost: "Connection lost",
        ended: ""
      };

      const missed = reason === "rejected" || reason === "no-answer";
      if (finalDuration > 0) {
        emitCallLog(finalDuration, false);
      } else if (missed) {
        emitCallLog(0, true);
      }

      finalizeEndedState(errorMap[reason] || "");
    },
    [cleanupPeer, cleanupStream, clearTimers, emitCallLog, finalizeEndedState, socket]
  );

  const startDurationTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setDuration(0);
    setDurationLabel("00:00");
    durationIntervalRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(seconds);
      setDurationLabel(formatDuration(seconds));
    }, 1000);
  }, []);

  const createPeer = useCallback(
    (initiator, stream) => {
      const meta = metaRef.current;
      const Peer = SimplePeerRef.current;
      const user = currentUser;

      const peer = new Peer({
        initiator,
        trickle: true,
        stream,
        config: { iceServers: ICE_SERVERS }
      });

      peer.on("signal", (data) => {
        const isInitialSignal = data.type === "offer" || data.type === "answer";
        if (isInitialSignal) {
          if (initiator) {
            socket?.emit("call:initiate", {
              recipientId: meta?.recipientId,
              recipientType: meta?.recipientType,
              callerId: user?.id,
              callerName: user?.name || "Caller",
              callerAvatar: user?.avatar || getInitials(user?.name),
              callerRole: user?.role,
              signal: data,
              conversationId: meta?.conversationId
            });
          } else {
            socket?.emit("call:accept", {
              callerId: meta?.callerId,
              signal: data
            });
          }
        } else {
          // ICE candidate (trickle)
          const recipientId = meta?.isCaller ? meta?.recipientId : meta?.callerId;
          socket?.emit("call:ice-candidate", {
            recipientId,
            recipientType: meta?.recipientType,
            candidate: data
          });
        }
      });

      peer.on("stream", (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
      });

      peer.on("connect", () => {
        setCallState("connected");
        startDurationTimer();
      });

      peer.on("error", (err) => {
        console.error("Peer error:", err.message);
        endCall("lost");
      });

      peer.on("close", () => {
        if (stateRef.current !== "idle" && stateRef.current !== "ended") {
          endCall("ended");
        }
      });

      return peer;
    },
    [currentUser, endCall, socket, startDurationTimer]
  );

  const getMicrophoneStream = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not support microphone access.");
    }
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Please allow microphone access in your browser settings to make voice calls.");
      }
      throw new Error(err.message || "Unable to access microphone.");
    }
  }, []);

  const initiateCall = useCallback(
    async ({ recipientId, recipientName, recipientAvatar, conversationId }) => {
      if (!socket) {
        setError("Not connected to call server.");
        return;
      }
      if (!SimplePeerRef.current) {
        setError("Call library is not loaded.");
        return;
      }

      const meta = {
        recipientId,
        recipientName,
        recipientAvatar,
        conversationId,
        isCaller: true,
        recipientType: currentUser?.role === "vendor" ? "client" : "vendor"
      };
      metaRef.current = meta;
      setCallMeta(meta);
      setCallState("calling");
      setError("");

      try {
        const stream = await getMicrophoneStream();
        streamRef.current = stream;
        peerRef.current = createPeer(true, stream);

        timeoutRef.current = setTimeout(() => {
          if (stateRef.current === "calling") {
            endCall("no-answer");
          }
        }, CALL_TIMEOUT_MS);
      } catch (err) {
        setError(err.message);
        setCallState("idle");
        setCallMeta(null);
        metaRef.current = null;
      }
    },
    [createPeer, endCall, getMicrophoneStream, socket]
  );

  const acceptCall = useCallback(async () => {
    if (!SimplePeerRef.current || !metaRef.current?.signal) return;

    setCallState("connecting");
    try {
      const stream = await getMicrophoneStream();
      streamRef.current = stream;
      const peer = createPeer(false, stream);
      peer.signal(metaRef.current.signal);
      peerRef.current = peer;
    } catch (err) {
      setError(err.message);
      setCallState("idle");
      setCallMeta(null);
      metaRef.current = null;
    }
  }, [createPeer, getMicrophoneStream]);

  const rejectCall = useCallback(() => {
    const meta = metaRef.current;
    if (meta?.callerId) {
      socket?.emit("call:reject", { callerId: meta.callerId });
    }
    cleanupStream();
    setCallState("idle");
    setCallMeta(null);
    metaRef.current = null;
  }, [cleanupStream, socket]);

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const nextMuted = !isMuted;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  const toggleSpeaker = useCallback(async () => {
    if (!remoteAudioRef.current) return;
    const next = !isSpeakerOn;
    try {
      if (typeof remoteAudioRef.current.sinkId !== "undefined") {
        await remoteAudioRef.current.setSinkId("default");
      }
      remoteAudioRef.current.volume = next ? 1 : 0.5;
      setIsSpeakerOn(next);
    } catch {
      remoteAudioRef.current.volume = next ? 1 : 0.5;
      setIsSpeakerOn(next);
    }
  }, [isSpeakerOn]);

  // Load simple-peer dynamically on client
  useEffect(() => {
    let cancelled = false;
    async function loadPeer() {
      try {
        const mod = await import("simple-peer");
        if (!cancelled) {
          SimplePeerRef.current = mod.default || mod;
        }
      } catch (err) {
        console.error("Failed to load simple-peer:", err.message);
      }
    }
    loadPeer();
    return () => {
      cancelled = true;
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    function handleIncomingCall(payload) {
      if (stateRef.current !== "idle") {
        socket.emit("call:reject", { callerId: payload.callerId });
        return;
      }
      const meta = {
        callerId: payload.callerId,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
        callerRole: payload.callerRole,
        conversationId: payload.conversationId,
        signal: payload.signal,
        isCaller: false,
        recipientId: payload.callerId
      };
      metaRef.current = meta;
      setCallMeta(meta);
      setCallState("receiving");
    }

    function handleCallAccepted(payload) {
      if (peerRef.current && payload.signal) {
        peerRef.current.signal(payload.signal);
      }
      setCallState("connecting");
      clearTimers();
    }

    function handleCallRejected() {
      endCall("rejected");
    }

    function handleCallEnded(payload) {
      cleanupPeer();
      cleanupStream();
      clearTimers();
      startTimeRef.current = null;
      const finalDuration = payload.duration || 0;
      if (finalDuration > 0) {
        emitCallLog(finalDuration, false);
      }
      finalizeEndedState("Call ended");
    }

    function handleIceCandidate(payload) {
      if (peerRef.current && payload.candidate) {
        peerRef.current.signal(payload.candidate);
      }
    }

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:ice-candidate", handleIceCandidate);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:ice-candidate", handleIceCandidate);
    };
  }, [socket, cleanupPeer, cleanupStream, clearTimers, endCall, emitCallLog, finalizeEndedState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPeer();
      cleanupStream();
      clearTimers();
    };
  }, [cleanupPeer, cleanupStream, clearTimers]);

  return {
    callState,
    callMeta,
    duration,
    durationLabel,
    isMuted,
    isSpeakerOn,
    error,
    remoteAudioRef,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker
  };
}
