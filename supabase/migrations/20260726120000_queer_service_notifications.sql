CREATE TYPE notification_type AS ENUM ('message', 'review', 'system');

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  reference_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Triggers

-- 1. Messages trigger
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_recipient_id UUID;
BEGIN
  -- Get sender name
  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

  -- Get recipient id
  SELECT
    CASE WHEN user_a = NEW.sender_id THEN user_b ELSE user_a END
  INTO v_recipient_id
  FROM public.connections
  WHERE id = NEW.connection_id;

  -- Insert notification
  INSERT INTO public.notifications (user_id, type, title, body, action_url, reference_id)
  VALUES (
    v_recipient_id,
    'message',
    'Nouveau message',
    v_sender_name || ' vous a envoyé un message.',
    '/messages/' || NEW.connection_id,
    NEW.connection_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_notification();

-- 2. Reviews trigger
CREATE OR REPLACE FUNCTION public.handle_new_review_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_author_name TEXT;
BEGIN
  SELECT display_name INTO v_author_name FROM public.profiles WHERE id = NEW.author_id;

  INSERT INTO public.notifications (user_id, type, title, body, action_url, reference_id)
  VALUES (
    NEW.target_id,
    'review',
    'Nouvel avis',
    v_author_name || ' a laissé un avis sur votre profil.',
    '/profil/' || NEW.target_id,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_review_insert
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_review_notification();
