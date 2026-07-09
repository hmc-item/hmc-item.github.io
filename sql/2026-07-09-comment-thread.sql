-- 코멘트 답글 스레드 (2026-07-09)
-- parent_id: null = 최상위 코멘트(교수/관리자), 값 있음 = 그 comment_id에 대한 답글(SME/교수/관리자)
-- 기존 테이블 ALTER라 RLS 재설정 불필요(comments RLS는 이미 off).
alter table comments add column if not exists parent_id text;

-- 확인용
-- select comment_id, parent_id, author_role, content from comments order by created_at;
