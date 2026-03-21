import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createDispatchOrder } from "@/lib/adapters/drayage";
import type { TruckingAppointment, DriverComm } from "@/lib/adapters/drayage";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dispatch = await createDispatchOrder(params.id);

    // Appointments stub -- in production, read from DB
    const appointments: TruckingAppointment[] = [];

    // Communications stub -- in production, read from DB
    const communications: DriverComm[] = [];

    return NextResponse.json({
      dispatch,
      appointments,
      communications,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load drayage data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
