-- Allow clients to send messages
CREATE POLICY "Clients can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);