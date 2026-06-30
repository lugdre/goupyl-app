--
-- PostgreSQL database dump
--

\restrict dqI4h3nhOAOJgFL6I7r3NZwYUK00bL6S8iR8DTfVQCftA9cl6NUBP95fGtivQSi

-- Dumped from database version 16.13 (Homebrew)
-- Dumped by pg_dump version 16.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: luciengendre
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO luciengendre;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: luciengendre
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AppointmentStatus; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."AppointmentStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'DONE',
    'CANCELLED'
);


ALTER TYPE public."AppointmentStatus" OWNER TO luciengendre;

--
-- Name: BillingCycle; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."BillingCycle" AS ENUM (
    'MONTHLY',
    'YEARLY'
);


ALTER TYPE public."BillingCycle" OWNER TO luciengendre;

--
-- Name: Level; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."Level" AS ENUM (
    'DEBUTANT',
    'INTERMEDIAIRE',
    'AVANCE',
    'ELITE'
);


ALTER TYPE public."Level" OWNER TO luciengendre;

--
-- Name: ResourceAccess; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."ResourceAccess" AS ENUM (
    'ZEN',
    'PULSE',
    'BOOST'
);


ALTER TYPE public."ResourceAccess" OWNER TO luciengendre;

--
-- Name: ResourceType; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."ResourceType" AS ENUM (
    'ARTICLE',
    'VIDEO'
);


ALTER TYPE public."ResourceType" OWNER TO luciengendre;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."Role" AS ENUM (
    'CLIENT',
    'INTERVENANT',
    'ADMIN',
    'ENTREPRISE'
);


ALTER TYPE public."Role" OWNER TO luciengendre;

--
-- Name: ServiceCategory; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."ServiceCategory" AS ENUM (
    'SPORT',
    'NUTRITION',
    'MENTAL',
    'BIENETRE'
);


ALTER TYPE public."ServiceCategory" OWNER TO luciengendre;

--
-- Name: SubscriptionPlan; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."SubscriptionPlan" AS ENUM (
    'ESSENTIELLE',
    'PERFORMANCE',
    'ELITE',
    'ZEN_ENTREPRISE',
    'PULSE_ENTREPRISE',
    'BOOST_ENTREPRISE'
);


ALTER TYPE public."SubscriptionPlan" OWNER TO luciengendre;

--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'ACTIVE',
    'CANCELLED',
    'EXPIRED'
);


ALTER TYPE public."SubscriptionStatus" OWNER TO luciengendre;

--
-- Name: VerificationStatus; Type: TYPE; Schema: public; Owner: luciengendre
--

CREATE TYPE public."VerificationStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED'
);


ALTER TYPE public."VerificationStatus" OWNER TO luciengendre;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO luciengendre;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    client_id integer NOT NULL,
    intervenant_id integer NOT NULL,
    service_id integer NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    duration_minutes integer NOT NULL,
    status public."AppointmentStatus" DEFAULT 'PENDING'::public."AppointmentStatus" NOT NULL,
    notes text,
    cancelled_by text,
    cancel_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    payment_status text DEFAULT 'unpaid'::text
);


ALTER TABLE public.appointments OWNER TO luciengendre;

--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO luciengendre;

--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: availabilities; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.availabilities (
    id integer NOT NULL,
    intervenant_id integer NOT NULL,
    day_of_week integer NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    is_recurring boolean DEFAULT true NOT NULL,
    date_override date,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.availabilities OWNER TO luciengendre;

--
-- Name: availabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.availabilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.availabilities_id_seq OWNER TO luciengendre;

--
-- Name: availabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.availabilities_id_seq OWNED BY public.availabilities.id;


--
-- Name: company_invites; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.company_invites (
    id integer NOT NULL,
    company_id integer NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    used_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.company_invites OWNER TO luciengendre;

--
-- Name: company_invites_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.company_invites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_invites_id_seq OWNER TO luciengendre;

--
-- Name: company_invites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.company_invites_id_seq OWNED BY public.company_invites.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    stored_name text NOT NULL,
    original_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.documents OWNER TO luciengendre;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO luciengendre;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.payments (
    id text NOT NULL,
    appointment_id integer NOT NULL,
    stripe_payment_intent_id text NOT NULL,
    amount integer NOT NULL,
    platform_fee integer NOT NULL,
    intervenant_share integer NOT NULL,
    currency text DEFAULT 'eur'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payments OWNER TO luciengendre;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    level public."Level" DEFAULT 'DEBUTANT'::public."Level" NOT NULL,
    objectives jsonb,
    sport_type text,
    constraints text,
    bio text,
    specialties jsonb,
    experience integer,
    diplomas jsonb,
    hourly_rate numeric(10,2),
    city text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.profiles OWNER TO luciengendre;

--
-- Name: profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profiles_id_seq OWNER TO luciengendre;

--
-- Name: profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.profiles_id_seq OWNED BY public.profiles.id;


--
-- Name: resources; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    content text,
    video_url text,
    type public."ResourceType" NOT NULL,
    category public."ServiceCategory" NOT NULL,
    access public."ResourceAccess" DEFAULT 'ZEN'::public."ResourceAccess" NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.resources OWNER TO luciengendre;

--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resources_id_seq OWNER TO luciengendre;

--
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    appointment_id integer NOT NULL,
    client_id integer NOT NULL,
    intervenant_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reviews OWNER TO luciengendre;

--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reviews_id_seq OWNER TO luciengendre;

--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.services (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    category public."ServiceCategory" NOT NULL,
    duration_minutes integer NOT NULL,
    price numeric(10,2) NOT NULL,
    available_in_plans jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.services OWNER TO luciengendre;

--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_id_seq OWNER TO luciengendre;

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: session_reports; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.session_reports (
    id integer NOT NULL,
    appointment_id integer NOT NULL,
    intervenant_id integer NOT NULL,
    notes text NOT NULL,
    objectives_update text,
    rating integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.session_reports OWNER TO luciengendre;

--
-- Name: session_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.session_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.session_reports_id_seq OWNER TO luciengendre;

--
-- Name: session_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.session_reports_id_seq OWNED BY public.session_reports.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    plan public."SubscriptionPlan" NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    billing_cycle public."BillingCycle" DEFAULT 'MONTHLY'::public."BillingCycle" NOT NULL
);


ALTER TABLE public.subscriptions OWNER TO luciengendre;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO luciengendre;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: luciengendre
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role public."Role" DEFAULT 'CLIENT'::public."Role" NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    company_name text,
    siret text,
    verification_note text,
    verification_status public."VerificationStatus" DEFAULT 'PENDING'::public."VerificationStatus" NOT NULL,
    employer_company_id integer,
    join_code text,
    stripe_account_id text,
    stripe_account_status text DEFAULT 'pending'::text
);


ALTER TABLE public.users OWNER TO luciengendre;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: luciengendre
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO luciengendre;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: luciengendre
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: availabilities id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.availabilities ALTER COLUMN id SET DEFAULT nextval('public.availabilities_id_seq'::regclass);


--
-- Name: company_invites id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.company_invites ALTER COLUMN id SET DEFAULT nextval('public.company_invites_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: profiles id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.profiles ALTER COLUMN id SET DEFAULT nextval('public.profiles_id_seq'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: session_reports id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.session_reports ALTER COLUMN id SET DEFAULT nextval('public.session_reports_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
aa5327c2-f2f4-4457-b5a4-82aa8bb35817	4528799ed34b278937034fdf1f2335a839cde9ac92de0f9805652e41f2fee65c	2026-03-25 14:39:07.474292+01	20260325133907_init	\N	\N	2026-03-25 14:39:07.443716+01	1
001ed093-167f-4a9c-acad-c650c69a8822	b2316e4ff6778d9b8f7faca4f2d9535fdc661059395c337b9773a46deaa795dc	2026-03-26 10:56:53.441161+01	20260326095653_add_enterprise_plans_and_billing_cycle	\N	\N	2026-03-26 10:56:53.437594+01	1
2aab30b9-443e-41dc-b8f3-c89d65d4ffe3	b039645d7977ee65f6ab919437bb00234e1de8f19196d864244a9c15b712ac43	2026-03-26 11:04:55.023904+01	20260326100455_add_entreprise_role_and_company_name	\N	\N	2026-03-26 11:04:55.021879+01	1
452447fa-54e5-4620-86c0-2a73528852c4	bb24bf704159daa801ff5e9791125840d5ec2394c39795681ba80b3a4d5685df	2026-03-27 13:20:06.297439+01	20260327122006_add_verification_and_documents	\N	\N	2026-03-27 13:20:06.290178+01	1
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.appointments (id, client_id, intervenant_id, service_id, scheduled_at, duration_minutes, status, notes, cancelled_by, cancel_reason, created_at, updated_at, payment_status) FROM stdin;
21	96	65	42	2026-03-25 13:01:28.561	60	DONE	\N	\N	\N	2026-04-01 13:01:28.561	2026-04-01 13:01:28.561	unpaid
22	95	75	43	2026-04-21 10:30:00	90	PENDING	\N	\N	\N	2026-04-02 08:51:17.91	2026-04-02 08:51:17.91	unpaid
20	95	65	42	2026-04-08 13:01:28.56	60	DONE	Premiere seance d'evaluation	\N	\N	2026-04-01 13:01:28.561	2026-04-02 10:21:18.709	unpaid
24	96	65	45	2026-04-20 12:00:00	60	DONE	Prépare un marathon	\N	\N	2026-04-02 09:07:49.87	2026-04-02 10:21:19.451	paid
23	96	65	42	2026-05-21 12:20:00	60	DONE	\N	\N	\N	2026-04-02 09:02:10.394	2026-04-02 10:21:20.365	paid
25	96	66	43	2026-04-11 13:30:00	90	DONE	Je souhaite perdre 15 kilos avant le début de l'été.	\N	\N	2026-04-02 10:35:51.162	2026-04-02 10:42:08.186	paid
26	96	67	47	2026-04-30 13:30:00	90	CANCELLED	TEST ANNULATION	\N	\N	2026-04-02 10:44:52.517	2026-04-02 10:46:10.788	unpaid
27	96	65	46	2026-04-25 11:45:00	75	CANCELLED	TEST ANNULATION	\N	\N	2026-04-02 10:45:37.627	2026-04-02 10:47:44.406	paid
28	96	65	44	2027-01-30 19:05:00	60	DONE	TEST PAIEMENT COACH	\N	\N	2026-04-02 13:56:24.601	2026-04-02 13:57:32.076	paid
29	96	65	43	2026-06-13 21:30:00	90	DONE	TEST GAINS	\N	\N	2026-04-02 14:09:45.707	2026-04-02 14:11:23.705	paid
\.


--
-- Data for Name: availabilities; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.availabilities (id, intervenant_id, day_of_week, start_time, end_time, is_recurring, date_override, created_at) FROM stdin;
83	65	1	09:00	12:00	t	\N	2026-04-01 13:01:28.553
84	65	1	14:00	18:00	t	\N	2026-04-01 13:01:28.553
85	65	2	09:00	12:00	t	\N	2026-04-01 13:01:28.553
86	65	2	14:00	18:00	t	\N	2026-04-01 13:01:28.553
87	65	3	09:00	12:00	t	\N	2026-04-01 13:01:28.553
88	65	3	14:00	18:00	t	\N	2026-04-01 13:01:28.553
89	65	4	09:00	12:00	t	\N	2026-04-01 13:01:28.553
90	65	4	14:00	18:00	t	\N	2026-04-01 13:01:28.553
91	66	1	10:00	17:00	t	\N	2026-04-01 13:01:28.554
92	66	2	10:00	17:00	t	\N	2026-04-01 13:01:28.554
93	66	3	10:00	17:00	t	\N	2026-04-01 13:01:28.555
94	68	0	08:00	12:00	t	\N	2026-04-01 13:01:28.556
95	68	1	08:00	12:00	t	\N	2026-04-01 13:01:28.556
96	68	2	08:00	12:00	t	\N	2026-04-01 13:01:28.556
97	68	3	08:00	12:00	t	\N	2026-04-01 13:01:28.556
98	68	4	08:00	12:00	t	\N	2026-04-01 13:01:28.556
99	72	0	08:00	12:00	t	\N	2026-04-01 13:01:28.556
100	72	1	08:00	12:00	t	\N	2026-04-01 13:01:28.556
101	72	2	08:00	12:00	t	\N	2026-04-01 13:01:28.556
102	72	3	08:00	12:00	t	\N	2026-04-01 13:01:28.556
103	72	4	08:00	12:00	t	\N	2026-04-01 13:01:28.556
104	69	0	08:00	12:00	t	\N	2026-04-01 13:01:28.556
105	69	1	08:00	12:00	t	\N	2026-04-01 13:01:28.556
106	69	2	08:00	12:00	t	\N	2026-04-01 13:01:28.556
107	69	3	08:00	12:00	t	\N	2026-04-01 13:01:28.556
108	69	4	08:00	12:00	t	\N	2026-04-01 13:01:28.556
109	91	0	08:00	12:00	t	\N	2026-04-01 13:01:28.556
110	91	1	08:00	12:00	t	\N	2026-04-01 13:01:28.556
111	91	2	08:00	12:00	t	\N	2026-04-01 13:01:28.556
112	91	3	08:00	12:00	t	\N	2026-04-01 13:01:28.556
113	91	4	08:00	12:00	t	\N	2026-04-01 13:01:28.556
114	76	0	08:00	12:00	t	\N	2026-04-01 13:01:28.556
115	76	1	08:00	12:00	t	\N	2026-04-01 13:01:28.556
116	76	2	08:00	12:00	t	\N	2026-04-01 13:01:28.556
117	76	3	08:00	12:00	t	\N	2026-04-01 13:01:28.556
118	76	4	08:00	12:00	t	\N	2026-04-01 13:01:28.556
119	84	0	14:00	19:00	t	\N	2026-04-01 13:01:28.556
120	84	1	14:00	19:00	t	\N	2026-04-01 13:01:28.556
121	84	2	14:00	19:00	t	\N	2026-04-01 13:01:28.556
122	84	3	14:00	19:00	t	\N	2026-04-01 13:01:28.556
123	84	4	14:00	19:00	t	\N	2026-04-01 13:01:28.556
124	75	0	14:00	19:00	t	\N	2026-04-01 13:01:28.556
125	75	1	14:00	19:00	t	\N	2026-04-01 13:01:28.556
126	75	2	14:00	19:00	t	\N	2026-04-01 13:01:28.556
127	75	3	14:00	19:00	t	\N	2026-04-01 13:01:28.556
128	75	4	14:00	19:00	t	\N	2026-04-01 13:01:28.556
129	81	0	14:00	19:00	t	\N	2026-04-01 13:01:28.556
130	81	1	14:00	19:00	t	\N	2026-04-01 13:01:28.556
131	81	2	14:00	19:00	t	\N	2026-04-01 13:01:28.556
132	81	3	14:00	19:00	t	\N	2026-04-01 13:01:28.556
133	81	4	14:00	19:00	t	\N	2026-04-01 13:01:28.556
134	74	0	14:00	19:00	t	\N	2026-04-01 13:01:28.556
135	74	1	14:00	19:00	t	\N	2026-04-01 13:01:28.556
136	74	2	14:00	19:00	t	\N	2026-04-01 13:01:28.556
137	74	3	14:00	19:00	t	\N	2026-04-01 13:01:28.556
138	74	4	14:00	19:00	t	\N	2026-04-01 13:01:28.556
139	87	0	14:00	19:00	t	\N	2026-04-01 13:01:28.556
140	87	1	14:00	19:00	t	\N	2026-04-01 13:01:28.556
141	87	2	14:00	19:00	t	\N	2026-04-01 13:01:28.556
142	87	3	14:00	19:00	t	\N	2026-04-01 13:01:28.556
143	87	4	14:00	19:00	t	\N	2026-04-01 13:01:28.556
144	71	0	09:00	12:30	t	\N	2026-04-01 13:01:28.556
145	71	0	15:00	18:00	t	\N	2026-04-01 13:01:28.556
146	71	1	09:00	12:30	t	\N	2026-04-01 13:01:28.556
147	71	1	15:00	18:00	t	\N	2026-04-01 13:01:28.556
148	71	2	09:00	12:30	t	\N	2026-04-01 13:01:28.556
149	71	2	15:00	18:00	t	\N	2026-04-01 13:01:28.556
150	71	3	09:00	12:30	t	\N	2026-04-01 13:01:28.556
151	71	3	15:00	18:00	t	\N	2026-04-01 13:01:28.556
152	71	4	09:00	12:30	t	\N	2026-04-01 13:01:28.556
153	71	4	15:00	18:00	t	\N	2026-04-01 13:01:28.556
154	71	5	09:00	12:30	t	\N	2026-04-01 13:01:28.556
155	71	5	15:00	18:00	t	\N	2026-04-01 13:01:28.556
156	85	0	09:00	12:30	t	\N	2026-04-01 13:01:28.556
157	85	0	15:00	18:00	t	\N	2026-04-01 13:01:28.556
158	85	1	09:00	12:30	t	\N	2026-04-01 13:01:28.556
159	85	1	15:00	18:00	t	\N	2026-04-01 13:01:28.556
160	85	2	09:00	12:30	t	\N	2026-04-01 13:01:28.556
161	85	2	15:00	18:00	t	\N	2026-04-01 13:01:28.556
162	85	3	09:00	12:30	t	\N	2026-04-01 13:01:28.556
163	85	3	15:00	18:00	t	\N	2026-04-01 13:01:28.556
164	85	4	09:00	12:30	t	\N	2026-04-01 13:01:28.556
165	85	4	15:00	18:00	t	\N	2026-04-01 13:01:28.556
166	85	5	09:00	12:30	t	\N	2026-04-01 13:01:28.556
167	85	5	15:00	18:00	t	\N	2026-04-01 13:01:28.556
168	77	0	09:00	12:30	t	\N	2026-04-01 13:01:28.556
169	77	0	15:00	18:00	t	\N	2026-04-01 13:01:28.556
170	77	1	09:00	12:30	t	\N	2026-04-01 13:01:28.556
171	77	1	15:00	18:00	t	\N	2026-04-01 13:01:28.556
172	77	2	09:00	12:30	t	\N	2026-04-01 13:01:28.556
173	77	2	15:00	18:00	t	\N	2026-04-01 13:01:28.556
174	77	3	09:00	12:30	t	\N	2026-04-01 13:01:28.556
175	77	3	15:00	18:00	t	\N	2026-04-01 13:01:28.556
176	77	4	09:00	12:30	t	\N	2026-04-01 13:01:28.556
177	77	4	15:00	18:00	t	\N	2026-04-01 13:01:28.556
178	77	5	09:00	12:30	t	\N	2026-04-01 13:01:28.556
179	77	5	15:00	18:00	t	\N	2026-04-01 13:01:28.556
180	83	0	09:00	12:30	t	\N	2026-04-01 13:01:28.556
181	83	0	15:00	18:00	t	\N	2026-04-01 13:01:28.556
182	83	1	09:00	12:30	t	\N	2026-04-01 13:01:28.556
183	83	1	15:00	18:00	t	\N	2026-04-01 13:01:28.556
184	83	2	09:00	12:30	t	\N	2026-04-01 13:01:28.556
185	83	2	15:00	18:00	t	\N	2026-04-01 13:01:28.556
186	83	3	09:00	12:30	t	\N	2026-04-01 13:01:28.556
187	83	3	15:00	18:00	t	\N	2026-04-01 13:01:28.556
188	83	4	09:00	12:30	t	\N	2026-04-01 13:01:28.556
189	83	4	15:00	18:00	t	\N	2026-04-01 13:01:28.556
190	83	5	09:00	12:30	t	\N	2026-04-01 13:01:28.556
191	83	5	15:00	18:00	t	\N	2026-04-01 13:01:28.556
192	90	0	09:00	12:30	t	\N	2026-04-01 13:01:28.556
193	90	0	15:00	18:00	t	\N	2026-04-01 13:01:28.556
194	90	1	09:00	12:30	t	\N	2026-04-01 13:01:28.556
195	90	1	15:00	18:00	t	\N	2026-04-01 13:01:28.556
196	90	2	09:00	12:30	t	\N	2026-04-01 13:01:28.556
197	90	2	15:00	18:00	t	\N	2026-04-01 13:01:28.556
198	90	3	09:00	12:30	t	\N	2026-04-01 13:01:28.556
199	90	3	15:00	18:00	t	\N	2026-04-01 13:01:28.556
200	90	4	09:00	12:30	t	\N	2026-04-01 13:01:28.556
201	90	4	15:00	18:00	t	\N	2026-04-01 13:01:28.556
202	90	5	09:00	12:30	t	\N	2026-04-01 13:01:28.556
203	90	5	15:00	18:00	t	\N	2026-04-01 13:01:28.556
204	70	1	10:00	18:00	t	\N	2026-04-01 13:01:28.556
205	70	2	10:00	18:00	t	\N	2026-04-01 13:01:28.556
206	70	3	10:00	18:00	t	\N	2026-04-01 13:01:28.556
207	70	4	10:00	18:00	t	\N	2026-04-01 13:01:28.556
208	70	5	10:00	18:00	t	\N	2026-04-01 13:01:28.556
209	88	1	10:00	18:00	t	\N	2026-04-01 13:01:28.556
210	88	2	10:00	18:00	t	\N	2026-04-01 13:01:28.556
211	88	3	10:00	18:00	t	\N	2026-04-01 13:01:28.556
212	88	4	10:00	18:00	t	\N	2026-04-01 13:01:28.556
213	88	5	10:00	18:00	t	\N	2026-04-01 13:01:28.556
214	80	1	10:00	18:00	t	\N	2026-04-01 13:01:28.556
215	80	2	10:00	18:00	t	\N	2026-04-01 13:01:28.556
216	80	3	10:00	18:00	t	\N	2026-04-01 13:01:28.556
217	80	4	10:00	18:00	t	\N	2026-04-01 13:01:28.556
218	80	5	10:00	18:00	t	\N	2026-04-01 13:01:28.556
219	89	1	10:00	18:00	t	\N	2026-04-01 13:01:28.556
220	89	2	10:00	18:00	t	\N	2026-04-01 13:01:28.556
221	89	3	10:00	18:00	t	\N	2026-04-01 13:01:28.556
222	89	4	10:00	18:00	t	\N	2026-04-01 13:01:28.556
223	89	5	10:00	18:00	t	\N	2026-04-01 13:01:28.556
224	82	1	10:00	18:00	t	\N	2026-04-01 13:01:28.556
225	82	2	10:00	18:00	t	\N	2026-04-01 13:01:28.556
226	82	3	10:00	18:00	t	\N	2026-04-01 13:01:28.556
227	82	4	10:00	18:00	t	\N	2026-04-01 13:01:28.556
228	82	5	10:00	18:00	t	\N	2026-04-01 13:01:28.556
229	78	1	10:00	18:00	t	\N	2026-04-01 13:01:28.556
230	78	2	10:00	18:00	t	\N	2026-04-01 13:01:28.556
231	78	3	10:00	18:00	t	\N	2026-04-01 13:01:28.556
232	78	4	10:00	18:00	t	\N	2026-04-01 13:01:28.556
233	78	5	10:00	18:00	t	\N	2026-04-01 13:01:28.556
234	73	1	10:00	18:00	t	\N	2026-04-01 13:01:28.556
235	73	2	10:00	18:00	t	\N	2026-04-01 13:01:28.556
236	73	3	10:00	18:00	t	\N	2026-04-01 13:01:28.556
237	73	4	10:00	18:00	t	\N	2026-04-01 13:01:28.556
238	73	5	10:00	18:00	t	\N	2026-04-01 13:01:28.556
239	79	1	10:00	18:00	t	\N	2026-04-01 13:01:28.556
240	79	2	10:00	18:00	t	\N	2026-04-01 13:01:28.556
241	79	3	10:00	18:00	t	\N	2026-04-01 13:01:28.556
242	79	4	10:00	18:00	t	\N	2026-04-01 13:01:28.556
243	79	5	10:00	18:00	t	\N	2026-04-01 13:01:28.556
244	86	1	10:00	18:00	t	\N	2026-04-01 13:01:28.556
245	86	2	10:00	18:00	t	\N	2026-04-01 13:01:28.556
246	86	3	10:00	18:00	t	\N	2026-04-01 13:01:28.556
247	86	4	10:00	18:00	t	\N	2026-04-01 13:01:28.556
248	86	5	10:00	18:00	t	\N	2026-04-01 13:01:28.556
\.


--
-- Data for Name: company_invites; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.company_invites (id, company_id, email, token, used_at, expires_at, created_at) FROM stdin;
1	92	lucien@apyk.fr	CB4C492D7B46	\N	2026-04-08 13:50:06.182	2026-04-01 13:50:06.183
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.documents (id, user_id, type, stored_name, original_name, mime_type, size_bytes, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.payments (id, appointment_id, stripe_payment_intent_id, amount, platform_fee, intervenant_share, currency, status, created_at, updated_at) FROM stdin;
cmnh9l62k0001dpov50bp6vhz	24	pi_3THhntRy5ak4YIFs1jWU8ROk	6500	1950	4550	eur	succeeded	2026-04-02 09:20:33.02	2026-04-02 09:45:27.661
cmnhbczy40005yupgzdj3edui	23	pi_3THiCURy5ak4YIFs05GpT8fU	5500	1650	3850	eur	pending	2026-04-02 10:10:11.068	2026-04-02 10:10:11.086
cmnhcg29n0001a7g1d8j519h4	25	pi_3THiftRy5ak4YIFs1dGfeo8O	7000	2100	4900	eur	pending	2026-04-02 10:40:33.659	2026-04-02 10:40:34.106
cmnhcndvx0005a7g1ltb2llob	27	pi_3THilPRy5ak4YIFs1sTnVT8y	4000	1200	2800	eur	pending	2026-04-02 10:46:15.31	2026-04-02 10:46:15.317
cmnhjgd5n0001iysvk8sv0c2n	28	pi_3THljkRy5ak4YIFs1SLMkhQh	3500	1050	2450	eur	pending	2026-04-02 13:56:45.082	2026-04-02 13:56:45.101
cmnhjy2fr000112nk519r1kh1	29	pi_3THlx4Ry5ak4YIFs1OLH9ljh	7000	2100	4900	eur	pending	2026-04-02 14:10:30.999	2026-04-02 14:10:31.105
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.profiles (id, user_id, level, objectives, sport_type, constraints, bio, specialties, experience, diplomas, hourly_rate, city, created_at, updated_at) FROM stdin;
33	65	ELITE	\N	\N	\N	Coach sportif diplome BPJEPS, 15 ans d'experience en preparation physique.	["musculation", "running", "remise en forme"]	15	["BPJEPS", "DE JEPS"]	60.00	Angers	2026-04-01 13:01:28.504	2026-04-01 13:01:28.504
34	66	AVANCE	\N	\N	\N	Dieteticienne-nutritionniste specialisee en nutrition sportive.	["nutrition sportive", "equilibre alimentaire", "perte de poids"]	8	["BTS Dietetique", "DU Nutrition du sport"]	70.00	Angers	2026-04-01 13:01:28.507	2026-04-01 13:01:28.507
35	67	AVANCE	\N	\N	\N	Psychologue du sport, accompagnement mental des athletes.	["gestion du stress", "preparation mentale", "sophrologie"]	10	["Master Psychologie du sport"]	80.00	Paris	2026-04-01 13:01:28.508	2026-04-01 13:01:28.508
36	68	AVANCE	\N	\N	\N	Coach fitness et yoga certifiée RYT-200, spécialisée dans la remise en forme post-grossesse et le yoga thérapeutique.	["yoga", "pilates", "remise en forme"]	7	["RYT-200 Yoga Alliance", "BPJEPS AF"]	65.00	Paris	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
37	69	AVANCE	\N	\N	\N	Nutritionniste et micronutritionniste, consultations en cabinet et à domicile. Approche fonctionnelle et personnalisée.	["micronutrition", "nutrition fonctionnelle", "perte de poids"]	9	["DU Micronutrition", "BTS Dietetique"]	75.00	Boulogne-Billancourt	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
40	72	ELITE	\N	\N	\N	Préparateur physique ex-professionnel, ancien staff technique Ligue 1. Spécialiste haute performance et réathlétisation.	["preparation physique", "reathletisation", "musculation"]	18	["DE JEPS", "Master STAPS"]	90.00	Paris	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
44	76	AVANCE	\N	\N	\N	Coach bien-être et sophrologie caycédienne. Accompagnement des entreprises dans la gestion du stress et la qualité de vie au travail.	["sophrologie", "meditation", "gestion du stress"]	12	["Titre RNCP Sophrologue", "DU Qualite de vie au travail"]	68.00	Lyon	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
48	79	ELITE	\N	\N	\N	Coach tennis et padel. Ancien joueur ATP. Cours tous niveaux, perfectionnement technique et préparation aux compétitions amateurs.	["tennis", "padel", "preparation competition"]	20	["DE Tennis", "Moniteur Padel"]	85.00	Nice	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
52	84	INTERMEDIAIRE	\N	\N	\N	Coach sportif diplômé, spécialiste renforcement musculaire et sport-santé. Accompagnement des seniors actifs et personnes avec pathologies.	["sport-sante", "seniors", "renforcement musculaire"]	5	["BPJEPS AF", "CQP SIAP Sport Sante"]	55.00	Lyon	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
56	88	AVANCE	\N	\N	\N	Diététicienne clinique et sportive, spécialisée dans les troubles du comportement alimentaire et la nutrition de performance.	["troubles alimentaires", "nutrition performance", "alimentation intuitive"]	10	["DUT Genie Biologique", "DU TCA", "BTS Dietetique"]	70.00	Strasbourg	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
38	70	ELITE	\N	\N	\N	Préparateur physique spécialisé sports collectifs. Travail de vitesse, agilité, coordination. Coach certifié UEFA dans l'encadrement sportif.	["sports collectifs", "vitesse", "agilite"]	12	["DE JEPS", "Preparateur physique certifie"]	65.00	Saint-Nazaire	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
41	73	INTERMEDIAIRE	\N	\N	\N	Coach en nutrition végétale et spécialiste de l'alimentation anti-inflammatoire. Consultations individuelles et ateliers cuisine santé.	["alimentation vegetale", "anti-inflammatoire", "ateliers cuisine"]	3	["Nutritionniste certifiee", "DU Phytotherapie Nutrition"]	52.00	Brest	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
45	77	AVANCE	\N	\N	\N	Psychologue du travail et coach en gestion du stress. Interventions en entreprises pour prévenir les risques psychosociaux.	["psychologie du travail", "prevention RPS", "gestion du stress"]	15	["Master Psychologie du Travail", "Coach certifie ICF"]	85.00	Toulouse	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
49	81	ELITE	\N	\N	\N	Entraîneur de boxe française et coach fitness. Champion régional 2015. Cours collectifs et accompagnements individuels.	["boxe francaise", "fitness", "cardio-training"]	14	["Brevet Federal Boxe Francaise", "BPJEPS AGFF"]	58.00	Marseille	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
53	85	AVANCE	\N	\N	\N	Ostéopathe et coach en mobilité. Séances alliant travail postural, étirements profonds et rééducation fonctionnelle.	["mobilite", "posturologie", "etirements therapeutiques"]	8	["Diplome Osteopathie", "Certifie FRC Mobility"]	80.00	Bordeaux	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
57	90	INTERMEDIAIRE	\N	\N	\N	Coach bien-être holistique, formatrice en nutrition et naturopathie. Accompagnement global pour une hygiène de vie saine et durable.	["naturopathie", "nutrition holistique", "gestion du poids"]	4	["Praticien Naturopathe", "Diplome Nutrition"]	52.00	Nantes	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
39	71	ELITE	\N	\N	\N	Coach running et triathlon, ancienne athlète nationale. Préparation physique spécifique et plans d'entraînement personnalisés.	["running", "triathlon", "cyclisme"]	16	["BPJEPS APT", "Diplome Federal FFA"]	75.00	Bordeaux	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
42	74	AVANCE	\N	\N	\N	Professeure de yoga Iyengar et instructrice de méditation pleine conscience. Ateliers bien-être en entreprise depuis 2017.	["yoga iyengar", "meditation pleine conscience", "bien-etre entreprise"]	9	["Certification Iyengar Yoga", "MBSR Mindfulness"]	62.00	Aix-en-Provence	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
46	78	AVANCE	\N	\N	\N	Coach outdoor et survivaliste. Randonnée, trail, sports de pleine nature. Ateliers team-building nature pour entreprises.	["outdoor", "trail", "team-building nature"]	9	["BPJEPS Activites de Randonnee", "Guide de montagne stagiaire"]	60.00	Rennes	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
50	82	INTERMEDIAIRE	\N	\N	\N	Professeure de danse et coach fitness. Zumba, step, danse contemporaine. Animations séances collectives festives et dynamiques.	["zumba", "danse fitness", "step"]	5	["Professeure de danse DE", "BPJEPS AF"]	48.00	Roubaix	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
54	86	AVANCE	\N	\N	\N	Coach en bienêtre et thérapie par le mouvement. Danse-thérapie, stretching profond, techniques de relaxation avancées.	["danse-therapie", "stretching", "relaxation"]	11	["Diplome Danse-Therapie", "Certification Yin Yoga"]	68.00	Cannes	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
58	89	AVANCE	\N	\N	\N	Coach musculation et nutrition sportive. Accompagnement prise de masse, sèche et remise en forme. Suivi en salle ou à domicile.	["musculation", "seche", "prise de masse"]	6	["BTS STAPS", "Nutritionniste sportif certifie"]	50.00	Lille	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
43	75	AVANCE	\N	\N	\N	Diététicienne sportive et coach nutrition végétarienne. Consultations pour sportifs et entreprises souhaitant intégrer une alimentation durable.	["nutrition vegetarienne", "nutrition sportive", "bilan alimentaire"]	6	["BTS Dietetique", "DU Nutrition du sport"]	65.00	Grenoble	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
47	80	ELITE	\N	\N	\N	Coach natation et aquafitness. Ancien nageur de compétition nationale. Cours adultes débutants à confirmés, rééducation aquatique.	["natation", "aquafitness", "reeducation aquatique"]	13	["Maître Nageur Sauveteur", "BPJEPS AAN"]	55.00	Mulhouse	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
51	83	AVANCE	\N	\N	\N	Coach Pilates et rééducation posturale. Méthode Pilates traditionnelle et contemporaine, cours en groupe ou suivi individuel.	["pilates", "reeducation posturale", "gainage"]	7	["BPJEPS AF", "Certification Pilates STOTT"]	58.00	Montpellier	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
55	87	AVANCE	\N	\N	\N	Kinésiologue et coach sportif. Approche globale corps-esprit, spécialisé dans la récupération sportive et la prévention des blessures.	["kinesologie", "recuperation sportive", "prevention blessures"]	13	["Kinesiologue certifie", "DE JEPS"]	72.00	Toulon	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
59	91	ELITE	\N	\N	\N	Coach CrossFit certifié L2 et coach running. Préparation aux trails et compétitions d'endurance.	["crossfit", "running", "trail"]	11	["CrossFit L2", "BPJEPS AGFF"]	70.00	Vincennes	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511
60	95	DEBUTANT	["remise en forme", "perte de poids"]	fitness	Mal de dos chronique	\N	\N	\N	\N	\N	Angers	2026-04-01 13:01:28.55	2026-04-01 13:01:28.55
61	96	AVANCE	["competition triathlon", "optimisation performance"]	triathlon	\N	\N	\N	\N	\N	\N	Paris	2026-04-01 13:01:28.551	2026-04-01 13:01:28.551
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.resources (id, title, description, content, video_url, type, category, access, published, created_at, updated_at) FROM stdin;
27	5 étirements indispensables après une journée de travail	Réduisez les tensions musculaires accumulées au bureau avec cette routine de 10 minutes.	## Pourquoi s'étirer après le travail ?\n\nLa sédentarité prolongée raccourcit les muscles fléchisseurs de hanche, raidit le dos et crée des déséquilibres posturaux. Quelques minutes d'étirements suffisent à inverser ces effets.\n\n## Les 5 étirements clés\n\n### 1. Étirement du psoas (fléchisseur de hanche)\nPosition : un genou à terre, pied arrière au sol. Avancez le bassin en gardant le dos droit. Tenez 30 secondes de chaque côté.\n\n### 2. Étirement des ischio-jambiers\nAssis au sol, jambes tendues, penchez-vous en avant en gardant le dos droit. Tenez 30 secondes.\n\n### 3. Rotation thoracique\nAssis en tailleur, placez une main derrière la tête. Rotatez le tronc côté droit puis gauche. 10 rotations de chaque côté.\n\n### 4. Étirement du trapèze\nInclinez doucement la tête vers l'épaule droite, maintenez l'épaule gauche basse. 20 secondes de chaque côté.\n\n### 5. Étirement pectoral contre le mur\nPlacez l'avant-bras contre le montant d'une porte, pivotez doucement le corps. Tenez 30 secondes.\n\n## Conseils pratiques\n- Respirez lentement et profondément pendant chaque étirement\n- Ne forcez jamais jusqu'à la douleur\n- Pratiquez cette routine tous les soirs pour des résultats visibles en 2 semaines	\N	ARTICLE	BIENETRE	ZEN	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
28	Bien dormir pour mieux performer : les bases de l'hygiène du sommeil	Le sommeil est le premier facteur de récupération. Découvrez comment optimiser vos nuits.	## Le sommeil, pilier de la performance\n\nUn adulte a besoin de 7 à 9 heures de sommeil par nuit. La privation chronique de sommeil affecte la concentration, l'humeur, le système immunitaire et les performances physiques.\n\n## Les règles d'or\n\n### Régularité des horaires\nCouchez-vous et levez-vous à la même heure, même le week-end. Votre horloge biologique (rythme circadien) est votre meilleure alliée.\n\n### La chambre : un sanctuaire du sommeil\n- Température idéale : 16-18°C\n- Obscurité totale (masque si nécessaire)\n- Silence ou bruit blanc\n- Réservez le lit au sommeil et à l'intimité\n\n### Préparer le sommeil\n- Pas d'écrans 1h avant le coucher (la lumière bleue bloque la mélatonine)\n- Pas d'alcool : il perturbe les cycles de sommeil profond\n- Pas de sport intense après 20h\n- Une routine relaxante : lecture, méditation, bain chaud\n\n### Alimentation et sommeil\n- Dîner léger et 2h avant de dormir\n- Évitez la caféine après 14h\n- La mélatonine naturelle est stimulée par le tryptophane (banane, noix, dinde)\n\n## Outil pratique\nCalculez votre heure de coucher idéale : si vous devez vous lever à 7h et avez besoin de 8h de sommeil, couchez-vous avant 23h (comptez 15 minutes d'endormissement).	\N	ARTICLE	BIENETRE	ZEN	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
29	Reprendre le sport à 30, 40 ou 50 ans : le guide complet	Comment reprendre une activité physique en toute sécurité après une longue pause.	## Il n'est jamais trop tard\n\nLa sédentarité est le vrai ennemi. Reprendre le sport à tout âge apporte des bénéfices mesurables sur la santé cardiovasculaire, la densité osseuse, l'humeur et la longévité.\n\n## Avant de commencer\n\n### Bilan médical\nConsultez votre médecin si vous avez plus de 40 ans ou si vous n'avez pas fait de sport depuis plus de 3 ans. Un électrocardiogramme d'effort peut être conseillé.\n\n### Évaluation de votre niveau\n- Test des 6 minutes de marche\n- Nombre de pompes réalisables\n- Flexibilité (pouvez-vous toucher vos pieds ?)\n\n## Le plan de reprise progressif\n\n### Semaines 1-4 : Phase d'éveil musculaire\n- 3 sessions de 30 min par semaine\n- Marche rapide, natation, vélo à faible intensité\n- Priorité aux exercices de mobilité et de gainage léger\n\n### Mois 2-3 : Phase de construction\n- Augmentez à 4 sessions par semaine\n- Introduisez la musculation avec des charges légères\n- Ajoutez 10 minutes de cardio à chaque session\n\n### Mois 4+ : Phase de consolidation\n- Diversifiez les activités pour éviter la monotonie\n- Fixez-vous des objectifs concrets (5km, cours collectifs...)\n\n## Les erreurs à éviter\n❌ Vouloir retrouver son niveau d'il y a 10 ans en 2 semaines\n❌ Négliger l'échauffement et les étirements\n❌ S'entraîner malgré la douleur\n❌ Sous-estimer l'importance de la récupération	\N	ARTICLE	SPORT	ZEN	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
30	Nutrition au travail : comment bien manger malgré un emploi du temps chargé	Stratégies concrètes pour maintenir une alimentation équilibrée même en période de rush.	## Le défi de l'alimentation au bureau\n\nEntre les réunions, les déjeuners d'affaires et le stress, l'alimentation est souvent la première victime d'un emploi du temps chargé. Voici comment reprendre le contrôle.\n\n## Meal prep : cuisiner une fois, manger sainement toute la semaine\n\n### La méthode en 3 étapes\n1. **Planifiez** : le dimanche soir, décidez de vos repas de la semaine\n2. **Cuisinez en batch** : préparez vos protéines (poulet, légumineuses, œufs durs), vos féculents (riz complet, quinoa, patate douce) et vos légumes en une seule session de 1h\n3. **Assemblez** : chaque matin, composez votre boîte en 5 minutes\n\n### Formule gagnante pour le déjeuner\n- 1/2 assiette de légumes (crus ou cuits)\n- 1/4 de protéines (150g de viande, 200g de légumineuses, 3 œufs)\n- 1/4 de féculents complets\n\n## Gérer les fringales\n\n### Collations stratégiques\n- Poignée de noix + 1 fruit\n- Yaourt grec + quelques baies\n- Carotte + houmous\n- 1 carré de chocolat noir (>70%)\n\n### Identifier les vraies fringales\nDemandez-vous : est-ce de la faim physique (estomac vide) ou émotionnelle (stress, ennui) ? Boire un grand verre d'eau et attendre 10 minutes règle souvent la question.\n\n## Le piège de la cantine d'entreprise\n\n**Bonnes options :** entrées de légumes, viande grillée, fish & chips (pas frits), fromage blanc\n**À limiter :** plats en sauce, pain blanc, desserts sucrés, sodas\n\n## Hydratation : l'oublié de la performance\n\nUne déshydratation de seulement 2% diminue les capacités cognitives. Objectif : 1,5 à 2L d'eau par jour. Astuce : posez une gourde sur votre bureau et finissez-la avant de partir.	\N	ARTICLE	NUTRITION	PULSE	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
31	Gestion du stress au travail : techniques validées par la science	Cohérence cardiaque, méditation, pauses actives : des outils concrets et prouvés.	## Comprendre le stress pour mieux le gérer\n\nLe stress n'est pas mauvais en soi : c'est une réponse adaptative. C'est le stress chronique qui pose problème. Il élève durablement le cortisol, affectant l'immunité, la mémoire et la santé cardiovasculaire.\n\n## La cohérence cardiaque (technique 365)\n\n**Le protocole :** 3 fois par jour, 6 respirations par minute, pendant 5 minutes.\n- Inspirez 5 secondes\n- Expirez 5 secondes\n- Répétez\n\n**Effets mesurés :** réduction du cortisol, amélioration de la variabilité cardiaque, baisse de l'anxiété. Les effets durent 6 heures après chaque session.\n\n## La méditation de pleine conscience au bureau\n\nPas besoin de 30 minutes : 5 minutes suffisent pour un effet notable.\n\n**Exercice de l'ancrage (STOP) :**\n- **S**top : arrêtez ce que vous faites\n- **T**ake a breath : respirez profondément 3 fois\n- **O**bserve : observez vos sensations sans jugement\n- **P**roceed : reprenez votre activité avec plus de clarté\n\n## Pauses actives : la solution anti-stress sous-estimée\n\nUne pause active de 5-10 minutes toutes les 90 minutes améliore la concentration et réduit le stress.\n- Tour du bâtiment\n- Exercices de respiration dans un couloir\n- Quelques étirements à votre bureau\n\n## La règle des 3 cerveaux\n\nDistinguez ce qui est :\n- **Urgent ET important** : traitez immédiatement\n- **Important mais pas urgent** : planifiez\n- **Ni urgent ni important** : déléguez ou supprimez\n\nCette clarté cognitive réduit le sentiment d'être dépassé de 60%.	\N	ARTICLE	MENTAL	PULSE	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
32	Les macronutriments expliqués : protéines, glucides, lipides	Comprendre les bases de la nutrition pour faire les bons choix alimentaires au quotidien.	## Les 3 macronutriments essentiels\n\n### Protéines (4 kcal/g)\n**Rôle :** construction et réparation musculaire, enzymes, hormones, immunité\n**Besoin :** 1,2 à 2g par kg de poids corporel pour une personne active\n**Sources de qualité :**\n- Animales : viande, poisson, œufs, produits laitiers\n- Végétales : légumineuses, tofu, tempeh, edamame (associer avec des céréales pour les acides aminés complets)\n\n### Glucides (4 kcal/g)\n**Rôle :** carburant principal du cerveau et des muscles\n**Pas tous égaux !** Préférez les glucides complexes à index glycémique bas.\n- Bons : riz complet, patate douce, quinoa, légumineuses, fruits, légumes\n- À limiter : pain blanc, sucre raffiné, sodas, jus industriels\n\n**Fibre :** partie non digestible des glucides, indispensable pour le microbiote et la satiété. Objectif : 25-30g par jour.\n\n### Lipides (9 kcal/g)\n**Rôle :** hormones, absorption des vitamines liposolubles (A, D, E, K), santé cérébrale\n**Les bons gras :**\n- Oméga-3 : saumon, sardines, noix, graines de lin (anti-inflammatoires)\n- Oméga-9 : huile d'olive, avocat\n**À réduire :** graisses saturées (charcuterie, fromages gras) et graisses trans (produits industriels)\n\n## La règle de l'assiette équilibrée\n\n½ légumes | ¼ protéines | ¼ féculents complets + une bonne source de gras (avocat, huile d'olive, noix)\n\n## Mythes à déconstruire\n\n❌ "Les graisses font grossir" → C'est l'excès calorique global qui fait grossir\n❌ "Il faut éviter les glucides le soir" → L'heure importe peu, ce sont les quantités qui comptent\n❌ "Le sport compense tout" → On ne peut pas outrunner a bad diet	\N	ARTICLE	NUTRITION	PULSE	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
33	Performance mentale : le mental des champions appliqué au quotidien	Visualisation, dialogue intérieur positif, routines : les outils des sportifs d'élite pour vous.	## Le mental, 50% de la performance\n\nLes meilleurs sportifs ne sont pas seulement les plus forts physiquement. Ils maîtrisent leur état mental. Ces techniques fonctionnent aussi bien dans le sport que dans la vie professionnelle.\n\n## La visualisation mentale\n\n**Principe :** votre cerveau ne distingue pas clairement un événement réel d'un événement imaginé de manière vivide. En visualisant une performance réussie, vous créez des schémas neuronaux qui facilitent l'action réelle.\n\n**Protocole :**\n1. Fermez les yeux dans un endroit calme\n2. Respirez profondément 3 fois\n3. Visualisez en détail la situation : les sensations, les sons, les émotions\n4. Voyez-vous réussir\n5. Ressentez la satisfaction associée\n\n**Durée :** 5-10 minutes avant une situation importante (présentation, entretien, compétition).\n\n## Le dialogue intérieur positif\n\nLes self-talks négatifs ("je vais rater", "je suis nul") sabotent la performance. Remplacez-les par des instructions neutres ou positives.\n\n- ❌ "Je vais me planter" → ✅ "Je me concentre sur mes points forts"\n- ❌ "Je suis stressé" → ✅ "Je suis activé, prêt à performer"\n- ❌ "C'est trop difficile" → ✅ "C'est un défi, je prends une étape à la fois"\n\n## Les routines de performance\n\nLes routines pré-performance réduisent l'anxiété en créant un sentiment de contrôle et d'automatisation.\n\n**Exemple de routine matinale (20 min) :**\n1. 5 min de cohérence cardiaque\n2. 5 min de visualisation de la journée\n3. 5 min de journaling (3 gratitudes, 1 intention)\n4. 5 min d'activation physique (étirements, quelques squats)\n\n## La gestion de l'échec\n\nL'échec est une donnée, pas une identité. Après un résultat décevant :\n1. **Analysez** (pas de rumination) : qu'est-ce qui n'a pas fonctionné ?\n2. **Apprenez** : qu'est-ce que je vais faire différemment ?\n3. **Repositionnez** : revenez au processus, pas au résultat\n\nLes champions ne tombent pas moins que les autres. Ils se relèvent plus vite.	\N	ARTICLE	MENTAL	BOOST	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
34	Yoga du matin : routine 15 minutes pour bien démarrer la journée	Une séquence de yoga douce pour réveiller le corps et l'esprit avant de commencer à travailler.	\N	https://www.youtube.com/embed/VaoV1PrYft4	VIDEO	BIENETRE	ZEN	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
35	Renforcement musculaire sans matériel : 20 minutes full body	Une séance efficace de renforcement musculaire au poids de corps, réalisable partout.	\N	https://www.youtube.com/embed/UItWltVZZmE	VIDEO	SPORT	ZEN	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
36	Méditation guidée anti-stress : 10 minutes pour décompresser	Une méditation guidée en français pour relâcher les tensions et retrouver le calme.	\N	https://www.youtube.com/embed/O-6f5wQXSu8	VIDEO	MENTAL	ZEN	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
37	Comment construire une assiette équilibrée : guide visuel	Comprendre la méthode de l'assiette pour manger sainement sans se prendre la tête.	\N	https://www.youtube.com/embed/fqhYBTg73fw	VIDEO	NUTRITION	PULSE	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
38	Cohérence cardiaque : technique 365 expliquée et guidée	Apprenez et pratiquez la cohérence cardiaque, l'outil anti-stress le plus efficace.	\N	https://www.youtube.com/embed/vMHHEPFNfZ0	VIDEO	MENTAL	PULSE	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
39	Préparation mentale : les techniques des champions olympiques	Découvrez comment les sportifs de haut niveau utilisent la visualisation et le self-talk.	\N	https://www.youtube.com/embed/X6aUREVWsRY	VIDEO	MENTAL	BOOST	t	2026-04-01 13:01:28.563	2026-04-01 13:01:28.563
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.reviews (id, appointment_id, client_id, intervenant_id, rating, comment, created_at) FROM stdin;
1	23	96	65	5	Très professionnel, je recommande Marc	2026-04-02 10:32:51.814
2	25	96	66	5	Super, j'ai perdu 3 kilos en une semaine uniquement grâce à ses conseils ! Je recommande !!	2026-04-02 10:43:34.595
3	24	96	65	5	Toujours super, très bon coach sportif, très très bien !	2026-04-02 10:44:00.11
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.services (id, name, description, category, duration_minutes, price, available_in_plans, is_active, created_at, updated_at) FROM stdin;
42	Coaching sportif individuel	Seance personnalisee avec un coach diplome.	SPORT	60	55.00	["ZEN_ENTREPRISE", "PULSE_ENTREPRISE", "BOOST_ENTREPRISE"]	t	2026-04-01 13:01:28.552	2026-04-01 13:01:28.552
43	Bilan nutritionnel	Analyse complete de vos habitudes alimentaires.	NUTRITION	90	70.00	["ZEN_ENTREPRISE", "PULSE_ENTREPRISE", "BOOST_ENTREPRISE"]	t	2026-04-01 13:01:28.552	2026-04-01 13:01:28.552
44	Coaching sportif duo	Seance en duo, ideal pour progresser a deux.	SPORT	60	35.00	["ZEN_ENTREPRISE", "PULSE_ENTREPRISE", "BOOST_ENTREPRISE"]	t	2026-04-01 13:01:28.552	2026-04-01 13:01:28.552
45	Preparation mentale	Travail sur la concentration et la gestion du stress.	MENTAL	60	65.00	["PULSE_ENTREPRISE", "BOOST_ENTREPRISE"]	t	2026-04-01 13:01:28.552	2026-04-01 13:01:28.552
46	Seance de yoga	Yoga Vinyasa adapte a tous niveaux.	BIENETRE	75	40.00	["ZEN_ENTREPRISE", "PULSE_ENTREPRISE", "BOOST_ENTREPRISE"]	t	2026-04-01 13:01:28.552	2026-04-01 13:01:28.552
47	Atelier bien-etre collectif	Atelier collectif meditation, respiration et gestion du stress pour equipes.	BIENETRE	90	20.00	["ZEN_ENTREPRISE", "PULSE_ENTREPRISE", "BOOST_ENTREPRISE"]	t	2026-04-01 13:01:28.552	2026-04-01 13:01:28.552
48	Coaching nutrition entreprise	Accompagnement nutritionnel collectif adapte aux salaries.	NUTRITION	60	50.00	["PULSE_ENTREPRISE", "BOOST_ENTREPRISE"]	t	2026-04-01 13:01:28.552	2026-04-01 13:01:28.552
\.


--
-- Data for Name: session_reports; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.session_reports (id, appointment_id, intervenant_id, notes, objectives_update, rating, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.subscriptions (id, user_id, plan, start_date, end_date, status, created_at, updated_at, billing_cycle) FROM stdin;
23	92	ZEN_ENTREPRISE	2026-04-01	2027-04-01	ACTIVE	2026-04-01 13:01:28.559	2026-04-01 13:01:28.559	YEARLY
24	93	PULSE_ENTREPRISE	2026-04-01	2026-05-01	CANCELLED	2026-04-01 13:01:28.56	2026-04-02 09:05:06.396	MONTHLY
26	93	PULSE_ENTREPRISE	2026-04-02	2027-04-02	ACTIVE	2026-04-02 09:05:47.913	2026-04-02 09:05:47.913	YEARLY
25	94	BOOST_ENTREPRISE	2026-04-01	2027-04-01	CANCELLED	2026-04-01 13:01:28.56	2026-04-02 13:49:22.985	YEARLY
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: luciengendre
--

COPY public.users (id, email, password_hash, role, first_name, last_name, phone, avatar_url, is_active, created_at, updated_at, company_name, siret, verification_note, verification_status, employer_company_id, join_code, stripe_account_id, stripe_account_status) FROM stdin;
64	admin@goupylsport.fr	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	ADMIN	Nadia	Goupyl	\N	\N	t	2026-04-01 13:01:28.501	2026-04-01 13:01:28.501	\N	\N	\N	VERIFIED	\N	\N	\N	pending
67	julien.blanc@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Julien	Blanc	\N	\N	t	2026-04-01 13:01:28.508	2026-04-01 13:01:28.508	\N	\N	\N	VERIFIED	\N	\N	\N	pending
68	emma.rousseau@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Emma	Rousseau	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
70	florian.bernard@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Florian	Bernard	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
69	amandine.petit@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Amandine	Petit	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
71	sarah.lopez@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Sarah	Lopez	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
72	thomas.klein@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Thomas	Klein	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
73	marine.guichard@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Marine	Guichard	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
74	lea.simon@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Léa	Simon	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
75	marie.fontaine@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Marie	Fontaine	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
76	claire.dubois@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Claire	Dubois	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
77	isabelle.durand@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Isabelle	Durand	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
78	yann.le-gall@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Yann	Le Gall	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
79	giovanni.ferrari@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Giovanni	Ferrari	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
80	romain.muller@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Romain	Muller	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
81	rafael.costa@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Rafael	Costa	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
82	pauline.lefebvre@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Pauline	Lefebvre	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
83	arnaud.thomas@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Arnaud	Thomas	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
84	lucas.perrin@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Lucas	Perrin	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
85	nicolas.martin@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Nicolas	Martin	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
86	stephanie.vidal@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Stéphanie	Vidal	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
87	pierre.garcia@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Pierre	Garcia	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
88	alice.weber@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Alice	Weber	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
89	maxime.lecomte@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Maxime	Lecomte	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
90	camille.henry@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Camille	Henry	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
91	kevin.moreau@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Kévin	Moreau	\N	\N	t	2026-04-01 13:01:28.511	2026-04-01 13:01:28.511	\N	\N	\N	VERIFIED	\N	\N	\N	pending
92	rh@acmecorp.fr	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	ENTREPRISE	Claire	Fontaine	\N	\N	t	2026-04-01 13:01:28.549	2026-04-01 13:01:28.549	Acme Corp	12345678901234	\N	VERIFIED	\N	\N	\N	pending
93	wellness@techstart.fr	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	ENTREPRISE	Thomas	Renard	\N	\N	t	2026-04-01 13:01:28.55	2026-04-01 13:01:28.55	TechStart SAS	98765432109876	\N	VERIFIED	\N	\N	\N	pending
94	sport@industria.fr	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	ENTREPRISE	Marie	Leblanc	\N	\N	t	2026-04-01 13:01:28.55	2026-04-01 13:01:28.55	Industria SA	11223344556677	\N	VERIFIED	\N	\N	\N	pending
95	marvin.dupont@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	CLIENT	marvin	Dupont	\N	\N	t	2026-04-01 13:01:28.55	2026-04-01 13:01:28.55	\N	\N	\N	VERIFIED	\N	\N	\N	pending
96	sarah.benali@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	CLIENT	Sarah	Benali	\N	\N	t	2026-04-01 13:01:28.551	2026-04-01 13:01:28.551	\N	\N	\N	VERIFIED	\N	\N	\N	pending
65	marc.leroy@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Marc	Leroy	\N	\N	t	2026-04-01 13:01:28.504	2026-04-02 09:19:34.979	\N	\N	\N	VERIFIED	\N	\N	acct_1THhKaRyu3JKfOKW	active
66	sophie.martin@email.com	$2b$12$.e36uYefTRErnbdBf86RQewPEfYBGeC/M5988KoALvFGZo4YM0geq	INTERVENANT	Sophie	Martin	\N	\N	t	2026-04-01 13:01:28.507	2026-04-02 10:39:18.278	\N	\N	\N	VERIFIED	\N	\N	acct_1THibl2NqdPRuFYH	active
\.


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.appointments_id_seq', 29, true);


--
-- Name: availabilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.availabilities_id_seq', 248, true);


--
-- Name: company_invites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.company_invites_id_seq', 1, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.documents_id_seq', 16, true);


--
-- Name: profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.profiles_id_seq', 61, true);


--
-- Name: resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.resources_id_seq', 39, true);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.reviews_id_seq', 3, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.services_id_seq', 48, true);


--
-- Name: session_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.session_reports_id_seq', 7, true);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 26, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: luciengendre
--

SELECT pg_catalog.setval('public.users_id_seq', 96, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: availabilities availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.availabilities
    ADD CONSTRAINT availabilities_pkey PRIMARY KEY (id);


--
-- Name: company_invites company_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.company_invites
    ADD CONSTRAINT company_invites_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: session_reports session_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.session_reports
    ADD CONSTRAINT session_reports_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: company_invites_token_key; Type: INDEX; Schema: public; Owner: luciengendre
--

CREATE UNIQUE INDEX company_invites_token_key ON public.company_invites USING btree (token);


--
-- Name: payments_appointment_id_key; Type: INDEX; Schema: public; Owner: luciengendre
--

CREATE UNIQUE INDEX payments_appointment_id_key ON public.payments USING btree (appointment_id);


--
-- Name: payments_stripe_payment_intent_id_key; Type: INDEX; Schema: public; Owner: luciengendre
--

CREATE UNIQUE INDEX payments_stripe_payment_intent_id_key ON public.payments USING btree (stripe_payment_intent_id);


--
-- Name: profiles_user_id_key; Type: INDEX; Schema: public; Owner: luciengendre
--

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);


--
-- Name: reviews_appointment_id_key; Type: INDEX; Schema: public; Owner: luciengendre
--

CREATE UNIQUE INDEX reviews_appointment_id_key ON public.reviews USING btree (appointment_id);


--
-- Name: session_reports_appointment_id_key; Type: INDEX; Schema: public; Owner: luciengendre
--

CREATE UNIQUE INDEX session_reports_appointment_id_key ON public.session_reports USING btree (appointment_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: luciengendre
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_join_code_key; Type: INDEX; Schema: public; Owner: luciengendre
--

CREATE UNIQUE INDEX users_join_code_key ON public.users USING btree (join_code);


--
-- Name: appointments appointments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: appointments appointments_intervenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_intervenant_id_fkey FOREIGN KEY (intervenant_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: appointments appointments_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: availabilities availabilities_intervenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.availabilities
    ADD CONSTRAINT availabilities_intervenant_id_fkey FOREIGN KEY (intervenant_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: company_invites company_invites_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.company_invites
    ADD CONSTRAINT company_invites_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews reviews_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reviews reviews_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reviews reviews_intervenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_intervenant_id_fkey FOREIGN KEY (intervenant_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: session_reports session_reports_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.session_reports
    ADD CONSTRAINT session_reports_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: session_reports session_reports_intervenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.session_reports
    ADD CONSTRAINT session_reports_intervenant_id_fkey FOREIGN KEY (intervenant_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_employer_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: luciengendre
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employer_company_id_fkey FOREIGN KEY (employer_company_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: luciengendre
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict dqI4h3nhOAOJgFL6I7r3NZwYUK00bL6S8iR8DTfVQCftA9cl6NUBP95fGtivQSi

