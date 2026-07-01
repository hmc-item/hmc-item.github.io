-- 공지사항 스키마 (Supabase SQL Editor에서 실행)
-- ⚠ 실행 후 반드시 RLS 상태 확인(아래 주석) — SQL Editor로 만든 테이블은 RLS가 켜진 채 생성될 수 있음.

create table if not exists notices (
  id            text primary key,
  notice_id     text unique not null,
  title         text not null,
  content       text not null,
  is_common     boolean default false,   -- true = 전체 공통(team_ids 무시)
  team_ids      jsonb   default '[]',     -- is_common=false일 때 대상 조 team_id 배열
  is_pinned     boolean default false,    -- 상단 고정
  created_at    timestamptz default now()
);

alter table notices disable row level security;

-- 확인: 아래가 false 여야 publishable 키 INSERT가 통과함
-- select relrowsecurity from pg_class where relname = 'notices';
