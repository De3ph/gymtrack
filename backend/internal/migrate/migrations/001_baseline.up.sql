--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: log_users_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_users_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    actor_id INTEGER := NULL;
BEGIN
    BEGIN
        actor_id := NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        actor_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.user_audit_logs (user_id, action, old_data, new_data, changed_by)
        VALUES (NEW.user_id, 'INSERT', NULL, to_jsonb(NEW) - 'password_hash', actor_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.user_audit_logs (user_id, action, old_data, new_data, changed_by)
        VALUES (NEW.user_id, 'UPDATE', to_jsonb(OLD) - 'password_hash', to_jsonb(NEW) - 'password_hash', actor_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.user_audit_logs (user_id, action, old_data, new_data, changed_by)
        VALUES (OLD.user_id, 'DELETE', to_jsonb(OLD) - 'password_hash', NULL, actor_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: body_measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.body_measurements (
    id integer NOT NULL,
    athlete_id integer NOT NULL,
    date date NOT NULL,
    weight numeric(10,2) NOT NULL,
    weight_unit character varying(3) NOT NULL,
    body_fat_pct numeric(5,2),
    parts jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT body_measurements_body_fat_pct_check CHECK (((body_fat_pct >= (0)::numeric) AND (body_fat_pct <= (100)::numeric))),
    CONSTRAINT body_measurements_notes_check CHECK ((length(notes) <= 500)),
    CONSTRAINT body_measurements_weight_check CHECK ((weight >= (0)::numeric)),
    CONSTRAINT body_measurements_weight_unit_check CHECK (((weight_unit)::text = ANY ((ARRAY['kg'::character varying, 'lbs'::character varying])::text[])))
);


--
-- Name: body_measurements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.body_measurements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: body_measurements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.body_measurements_id_seq OWNED BY public.body_measurements.id;


--
-- Name: coaching_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coaching_requests (
    id integer NOT NULL,
    athlete_id integer NOT NULL,
    trainer_id integer NOT NULL,
    message text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT coaching_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: coaching_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.coaching_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coaching_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coaching_requests_id_seq OWNED BY public.coaching_requests.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    target_type character varying(10) NOT NULL,
    target_id integer NOT NULL,
    author_id integer NOT NULL,
    author_role character varying(10) NOT NULL,
    content text NOT NULL,
    parent_comment_id integer,
    created_at timestamp with time zone DEFAULT now(),
    edited_at timestamp with time zone,
    CONSTRAINT comments_author_role_check CHECK (((author_role)::text = ANY ((ARRAY['trainer'::character varying, 'athlete'::character varying])::text[]))),
    CONSTRAINT comments_content_check CHECK (((length(content) >= 1) AND (length(content) <= 2000))),
    CONSTRAINT comments_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['workout'::character varying, 'meal'::character varying])::text[])))
);


--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: equipment_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment_definitions (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    description text
);


--
-- Name: equipment_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipment_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipment_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipment_definitions_id_seq OWNED BY public.equipment_definitions.id;


--
-- Name: exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exercises (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(50) NOT NULL,
    muscle_group_id integer,
    equipment_id integer,
    instructions text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    is_verified boolean DEFAULT false NOT NULL,
    media_url text,
    media_type text DEFAULT 'gif'::text NOT NULL,
    CONSTRAINT exercises_media_type_check CHECK ((media_type = ANY (ARRAY['gif'::text, 'video'::text, 'image'::text])))
);


--
-- Name: exercises_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exercises_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exercises_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exercises_id_seq OWNED BY public.exercises.id;


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id integer NOT NULL,
    trainer_id integer NOT NULL,
    code character varying(32) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    athlete_id integer,
    CONSTRAINT invitations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'used'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invitations_id_seq OWNED BY public.invitations.id;


--
-- Name: meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meals (
    id integer NOT NULL,
    athlete_id integer NOT NULL,
    date date NOT NULL,
    meal_type character varying(10) NOT NULL,
    items jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT meals_meal_type_check CHECK (((meal_type)::text = ANY ((ARRAY['breakfast'::character varying, 'lunch'::character varying, 'dinner'::character varying, 'snack'::character varying])::text[])))
);


--
-- Name: meals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meals_id_seq OWNED BY public.meals.id;


--
-- Name: muscle_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.muscle_groups (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    description text
);


--
-- Name: muscle_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.muscle_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: muscle_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.muscle_groups_id_seq OWNED BY public.muscle_groups.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relationships (
    id integer NOT NULL,
    trainer_id integer NOT NULL,
    athlete_id integer NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT relationships_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'terminated'::character varying])::text[])))
);


--
-- Name: relationships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.relationships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: relationships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.relationships_id_seq OWNED BY public.relationships.id;


--
-- Name: trainer_availabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainer_availabilities (
    id integer NOT NULL,
    trainer_id integer NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_booked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trainer_availabilities_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT valid_time_range CHECK ((end_time > start_time))
);


--
-- Name: trainer_availabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trainer_availabilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trainer_availabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trainer_availabilities_id_seq OWNED BY public.trainer_availabilities.id;


--
-- Name: trainer_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainer_reviews (
    id integer NOT NULL,
    trainer_id integer NOT NULL,
    athlete_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trainer_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: trainer_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trainer_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trainer_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trainer_reviews_id_seq OWNED BY public.trainer_reviews.id;


--
-- Name: user_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(10) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by integer,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_audit_logs_action_check CHECK (((action)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[])))
);


--
-- Name: user_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_audit_logs_id_seq OWNED BY public.user_audit_logs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(30) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(10) NOT NULL,
    profile jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    token_version integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['trainer'::character varying, 'athlete'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'banned'::character varying, 'deleted'::character varying])::text[])))
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: workout_plan_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_plan_assignments (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    athlete_id integer NOT NULL,
    trainer_id integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workout_plan_assignments_status_check CHECK (((status)::text = 'active'::text))
);


--
-- Name: workout_plan_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workout_plan_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workout_plan_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workout_plan_assignments_id_seq OWNED BY public.workout_plan_assignments.id;


--
-- Name: workout_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_plans (
    id integer NOT NULL,
    creator_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    exercises jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workout_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workout_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workout_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workout_plans_id_seq OWNED BY public.workout_plans.id;


--
-- Name: workouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workouts (
    id integer NOT NULL,
    athlete_id integer NOT NULL,
    date date NOT NULL,
    plan_id integer,
    exercises jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workouts_id_seq OWNED BY public.workouts.id;


--
-- Name: body_measurements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.body_measurements ALTER COLUMN id SET DEFAULT nextval('public.body_measurements_id_seq'::regclass);


--
-- Name: coaching_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_requests ALTER COLUMN id SET DEFAULT nextval('public.coaching_requests_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: equipment_definitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_definitions ALTER COLUMN id SET DEFAULT nextval('public.equipment_definitions_id_seq'::regclass);


--
-- Name: exercises id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises ALTER COLUMN id SET DEFAULT nextval('public.exercises_id_seq'::regclass);


--
-- Name: invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations ALTER COLUMN id SET DEFAULT nextval('public.invitations_id_seq'::regclass);


--
-- Name: meals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals ALTER COLUMN id SET DEFAULT nextval('public.meals_id_seq'::regclass);


--
-- Name: muscle_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.muscle_groups ALTER COLUMN id SET DEFAULT nextval('public.muscle_groups_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: relationships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationships ALTER COLUMN id SET DEFAULT nextval('public.relationships_id_seq'::regclass);


--
-- Name: trainer_availabilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_availabilities ALTER COLUMN id SET DEFAULT nextval('public.trainer_availabilities_id_seq'::regclass);


--
-- Name: trainer_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_reviews ALTER COLUMN id SET DEFAULT nextval('public.trainer_reviews_id_seq'::regclass);


--
-- Name: user_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.user_audit_logs_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: workout_plan_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plan_assignments ALTER COLUMN id SET DEFAULT nextval('public.workout_plan_assignments_id_seq'::regclass);


--
-- Name: workout_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plans ALTER COLUMN id SET DEFAULT nextval('public.workout_plans_id_seq'::regclass);


--
-- Name: workouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts ALTER COLUMN id SET DEFAULT nextval('public.workouts_id_seq'::regclass);


--
-- Name: body_measurements body_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.body_measurements
    ADD CONSTRAINT body_measurements_pkey PRIMARY KEY (id);


--
-- Name: coaching_requests coaching_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_requests
    ADD CONSTRAINT coaching_requests_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: equipment_definitions equipment_definitions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_definitions
    ADD CONSTRAINT equipment_definitions_code_key UNIQUE (code);


--
-- Name: equipment_definitions equipment_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_definitions
    ADD CONSTRAINT equipment_definitions_pkey PRIMARY KEY (id);


--
-- Name: exercises exercises_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_name_unique UNIQUE (name);


--
-- Name: exercises exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_code_key UNIQUE (code);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: meals meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_pkey PRIMARY KEY (id);


--
-- Name: muscle_groups muscle_groups_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.muscle_groups
    ADD CONSTRAINT muscle_groups_code_key UNIQUE (code);


--
-- Name: muscle_groups muscle_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.muscle_groups
    ADD CONSTRAINT muscle_groups_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: relationships relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_pkey PRIMARY KEY (id);


--
-- Name: relationships relationships_trainer_id_athlete_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_trainer_id_athlete_id_key UNIQUE (trainer_id, athlete_id);


--
-- Name: trainer_availabilities trainer_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_availabilities
    ADD CONSTRAINT trainer_availabilities_pkey PRIMARY KEY (id);


--
-- Name: trainer_reviews trainer_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_reviews
    ADD CONSTRAINT trainer_reviews_pkey PRIMARY KEY (id);


--
-- Name: trainer_reviews trainer_reviews_trainer_id_athlete_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_reviews
    ADD CONSTRAINT trainer_reviews_trainer_id_athlete_id_key UNIQUE (trainer_id, athlete_id);


--
-- Name: user_audit_logs user_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_audit_logs
    ADD CONSTRAINT user_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: workout_plan_assignments workout_plan_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plan_assignments
    ADD CONSTRAINT workout_plan_assignments_pkey PRIMARY KEY (id);


--
-- Name: workout_plan_assignments workout_plan_assignments_plan_id_athlete_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plan_assignments
    ADD CONSTRAINT workout_plan_assignments_plan_id_athlete_id_key UNIQUE (plan_id, athlete_id);


--
-- Name: workout_plans workout_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_pkey PRIMARY KEY (id);


--
-- Name: workouts workouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts
    ADD CONSTRAINT workouts_pkey PRIMARY KEY (id);


--
-- Name: idx_availability_trainer_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_trainer_day ON public.trainer_availabilities USING btree (trainer_id, day_of_week);


--
-- Name: idx_bm_athlete_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bm_athlete_date ON public.body_measurements USING btree (athlete_id, date);


--
-- Name: idx_bm_athlete_weight; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bm_athlete_weight ON public.body_measurements USING btree (athlete_id, weight);


--
-- Name: idx_coaching_requests_athlete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coaching_requests_athlete ON public.coaching_requests USING btree (athlete_id, status);


--
-- Name: idx_coaching_requests_trainer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coaching_requests_trainer ON public.coaching_requests USING btree (trainer_id, status);


--
-- Name: idx_comments_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_author ON public.comments USING btree (author_id);


--
-- Name: idx_comments_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_parent ON public.comments USING btree (parent_comment_id);


--
-- Name: idx_comments_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_target ON public.comments USING btree (target_type, target_id);


--
-- Name: idx_exercises_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exercises_category ON public.exercises USING btree (category);


--
-- Name: idx_exercises_equipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exercises_equipment ON public.exercises USING btree (equipment_id);


--
-- Name: idx_exercises_muscle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exercises_muscle ON public.exercises USING btree (muscle_group_id);


--
-- Name: idx_exercises_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exercises_name ON public.exercises USING btree (name);


--
-- Name: idx_invitations_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_code ON public.invitations USING btree (code);


--
-- Name: idx_invitations_trainer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_trainer ON public.invitations USING btree (trainer_id, status);


--
-- Name: idx_meals_athlete_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meals_athlete_date ON public.meals USING btree (athlete_id, date);


--
-- Name: idx_meals_items_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meals_items_gin ON public.meals USING gin (items);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_relationships_athlete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationships_athlete ON public.relationships USING btree (athlete_id, status);


--
-- Name: idx_relationships_trainer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationships_trainer ON public.relationships USING btree (trainer_id, status);


--
-- Name: idx_reviews_trainer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_trainer ON public.trainer_reviews USING btree (trainer_id);


--
-- Name: idx_user_audit_logs_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_audit_logs_changed_at ON public.user_audit_logs USING btree (changed_at DESC);


--
-- Name: idx_user_audit_logs_user_changed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_audit_logs_user_changed ON public.user_audit_logs USING btree (user_id, changed_at DESC);


--
-- Name: idx_user_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_audit_logs_user_id ON public.user_audit_logs USING btree (user_id);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_workout_plans_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workout_plans_creator ON public.workout_plans USING btree (creator_id);


--
-- Name: idx_workout_plans_exercises_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workout_plans_exercises_gin ON public.workout_plans USING gin (exercises);


--
-- Name: idx_workouts_athlete_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workouts_athlete_date ON public.workouts USING btree (athlete_id, date);


--
-- Name: idx_workouts_exercises_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workouts_exercises_gin ON public.workouts USING gin (exercises);


--
-- Name: idx_workouts_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workouts_plan ON public.workouts USING btree (plan_id);


--
-- Name: idx_wpa_athlete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wpa_athlete ON public.workout_plan_assignments USING btree (athlete_id);


--
-- Name: idx_wpa_trainer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wpa_trainer ON public.workout_plan_assignments USING btree (trainer_id);


--
-- Name: users trg_users_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_audit AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.log_users_audit();


--
-- Name: body_measurements body_measurements_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.body_measurements
    ADD CONSTRAINT body_measurements_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: coaching_requests coaching_requests_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_requests
    ADD CONSTRAINT coaching_requests_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: coaching_requests coaching_requests_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_requests
    ADD CONSTRAINT coaching_requests_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: comments comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: comments comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE SET NULL;


--
-- Name: exercises exercises_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: exercises exercises_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment_definitions(id);


--
-- Name: exercises exercises_muscle_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_muscle_group_id_fkey FOREIGN KEY (muscle_group_id) REFERENCES public.muscle_groups(id);


--
-- Name: invitations invitations_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: invitations invitations_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: meals meals_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: relationships relationships_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: relationships relationships_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: trainer_availabilities trainer_availabilities_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_availabilities
    ADD CONSTRAINT trainer_availabilities_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: trainer_reviews trainer_reviews_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_reviews
    ADD CONSTRAINT trainer_reviews_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: trainer_reviews trainer_reviews_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_reviews
    ADD CONSTRAINT trainer_reviews_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_audit_logs user_audit_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_audit_logs
    ADD CONSTRAINT user_audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: workout_plan_assignments workout_plan_assignments_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plan_assignments
    ADD CONSTRAINT workout_plan_assignments_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: workout_plan_assignments workout_plan_assignments_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plan_assignments
    ADD CONSTRAINT workout_plan_assignments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.workout_plans(id) ON DELETE CASCADE;


--
-- Name: workout_plan_assignments workout_plan_assignments_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plan_assignments
    ADD CONSTRAINT workout_plan_assignments_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: workout_plans workout_plans_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: workouts workouts_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts
    ADD CONSTRAINT workouts_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: workouts workouts_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts
    ADD CONSTRAINT workouts_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.workout_plans(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

-- Restore default search path for subsequent migrations
SELECT pg_catalog.set_config('search_path', 'public', false);



