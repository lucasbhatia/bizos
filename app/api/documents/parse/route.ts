import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';
import { z } from 'zod';

const parseSchema = z.object({
  documentId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  initializeAgents();

  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { documentId } = parsed.data;

  // Fetch document metadata
  const serviceClient = createServiceClient();
  const { data: doc } = await serviceClient
    .from('documents')
    .select('*, entry_case:entry_cases(id, client_account_id, client_account:client_accounts(name))')
    .eq('id', documentId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Get document text from storage
  let documentText = '';
  try {
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('case-documents')
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message ?? 'File download failed');
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    if (doc.file_name.toLowerCase().endsWith('.pdf')) {
      // Dynamic import for pdf-parse (only needed server-side)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
      const pdfData = await pdfParse(buffer);
      documentText = pdfData.text;
    } else if (doc.file_name.match(/\.(png|jpg|jpeg|tiff)$/i)) {
      // For images, we send a note that image parsing would need OCR
      documentText = '[Image document — text extraction requires OCR integration. Using filename and metadata for classification.]';
    } else {
      documentText = buffer.toString('utf-8');
    }
  } catch (error) {
    // If file not in storage (e.g., seed data), use placeholder text
    const errorMsg = error instanceof Error ? error.message : String(error);
    documentText = `[Could not extract text: ${errorMsg}. Using document metadata for classification.]\nFilename: ${doc.file_name}\nDoc type: ${doc.doc_type}`;
  }

  const clientName = (doc.entry_case as Record<string, unknown>)?.client_account
    ? ((doc.entry_case as Record<string, unknown>).client_account as { name: string }).name
    : undefined;

  const result = await executeAgent(
    'document-parser',
    {
      data: {
        documentId,
        documentText,
        expectedDocType: doc.doc_type,
        clientName,
      },
      trigger: 'document_uploaded',
    },
    {
      tenantId: profile.tenant_id,
      userId: profile.id,
      caseId: doc.entry_case_id,
      triggerEvent: 'document_uploaded',
    },
    'write'
  );

  return NextResponse.json({
    success: result.output.success,
    confidence: result.output.confidence,
    result: result.output.result,
    approvalRequired: result.approvalRequired,
    logId: result.logId,
    error: result.output.error,
  });
}
