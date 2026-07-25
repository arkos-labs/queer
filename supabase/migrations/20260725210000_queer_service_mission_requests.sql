-- Create mission_requests table for community board

CREATE TABLE IF NOT EXISTS public.mission_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.mission_requests ENABLE ROW LEVEL SECURITY;

-- Policies

-- Everyone can read mission requests
CREATE POLICY "Les requêtes de mission sont publiques"
    ON public.mission_requests
    FOR SELECT
    USING (true);

-- Authenticated users can insert
CREATE POLICY "Les utilisateurs connectés peuvent créer une requête"
    ON public.mission_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Owners can update their requests
CREATE POLICY "Les utilisateurs peuvent modifier leurs propres requêtes"
    ON public.mission_requests
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

-- Owners can delete their requests
CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres requêtes"
    ON public.mission_requests
    FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- Add updated_at trigger
CREATE TRIGGER handle_mission_requests_updated_at
    BEFORE UPDATE ON public.mission_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
