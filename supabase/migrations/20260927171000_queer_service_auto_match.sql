-- Fonction pour gérer le matching automatisé (offre -> besoin)
CREATE OR REPLACE FUNCTION public.handle_new_skills_match_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_skill TEXT;
  v_target_user UUID;
BEGIN
  -- Ne rien faire si le profil n'est pas actif (pas fini son onboarding)
  IF NEW.profile_status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Si c'est une mise à jour, on ne déclenche que si les compétences ont changé
  IF TG_OP = 'UPDATE' THEN
    IF NEW.skills IS NOT DISTINCT FROM OLD.skills THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Parcourir chaque compétence proposée par le membre
  IF NEW.skills IS NOT NULL THEN
    FOR v_skill IN SELECT unnest(NEW.skills) LOOP
      -- Ignorer si la compétence était déjà là avant la mise à jour
      IF TG_OP = 'UPDATE' AND OLD.skills IS NOT NULL AND v_skill = ANY(OLD.skills) THEN
        CONTINUE;
      END IF;

      -- Chercher les profils actifs qui ont BESOIN de cette compétence
      FOR v_target_user IN
        SELECT id FROM public.profiles 
        WHERE id != NEW.id 
          AND profile_status = 'active'
          AND needs IS NOT NULL
          AND v_skill = ANY(needs)
      LOOP
        -- Insérer une notification système pour la personne qui cherche ce service
        INSERT INTO public.notifications (user_id, type, title, body, action_url, reference_id)
        VALUES (
          v_target_user,
          'system',
          'Nouveau match disponible !',
          NEW.display_name || ' vient d''arriver et propose un service que vous recherchez : ' || v_skill || '.',
          '/profil/' || NEW.id,
          NEW.id
        );
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà pour pouvoir rejouer le script
DROP TRIGGER IF EXISTS on_profile_skills_change ON public.profiles;

-- Créer le déclencheur
CREATE TRIGGER on_profile_skills_change
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_skills_match_notification();
