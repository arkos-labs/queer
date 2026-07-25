-- Add budget column to mission_requests

ALTER TABLE public.mission_requests ADD COLUMN budget text;
