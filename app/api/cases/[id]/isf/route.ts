import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { buildISFFromCase, validateISF } from "@/lib/adapters/isf";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const isf = await buildISFFromCase(params.id);
    const validation = validateISF(isf);

    return NextResponse.json({ isf, validation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build ISF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
