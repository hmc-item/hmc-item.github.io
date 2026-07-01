-- 역량기반 문항개발 시스템 스키마 (Supabase SQL Editor에서 실행)

create table if not exists teams (
  id          text primary key,
  team_id     text unique not null,
  team_name   text not null,
  class_no    int,
  created_at  timestamptz default now()
);

-- 기존 프로젝트 대응(이미 teams가 있으면 컬럼만 추가)
alter table teams add column if not exists class_no int;

create table if not exists competencies (
  id            text primary key,
  comp_id       text unique not null,
  comp_name     text not null,
  category      text,
  description   text,
  team_id       text,
  target_count  int  default 50,
  order_index   int  default 0,
  created_at    timestamptz default now()
);

create table if not exists items (
  id            bigint generated always as identity primary key,
  item_id       text unique not null,
  comp_id       text not null,
  team_id       text not null,
  item_type     text not null check (item_type in ('mcq','essay')),
  difficulty    int  not null check (difficulty in (1,2,3)),
  question      text not null,
  option1       text, option2 text, option3 text, option4 text,
  answer        int  check (answer between 1 and 4),
  model_answer  text,
  explanation   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists item_images (
  id          bigint generated always as identity primary key,
  image_id    text unique not null,
  item_id     text not null,
  area        text not null,           -- question|option1..4|explanation|model_answer
  file_path   text not null,
  file_name   text not null,
  created_at  timestamptz default now()
);

create table if not exists comments (
  id          bigint generated always as identity primary key,
  comment_id  text unique not null,
  item_id     text not null,
  comp_id     text not null,
  author_role text not null,           -- 교수|관리자
  content     text not null,
  is_resolved boolean default false,
  created_at  timestamptz default now()
);

create index if not exists idx_items_comp on items(comp_id);
create index if not exists idx_items_team on items(team_id);
create index if not exists idx_comments_item on comments(item_id);
create index if not exists idx_images_item on item_images(item_id);

-- RLS 비활성화: 비밀번호 없는 사내 공개 도구라 publishable(anon) 키로 읽기/쓰기 허용
-- (RLS가 켜져 있으면 정책 없이는 공개 키가 데이터를 못 읽어 빈 결과가 반환됨)
alter table teams        disable row level security;
alter table competencies disable row level security;
alter table items        disable row level security;
alter table item_images  disable row level security;
alter table comments     disable row level security;

-- Storage(item-images 버킷) 정책: 공개 키(anon)로 업로드/조회/삭제 허용
-- (버킷은 대시보드 Storage에서 먼저 생성. Public 체크 시 read는 자동이나 insert/delete는 정책 필요)
drop policy if exists item_images_public_read   on storage.objects;
drop policy if exists item_images_public_insert on storage.objects;
drop policy if exists item_images_public_delete on storage.objects;
create policy item_images_public_read   on storage.objects for select using (bucket_id = 'item-images');
create policy item_images_public_insert on storage.objects for insert with check (bucket_id = 'item-images');
create policy item_images_public_delete on storage.objects for delete using (bucket_id = 'item-images');

-- 시드 예시(선택): 조 1개 + 역량 1개
-- insert into teams(id,team_id,team_name) values('t_seed','t_seed','기계보전');
-- insert into competencies(id,comp_id,comp_name,team_id,target_count,order_index)
--   values('c_seed','c_seed','설비 진단','t_seed',50,1);
