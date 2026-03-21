"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageThread } from "@/components/message-thread";
import { MessageSquare, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, SenderType } from "@/lib/types/database";

interface CaseSummary {
  id: string;
  case_number: string;
  status: string;
}

interface PortalMessagesClientProps {
  initialMessages: Message[];
  cases: CaseSummary[];
  clientAccountId: string;
  tenantId: string;
  currentUser: {
    id: string;
    name: string;
    senderType: SenderType;
  };
}

type ConversationKey = string; // case_id or "general"

interface Conversation {
  key: ConversationKey;
  label: string;
  caseNumber: string | null;
  caseStatus: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  messageCount: number;
}

export function PortalMessagesClient({
  initialMessages,
  cases,
  clientAccountId,
  tenantId,
  currentUser,
}: PortalMessagesClientProps) {
  const [selectedConvo, setSelectedConvo] = useState<ConversationKey | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newCaseId, setNewCaseId] = useState<string>("general");

  // Group messages into conversations by case
  const conversations = useMemo(() => {
    const grouped = new Map<ConversationKey, Message[]>();

    for (const msg of initialMessages) {
      const key = msg.entry_case_id ?? "general";
      const existing = grouped.get(key) ?? [];
      existing.push(msg);
      grouped.set(key, existing);
    }

    // Also include cases with no messages yet
    for (const c of cases) {
      if (!grouped.has(c.id)) {
        grouped.set(c.id, []);
      }
    }

    // Ensure "general" conversation always exists
    if (!grouped.has("general")) {
      grouped.set("general", []);
    }

    const result: Conversation[] = [];
    for (const [key, msgs] of Array.from(grouped.entries())) {
      const caseInfo = cases.find((c) => c.id === key);
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const unreadCount = msgs.filter(
        (m) => !m.is_read && m.sender_type !== currentUser.senderType
      ).length;

      result.push({
        key,
        label: caseInfo ? `Case ${caseInfo.case_number}` : "General",
        caseNumber: caseInfo?.case_number ?? null,
        caseStatus: caseInfo?.status ?? null,
        lastMessage: lastMsg,
        unreadCount,
        messageCount: msgs.length,
      });
    }

    // Sort: conversations with unread first, then by last message date
    result.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      const aTime = a.lastMessage?.created_at ?? "";
      const bTime = b.lastMessage?.created_at ?? "";
      return bTime.localeCompare(aTime);
    });

    return result;
  }, [initialMessages, cases, currentUser.senderType]);

  // Start new conversation
  function handleStartConversation() {
    const caseId = newCaseId === "general" ? "general" : newCaseId;
    setSelectedConvo(caseId);
    setShowNewMessage(false);
    setNewCaseId("general");
  }

  // Selected conversation's data
  const activeConvo = conversations.find((c) => c.key === selectedConvo);
  const entryCaseId = selectedConvo && selectedConvo !== "general" ? selectedConvo : undefined;
  const filteredInitialMessages = selectedConvo
    ? initialMessages.filter((m) => {
        if (selectedConvo === "general") return !m.entry_case_id;
        return m.entry_case_id === selectedConvo;
      })
    : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Conversations list */}
      <div className={cn("lg:col-span-1", selectedConvo && "hidden lg:block")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Conversations</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewMessage(true)}
            >
              <Plus className="mr-1 h-3 w-3" />
              New
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {showNewMessage && (
              <div className="border-b px-4 py-3 space-y-2">
                <p className="text-xs font-medium text-slate-500">
                  Start a new conversation
                </p>
                <Select value={newCaseId} onValueChange={setNewCaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        Case {c.case_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleStartConversation}>
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewMessage(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <MessageSquare className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-500">
                  No conversations yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Click &quot;New&quot; to start a conversation
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((convo) => (
                  <button
                    key={convo.key}
                    onClick={() => setSelectedConvo(convo.key)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors",
                      selectedConvo === convo.key && "bg-slate-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">
                        {convo.label}
                      </span>
                      {convo.unreadCount > 0 && (
                        <Badge className="bg-blue-600 text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center">
                          {convo.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {convo.caseStatus && (
                      <span className="text-[10px] text-slate-400 capitalize">
                        {convo.caseStatus.replace(/_/g, " ")}
                      </span>
                    )}
                    {convo.lastMessage && (
                      <p className="mt-1 text-xs text-slate-500 truncate">
                        {convo.lastMessage.sender_name}:{" "}
                        {convo.lastMessage.body}
                      </p>
                    )}
                    {!convo.lastMessage && (
                      <p className="mt-1 text-xs text-slate-400 italic">
                        No messages yet
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Thread view */}
      <div className={cn("lg:col-span-2", !selectedConvo && "hidden lg:block")}>
        {selectedConvo ? (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
              <Button
                size="icon"
                variant="ghost"
                className="lg:hidden h-8 w-8"
                onClick={() => setSelectedConvo(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-base">
                  {activeConvo?.label ?? "Conversation"}
                </CardTitle>
                {activeConvo?.caseStatus && (
                  <p className="text-xs text-slate-400 capitalize">
                    Status: {activeConvo.caseStatus.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <MessageThread
                key={selectedConvo}
                initialMessages={filteredInitialMessages}
                clientAccountId={clientAccountId}
                entryCaseId={entryCaseId}
                tenantId={tenantId}
                currentUser={currentUser}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-500">
                Select a conversation to view messages
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Or click &quot;New&quot; to start a new one
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
