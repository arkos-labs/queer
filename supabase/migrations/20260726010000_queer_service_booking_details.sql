-- Add booking details columns to payments table

ALTER TABLE public.payments ADD COLUMN service_date text;
ALTER TABLE public.payments ADD COLUMN service_time text;
ALTER TABLE public.payments ADD COLUMN service_location text;
