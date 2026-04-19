SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict mKh0NFrCApbKrpi6auNgJfUxA46d1hSQScGxaQEtsaReIUUDsHifJbNxnnZoR92

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: consumption_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."consumption_logs" ("id", "teacher_id", "log_date", "meals_served_primary", "meals_served_upper_primary", "main_food", "main_foods_all", "ingredients_used", "is_overridden", "original_template", "created_at", "is_holiday", "holiday_remarks", "standard_group", "borrowed_items") FROM stdin;
ad146c72-ca26-43f6-a55f-a3f161e627ce	de4acac4-8d84-442f-81dc-6bd72acc571c	2026-04-14	12	0	तांदूळ	["तांदूळ", "हरभरा"]	["कांदा मसाला", "जिरे", "तेल", "मीठ", "मोहरी", "हळद"]	f	{"mainFoods": ["तांदूळ", "हरभरा"], "ingredients": ["कांदा मसाला", "जिरे", "तेल", "मीठ", "मोहरी", "हळद"]}	2026-04-14 06:49:56.993402+00	f	\N	primary	{}
1311b03f-ef52-44c7-8ef7-a9543cf70d34	de4acac4-8d84-442f-81dc-6bd72acc571c	2026-04-14	0	8	तांदूळ	["तांदूळ", "हरभरा"]	["कांदा मसाला", "जिरे", "तेल", "मीठ", "मोहरी", "हळद"]	f	{"mainFoods": ["तांदूळ", "हरभरा"], "ingredients": ["कांदा मसाला", "जिरे", "तेल", "मीठ", "मोहरी", "हळद"]}	2026-04-14 06:49:56.993402+00	f	\N	upper_primary	{"तेल": 0.0332, "मीठ": 0.016, "हळद": 0.0012, "जिरे": 0.0012, "मोहरी": 0.0012, "हरभरा": 0.24, "तांदूळ": 1.2, "कांदा मसाला": 0.01}
\.


--
-- Data for Name: cooking_staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cooking_staff" ("id", "teacher_id", "staff_name", "post_name", "monthly_cost", "created_at", "record_month", "record_year", "standard_group", "payment_type", "rate_primary", "rate_upper") FROM stdin;
be8bfa9a-ee37-4094-8e0e-4c0ddde6ad20	de4acac4-8d84-442f-81dc-6bd72acc571c	Vishakha 	Cook 	2500	2026-04-12 05:44:23.363551+00	4	2026	primary	per_day	0	0
\.


--
-- Data for Name: daily_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."daily_logs" ("id", "teacher_id", "log_date", "meals_served_primary", "meals_served_upper_primary", "created_at", "is_holiday", "holiday_remarks") FROM stdin;
\.


--
-- Data for Name: demand_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."demand_reports" ("id", "teacher_id", "report_period", "class_group", "working_days", "enrollment_count", "report_data", "created_at", "standard_group") FROM stdin;
f11653b9-591a-43b4-9ea5-16c123a1fba2	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	एप्रिल 2026 ते जून 2026	PRIMARY	20	25	{"1161a0f5-a211-4add-a2ae-2e5aa18b1083": "0.000", "31b2b05d-b41a-4b33-a30e-56ec09950d60": "50.000"}	2026-04-15 20:04:05.14707+00	primary
\.


--
-- Data for Name: financial_ledger_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."financial_ledger_snapshots" ("id", "teacher_id", "fiscal_year", "ledger_data", "created_at", "section_type") FROM stdin;
\.


--
-- Data for Name: fuel_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."fuel_tracking" ("id", "teacher_id", "fuel_type", "monthly_cost", "created_at", "record_month", "record_year", "standard_group", "fuel_rate_primary", "fuel_rate_upper", "veg_rate_primary", "veg_rate_upper") FROM stdin;
\.


--
-- Data for Name: global_food_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."global_food_master" ("code", "name", "name_en", "created_at", "item_category") FROM stdin;
F_TANDUL	तांदूळ	Tandul	2026-04-06 19:54:57.692172+00	MAIN
F_MOONGDAL	मुगडाळ	Moongdal	2026-04-06 20:01:56.525824+00	MAIN
F_TOORDAL	तूरडाळ	Toordal	2026-04-06 20:02:16.740082+00	MAIN
F_MASURDAL	मसूरडाळ	MasurDal	2026-04-06 20:02:55.393618+00	MAIN
F_MOOG	मुग	Moog	2026-04-06 20:03:39.337161+00	MAIN
F_CHAVALI	चवळी	Chavali	2026-04-06 20:04:01.679572+00	MAIN
F_HARBHARA	हरभरा	Harbhara	2026-04-06 20:04:26.402371+00	MAIN
F_WATANA	वाटाणा	Watana	2026-04-06 20:04:47.4182+00	MAIN
F_MATAKI	मटकी	Mataki	2026-04-06 20:05:05.714603+00	MAIN
F_SOYABIN	सोयाबीन	Soyabin	2026-04-06 20:05:21.50901+00	MAIN
F_JIRE	जिरे	Jire	2026-04-06 20:05:44.58224+00	INGREDIENT
F_MOHRI	मोहरी	Mohri	2026-04-06 20:06:11.809702+00	INGREDIENT
F_HALAD	हळद	Halad	2026-04-06 20:06:26.12477+00	INGREDIENT
F_MITH	मीठ	Mith	2026-04-06 20:06:40.353051+00	INGREDIENT
F_TEL	तेल	Tel	2026-04-06 20:06:52.787074+00	INGREDIENT
F_CHATANI	चटणी	Chatani	2026-04-06 20:07:14.728777+00	INGREDIENT
F_BHAJIPALA	भाजी पाला	Bhaji Pala	2026-04-06 20:07:56.909179+00	INGREDIENT
F_KANDAMASALA	कांदामसाला	Kandamasala	2026-04-15 15:19:30.20752+00	INGREDIENT
\.


--
-- Data for Name: inventory_stock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inventory_stock" ("id", "teacher_id", "item_name", "current_balance", "unit", "last_updated", "standard_group", "item_code") FROM stdin;
4b400063-53cd-4e32-bb27-d35b9d426407	de4acac4-8d84-442f-81dc-6bd72acc571c	हळद	0.49819999964255873	kg	2026-04-12 05:49:24.375334+00	primary	\N
ab8a1fb5-8f54-400b-960e-340b30816404	de4acac4-8d84-442f-81dc-6bd72acc571c	हरभरा	2.76000000536442	kg	2026-04-12 05:48:41.487271+00	primary	\N
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."profiles" ("id", "email", "role", "created_at", "first_name", "last_name", "school_name", "school_id", "school_name_mr", "center_name_mr", "taluka_mr", "district_mr", "has_primary", "has_upper_primary", "is_onboarded", "onboarding_step", "saas_plan_type", "saas_payment_status", "saas_amount_paid", "saas_expiry_date") FROM stdin;
fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	lrathod330@gmail.com	teacher	2026-04-05 18:33:54.976886+00	Laxman	Rathod	ZP Pune	11223344556	जिल्हा परिषद प्राथमिक शाळा साळगाव जांभरमळा 	झाराप 	कुडाळ 	सिंधुदुर्ग 	t	t	f	6	primary	unpaid	0	\N
37298e7d-6cb6-4ecb-b653-3f2c07085989	master@pmposhan.gov.in	master	2026-04-05 17:15:22+00	\N	\N	\N	\N	\N	\N	\N	\N	t	t	t	1	primary	unpaid	0	\N
de4acac4-8d84-442f-81dc-6bd72acc571c	sanvira09@gmail.com	teacher	2026-04-11 14:50:13.295906+00	Vignesh	Jadhav	ZP Sindhudurg	91564910831	जि. प. प्राथमिक शाळा मांडकुली नं.१	घावनळे 	कुडाळ 	सिंधुदुर्ग 	t	t	t	1	primary	unpaid	0	\N
\.


--
-- Data for Name: item_ledger_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."item_ledger_reports" ("id", "teacher_id", "item_name", "date_range", "report_data", "created_at", "standard_group") FROM stdin;
\.


--
-- Data for Name: local_food_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."local_food_master" ("local_code", "teacher_id", "name", "default_unit", "created_at", "name_en", "id", "item_category") FROM stdin;
\.


--
-- Data for Name: menu_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."menu_master" ("id", "teacher_id", "item_name", "grams_primary", "created_at", "item_code", "source", "item_category", "grams_upper_primary") FROM stdin;
7ebf396b-f482-451e-8bcd-cfb757e819df	de4acac4-8d84-442f-81dc-6bd72acc571c	तांदूळ	100	2026-04-11 15:44:11.561487+00	F_TANDUL	global	MAIN	150
27ee8de5-fc0b-4053-8372-fae8b402d737	de4acac4-8d84-442f-81dc-6bd72acc571c	तूरडाळ	10	2026-04-11 15:44:58.087082+00	F_TOORDAL	global	MAIN	15
a31055f3-1ac0-4249-9120-d43fba6d334d	de4acac4-8d84-442f-81dc-6bd72acc571c	वाटाणा	20	2026-04-11 15:45:40.271575+00	F_WATANA	global	MAIN	30
7d51171f-877c-4e8c-bc47-2f168312b9ff	de4acac4-8d84-442f-81dc-6bd72acc571c	मुग	10	2026-04-12 05:33:30.392133+00	F_MOOG	global	MAIN	15
9714ebdb-588d-46f6-ae45-5334f1933781	de4acac4-8d84-442f-81dc-6bd72acc571c	मुगडाळ	20	2026-04-12 05:33:47.671367+00	F_MOONGDAL	global	MAIN	30
e4f6a177-b8c9-4bf8-94fc-6dc7f39dc78b	de4acac4-8d84-442f-81dc-6bd72acc571c	मसूरडाळ	20	2026-04-12 05:33:57.69549+00	F_MASURDAL	global	MAIN	30
c95ce98d-0417-443b-b1b8-e92f3fadd089	de4acac4-8d84-442f-81dc-6bd72acc571c	चवळी	20	2026-04-12 05:34:09.171524+00	F_CHAVALI	global	MAIN	30
2d604c20-eb8d-4b23-935a-01be5054d55f	de4acac4-8d84-442f-81dc-6bd72acc571c	हरभरा	20	2026-04-12 05:34:24.304681+00	F_HARBHARA	global	MAIN	30
ed694fd9-a4a8-43eb-b9ee-9fed96ff6162	de4acac4-8d84-442f-81dc-6bd72acc571c	सोयाबीन	20	2026-04-12 05:34:39.62153+00	F_SOYABIN	global	MAIN	30
6e63cbb2-cfcb-4240-8013-21142239665b	de4acac4-8d84-442f-81dc-6bd72acc571c	मटकी	20	2026-04-12 05:34:51.883061+00	F_MATAKI	global	MAIN	30
4a6e152a-f324-431f-944b-155b4c277447	de4acac4-8d84-442f-81dc-6bd72acc571c	मीठ	1	2026-04-12 05:35:22.969324+00	F_MITH	global	INGREDIENT	2
fe10a7bc-e5fd-4504-b5a8-560b926456c9	de4acac4-8d84-442f-81dc-6bd72acc571c	हळद	0.15	2026-04-12 05:35:46.814443+00	F_HALAD	global	INGREDIENT	0.15
36c5a405-4fec-4692-8093-46cd558d2c3f	de4acac4-8d84-442f-81dc-6bd72acc571c	कांदा मसाला	1.25	2026-04-12 05:36:03.747183+00	F_KANDAMASALA	global	INGREDIENT	1.25
ba95de58-832b-4f50-989f-76c4dffd45c7	de4acac4-8d84-442f-81dc-6bd72acc571c	जिरे	0.15	2026-04-12 05:36:18.758482+00	F_JIRE	global	INGREDIENT	0.15
abafa04a-1a77-4c0d-aad7-988c0bb74c62	de4acac4-8d84-442f-81dc-6bd72acc571c	मोहरी	0.15	2026-04-12 05:36:33.12519+00	F_MOHRI	global	INGREDIENT	0.15
a9dcdac5-521a-4d26-be48-60907eb07c2b	de4acac4-8d84-442f-81dc-6bd72acc571c	तेल	4.15	2026-04-12 05:37:00.158581+00	F_TEL	global	INGREDIENT	4.15
31b2b05d-b41a-4b33-a30e-56ec09950d60	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	तांदूळ	100	2026-04-15 17:39:55.244237+00	F_TANDUL	global	MAIN	150
1161a0f5-a211-4add-a2ae-2e5aa18b1083	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	चटणी	0.02	2026-04-15 17:40:07.572159+00	F_CHATANI	global	INGREDIENT	0.02
\.


--
-- Data for Name: menu_weekly_schedule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."menu_weekly_schedule" ("id", "teacher_id", "week_pattern", "day_name", "is_active", "menu_items", "main_food_codes") FROM stdin;
92dad0c4-76c0-4e3c-872c-815ad4ebfc43	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_1_3_5	Monday	t	["F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_TANDUL", "F_TOORDAL", "F_MOOG"]
33864351-90f0-4fe5-a7d0-452b5d43498d	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_1_3_5	Tuesday	t	["F_KANDAMASALA", "F_TEL", "F_MOHRI", "F_JIRE", "F_MITH", "F_HALAD"]	["F_TANDUL", "F_WATANA"]
c168dcca-753e-4b6f-8fa2-39f2bb81c703	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_1_3_5	Wednesday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_TANDUL", "F_MOONGDAL"]
41ea3a85-1a7d-453d-ad87-5a462c37fabe	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_1_3_5	Thursday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_MASURDAL", "F_TANDUL"]
ee596061-fc7c-4eac-a576-c846423579d3	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_1_3_5	Friday	t	["F_KANDAMASALA", "F_TEL", "F_MOHRI", "F_JIRE", "F_MITH", "F_HALAD"]	["F_CHAVALI", "F_TANDUL"]
acff0ad1-5b5d-4928-beca-aa0cf9f62959	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_1_3_5	Saturday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_WATANA", "F_TANDUL"]
19731b65-d623-4367-b224-6aba6592232d	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_1_3_5	Monday	t	["F_KANDAMASALA", "F_TEL", "F_MITH", "F_HALAD", "F_MOHRI", "F_JIRE"]	["F_MOOG", "F_TOORDAL", "F_TANDUL"]
6a8b253c-9844-451d-813e-6bfa6011c61b	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_1_3_5	Tuesday	t	["F_KANDAMASALA", "F_MITH", "F_TEL", "F_JIRE", "F_MOHRI", "F_HALAD"]	["F_TANDUL", "F_WATANA"]
8c3ce670-f974-442b-9ee9-d17976edd7fe	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_1_3_5	Wednesday	t	["F_HALAD", "F_MITH", "F_TEL", "F_KANDAMASALA", "F_JIRE", "F_MOHRI"]	["F_TANDUL", "F_MOONGDAL"]
a847463c-fbe2-4869-8729-7fce88731632	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_1_3_5	Thursday	t	["F_TEL", "F_KANDAMASALA", "F_JIRE", "F_MITH", "F_HALAD", "F_MOHRI"]	["F_TANDUL", "F_MASURDAL"]
0d4622c0-a635-4c9b-ad00-40e4dfc5e6c2	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_1_3_5	Friday	t	["F_TEL", "F_KANDAMASALA", "F_MITH", "F_JIRE", "F_MOHRI", "F_HALAD"]	["F_TANDUL", "F_CHAVALI"]
02732562-d82b-48c9-bb06-96d46902f479	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_1_3_5	Saturday	t	["F_TEL", "F_MITH", "F_KANDAMASALA", "F_JIRE", "F_MOHRI", "F_HALAD"]	["F_WATANA", "F_TANDUL"]
67a48b20-3a88-43d1-bce8-d7d8f98493bf	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_1_3_5	Sunday	f	[]	[]
2d3299d2-7746-4746-a5d5-4e7d0fba0cd8	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_2_4	Monday	t	["F_TEL", "F_KANDAMASALA", "F_MOHRI", "F_JIRE", "F_MITH", "F_HALAD"]	["F_TOORDAL", "F_TANDUL", "F_MOOG"]
d62255db-8bb2-43b1-aa47-98deb2bcf3b5	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_2_4	Tuesday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MOHRI", "F_MITH", "F_HALAD"]	["F_HARBHARA", "F_TANDUL"]
56895897-368e-4c67-9d64-a215f18b70c7	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_2_4	Wednesday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_SOYABIN", "F_TANDUL"]
e8abae88-d845-4546-bce5-9d419c8256c5	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_2_4	Sunday	f	[]	[]
aac85646-9488-46e8-9a39-f1f156b91525	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_1_3_5	Sunday	f	[]	[]
4515d23b-0da4-4b56-ba3d-963319ccd564	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_2_4	Monday	t	["F_KANDAMASALA", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_TANDUL", "F_TOORDAL", "F_MOOG"]
a9e904e5-1f0a-4c3b-a7a5-2e05d45779e5	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_2_4	Tuesday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_TANDUL", "F_HARBHARA"]
d54a8ad7-a3e3-44c8-b0fb-b89a272fa635	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_2_4	Wednesday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_SOYABIN", "F_TANDUL"]
720ef0f3-e373-4ed4-8c9d-6228c7955b06	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_2_4	Thursday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_MATAKI", "F_TANDUL"]
98d25e2a-92d0-4e8c-9bce-df3769d53b5f	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_2_4	Friday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_WATANA", "F_TANDUL"]
3d561ac9-70cd-4782-8617-4ffd7762a8bd	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_2_4	Saturday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_WATANA", "F_TANDUL"]
75ff20aa-b644-45a3-937c-80dc2a60b4ec	de4acac4-8d84-442f-81dc-6bd72acc571c	WEEK_2_4	Sunday	f	[]	[]
ce77686c-9289-4793-94a9-cf9fdda48227	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_2_4	Thursday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_TANDUL", "F_MATAKI"]
3347e9fb-9925-410f-96cc-3500d3d749cb	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_2_4	Friday	t	["F_KANDAMASALA", "F_JIRE", "F_TEL", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_TANDUL", "F_WATANA"]
b567aa90-0d09-4b4b-9f94-7a1dd1302e90	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	WEEK_2_4	Saturday	t	["F_TEL", "F_KANDAMASALA", "F_JIRE", "F_MITH", "F_MOHRI", "F_HALAD"]	["F_TANDUL", "F_WATANA"]
\.


--
-- Data for Name: monthly_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."monthly_reports" ("id", "teacher_id", "report_month", "report_year", "report_data", "is_locked", "created_at", "daily_ledger_data", "standard_group") FROM stdin;
6011e114-602f-482a-aa1c-1111f970ce4c	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	7	2025	"[{\\"item\\":\\"तांदूळ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मुगडाळ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"तूरडाळ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मसूरडाळ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मुग\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"चवळी\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"हरभरा\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"वाटाणा\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मटकी\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"सोयाबीन\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"जिरे\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मोहरी\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"हळद\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मीठ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"तेल\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"कांदा मसाला\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"भाजी पाला\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"}]"	t	2026-04-10 11:31:42.470762+00	\N	primary
848ac3fa-77f7-463d-a8d5-271eb150bc4b	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	8	2025	"[{\\"item\\":\\"तांदूळ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मुगडाळ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"तूरडाळ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मसूरडाळ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मुग\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"चवळी\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"हरभरा\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"वाटाणा\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मटकी\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"सोयाबीन\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"जिरे\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मोहरी\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"हळद\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"मीठ\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"तेल\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"कांदा मसाला\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"},{\\"item\\":\\"भाजी पाला\\",\\"openingBalance\\":\\"0.000\\",\\"received\\":\\"0.000\\",\\"total\\":\\"0.000\\",\\"consumed\\":\\"0.000\\",\\"closingBalance\\":\\"0.000\\"}]"	t	2026-04-10 12:21:55.632465+00	\N	primary
ebb04339-b6b8-406f-8052-a260ebc8a286	de4acac4-8d84-442f-81dc-6bd72acc571c	3	2026	"[{\\"item\\":\\"तांदूळ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"100\\",\\"total\\":\\"100\\",\\"consumed\\":\\"71.25\\",\\"borrowed\\":\\"0\\",\\"closingBalance\\":\\"28.75\\"},{\\"item\\":\\"तूरडाळ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"3\\",\\"total\\":\\"3\\",\\"consumed\\":\\"7.125\\",\\"borrowed\\":\\"4.125\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"वाटाणा\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"3\\",\\"total\\":\\"3\\",\\"consumed\\":\\"14.25\\",\\"borrowed\\":\\"11.25\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मुग\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"6\\",\\"total\\":\\"6\\",\\"consumed\\":\\"7.125\\",\\"borrowed\\":\\"1.125\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मुगडाळ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"3\\",\\"total\\":\\"3\\",\\"consumed\\":\\"14.25\\",\\"borrowed\\":\\"11.25\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मसूरडाळ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"3\\",\\"total\\":\\"3\\",\\"consumed\\":\\"14.25\\",\\"borrowed\\":\\"11.25\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"चवळी\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"3\\",\\"total\\":\\"3\\",\\"consumed\\":\\"14.25\\",\\"borrowed\\":\\"11.25\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"हरभरा\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"3\\",\\"total\\":\\"3\\",\\"consumed\\":\\"14.25\\",\\"borrowed\\":\\"11.25\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"सोयाबीन\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"3\\",\\"total\\":\\"3\\",\\"consumed\\":\\"14.25\\",\\"borrowed\\":\\"11.25\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मटकी\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"3\\",\\"total\\":\\"3\\",\\"consumed\\":\\"14.25\\",\\"borrowed\\":\\"11.25\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मीठ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"1\\",\\"total\\":\\"1\\",\\"consumed\\":\\"0.825\\",\\"borrowed\\":\\"0\\",\\"closingBalance\\":\\"0.17500000000000004\\"},{\\"item\\":\\"हळद\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0.5\\",\\"total\\":\\"0.5\\",\\"consumed\\":\\"0.09\\",\\"borrowed\\":\\"0\\",\\"closingBalance\\":\\"0.41000000000000003\\"},{\\"item\\":\\"कांदा मसाला\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"1\\",\\"total\\":\\"1\\",\\"consumed\\":\\"0.75\\",\\"borrowed\\":\\"0\\",\\"closingBalance\\":\\"0.25\\"},{\\"item\\":\\"जिरे\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0.5\\",\\"total\\":\\"0.5\\",\\"consumed\\":\\"0.09\\",\\"borrowed\\":\\"0\\",\\"closingBalance\\":\\"0.41000000000000003\\"},{\\"item\\":\\"मोहरी\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0.5\\",\\"total\\":\\"0.5\\",\\"consumed\\":\\"0.09\\",\\"borrowed\\":\\"0\\",\\"closingBalance\\":\\"0.41000000000000003\\"},{\\"item\\":\\"तेल\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"3\\",\\"total\\":\\"3\\",\\"consumed\\":\\"2.4900000000000007\\",\\"borrowed\\":\\"0\\",\\"closingBalance\\":\\"0.5099999999999993\\"}]"	t	2026-04-12 06:11:26.990759+00	\N	primary
83b6600e-c0e2-4eca-adef-cfeeeaf58818	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	4	2026	"[{\\"item\\":\\"तांदूळ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"1.2\\",\\"borrowed\\":\\"1.2\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मुगडाळ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.24\\",\\"borrowed\\":\\"0.24\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"तूरडाळ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.12\\",\\"borrowed\\":\\"0.12\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मसूरडाळ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.24\\",\\"borrowed\\":\\"0.24\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मुग\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.12\\",\\"borrowed\\":\\"0.12\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"चवळी\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.24\\",\\"borrowed\\":\\"0.24\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"हरभरा\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.24\\",\\"borrowed\\":\\"0.24\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"वाटाणा\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.24\\",\\"borrowed\\":\\"0.24\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मटकी\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.24\\",\\"borrowed\\":\\"0.24\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मीठ\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.012\\",\\"borrowed\\":\\"0.012\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"तेल\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.049800000000000004\\",\\"borrowed\\":\\"0.049800000000000004\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"कांदा मसाला\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.015\\",\\"borrowed\\":\\"0.015\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"जिरे\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.00023999999999999998\\",\\"borrowed\\":\\"0.00023999999999999998\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"हळद\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.00023999999999999998\\",\\"borrowed\\":\\"0.00023999999999999998\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"मोहरी\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.00023999999999999998\\",\\"borrowed\\":\\"0.00023999999999999998\\",\\"closingBalance\\":\\"0\\"},{\\"item\\":\\"सोयाबीन\\",\\"openingBalance\\":\\"0\\",\\"received\\":\\"0\\",\\"total\\":\\"0\\",\\"consumed\\":\\"0.24\\",\\"borrowed\\":\\"0.24\\",\\"closingBalance\\":\\"0\\"}]"	t	2026-04-07 20:00:19.719747+00	"{\\"topSummaries\\":{\\"opening\\":{\\"F_TANDUL\\":\\"0\\",\\"F_MOONGDAL\\":\\"0\\",\\"F_TOORDAL\\":\\"0\\",\\"F_MASURDAL\\":\\"0\\",\\"F_MOOG\\":\\"0\\",\\"F_CHAVALI\\":\\"0\\",\\"F_HARBHARA\\":\\"0\\",\\"F_WATANA\\":\\"0\\",\\"F_MATAKI\\":\\"0\\",\\"F_SOYABIN\\":\\"0\\",\\"F_MITH\\":\\"0\\",\\"F_TEL\\":\\"0\\",\\"F_KANDAMASALA\\":\\"0\\",\\"F_JIRE\\":\\"0\\",\\"F_HALAD\\":\\"0\\",\\"F_MOHRI\\":\\"0\\"},\\"received\\":{\\"F_TANDUL\\":\\"0\\",\\"F_MOONGDAL\\":\\"0\\",\\"F_TOORDAL\\":\\"0\\",\\"F_MASURDAL\\":\\"0\\",\\"F_MOOG\\":\\"0\\",\\"F_CHAVALI\\":\\"0\\",\\"F_HARBHARA\\":\\"0\\",\\"F_WATANA\\":\\"0\\",\\"F_MATAKI\\":\\"0\\",\\"F_SOYABIN\\":\\"0\\",\\"F_MITH\\":\\"0\\",\\"F_TEL\\":\\"0\\",\\"F_KANDAMASALA\\":\\"0\\",\\"F_JIRE\\":\\"0\\",\\"F_HALAD\\":\\"0\\",\\"F_MOHRI\\":\\"0\\"},\\"total\\":{\\"F_TANDUL\\":\\"0\\",\\"F_MOONGDAL\\":\\"0\\",\\"F_TOORDAL\\":\\"0\\",\\"F_MASURDAL\\":\\"0\\",\\"F_MOOG\\":\\"0\\",\\"F_CHAVALI\\":\\"0\\",\\"F_HARBHARA\\":\\"0\\",\\"F_WATANA\\":\\"0\\",\\"F_MATAKI\\":\\"0\\",\\"F_SOYABIN\\":\\"0\\",\\"F_MITH\\":\\"0\\",\\"F_TEL\\":\\"0\\",\\"F_KANDAMASALA\\":\\"0\\",\\"F_JIRE\\":\\"0\\",\\"F_HALAD\\":\\"0\\",\\"F_MOHRI\\":\\"0\\"}},\\"dailyRows\\":[{\\"date\\":\\"2026-04-01\\",\\"formattedDate\\":\\"1 एप्रिल\\",\\"dayName\\":\\"Wednesday\\",\\"marathiDayName\\":\\"बुधवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-02\\",\\"formattedDate\\":\\"2 एप्रिल\\",\\"dayName\\":\\"Thursday\\",\\"marathiDayName\\":\\"गुरुवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-03\\",\\"formattedDate\\":\\"3 एप्रिल\\",\\"dayName\\":\\"Friday\\",\\"marathiDayName\\":\\"शुक्रवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-04\\",\\"formattedDate\\":\\"4 एप्रिल\\",\\"dayName\\":\\"Saturday\\",\\"marathiDayName\\":\\"शनिवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-05\\",\\"formattedDate\\":\\"5 एप्रिल\\",\\"dayName\\":\\"Sunday\\",\\"marathiDayName\\":\\"रविवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-06\\",\\"formattedDate\\":\\"6 एप्रिल\\",\\"dayName\\":\\"Monday\\",\\"marathiDayName\\":\\"सोमवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-07\\",\\"formattedDate\\":\\"7 एप्रिल\\",\\"dayName\\":\\"Tuesday\\",\\"marathiDayName\\":\\"मंगळवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-08\\",\\"formattedDate\\":\\"8 एप्रिल\\",\\"dayName\\":\\"Wednesday\\",\\"marathiDayName\\":\\"बुधवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-09\\",\\"formattedDate\\":\\"9 एप्रिल\\",\\"dayName\\":\\"Thursday\\",\\"marathiDayName\\":\\"गुरुवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-10\\",\\"formattedDate\\":\\"10 एप्रिल\\",\\"dayName\\":\\"Friday\\",\\"marathiDayName\\":\\"शुक्रवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-11\\",\\"formattedDate\\":\\"11 एप्रिल\\",\\"dayName\\":\\"Saturday\\",\\"marathiDayName\\":\\"शनिवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-12\\",\\"formattedDate\\":\\"12 एप्रिल\\",\\"dayName\\":\\"Sunday\\",\\"marathiDayName\\":\\"रविवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-13\\",\\"formattedDate\\":\\"13 एप्रिल\\",\\"dayName\\":\\"Monday\\",\\"marathiDayName\\":\\"सोमवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-14\\",\\"formattedDate\\":\\"14 एप्रिल\\",\\"dayName\\":\\"Tuesday\\",\\"marathiDayName\\":\\"मंगळवार\\",\\"menuName\\":\\"हरभरा + तांदूळ\\",\\"primaryAtt\\":12,\\"upperAtt\\":0,\\"honorarium\\":31.08,\\"consumptions\\":{\\"F_TANDUL\\":\\"1.200\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.240\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.012\\",\\"F_TEL\\":\\"0.050\\",\\"F_KANDAMASALA\\":\\"0.015\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":31.08,\\"vegCost\\":0},{\\"date\\":\\"2026-04-15\\",\\"formattedDate\\":\\"15 एप्रिल\\",\\"dayName\\":\\"Wednesday\\",\\"marathiDayName\\":\\"बुधवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-16\\",\\"formattedDate\\":\\"16 एप्रिल\\",\\"dayName\\":\\"Thursday\\",\\"marathiDayName\\":\\"गुरुवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-17\\",\\"formattedDate\\":\\"17 एप्रिल\\",\\"dayName\\":\\"Friday\\",\\"marathiDayName\\":\\"शुक्रवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-18\\",\\"formattedDate\\":\\"18 एप्रिल\\",\\"dayName\\":\\"Saturday\\",\\"marathiDayName\\":\\"शनिवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-19\\",\\"formattedDate\\":\\"19 एप्रिल\\",\\"dayName\\":\\"Sunday\\",\\"marathiDayName\\":\\"रविवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-20\\",\\"formattedDate\\":\\"20 एप्रिल\\",\\"dayName\\":\\"Monday\\",\\"marathiDayName\\":\\"सोमवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-21\\",\\"formattedDate\\":\\"21 एप्रिल\\",\\"dayName\\":\\"Tuesday\\",\\"marathiDayName\\":\\"मंगळवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-22\\",\\"formattedDate\\":\\"22 एप्रिल\\",\\"dayName\\":\\"Wednesday\\",\\"marathiDayName\\":\\"बुधवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-23\\",\\"formattedDate\\":\\"23 एप्रिल\\",\\"dayName\\":\\"Thursday\\",\\"marathiDayName\\":\\"गुरुवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-24\\",\\"formattedDate\\":\\"24 एप्रिल\\",\\"dayName\\":\\"Friday\\",\\"marathiDayName\\":\\"शुक्रवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-25\\",\\"formattedDate\\":\\"25 एप्रिल\\",\\"dayName\\":\\"Saturday\\",\\"marathiDayName\\":\\"शनिवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-26\\",\\"formattedDate\\":\\"26 एप्रिल\\",\\"dayName\\":\\"Sunday\\",\\"marathiDayName\\":\\"रविवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-27\\",\\"formattedDate\\":\\"27 एप्रिल\\",\\"dayName\\":\\"Monday\\",\\"marathiDayName\\":\\"सोमवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-28\\",\\"formattedDate\\":\\"28 एप्रिल\\",\\"dayName\\":\\"Tuesday\\",\\"marathiDayName\\":\\"मंगळवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-29\\",\\"formattedDate\\":\\"29 एप्रिल\\",\\"dayName\\":\\"Wednesday\\",\\"marathiDayName\\":\\"बुधवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0},{\\"date\\":\\"2026-04-30\\",\\"formattedDate\\":\\"30 एप्रिल\\",\\"dayName\\":\\"Thursday\\",\\"marathiDayName\\":\\"गुरुवार\\",\\"menuName\\":\\"\\",\\"primaryAtt\\":0,\\"upperAtt\\":0,\\"honorarium\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"0.000\\",\\"F_MOONGDAL\\":\\"0.000\\",\\"F_TOORDAL\\":\\"0.000\\",\\"F_MASURDAL\\":\\"0.000\\",\\"F_MOOG\\":\\"0.000\\",\\"F_CHAVALI\\":\\"0.000\\",\\"F_HARBHARA\\":\\"0.000\\",\\"F_WATANA\\":\\"0.000\\",\\"F_MATAKI\\":\\"0.000\\",\\"F_SOYABIN\\":\\"0.000\\",\\"F_MITH\\":\\"0.000\\",\\"F_TEL\\":\\"0.000\\",\\"F_KANDAMASALA\\":\\"0.000\\",\\"F_JIRE\\":\\"0.000\\",\\"F_HALAD\\":\\"0.000\\",\\"F_MOHRI\\":\\"0.000\\"},\\"fuelCost\\":0,\\"vegCost\\":0}],\\"footerTotals\\":{\\"primaryAtt\\":12,\\"upperAtt\\":0,\\"totalHonorarium\\":31.08,\\"totalFuel\\":31.08,\\"totalVeg\\":0,\\"consumptions\\":{\\"F_TANDUL\\":\\"1.2\\",\\"F_MOONGDAL\\":\\"0\\",\\"F_TOORDAL\\":\\"0\\",\\"F_MASURDAL\\":\\"0\\",\\"F_MOOG\\":\\"0\\",\\"F_CHAVALI\\":\\"0\\",\\"F_HARBHARA\\":\\"0.24\\",\\"F_WATANA\\":\\"0\\",\\"F_MATAKI\\":\\"0\\",\\"F_SOYABIN\\":\\"0\\",\\"F_MITH\\":\\"0.01\\",\\"F_TEL\\":\\"0.05\\",\\"F_KANDAMASALA\\":\\"0.01\\",\\"F_JIRE\\":\\"0\\",\\"F_HALAD\\":\\"0\\",\\"F_MOHRI\\":\\"0\\"}}}"	primary
\.


--
-- Data for Name: payment_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payment_receipts" ("id", "teacher_id", "receipt_date", "amount", "remarks", "created_at", "section_type") FROM stdin;
\.


--
-- Data for Name: saas_coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."saas_coupons" ("id", "code", "discount_percent", "promoter_name", "usage_limit", "usage_count", "is_active", "created_at") FROM stdin;
\.


--
-- Data for Name: saas_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."saas_pricing" ("id", "section_type", "base_price", "description", "updated_at") FROM stdin;
74cc9b58-0762-4c0c-934a-4589c8119295	primary	800	इ. १ ते ५ वी शिक्षक वार्षिक शुल्क	2026-04-15 16:36:28.731036+00
e283edbd-e49a-419b-aa01-6770e9792ea1	upper_primary	800	इ. ६ ते ८ वी शिक्षक वार्षिक शुल्क	2026-04-15 16:36:28.731036+00
53c4f2b1-aa4d-4fee-a186-5e041722c309	combo	1200	इ. १ ते ८ वी शिक्षक वार्षिक शुल्क (Combo Package)	2026-04-15 16:36:28.731036+00
\.


--
-- Data for Name: saas_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."saas_subscriptions" ("id", "teacher_id", "plan_type", "amount_paid", "coupon_used", "razorpay_order_id", "razorpay_payment_id", "payment_status", "created_at") FROM stdin;
\.


--
-- Data for Name: schools; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."schools" ("id", "name", "created_at") FROM stdin;
\.


--
-- Data for Name: stock_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."stock_receipts" ("id", "teacher_id", "item_name", "quantity_kg", "unit", "receipt_date", "remarks", "created_at", "standard_group") FROM stdin;
fadbca41-a938-4c04-9723-e8797f04d304	de4acac4-8d84-442f-81dc-6bd72acc571c	तांदूळ	100	kg	2026-04-01	\N	2026-04-12 05:45:35.632715+00	primary
5523c25f-1709-4968-b733-203d0ca708e9	de4acac4-8d84-442f-81dc-6bd72acc571c	तांदूळ	100	kg	2026-03-01	\N	2026-04-12 05:46:37.463151+00	primary
9547771e-b603-4dac-8906-55b66170133c	de4acac4-8d84-442f-81dc-6bd72acc571c	तूरडाळ	3	kg	2026-03-01	\N	2026-04-12 05:46:51.242562+00	primary
fa09956e-278f-41da-bc54-268c320b3cc6	de4acac4-8d84-442f-81dc-6bd72acc571c	वाटाणा	3	kg	2026-03-01	\N	2026-04-12 05:47:02.725757+00	primary
6bd1f4a8-9643-40d5-a3d8-0d299b1794bb	de4acac4-8d84-442f-81dc-6bd72acc571c	मुग	3	kg	2026-03-01	\N	2026-04-12 05:47:14.819836+00	primary
a0178ba7-599e-402f-b2dd-edf9b903a351	de4acac4-8d84-442f-81dc-6bd72acc571c	मुग	3	kg	2026-03-01	\N	2026-04-12 05:47:34.266174+00	primary
a3642eea-a520-405d-9874-72c3bc0ef5dc	de4acac4-8d84-442f-81dc-6bd72acc571c	मुगडाळ	3	kg	2026-03-01	\N	2026-04-12 05:47:45.399458+00	primary
ad7226b5-d985-40ba-aa55-7eff27eed853	de4acac4-8d84-442f-81dc-6bd72acc571c	मसूरडाळ	3	kg	2026-03-01	\N	2026-04-12 05:47:52.38367+00	primary
26a7d709-50d7-453b-a366-420c41464d24	de4acac4-8d84-442f-81dc-6bd72acc571c	चवळी	3	kg	2026-03-01	\N	2026-04-12 05:48:30.47641+00	primary
858c957c-3b6c-4c01-a542-034b01d11f78	de4acac4-8d84-442f-81dc-6bd72acc571c	हरभरा	3	kg	2026-03-01	\N	2026-04-12 05:48:40.865453+00	primary
3f3d2f13-aa86-43a3-9d2c-374f78046343	de4acac4-8d84-442f-81dc-6bd72acc571c	सोयाबीन	3	kg	2026-03-01	\N	2026-04-12 05:48:48.983097+00	primary
935bfd39-2f2a-480d-8a07-3b5de8d9c8cc	de4acac4-8d84-442f-81dc-6bd72acc571c	मटकी	3	kg	2026-03-01	\N	2026-04-12 05:49:00.190926+00	primary
6a3b29b1-ba38-4ab2-b3d2-0e0e4be25cfd	de4acac4-8d84-442f-81dc-6bd72acc571c	मीठ	1	kg	2026-03-01	\N	2026-04-12 05:49:10.774642+00	primary
afb58d74-0cca-4262-b88b-aa9725938300	de4acac4-8d84-442f-81dc-6bd72acc571c	हळद	0.5	kg	2026-03-01	\N	2026-04-12 05:49:23.823769+00	primary
43f8eef5-3f2e-49fa-9dd4-e7d3b0c057ba	de4acac4-8d84-442f-81dc-6bd72acc571c	कांदा मसाला	1	kg	2026-03-01	\N	2026-04-12 05:49:32.233731+00	primary
8df87c07-cf4b-41e8-8984-d0c22b51ba5d	de4acac4-8d84-442f-81dc-6bd72acc571c	जिरे	0.5	kg	2026-03-01	\N	2026-04-12 05:49:42.394941+00	primary
e7a8cb5a-1be1-4fa7-a5de-db57d5a9ce33	de4acac4-8d84-442f-81dc-6bd72acc571c	मोहरी	0.5	kg	2026-03-01	\N	2026-04-12 05:49:51.07393+00	primary
e84c4cd3-c0fc-468d-9c34-3acf872b7713	de4acac4-8d84-442f-81dc-6bd72acc571c	तेल	3	kg	2026-03-01	\N	2026-04-12 05:49:59.534542+00	primary
05299ec4-a295-497b-8ccc-7ed08a7ddad4	de4acac4-8d84-442f-81dc-6bd72acc571c	तांदूळ	100	kg	2026-04-02	\N	2026-04-12 06:21:18.453524+00	primary
ed1d9606-8d57-484c-a543-40c4a481e917	de4acac4-8d84-442f-81dc-6bd72acc571c	तूरडाळ	20	kg	2026-04-02	\N	2026-04-12 06:21:36.328381+00	primary
c82cf422-a6fa-4405-90a1-d4a85cece9e9	de4acac4-8d84-442f-81dc-6bd72acc571c	तूरडाळ	20	kg	2026-04-02	\N	2026-04-12 06:22:02.226783+00	primary
7212888e-3833-4853-82b1-51dc93bd742c	de4acac4-8d84-442f-81dc-6bd72acc571c	तूरडाळ	20	kg	2026-04-01	\N	2026-04-12 06:23:03.727758+00	primary
acacb662-5ae6-409a-8687-cde8f1e6c1c3	de4acac4-8d84-442f-81dc-6bd72acc571c	तूरडाळ	20	kg	2026-04-01	\N	2026-04-12 06:23:38.897129+00	primary
\.


--
-- Data for Name: student_enrollment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."student_enrollment" ("id", "teacher_id", "std_1", "std_2", "std_3", "std_4", "std_5", "std_6", "std_7", "std_8", "last_updated") FROM stdin;
2c774ecc-f188-49c1-a1dd-c11e849ff7f4	de4acac4-8d84-442f-81dc-6bd72acc571c	4	1	3	2	5	7	2	0	2026-04-11 15:42:23.982581+00
45cb21d2-8bac-49b4-9411-e0ea8a731bb7	fa7e7ca3-8532-4609-a7ce-7d1bd3d183b3	5	5	5	5	5	5	5	5	2026-04-15 17:39:33.432816+00
\.


--
-- Data for Name: system_modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."system_modules" ("id", "module_name", "route_path", "icon_name", "is_active_for_teachers", "created_at") FROM stdin;
4961f88b-9aea-4582-90f0-0b82841682c4	Dashboard	/dashboard	LayoutDashboard	t	2026-04-05 17:03:56.497154+00
9848eee3-5cbc-4aca-a337-c7d385eb640e	Daily Log	/daily-log	ClipboardList	t	2026-04-05 17:03:56.497154+00
0f8ef358-f586-4bc0-a8ac-38e5bc9d59e7	Audit Reports	/reports	FileText	t	2026-04-05 17:03:56.497154+00
ffff37ac-d41f-4b8f-94fd-97afbc26333b	Inventory	/inventory	Package	t	2026-04-05 17:03:56.497154+00
\.


--
-- PostgreSQL database dump complete
--

-- \unrestrict mKh0NFrCApbKrpi6auNgJfUxA46d1hSQScGxaQEtsaReIUUDsHifJbNxnnZoR92

RESET ALL;
