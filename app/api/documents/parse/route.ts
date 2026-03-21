import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';
import { z } from 'zod';

const parseSchema = z.object({
  documentId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  initializeAgents();

  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    .eq('tenant_id', auth.tenantId)
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

  try {
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
        tenantId: auth.tenantId,
        userId: auth.userId,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Document parse agent invocation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
