-- Storage bucket and policies for case documents
-- Bucket: case-documents
-- Path structure: /{tenant_id}/{case_id}/{doc_type}/{filename}

INSERT INTO storage.buckets (id, name, public)
VALUES ('case-documents', 'case-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Upload policy: authenticated users can upload to their tenant's path
CREATE POLICY storage_upload ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'case-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Read policy: authenticated users can read from their tenant's path
CREATE POLICY storage_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'case-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Delete policy: authenticated users can delete from their tenant's path
CREATE POLICY storage_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'case-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.users WHERE id = auth.uid()
    )
  );
