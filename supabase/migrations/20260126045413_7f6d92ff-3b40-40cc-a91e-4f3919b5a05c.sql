-- Add new registration types to the enum
ALTER TYPE registration_type ADD VALUE IF NOT EXISTS 'seminar';
ALTER TYPE registration_type ADD VALUE IF NOT EXISTS 'vac';

-- Add extra_data JSONB column for additional form data
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}';

-- Update status column to have proper values
-- First let's update existing statuses to match new system
UPDATE public.registrations SET status = 'new' WHERE status = 'pending';
UPDATE public.registrations SET status = 'contacted' WHERE status = 'confirmed';

-- Create status enum for better type safety (optional, keeping as text for flexibility)
-- Status values: new, contacted, converted

-- Enable realtime for registrations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;

-- Add RLS policy for Course Admin to update registrations
CREATE POLICY "Course admin can update registrations"
ON public.registrations
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Ensure public users can only see their own registrations by email (if needed)
-- Keep existing "Anyone can register" INSERT policy for website forms

-- Add index for faster searches
CREATE INDEX IF NOT EXISTS idx_registrations_type ON public.registrations(registration_type);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);