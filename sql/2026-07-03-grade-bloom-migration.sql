-- 2026-07-03 통합: 난이도(difficulty) 폐지 → 급수(grade)로 통일 + Bloom 보존
-- Supabase SQL Editor에서 실행. 실행 후 RLS 상태(relrowsecurity=false) 재확인 필수.

alter table items add column if not exists grade text;
alter table items add column if not exists bloom text;

-- 기존 테스트 문항 backfill: difficulty(1/2/3) → 급수
update items set grade = case difficulty
    when 1 then '3급'
    when 2 then '2급'
    when 3 then '1급'
    else null
  end
  where grade is null and difficulty is not null;

-- 코드가 더 이상 difficulty를 INSERT하지 않으므로 NOT NULL 제약 해제(INSERT 실패 방지)
alter table items alter column difficulty drop not null;

-- 확인용: 아래 두 쿼리로 검증
-- select column_name from information_schema.columns where table_name='items' and column_name in ('grade','bloom');
-- select relrowsecurity from pg_class where relname='items';   -- false 기대
