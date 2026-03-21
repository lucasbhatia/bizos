"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageThread } from "@/components/message-thread";
import { MessageSquare } from "lucide-react";

interface CaseMessagesProps {
  caseId: string;
  clientAccountId: string;
  tenantId: string;
  currentUserId: string;
  currentUserName: string;
}

export function CaseMessages({
  caseId,
  clientAccountId,
  tenantId,
  currentUserId,
  currentUserName,
}: CaseMessagesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Client Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <MessageThread
          clientAccountId={clientAccountId}
          entryCaseId={caseId}
          tenantId={tenantId}
          currentUser={{
            id: currentUserId,
            name: currentUserName,
            senderType: "broker",
          }}
        />
      </CardContent>
    </Card>
  );
}
