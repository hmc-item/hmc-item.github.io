-- item-dev/sql/2026-07-09-assignments-migration.sql
-- 역량 1:N 조 배정 — competencies에 assignments(jsonb) 추가 + 기존 단일 team_id backfill.
-- Supabase SQL Editor에서 실행. 기존 competencies 테이블이라 RLS 재확인 불필요.

alter table competencies add column if not exists assignments jsonb default '[]'::jsonb;

-- 기존 단일 team_id → assignments 배열 backfill (assignments가 비어있는 행만)
update competencies
set assignments = jsonb_build_array(
      jsonb_build_object('team_id', team_id, 'target_count', coalesce(target_count, 50))
    )
where team_id is not null
  and (assignments is null or assignments = '[]'::jsonb);

-- 확인
select comp_id, comp_name, team_id, target_count, assignments from competencies order by order_index;
