-- Allow all authenticated users to view admin roles
-- This is necessary so clients can find the admin user to send messages to
CREATE POLICY "Users can view admin roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'admin');