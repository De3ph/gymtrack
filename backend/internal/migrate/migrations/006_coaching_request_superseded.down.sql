-- Removing 'superseded' requires deciding what happens to any request rows
-- already recorded with that status: map them to 'rejected' so the old CHECK
-- can be re-added on a database where establish has closed requests.
UPDATE public.coaching_requests SET status = 'rejected' WHERE status = 'superseded';

ALTER TABLE public.coaching_requests
    DROP CONSTRAINT coaching_requests_status_check;

ALTER TABLE public.coaching_requests
    ADD CONSTRAINT coaching_requests_status_check
    CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])));
