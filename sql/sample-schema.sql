-- 샘플 문항 뱅크 스키마 (Supabase SQL Editor에서 실행)
-- 기존 item-images 버킷/정책 재사용. RLS off(사내 무암호 설계).

create table if not exists sample_items (
  id            bigint generated always as identity primary key,
  sample_id     text unique not null,
  item_type     text not null check (item_type in ('mcq','essay')),
  qual_grade    text,          -- 기능사|산업기사|기사 (자격등급, 난이도 대체)
  qual_name     text,          -- 국가기술자격명, 없으면 '현대엔지비 직접개발'
  comp_id       text,          -- 역량 태깅(선택, nullable) — 혼합 연동
  category      text,          -- 선택 분류
  question      text not null,
  option1 text, option2 text, option3 text, option4 text,
  answer        int  check (answer between 1 and 4),
  model_answer  text,
  explanation   text not null, -- 필수: 이론서 개발 근거
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists sample_item_images (
  id          bigint generated always as identity primary key,
  image_id    text unique not null,
  sample_id   text not null,
  area        text not null,   -- question|option1..4|explanation|model_answer
  file_path   text not null,
  file_name   text not null,
  created_at  timestamptz default now()
);

create index if not exists idx_sample_items_comp on sample_items(comp_id);
create index if not exists idx_sample_images_sample on sample_item_images(sample_id);

alter table sample_items disable row level security;
alter table sample_item_images disable row level security;
