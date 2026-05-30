"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Minimize2 } from "lucide-react";

function useInternalThreadState(conversationId) {
  const [threadState, setThreadState] = useState({
    loading: false,
    sending: false,
    error: "",
    messages: [],
    draft: ""
  });

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await fetch(`/api/dashboard/messages/${conversationId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load messages.");
      setThreadState((current) => ({
        ...current,
        messages: data.messages || [],
        error: ""
      }));
    } catch (error) {
      setThreadState((current) => ({ ...current, error: error.message }));
    }
  }, [conversationId]);

  async function handleSendMessage() {
    if (!conversationId || !threadState.draft.trim()) return;
    setThreadState((current) => ({ ...current, sending: true, error: "" }));
    try {
      const response = await fetch(`/api/dashboard/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: threadState.draft.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send message.");
      setThreadState((current) => ({
        ...current,
        sending: false,
        draft: "",
        messages: data.messages || [],
        error: ""
      }));
    } catch (error) {
      setThreadState((current) => ({ ...current, sending: false, error: error.message }));
    }
  }

  return {
    threadState,
    setThreadState,
    loadMessages,
    handleSendMessage
  };
}

export default function MessengerWidget({
  conversationId,
  recipientName,
  recipientAvatar,
  userRole = "client",
  initialOpen = false,
  onClose,
  // Optional external state (for vendor dashboard integration)
  externalMessages,
  externalDraft,
  externalSending,
  externalLoading,
  externalError,
  onSend,
  onDraftChange
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const hasExternalState =
    externalMessages !== undefined ||
    externalDraft !== undefined ||
    onSend !== undefined;

  const internal = useInternalThreadState(hasExternalState ? null : conversationId);

  const threadState = hasExternalState
    ? {
        loading: externalLoading || false,
        sending: externalSending || false,
        error: externalError || "",
        messages: externalMessages || [],
        draft: externalDraft || ""
      }
    : internal.threadState;

  const setDraft = hasExternalState
    ? (value) => onDraftChange?.(value)
    : (value) => internal.setThreadState((c) => ({ ...c, draft: value }));

  const handleSend = hasExternalState
    ? async () => {
        if (!conversationId || !threadState.draft.trim()) return;
        onSend?.(threadState.draft.trim());
      }
    : internal.handleSendMessage;

  const loadMessages = hasExternalState ? null : internal.loadMessages;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!hasExternalState && isOpen && conversationId) {
      loadMessages();
    }
  }, [isOpen, conversationId, loadMessages, hasExternalState]);

  useEffect(() => {
    if (hasExternalState || !isOpen || !conversationId) return;
    pollRef.current = setInterval(() => {
      loadMessages();
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, conversationId, loadMessages, hasExternalState]);

  useEffect(() => {
    scrollToBottom();
  }, [threadState.messages, scrollToBottom]);

  function handleClose() {
    setIsOpen(false);
    onClose?.();
  }

  if (!conversationId) {
    return null;
  }

  return (
    <div
      className="messenger-widget"
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start"
      }}
    >
      {isOpen ? (
        <div
          className="messenger-window"
          style={{
            width: 360,
            maxWidth: "calc(100vw - 40px)",
            height: 480,
            maxHeight: "calc(100vh - 100px)",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            marginBottom: 12
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid #e5e5e5",
              background: "#f8fafc"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#e2e8f0",
                  flexShrink: 0
                }}
              >
                {recipientAvatar ? (
                  <img
                    src={recipientAvatar}
                    alt={recipientName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#64748b"
                    }}
                  >
                    {recipientName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div>
                <strong style={{ fontSize: 14, color: "#0f172a" }}>{recipientName}</strong>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Direct message</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 8,
                  color: "#64748b"
                }}
                title="Minimize"
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 8,
                  color: "#64748b"
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}
          >
            {threadState.loading ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, margin: "auto" }}>
                Loading messages...
              </div>
            ) : null}

            {!threadState.loading && threadState.messages.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 13,
                  marginTop: "auto",
                  marginBottom: "auto"
                }}
              >
                Send a message to start the conversation.
              </div>
            ) : (
              threadState.messages.map((message) => {
                const isMine = message.senderRole === userRole;
                return (
                  <div
                    key={message.id}
                    style={{
                      alignSelf: isMine ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isMine ? "#0070f3" : "#f1f5f9",
                      color: isMine ? "#fff" : "#0f172a",
                      fontSize: 13,
                      lineHeight: 1.4,
                      wordBreak: "break-word"
                    }}
                  >
                    {message.body}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {threadState.error ? (
            <div
              style={{
                padding: "8px 16px",
                fontSize: 12,
                color: "#dc2626",
                background: "#fef2f2",
                borderTop: "1px solid #fecaca"
              }}
            >
              {threadState.error}
            </div>
          ) : null}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderTop: "1px solid #e5e5e5",
              background: "#fff"
            }}
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={threadState.draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={threadState.sending}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 20,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                fontSize: 13,
                outline: "none"
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="submit"
              disabled={threadState.sending || !threadState.draft.trim()}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: "none",
                background: threadState.draft.trim() ? "#0070f3" : "#e2e8f0",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: threadState.draft.trim() ? "pointer" : "default",
                flexShrink: 0
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : null}

      {/* Toggle button */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "none",
            background: "#0070f3",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,112,243,0.35)"
          }}
          title="Open messages"
        >
          <MessageCircle size={26} />
        </button>
      ) : null}
    </div>
  );
}
