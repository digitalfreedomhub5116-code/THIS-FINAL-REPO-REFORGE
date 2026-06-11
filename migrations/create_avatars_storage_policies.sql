-- Enable public SELECT access to the avatars bucket
CREATE POLICY "Allow public select on avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Enable public INSERT access to the avatars bucket
CREATE POLICY "Allow public insert on avatars"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

-- Enable public DELETE access to the avatars bucket
CREATE POLICY "Allow public delete on avatars"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'avatars');
