-- Vault storage bucket (private, 50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault', 'vault', false, 52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

CREATE POLICY vault_upload ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vault' AND auth.uid() IS NOT NULL);

CREATE POLICY vault_read ON storage.objects FOR SELECT
  USING (bucket_id = 'vault' AND auth.uid() IS NOT NULL);

CREATE POLICY vault_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'vault' AND (storage.foldername(name))[2] = auth.uid()::text);
