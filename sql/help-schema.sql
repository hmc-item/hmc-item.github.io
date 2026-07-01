-- 관리자 편집형 사용법(Help) 스키마 (Supabase SQL Editor에서 실행)
-- 주의: SQL Editor로 만든 테이블은 RLS가 켜진 채 생성될 수 있음.
--       아래 disable 실행 후 relrowsecurity=false 확인 필수.

create table if not exists help_texts (
  role        text primary key,          -- 'sme' | 'coach' | 'admin'
  body        text not null,             -- 여러 줄 텍스트(줄 = 단계)
  updated_at  timestamptz default now()
);

alter table help_texts disable row level security;

-- 확인용:
-- select relname, relrowsecurity from pg_class where relname = 'help_texts';
