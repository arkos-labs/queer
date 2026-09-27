CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs connectés peuvent créer un signalement
CREATE POLICY "Users can create reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Seuls les admins peuvent voir et gérer tous les signalements
CREATE POLICY "Admins can view all reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Fonction pour alerter les admins lors d'un nouveau signalement
CREATE OR REPLACE FUNCTION public.handle_new_report_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_reporter_name TEXT;
  v_reported_name TEXT;
BEGIN
  -- Récupérer le nom de celui qui signale
  SELECT display_name INTO v_reporter_name FROM public.profiles WHERE id = NEW.reporter_id;
  
  -- Récupérer le nom de la personne signalée (si applicable)
  IF NEW.reported_id IS NOT NULL THEN
    SELECT display_name INTO v_reported_name FROM public.profiles WHERE id = NEW.reported_id;
  ELSE
    v_reported_name := 'un problème général';
  END IF;

  -- Envoyer une notification à CHAQUE administrateur
  FOR v_admin_id IN
    SELECT id FROM public.profiles WHERE is_admin = true
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, action_url, reference_id)
    VALUES (
      v_admin_id,
      'system',
      '🚨 Nouveau signalement',
      v_reporter_name || ' a signalé ' || v_reported_name || ' (Motif : ' || NEW.reason || ').',
      '/admin/reports',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur la table reports
DROP TRIGGER IF EXISTS on_new_report_insert ON public.reports;

CREATE TRIGGER on_new_report_insert
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_report_alert();
