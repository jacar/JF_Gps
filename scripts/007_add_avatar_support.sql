-- Step 1: Add avatar_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Configure Storage Policies
-- Note: If policies already exist, you'll get an error but that's OK
-- You can skip the policy creation if they already exist

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

-- Allow public read access
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Allow users to update their files
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos');

-- Allow users to delete their files
CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos');
