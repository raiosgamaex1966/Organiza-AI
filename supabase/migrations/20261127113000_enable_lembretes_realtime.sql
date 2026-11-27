-- Enable Realtime for public.lembretes so reminders created via WhatsApp appear immediately without page reload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lembretes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lembretes;
  END IF;
END $$;
