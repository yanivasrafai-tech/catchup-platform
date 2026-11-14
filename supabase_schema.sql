-- CatchUp Database Schema for Supabase (Free Tier)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('student', 'tutor', 'admin')),
  school text default 'אמית ישיבה תיכונית שדרות',
  grade text default 'י״א',
  subjects jsonb default '["מתמטיקה 5 יח׳", "פיזיקה 5 יח׳", "אנגלית 5 יח׳"]'::jsonb,
  xp_points integer default 120,
  created_at timestamptz default now()
);

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  topic text not null,
  title text not null,
  type text not null check (type in ('summary', 'exercise', 'video')),
  difficulty text default 'בינוני',
  content text not null,
  solution_steps text,
  video_url text,
  status text not null default 'approved' check (status in ('draft', 'pending', 'approved')),
  search_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.live_capsules (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  topic text not null,
  school text not null default 'אמית ישיבה תיכונית שדרות',
  grade text not null default 'י״א',
  lesson_date text not null,
  uploader_name text not null,
  raw_notes text,
  ai_capsule_summary text not null,
  key_formulas jsonb default '[]'::jsonb,
  solved_example text,
  quick_quiz jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.tutoring_requests (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  student_grade text not null,
  student_contact text not null,
  subject text not null,
  topic text not null,
  preferred_time text not null,
  clinical_brief text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed')),
  assigned_tutor text,
  created_at timestamptz default now()
);

create table if not exists public.radar_alerts (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  grade text not null,
  subject text not null,
  topic text not null,
  stuck_percentage integer not null,
  students_affected integer not null,
  severity text not null check (severity in ('critical', 'warning', 'watch')),
  recommendation text not null,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.study_materials enable row level security;
alter table public.live_capsules enable row level security;
alter table public.tutoring_requests enable row level security;
alter table public.radar_alerts enable row level security;

create policy "Public read/write profiles" on public.profiles for all using (true) with check (true);
create policy "Public read/write materials" on public.study_materials for all using (true) with check (true);
create policy "Public read/write capsules" on public.live_capsules for all using (true) with check (true);
create policy "Public read/write requests" on public.tutoring_requests for all using (true) with check (true);
create policy "Public read/write radar" on public.radar_alerts for all using (true) with check (true);
