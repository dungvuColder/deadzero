-- DeadZero · Nhắc deadline qua email (tóm tắt buổi sáng 06:30 giờ Việt Nam)
-- Gửi qua Brevo (miễn phí 300 email/ngày). Chạy file này sau schema.sql.
-- Khoá API Brevo và email người gửi được lưu trong Supabase Vault (xem README).

create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table profiles add column if not exists email_digest boolean not null default true;

-- Nội dung email cho một người: việc quá hạn và việc hết hạn trong 3 ngày tới
create or replace function digest_html(p_uid uuid) returns json
language plpgsql security definer stable set search_path = public as $$
declare
  rows text := '';
  n int := 0;
  t record;
  name text;
begin
  select full_name into name from profiles where id = p_uid;
  for t in
    select tk.title, tk.due_at, coalesce(c.name, '') as cls,
           (tk.due_at at time zone 'Asia/Ho_Chi_Minh')::date - (now() at time zone 'Asia/Ho_Chi_Minh')::date as days_left
    from tasks tk
    join task_assignees a on a.task_id = tk.id and a.user_id = p_uid
    left join class_sections c on c.id = tk.class_id
    where tk.status <> 'done' and tk.due_at < now() + interval '3 days'
    order by tk.due_at
    limit 15
  loop
    n := n + 1;
    rows := rows || format(
      '<tr><td style="padding:10px 0;border-bottom:1px solid #ECECEE"><b>%s</b><br><span style="color:#71717A;font-size:13px">%s</span></td>'
      '<td style="padding:10px 0;border-bottom:1px solid #ECECEE;text-align:right;white-space:nowrap;font-family:monospace;color:%s">%s</td></tr>',
      replace(replace(t.title, '<', '&lt;'), '>', '&gt;'),
      replace(replace(t.cls, '<', '&lt;'), '>', '&gt;'),
      case when t.days_left <= 0 then '#C2410C' else '#0A0A0A' end,
      case when t.due_at < now() then 'Quá hạn'
           when t.days_left = 0 then 'Hôm nay ' || to_char(t.due_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI')
           when t.days_left = 1 then 'Ngày mai'
           else 'Còn ' || t.days_left || ' ngày' end);
  end loop;
  return json_build_object(
    'count', n,
    'subject', case when n = 0 then 'DeadZero · Hôm nay không có deadline gấp' else 'DeadZero · ' || n || ' deadline trong 3 ngày tới' end,
    'html',
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0A0A0A">'
      || '<div style="width:36px;height:36px;border-radius:10px;background:#0A0A0A;color:#fff;font-weight:700;font-size:18px;text-align:center;line-height:36px">0</div>'
      || '<h2 style="margin:20px 0 4px">Chào ' || coalesce(name, 'bạn') || ',</h2>'
      || case when n = 0 then '<p style="color:#52525B">Không có việc nào hết hạn trong 3 ngày tới. Một ngày nhẹ nhàng!</p>'
              else '<p style="color:#52525B">Đây là những việc cần để ý hôm nay:</p><table style="width:100%;border-collapse:collapse">' || rows || '</table>' end
      || '<p style="color:#A1A1AA;font-size:12px;margin-top:24px">Tắt email này trong DeadZero › Cài đặt.</p></div>'
  );
end $$;

-- Gửi một email qua Brevo
create or replace function send_brevo(p_to text, p_subject text, p_html text) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  key text; sender text;
begin
  select decrypted_secret into key from vault.decrypted_secrets where name = 'brevo_api_key';
  select decrypted_secret into sender from vault.decrypted_secrets where name = 'digest_sender';
  if key is null or sender is null then raise exception 'Chưa cấu hình brevo_api_key hoặc digest_sender trong Vault'; end if;
  return net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', key, 'content-type', 'application/json', 'accept', 'application/json'),
    body := jsonb_build_object('sender', jsonb_build_object('name', 'DeadZero', 'email', sender),
                               'to', jsonb_build_array(jsonb_build_object('email', p_to)),
                               'subject', p_subject, 'htmlContent', p_html)
  );
end $$;

-- Chạy mỗi sáng: gửi cho người bật nhắc và có việc gấp
create or replace function send_daily_digests() returns int
language plpgsql security definer set search_path = public as $$
declare u record; d json; sent int := 0;
begin
  for u in
    select p.id, au.email from profiles p join auth.users au on au.id = p.id
    where p.email_digest and au.email is not null and au.email_confirmed_at is not null
  loop
    d := digest_html(u.id);
    if (d->>'count')::int > 0 then
      perform send_brevo(u.email, d->>'subject', d->>'html');
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end $$;

-- Nút "Gửi thử" trong Cài đặt: gửi cho chính người đang đăng nhập, tối đa 1 lần / 5 phút
alter table profiles add column if not exists last_test_digest timestamptz;
create or replace function send_test_digest() returns text
language plpgsql security definer set search_path = public as $$
declare em text; d json; last timestamptz;
begin
  select email into em from auth.users where id = auth.uid();
  if em is null then raise exception 'Chưa đăng nhập'; end if;
  select last_test_digest into last from profiles where id = auth.uid();
  if last is not null and last > now() - interval '5 minutes' then
    raise exception 'Vừa gửi thử rồi, chờ 5 phút rồi thử lại';
  end if;
  update profiles set last_test_digest = now() where id = auth.uid();
  d := digest_html(auth.uid());
  perform send_brevo(em, d->>'subject', d->>'html');
  return em;
end $$;

revoke execute on function digest_html(uuid), send_brevo(text, text, text), send_daily_digests(), send_test_digest() from public, anon, authenticated;
grant execute on function send_test_digest() to authenticated;

-- 23:30 UTC = 06:30 giờ Việt Nam
select cron.unschedule('deadzero-daily-digest') where exists (select 1 from cron.job where jobname = 'deadzero-daily-digest');
select cron.schedule('deadzero-daily-digest', '30 23 * * *', 'select public.send_daily_digests()');
