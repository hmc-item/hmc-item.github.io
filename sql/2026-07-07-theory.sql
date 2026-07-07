-- 이론서 초안 생성기 스키마 (Supabase SQL Editor에서 실행)
-- ⚠️ 실행 후 반드시 RLS 비활성 + relrowsecurity=false 확인 (반복 함정)

-- 1) 이론서 저장 테이블 (1역량 = 1단원, section_key = comp_id)
create table if not exists theory_sections (
  id            text primary key,
  section_key   text unique not null,
  subject       text,
  section_title text,
  content       jsonb not null,
  status        text default 'draft',
  updated_at    timestamptz default now(),
  created_at    timestamptz default now()
);
alter table theory_sections disable row level security;

-- 2) 역량에 문항개발 완료 플래그 추가 (이론서 개발 게이트)
alter table competencies add column if not exists dev_done boolean default false;

-- 3) RLS 상태 확인 (아래 쿼리 결과가 false 여야 정상)
-- select relname, relrowsecurity from pg_class where relname = 'theory_sections';
