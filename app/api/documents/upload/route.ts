import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { docTypeSchema } from "@/lib/validators/schemas";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile for tenant_id
  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const caseId = formData.get("case_id") as string | null;
  const docType = formData.get("doc_type") as string | null;

  if (!file || !caseId || !docType) {
    return NextResponse.json({ error: "Missing file, case_id, or doc_type" }, { status: 400 });
  }

  // Validate doc_type
  const docTypeParsed = docTypeSchema.safeParse(docType);
  if (!docTypeParsed.success) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed. Accepted: PDF, PNG, JPG, TIFF, XLSX, DOCX" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 25MB." }, { status: 400 });
  }

  // Verify case exists and belongs to tenant
  const { data: entryCase } = await supabase
    .from("entry_cases")
    .select("id, tenant_id")
    .eq("id", caseId)
    .single();

  if (!entryCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Compute file hash
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fileHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Determine version
  const { count: existingCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("entry_case_id", caseId)
    .eq("doc_type", docType);

  const version = (existingCount ?? 0) + 1;

  // Upload to storage
  const storagePath = `${profile.tenant_id}/${caseId}/${docType}/${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("case-documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Create document record
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      tenant_id: profile.tenant_id,
      entry_case_id: caseId,
      uploaded_by_user_id: authUser.id,
      doc_type: docType,
      file_name: file.name,
      storage_path: storagePath,
      file_hash: fileHash,
      file_size_bytes: file.size,
      version,
      parse_status: "pending",
    })
    .select()
    .single();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  // Create audit event
  await supabase.from("audit_events").insert({
    tenant_id: profile.tenant_id,
    event_type: "document.uploaded",
    entity_type: "document",
    entity_id: doc.id,
    actor_type: "user",
    actor_id: authUser.id,
    action: `Uploaded ${docType} for case`,
    details: { doc_type: docType, file_name: file.name, version, case_id: caseId },
  });

  return NextResponse.json({ success: true, document: doc });
}
