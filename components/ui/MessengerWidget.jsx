"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Paperclip,
  Maximize2,
  Smile
} from "lucide-react";

import { parseMediaUrl } from "@/lib/chat-helpers";
import { uploadFile, safeParseResponse, errorFromResponse } from "@/lib/client-upload-utils";

const COMMON_EMOJIS = [
  "😀","😂","🥰","😍","😎","🤔","😢","😡","👍","👎",
  "🙏","🔥","❤️","🎉","✅","❌","👋","🤝","💇","💇‍♀️"
];

function MessageBubble({ message, userRole }) {
  const isMine = message.senderRole === userRole;
  const media = parseMediaUrl(message.body);

  return (
    <div
      style={{
        alignSelf: isMine ? "flex-end" : "flex-start",
        maxWidth: "92%",
        padding: "10px 14px",
        borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isMine ? "#0070f3" : "#f1f5f9",
        color: isMine ? "#fff" : "#0f172a",
        fontSize: 13,
        lineHeight: 1.4,
        wordBreak: "break-word"
      }}
    >
      {media?.type === "image" ? (
        <img
          src={media.url}
          alt="Attachment"
          style={{ maxWidth: "100%", borderRadius: 8, display: "block" }}
        />
      ) : media?.type === "video" ? (
        <video
          src={media.url}
          controls
          style={{ maxWidth: "100%", borderRadius: 8, display: "block" }}
        />
      ) : (
        message.body
      )}
    </div>
  );
}

function EmojiPicker({ onPick }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "100%",
        right: 0,
        marginBottom: 8,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        padding: 10,
        display: "grid",
        gridTemplateColumns: "repeat(10, 1fr)",
        gap: 4,
        zIndex: 10,
        width: 280
      }}
    >
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            padding: 4,
            borderRadius: 6,
            lineHeight: 1
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

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
    setThreadState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await fetch(`/api/dashboard/messages/${conversationId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load messages.");
      setThreadState((current) => ({
        ...current,
        loading: false,
        messages: data.messages || [],
        error: ""
      }));
    } catch (error) {
      setThreadState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }, [conversationId]);

  async function handleSendMessage(bodyOverride) {
    const bodyText = String(bodyOverride || threadState.draft || "").trim();
    if (!conversationId || !bodyText) return;
    setThreadState((current) => ({ ...current, sending: true, error: "" }));
    try {
      const response = await fetch(`/api/dashboard/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: bodyText })
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
  controlledOpen,
  onToggle,
  onClose,
  onExpand,
  // Optional external state (for vendor dashboard integration)
  externalMessages,
  externalDraft,
  externalSending,
  externalLoading,
  externalError,
  onSend,
  onDraftChange,
  onLoadMessages
}) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(initialOpen);
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiRef = useRef(null);
  const optimisticIdRef = useRef(0);

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
    ? (value) => onDraftChangeRef.current?.(value)
    : (value) => internal.setThreadState((c) => ({ ...c, draft: value }));

  const handleSend = useCallback(
    async (bodyOverride) => {
      const bodyText = String(bodyOverride || threadState.draft || "").trim();
      if (!conversationId || !bodyText) return;
      setUploadError("");

      if (hasExternalState) {
        // Optimistically clear input and show message immediately
        onDraftChangeRef.current?.("");
        optimisticIdRef.current += 1;
        const tempId = `opt-${optimisticIdRef.current}`;
        setOptimisticMessages((prev) => [
          ...prev,
          {
            id: tempId,
            body: bodyText,
            senderRole: userRole,
            createdAt: new Date().toISOString(),
            temp: true
          }
        ]);
        onSendRef.current?.(bodyText);
      } else {
        // For internal mode, clear draft immediately too
        internal.setThreadState((c) => ({ ...c, draft: "" }));
        await internal.handleSendMessage(bodyOverride);
      }
    },
    [conversationId, threadState.draft, hasExternalState, internal, userRole]
  );

  const loadMessages = hasExternalState ? null : internal.loadMessages;

  // Use refs for callbacks so they don't re-trigger effects when parent re-renders
  const onLoadMessagesRef = useRef(onLoadMessages);
  const onSendRef = useRef(onSend);
  const onDraftChangeRef = useRef(onDraftChange);
  useEffect(() => {
    onLoadMessagesRef.current = onLoadMessages;
    onSendRef.current = onSend;
    onDraftChangeRef.current = onDraftChange;
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isOpen || !conversationId) return;
    if (hasExternalState) {
      onLoadMessagesRef.current?.();
    } else {
      loadMessages();
    }
  }, [isOpen, conversationId, loadMessages, hasExternalState]);

  useEffect(() => {
    scrollToBottom();
  }, [threadState.messages, optimisticMessages, scrollToBottom]);

  // Clear optimistic messages when real messages arrive
  useEffect(() => {
    if (optimisticMessages.length > 0 && threadState.messages.length > 0) {
      setOptimisticMessages([]);
    }
  }, [threadState.messages]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEmojiPicker]);

  function setOpen(value) {
    if (isControlled) {
      onToggle?.(value);
    } else {
      setInternalOpen(value);
    }
  }

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  async function handleFileUpload(file) {
    if (!file || !conversationId) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const url = await uploadFile(file, "messages");
      await handleSend(url);
    } catch (error) {
      setUploadError(error.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    event.target.value = "";
  }

  function handleEmojiPick(emoji) {
    const current = threadState.draft || "";
    setDraft(current + emoji);
    setShowEmojiPicker(false);
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
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end"
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
            marginBottom: 0
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
              background: "#f8fafc",
              flexShrink: 0
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
                      color: "#1e293b"
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
              {onExpand ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onExpand();
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 8,
                    color: "#64748b"
                  }}
                  title="Expand"
                >
                  <Maximize2 size={16} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
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
              gap: 10,
              minHeight: 0
            }}
          >
            {threadState.loading ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, margin: "auto" }}>
                Loading messages...
              </div>
            ) : null}

            {!threadState.loading && threadState.messages.length === 0 && optimisticMessages.length === 0 ? (
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
              <>
                {threadState.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} userRole={userRole} />
                ))}
                {optimisticMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} userRole={userRole} />
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {(threadState.error || uploadError) ? (
            <div
              style={{
                padding: "8px 16px",
                fontSize: 12,
                color: "#dc2626",
                background: "#fef2f2",
                borderTop: "1px solid #fecaca",
                flexShrink: 0
              }}
            >
              {threadState.error || uploadError}
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
              background: "#fff",
              flexShrink: 0,
              position: "relative",
              margin: 0
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || threadState.sending}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0
              }}
              title="Send image or video"
            >
              <Paperclip size={18} />
            </button>
            <input
              type="text"
              placeholder="Type a message..."
              value={threadState.draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={threadState.sending || isUploading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 20,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                fontSize: 13,
                outline: "none",
                color: "#0f172a"
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter") && !event.shiftKey && !event.isComposing) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <div ref={emojiRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((s) => !s)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0
                }}
                title="Emoji"
              >
                <Smile size={18} />
              </button>
              {showEmojiPicker ? <EmojiPicker onPick={handleEmojiPick} /> : null}
            </div>
            <button
              type="submit"
              disabled={threadState.sending || !threadState.draft.trim() || isUploading}
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
          onClick={() => setOpen(true)}
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
