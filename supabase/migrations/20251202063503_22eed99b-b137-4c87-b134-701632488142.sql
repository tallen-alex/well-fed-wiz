-- Update RLS policy to allow clients to update their own pending or confirmed appointments
DROP POLICY IF EXISTS "Clients can update own pending appointments" ON appointments;

CREATE POLICY "Clients can update own pending or confirmed appointments"
ON appointments
FOR UPDATE
USING (
  auth.uid() = client_id 
  AND status IN ('pending', 'confirmed')
);