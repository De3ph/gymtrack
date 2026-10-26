-- Establishing a coaching connection (accepting a coaching request or an
-- invitation code) previously left the athlete's other pending coaching
-- requests open. A trainer could later accept a stale request only to fail
-- with "athlete already has an active trainer" — the request was answered
-- after the athlete had already connected elsewhere.
--
-- The establish step now closes those requests as 'superseded' in the same
-- transaction, so the status needs to be a legal value.
ALTER TABLE public.coaching_requests
    DROP CONSTRAINT coaching_requests_status_check;

ALTER TABLE public.coaching_requests
    ADD CONSTRAINT coaching_requests_status_check
    CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'superseded'::character varying])::text[])));
