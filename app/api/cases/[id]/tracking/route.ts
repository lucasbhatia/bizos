import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { trackShipment, getTrackingTimeline } from "@/lib/integrations/carrier-tracking";
import type { CarrierCode } from "@/lib/integrations/carrier-tracking";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

    const { data: entryCase } = await supabase
      .from("entry_cases")
      .select("case_number, mode_of_transport")
      .eq("id", params.id)
      .single();

    if (!entryCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Determine carrier based on transport mode (stub logic)
    const carrier: CarrierCode =
      entryCase.mode_of_transport === "air" ? "DHL" :
      entryCase.mode_of_transport === "ocean" ? "MAERSK" :
      "FEDEX";

    // Use case number as tracking number for the stub
    const trackingNumber = entryCase.case_number;

    const tracking = trackShipment(carrier, trackingNumber);
    const timeline = getTrackingTimeline(tracking.events);

    return NextResponse.json({ tracking, timeline });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load tracking data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
