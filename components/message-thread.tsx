"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, SenderType } from "@/lib/types/database";

interface MessageThreadProps {
  /** Pre-loaded messages (optional, will fetch if not provided) */
  initialMessages?: Message[];
  /** The client_account_id to scope messages to */
  clientAccountId: string;
  /** The entry_case_id to scope messages to (optional for general conversations) */
  entryCaseId?: string;
  /** Current user info for sending messages */
  currentUser: {
    id: string;
    name: string;
    senderType: SenderType;
  };
  /** Tenant ID */
  tenantId: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageThread({
  initialMessages,
  clientAccountId,
  entryCaseId,
  currentUser,
  tenantId,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(!initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // suppress unused var lint — tenantId is used for the data model but not directly in fetch calls
  void tenantId;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("client_account_id", clientAccountId);
    if (entryCaseId) params.set("entry_case_id", entryCaseId);
    params.set("limit", "100");

    const res = await fetch(`/api/messages?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
    setLoading(false);
  }, [clientAccountId, entryCaseId]);

  useEffect(() => {
    if (!initialMessages) {
      fetchMessages();
    }
  }, [initialMessages, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mark unread messages as read
  useEffect(() => {
    const unreadIds = messages
      .filter(
        (m) =>
          !m.is_read && m.sender_type !== currentUser.senderType
      )
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unreadIds }),
      }).catch(() => {
        // Silent fail for read receipts
      });
    }
  }, [messages, currentUser.senderType]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_account_id: clientAccountId,
          entry_case_id: entryCaseId,
          sender_type: currentUser.senderType,
          sender_id: currentUser.id,
          sender_name: currentUser.name,
          body: trimmed,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setBody("");
        textareaRef.current?.focus();
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ minHeight: 200, maxHeight: 500 }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-400">
              No messages yet. Start the conversation below.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_type === currentUser.senderType;
          return (
            <div
              key={msg.id}
              className={cn("flex gap-3", isOwn ? "flex-row-reverse" : "flex-row")}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    "text-xs",
                    msg.sender_type === "broker"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  )}
                >
                  {getInitials(msg.sender_name)}
                </AvatarFallback>
              </Avatar>

              <div
                className={cn(
                  "max-w-[75%] space-y-1",
                  isOwn ? "items-end" : "items-start"
                )}
              >
                <div className={cn("flex items-baseline gap-2", isOwn && "flex-row-reverse")}>
                  <span className="text-xs font-medium text-slate-700">
                    {msg.sender_name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatTimestamp(msg.created_at)}
                  </span>
                </div>

                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    isOwn
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compose area */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!body.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
