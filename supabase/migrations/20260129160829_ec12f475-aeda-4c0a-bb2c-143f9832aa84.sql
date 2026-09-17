-- Create contact_messages table for website contact form submissions
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow public INSERT (anon users can submit the contact form)
CREATE POLICY "Anyone can submit contact form"
ON public.contact_messages
FOR INSERT
WITH CHECK (true);

-- Allow all admin roles to view contact messages
CREATE POLICY "All admin roles can view contact messages"
ON public.contact_messages
FOR SELECT
USING (has_any_role(auth.uid()));

-- Allow admins to update contact messages (for status changes)
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages
FOR UPDATE
USING (is_admin(auth.uid()));

-- Allow super admin to delete contact messages
CREATE POLICY "Super admin can delete contact messages"
ON public.contact_messages
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));