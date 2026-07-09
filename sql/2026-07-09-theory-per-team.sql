-- 이론서 조별 개발: 문항개발 완료 게이트를 조별로 (역량×조)
-- ⚠️ 기존 테이블 ALTER이므로 신규 테이블 RLS 함정과 무관(별도 disable 불필요).

-- 1) 조별 완료 플래그 컬럼(jsonb 배열: [team_id, ...])
alter table competencies add column if not exists dev_done_teams jsonb default '[]'::jsonb;

-- 2) 기존 dev_done=true 역량 → 배정된 조 전체를 dev_done_teams에 backfill(과거 완료 보존)
--    assignments(jsonb 배열)에서 team_id를 뽑아 채운다. assignments 없고 구 team_id만 있으면 그것 사용.
update competencies
set dev_done_teams = coalesce(
  (select jsonb_agg(a->>'team_id') from jsonb_array_elements(assignments) a),
  case when team_id is not null then jsonb_build_array(team_id) else '[]'::jsonb end
)
where dev_done = true
  and (dev_done_teams is null or dev_done_teams = '[]'::jsonb);

-- 3) 확인용(선택): 컬럼과 backfill 결과 조회
-- select comp_id, comp_name, dev_done, dev_done_teams from competencies order by order_index;
