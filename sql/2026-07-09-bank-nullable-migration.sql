-- 문제은행(Item Bank) — items.comp_id / team_id NOT NULL 해제
-- 배경: 은행 문항 = 역량 미연결(comp_id/team_id 없음). A안은 null로 표현.
-- 라이브 DB는 두 컬럼이 NOT NULL(에러 23502)이라 은행 저장이 막힘 → 해제.
-- 주의: 이는 "기존 테이블 컬럼 ALTER"라 RLS 함정(신규 테이블 생성 시)과 무관. 안전.

alter table items alter column comp_id drop not null;
alter table items alter column team_id drop not null;

-- 확인용(선택): 두 컬럼 is_nullable = YES 여야 함
-- select column_name, is_nullable from information_schema.columns
--   where table_name='items' and column_name in ('comp_id','team_id');
