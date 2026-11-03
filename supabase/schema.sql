-- DeadZero · schema Supabase
-- Chạy toàn bộ file này một lần trong Supabase > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

-- ===== Bảng =====
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default 'Sinh viên',
  hours numeric[] not null default '{3,3,2,3,3,5,4}',
  semester_start date not null default (date_trunc('week', now())::date - 63),
  semester_weeks int not null default 15
);

create table if not exists class_sections (
  id uuid primary key default gen_random_uuid(),
  sec text not null,
  name text not null,
  color int not null default 1,
  lecturer text not null default '',
  credits int not null default 3,
  shared boolean not null default false,
  join_code text unique,
  owner_id uuid not null default auth.uid() references profiles on delete cascade,
  exam_at timestamptz, exam_room text, exam_format text,
  created_at timestamptz not null default now()
);

create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references class_sections on delete cascade,
  wd int not null check (wd between 0 and 6),
  period_from int not null, period_to int not null,
  room text not null default ''
);

create table if not exists class_members (
  class_id uuid references class_sections on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (class_id, user_id)
);

-- Bài tập chung của lớp: khi có người tham gia, mỗi bài được chép thành một nhiệm vụ của họ
create table if not exists class_tasks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references class_sections on delete cascade,
  title text not null, due_at timestamptz not null, est numeric not null default 2
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_id uuid references class_sections on delete set null,
  leader_id uuid not null default auth.uid() references profiles on delete cascade,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid references groups on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (group_id, user_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  class_id uuid references class_sections on delete set null,
  group_id uuid references groups on delete cascade,
  due_at timestamptz not null,
  est numeric not null default 2,
  progress int not null default 0,
  status text not null default 'todo' check (status in ('todo','doing','review','done')),
  src text not null default 'personal' check (src in ('personal','class','group','goal')),
  created_by uuid not null default auth.uid() references profiles on delete cascade,
  subtasks jsonb not null default '[]',
  done_at timestamptz,
  files int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists task_assignees (
  task_id uuid references tasks on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (task_id, user_id)
);

-- Nhật ký nhóm: chỉ thêm, không sửa, không xoá
create table if not exists activity_log (
  id bigserial primary key,
  group_id uuid not null references groups on delete cascade,
  actor_id uuid not null default auth.uid() references profiles on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  name text not null, start_date date not null, end_date date not null,
  days int[] not null, minutes int not null default 45,
  ms jsonb not null default '[]', items jsonb not null default '[]'
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  icon text not null default 'info',
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===== Hàm kiểm tra quyền (security definer để tránh đệ quy RLS) =====
create or replace function is_class_member(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from class_members where class_id = cid and user_id = auth.uid());
$$;

create or replace function is_group_member(gid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function can_see_task(tid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from tasks t where t.id = tid and (
      t.created_by = auth.uid()
      or exists(select 1 from task_assignees a where a.task_id = t.id and a.user_id = auth.uid())
      or (t.group_id is not null and exists(select 1 from group_members g where g.group_id = t.group_id and g.user_id = auth.uid()))
    ));
$$;

-- ===== Row Level Security =====
alter table profiles enable row level security;
alter table class_sections enable row level security;
alter table class_sessions enable row level security;
alter table class_members enable row level security;
alter table class_tasks enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table tasks enable row level security;
alter table task_assignees enable row level security;
alter table activity_log enable row level security;
alter table goals enable row level security;
alter table notifications enable row level security;

drop policy if exists p_profiles_sel on profiles;   create policy p_profiles_sel on profiles for select to authenticated using (true);
drop policy if exists p_profiles_upd on profiles;   create policy p_profiles_upd on profiles for update using (id = auth.uid());

drop policy if exists p_cls_sel on class_sections;  create policy p_cls_sel on class_sections for select using (owner_id = auth.uid() or is_class_member(id));
drop policy if exists p_cls_ins on class_sections;  create policy p_cls_ins on class_sections for insert with check (owner_id = auth.uid());
drop policy if exists p_cls_upd on class_sections;  create policy p_cls_upd on class_sections for update using (owner_id = auth.uid());
drop policy if exists p_cls_del on class_sections;  create policy p_cls_del on class_sections for delete using (owner_id = auth.uid());

drop policy if exists p_ses_sel on class_sessions;  create policy p_ses_sel on class_sessions for select using (is_class_member(class_id));
drop policy if exists p_ses_all on class_sessions;  create policy p_ses_all on class_sessions for all
  using (exists(select 1 from class_sections c where c.id = class_id and c.owner_id = auth.uid()))
  with check (exists(select 1 from class_sections c where c.id = class_id and c.owner_id = auth.uid()));

drop policy if exists p_cm_sel on class_members;    create policy p_cm_sel on class_members for select using (is_class_member(class_id));
drop policy if exists p_cm_ins on class_members;    create policy p_cm_ins on class_members for insert
  with check (user_id = auth.uid() and exists(select 1 from class_sections c where c.id = class_id and c.owner_id = auth.uid()));
drop policy if exists p_cm_del on class_members;    create policy p_cm_del on class_members for delete using (user_id = auth.uid());

drop policy if exists p_ct_sel on class_tasks;      create policy p_ct_sel on class_tasks for select using (is_class_member(class_id));

drop policy if exists p_grp_sel on groups;          create policy p_grp_sel on groups for select using (leader_id = auth.uid() or is_group_member(id));
drop policy if exists p_grp_ins on groups;          create policy p_grp_ins on groups for insert with check (leader_id = auth.uid());
drop policy if exists p_grp_upd on groups;          create policy p_grp_upd on groups for update using (leader_id = auth.uid());

drop policy if exists p_gm_sel on group_members;    create policy p_gm_sel on group_members for select using (is_group_member(group_id));
drop policy if exists p_gm_ins on group_members;    create policy p_gm_ins on group_members for insert
  with check (user_id = auth.uid() and exists(select 1 from groups g where g.id = group_id and g.leader_id = auth.uid()));
drop policy if exists p_gm_del on group_members;    create policy p_gm_del on group_members for delete using (user_id = auth.uid());

drop policy if exists p_task_sel on tasks;          create policy p_task_sel on tasks for select using (created_by = auth.uid() or can_see_task(id));
drop policy if exists p_task_ins on tasks;          create policy p_task_ins on tasks for insert
  with check (created_by = auth.uid() and (group_id is null or is_group_member(group_id)));
drop policy if exists p_task_upd on tasks;          create policy p_task_upd on tasks for update using (created_by = auth.uid() or can_see_task(id));
drop policy if exists p_task_del on tasks;          create policy p_task_del on tasks for delete using (created_by = auth.uid());

drop policy if exists p_ta_sel on task_assignees;   create policy p_ta_sel on task_assignees for select using (user_id = auth.uid() or can_see_task(task_id));
drop policy if exists p_ta_ins on task_assignees;   create policy p_ta_ins on task_assignees for insert with check (can_see_task(task_id));
drop policy if exists p_ta_del on task_assignees;   create policy p_ta_del on task_assignees for delete using (can_see_task(task_id));

drop policy if exists p_log_sel on activity_log;    create policy p_log_sel on activity_log for select using (is_group_member(group_id));
drop policy if exists p_log_ins on activity_log;    create policy p_log_ins on activity_log for insert with check (actor_id = auth.uid() and is_group_member(group_id));

drop policy if exists p_goal_all on goals;          create policy p_goal_all on goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_ntf_sel on notifications;   create policy p_ntf_sel on notifications for select using (user_id = auth.uid());
drop policy if exists p_ntf_upd on notifications;   create policy p_ntf_upd on notifications for update using (user_id = auth.uid());

-- ===== Tự tạo hồ sơ khi đăng ký =====
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ===== Thông báo tự động =====
create or replace function notify_assigned() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then
    insert into notifications (user_id, icon, text)
    select new.user_id, 'user', 'Bạn được giao “' || t.title || '”' from tasks t where t.id = new.task_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_assigned on task_assignees;
create trigger trg_notify_assigned after insert on task_assignees for each row execute function notify_assigned();

create or replace function notify_session_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, icon, text)
  select m.user_id, 'cal', 'Lịch ' || c.name || ' đã đổi: phòng ' || new.room
  from class_members m join class_sections c on c.id = new.class_id
  where m.class_id = new.class_id and m.user_id <> c.owner_id;
  return new;
end $$;
drop trigger if exists trg_session_change on class_sessions;
create trigger trg_session_change after update on class_sessions for each row execute function notify_session_change();

create or replace function notify_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.group_id is not null and new.status = 'review' and old.status <> 'review' then
    insert into notifications (user_id, icon, text)
    select g.leader_id, 'review', 'Có việc chờ duyệt: “' || new.title || '”' from groups g
    where g.id = new.group_id and g.leader_id <> auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists trg_review on tasks;
create trigger trg_review after update on tasks for each row execute function notify_review();

-- ===== RPC =====
create or replace function preview_class(p_code text) returns json
language sql security definer stable set search_path = public as $$
  select json_build_object(
    'id', c.id, 'sec', c.sec, 'name', c.name, 'credits', c.credits,
    'members', (select count(*) from class_members m where m.class_id = c.id),
    'owner_name', (select full_name from profiles where id = c.owner_id),
    'sessions', coalesce((select json_agg(s order by s.wd) from class_sessions s where s.class_id = c.id), '[]'),
    'exam_at', c.exam_at, 'exam_room', c.exam_room, 'exam_format', c.exam_format,
    'shared_tasks', (select count(*) from class_tasks t where t.class_id = c.id),
    'already', is_class_member(c.id))
  from class_sections c where c.shared and c.join_code = upper(p_code);
$$;

create or replace function join_class(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; ct record; tid uuid;
begin
  select id into cid from class_sections where shared and join_code = upper(p_code);
  if cid is null then raise exception 'Không tìm thấy lớp với mã này'; end if;
  if is_class_member(cid) then return cid; end if;
  insert into class_members (class_id, user_id) values (cid, auth.uid());
  for ct in select * from class_tasks where class_id = cid loop
    insert into tasks (title, class_id, due_at, est, src, created_by)
    values (ct.title, cid, ct.due_at, ct.est, 'class', auth.uid()) returning id into tid;
    insert into task_assignees (task_id, user_id) values (tid, auth.uid());
  end loop;
  insert into notifications (user_id, icon, text)
  select auth.uid(), 'cls', 'Đã tham gia ' || name from class_sections where id = cid;
  return cid;
end $$;

create or replace function find_class_by_sec(p_sec text) returns json
language sql security definer stable set search_path = public as $$
  select json_build_object('code', c.join_code, 'members', (select count(*) from class_members m where m.class_id = c.id))
  from class_sections c where c.shared and c.sec = p_sec and not is_class_member(c.id)
  order by (select count(*) from class_members m where m.class_id = c.id) desc limit 1;
$$;

create or replace function add_class_task(p_class uuid, p_title text, p_due timestamptz, p_est numeric) returns void
language plpgsql security definer set search_path = public as $$
declare m record; tid uuid;
begin
  if not exists(select 1 from class_sections where id = p_class and owner_id = auth.uid()) then
    raise exception 'Chỉ người quản lý lớp mới thêm được bài tập chung';
  end if;
  insert into class_tasks (class_id, title, due_at, est) values (p_class, p_title, p_due, p_est);
  for m in select user_id from class_members where class_id = p_class loop
    insert into tasks (title, class_id, due_at, est, src, created_by)
    values (p_title, p_class, p_due, p_est, 'class', m.user_id) returning id into tid;
    insert into task_assignees (task_id, user_id) values (tid, m.user_id);
  end loop;
end $$;

create or replace function join_group(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  select id into gid from groups where invite_code = upper(p_code);
  if gid is null then raise exception 'Không tìm thấy nhóm với mã này'; end if;
  insert into group_members (group_id, user_id) values (gid, auth.uid()) on conflict do nothing;
  insert into activity_log (group_id, actor_id, action) values (gid, auth.uid(), 'tham gia nhóm');
  return gid;
end $$;

-- Toàn bộ dữ liệu người dùng cần, trong một lần gọi
create or replace function my_state() returns json
language sql security definer stable set search_path = public as $$
  with my_groups as (select group_id from group_members where user_id = auth.uid()),
       my_classes as (select class_id from class_members where user_id = auth.uid())
  select json_build_object(
    'me', (select row_to_json(p) from profiles p where p.id = auth.uid()),
    'classes', coalesce((select json_agg(json_build_object(
        'id', c.id, 'sec', c.sec, 'name', c.name, 'color', c.color, 'lecturer', c.lecturer, 'credits', c.credits,
        'shared', c.shared, 'join_code', c.join_code, 'owner_id', c.owner_id,
        'owner_name', (select full_name from profiles where id = c.owner_id),
        'members', (select count(*) from class_members m where m.class_id = c.id),
        'exam_at', c.exam_at, 'exam_room', c.exam_room, 'exam_format', c.exam_format,
        'sessions', coalesce((select json_agg(s order by s.wd, s.period_from) from class_sessions s where s.class_id = c.id), '[]')
      ) order by c.created_at) from class_sections c where c.id in (select class_id from my_classes)), '[]'),
    'groups', coalesce((select json_agg(json_build_object(
        'id', g.id, 'name', g.name, 'class_id', g.class_id, 'leader_id', g.leader_id, 'invite_code', g.invite_code,
        'members', (select json_agg(json_build_object('id', p.id, 'name', p.full_name)) from group_members gm join profiles p on p.id = gm.user_id where gm.group_id = g.id)
      ) order by g.created_at) from groups g where g.id in (select group_id from my_groups)), '[]'),
    'tasks', coalesce((select json_agg(json_build_object(
        'id', t.id, 'title', t.title, 'class_id', t.class_id, 'group_id', t.group_id, 'due_at', t.due_at, 'est', t.est,
        'progress', t.progress, 'status', t.status, 'src', t.src, 'created_by', t.created_by, 'subtasks', t.subtasks,
        'done_at', t.done_at, 'files', t.files,
        'assignees', coalesce((select json_agg(a.user_id) from task_assignees a where a.task_id = t.id), '[]')
      )) from tasks t where t.created_by = auth.uid()
          or exists(select 1 from task_assignees a where a.task_id = t.id and a.user_id = auth.uid())
          or t.group_id in (select group_id from my_groups)), '[]'),
    'log', coalesce((select json_agg(l order by l.created_at desc) from (select * from activity_log where group_id in (select group_id from my_groups) order by created_at desc limit 300) l), '[]'),
    'goals', coalesce((select json_agg(g) from goals g where g.user_id = auth.uid()), '[]'),
    'notifs', coalesce((select json_agg(n order by n.created_at desc) from (select * from notifications where user_id = auth.uid() order by created_at desc limit 50) n), '[]'),
    'people', coalesce((select json_object_agg(p.id, p.full_name) from profiles p where p.id = auth.uid()
        or p.id in (select gm.user_id from group_members gm where gm.group_id in (select group_id from my_groups))
        or p.id in (select c.owner_id from class_sections c where c.id in (select class_id from my_classes))), '{}')
  );
$$;

-- ===== Realtime =====
do $$
declare t text;
begin
  foreach t in array array['tasks','task_assignees','activity_log','class_sessions','class_members','group_members','notifications'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
