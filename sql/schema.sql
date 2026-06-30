-- 역량기반 문항개발 시스템 스키마 (Supabase SQL Editor에서 실행)

create table if not exists teams (
  id          text primary key,
  team_id     text unique not null,
  team_name   text not null,
  created_at  timestamptz default now()
);

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

-- 시드 예시(선택): 조 1개 + 역량 1개
-- insert into teams(id,team_id,team_name) values('t_seed','t_seed','기계보전');
-- insert into competencies(id,comp_id,comp_name,team_id,target_count,order_index)
--   values('c_seed','c_seed','설비 진단','t_seed',50,1);
