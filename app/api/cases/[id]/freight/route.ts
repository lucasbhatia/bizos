import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createBookingRequest } from "@/lib/adapters/freight";
import type { BLWorkflow, Consolidation } from "@/lib/adapters/freight";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const booking = await createBookingRequest(params.id);

    // BL workflow stub -- in production, read from DB
    const blWorkflow: BLWorkflow = {
      case_id: params.id,
      bl_number: "",
      bl_type: "original",
      status: "pending_draft",
      carrier: booking.carrier,
      shipper: "",
      consignee: "",
      notify_party: "",
      corrections: [],
      history: [],
    };

    // Consolidations stub -- in production, read from DB
    const consolidations: Consolidation[] = [];

    return NextResponse.json({
      booking,
      bl_workflow: blWorkflow,
      consolidations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load freight data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
