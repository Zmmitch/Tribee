-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================
-- Instant-Runoff Voting
-- ============================================================

CREATE OR REPLACE FUNCTION run_instant_runoff(p_poll_id uuid)
RETURNS uuid AS $$
DECLARE
  v_option_ids uuid[];
  v_eliminated uuid[] := '{}';
  v_round int := 0;
  v_winner uuid;
  v_total int;
  v_majority int;
  v_min_option uuid;
  v_min_count int;
  v_remaining int;
BEGIN
  SELECT array_agg(id) INTO v_option_ids
  FROM poll_options WHERE poll_id = p_poll_id;

  IF v_option_ids IS NULL OR array_length(v_option_ids, 1) = 0 THEN RETURN NULL; END IF;
  IF array_length(v_option_ids, 1) = 1 THEN RETURN v_option_ids[1]; END IF;

  LOOP
    v_round := v_round + 1;
    IF v_round > 100 THEN RETURN NULL; END IF;

    SELECT count(*) INTO v_remaining
    FROM unnest(v_option_ids) oid WHERE NOT (oid = ANY(v_eliminated));

    IF v_remaining <= 1 THEN
      SELECT oid INTO v_winner FROM unnest(v_option_ids) oid
      WHERE NOT (oid = ANY(v_eliminated)) LIMIT 1;
      RETURN v_winner;
    END IF;

    WITH first_choices AS (
      SELECT DISTINCT ON (b.id) br.option_id
      FROM ballots b JOIN ballot_rankings br ON br.ballot_id = b.id
      WHERE b.poll_id = p_poll_id AND NOT (br.option_id = ANY(v_eliminated))
      ORDER BY b.id, br.rank ASC
    )
    SELECT count(*)::int INTO v_total FROM first_choices;

    IF v_total IS NULL OR v_total = 0 THEN RETURN NULL; END IF;
    v_majority := v_total / 2;

    SELECT option_id INTO v_winner FROM (
      SELECT DISTINCT ON (b.id) br.option_id
      FROM ballots b JOIN ballot_rankings br ON br.ballot_id = b.id
      WHERE b.poll_id = p_poll_id AND NOT (br.option_id = ANY(v_eliminated))
      ORDER BY b.id, br.rank ASC
    ) fc GROUP BY option_id HAVING count(*) > v_majority LIMIT 1;

    IF v_winner IS NOT NULL THEN RETURN v_winner; END IF;

    SELECT option_id, count(*)::int INTO v_min_option, v_min_count FROM (
      SELECT DISTINCT ON (b.id) br.option_id
      FROM ballots b JOIN ballot_rankings br ON br.ballot_id = b.id
      WHERE b.poll_id = p_poll_id AND NOT (br.option_id = ANY(v_eliminated))
      ORDER BY b.id, br.rank ASC
    ) fc GROUP BY option_id ORDER BY count(*) ASC LIMIT 1;

    IF v_min_option IS NULL THEN RETURN NULL; END IF;
    v_eliminated := array_append(v_eliminated, v_min_option);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- Auto-resolve expired polls (runs every 5 min)
-- ============================================================

CREATE OR REPLACE FUNCTION auto_resolve_expired_polls() RETURNS void AS $$
DECLARE
  poll_rec RECORD;
  winner uuid;
BEGIN
  FOR poll_rec IN
    SELECT id FROM polls WHERE status = 'open' AND deadline IS NOT NULL AND deadline < now()
  LOOP
    winner := run_instant_runoff(poll_rec.id);
    UPDATE polls SET status = 'resolved', resolved_option_id = winner WHERE id = poll_rec.id;
    INSERT INTO activity_log (trip_id, user_id, action, entity_type, entity_id, metadata)
    SELECT trip_id, created_by, 'poll_auto_resolved', 'poll', poll_rec.id,
           jsonb_build_object('winner_option_id', winner)
    FROM polls WHERE id = poll_rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Document expiry alerts (runs daily at 9 AM UTC)
-- Thresholds: 30, 14, 7, 1 day before expiry
-- ============================================================

CREATE OR REPLACE FUNCTION check_document_expiry_alerts() RETURNS void AS $$
DECLARE
  doc_rec RECORD;
  days_until int;
  current_threshold int;
  last_alert int;
BEGIN
  FOR doc_rec IN
    SELECT id, expires_at, metadata, uploaded_by, trip_id FROM documents
    WHERE expires_at IS NOT NULL
      AND expires_at <= (current_date + interval '30 days')
      AND expires_at >= current_date
  LOOP
    days_until := (doc_rec.expires_at - current_date);
    IF days_until <= 1 THEN current_threshold := 1;
    ELSIF days_until <= 7 THEN current_threshold := 7;
    ELSIF days_until <= 14 THEN current_threshold := 14;
    ELSE current_threshold := 30;
    END IF;

    last_alert := COALESCE((doc_rec.metadata->>'last_alert_days')::int, 999);

    IF current_threshold < last_alert THEN
      UPDATE documents SET metadata = doc_rec.metadata || jsonb_build_object(
        'last_alert_days', current_threshold, 'last_alert_at', now()::text, 'days_until_expiry', days_until
      ) WHERE id = doc_rec.id;

      INSERT INTO activity_log (trip_id, user_id, action, entity_type, entity_id, metadata)
      VALUES (doc_rec.trip_id, doc_rec.uploaded_by, 'document_expiry_alert', 'document', doc_rec.id,
        jsonb_build_object('days_until_expiry', days_until, 'threshold', current_threshold));
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Cron schedules
-- ============================================================

SELECT cron.schedule('auto-resolve-polls', '*/5 * * * *', $$SELECT auto_resolve_expired_polls()$$);
SELECT cron.schedule('document-expiry-alerts', '0 9 * * *', $$SELECT check_document_expiry_alerts()$$);
