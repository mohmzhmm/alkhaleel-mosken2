begin;

-- Permanent default texts used by the monthly PNG/PDF generator.
create table if not exists public.mosque_calendar_defaults(
  id smallint primary key default 1 check(id=1),
  left_text text not null default '',
  right_text text not null default '',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check(length(left_text)<=450 and length(right_text)<=550)
);
insert into public.mosque_calendar_defaults(id) values(1) on conflict(id) do nothing;
alter table public.mosque_calendar_defaults enable row level security;
revoke all on public.mosque_calendar_defaults from anon,authenticated;
grant select(id,left_text,right_text,updated_at) on public.mosque_calendar_defaults to authenticated;
drop policy if exists read_calendar_defaults on public.mosque_calendar_defaults;
create policy read_calendar_defaults on public.mosque_calendar_defaults
  for select to authenticated using(true);

create or replace function public.save_calendar_defaults(p_left_text text,p_right_text text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_mosque_admin() then raise exception 'Forbidden' using errcode='42501';end if;
  if length(coalesce(p_left_text,''))>450 or length(coalesce(p_right_text,''))>550
  then raise exception 'Calendar text is too long';end if;
  insert into public.mosque_calendar_defaults(id,left_text,right_text,updated_by,updated_at)
  values(1,trim(coalesce(p_left_text,'')),trim(coalesce(p_right_text,'')),auth.uid(),now())
  on conflict(id) do update set left_text=excluded.left_text,right_text=excluded.right_text,
    updated_by=auth.uid(),updated_at=now();
end;
$$;
revoke all on function public.save_calendar_defaults(text,text) from public;
grant execute on function public.save_calendar_defaults(text,text) to authenticated;

-- Safe visual settings for both public mosque screens.
create table if not exists public.mosque_screen_layouts(
  screen_key text primary key check(screen_key in ('alkhaleel-mosken2','alkhaleel-mosken')),
  settings jsonb not null check(jsonb_typeof(settings)='object'),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.mosque_screen_layouts(screen_key,settings) values
('alkhaleel-mosken2','{"logo_size":180,"logo_x":15,"logo_y":15,"clock_font":64,"date_font":26,"countdown_font":112,"countdown_label_font":29,"next_prayer_font":48,"prayer_name_font":29,"swedish_name_font":19,"prayer_time_font":26,"iqama_label_font":13,"iqama_time_font":19,"header_offset":0,"countdown_offset":80,"cards_offset":15,"cards_width":45,"card_gap":15,"news_font":19,"side_width":450,"side_x":60,"ticker_font":32,"ticker_height":80}'::jsonb),
('alkhaleel-mosken','{"logo_size":70,"logo_x":10,"logo_y":10,"clock_font":48,"date_font":16,"countdown_font":80,"countdown_label_font":17,"next_prayer_font":32,"prayer_name_font":20,"swedish_name_font":12,"prayer_time_font":18,"iqama_label_font":10,"iqama_time_font":16,"header_offset":8,"countdown_offset":12,"cards_offset":12,"cards_width":92,"card_gap":8,"news_font":19,"side_width":450,"side_x":60,"ticker_font":32,"ticker_height":80}'::jsonb)
on conflict(screen_key) do nothing;

alter table public.mosque_screen_layouts enable row level security;
revoke all on public.mosque_screen_layouts from anon,authenticated;
grant select(screen_key,settings,updated_at) on public.mosque_screen_layouts to anon,authenticated;
drop policy if exists read_screen_layouts on public.mosque_screen_layouts;
create policy read_screen_layouts on public.mosque_screen_layouts
  for select to anon,authenticated using(true);

create or replace function public.save_screen_layout(p_screen_key text,p_settings jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare
  k text;
  defaults jsonb;
  value jsonb;
begin
  if not public.is_mosque_admin() then raise exception 'Forbidden' using errcode='42501';end if;
  if p_screen_key not in ('alkhaleel-mosken2','alkhaleel-mosken') or jsonb_typeof(p_settings)<>'object'
  then raise exception 'Invalid screen settings';end if;

  for k in select jsonb_object_keys(p_settings) loop
    if k not in ('logo_size','logo_x','logo_y','clock_font','date_font','countdown_font',
      'countdown_label_font','next_prayer_font','prayer_name_font','swedish_name_font',
      'prayer_time_font','iqama_label_font','iqama_time_font','header_offset',
      'countdown_offset','cards_offset','cards_width','card_gap','news_font','side_width',
      'side_x','ticker_font','ticker_height')
    then raise exception 'Unknown screen setting: %',k;end if;
  end loop;

  defaults=case p_screen_key
    when 'alkhaleel-mosken2' then '{"logo_size":180,"logo_x":15,"logo_y":15,"clock_font":64,"date_font":26,"countdown_font":112,"countdown_label_font":29,"next_prayer_font":48,"prayer_name_font":29,"swedish_name_font":19,"prayer_time_font":26,"iqama_label_font":13,"iqama_time_font":19,"header_offset":0,"countdown_offset":80,"cards_offset":15,"cards_width":45,"card_gap":15,"news_font":19,"side_width":450,"side_x":60,"ticker_font":32,"ticker_height":80}'::jsonb
    else '{"logo_size":70,"logo_x":10,"logo_y":10,"clock_font":48,"date_font":16,"countdown_font":80,"countdown_label_font":17,"next_prayer_font":32,"prayer_name_font":20,"swedish_name_font":12,"prayer_time_font":18,"iqama_label_font":10,"iqama_time_font":16,"header_offset":8,"countdown_offset":12,"cards_offset":12,"cards_width":92,"card_gap":8,"news_font":19,"side_width":450,"side_x":60,"ticker_font":32,"ticker_height":80}'::jsonb
  end;
  value=defaults||p_settings;

  if (value->>'logo_size')::numeric not between 30 and 400
    or (value->>'logo_x')::numeric not between 0 and 500
    or (value->>'logo_y')::numeric not between 0 and 500
    or (value->>'clock_font')::numeric not between 24 and 120
    or (value->>'date_font')::numeric not between 10 and 60
    or (value->>'countdown_font')::numeric not between 36 and 200
    or (value->>'countdown_label_font')::numeric not between 10 and 60
    or (value->>'next_prayer_font')::numeric not between 14 and 90
    or (value->>'prayer_name_font')::numeric not between 12 and 70
    or (value->>'swedish_name_font')::numeric not between 8 and 50
    or (value->>'prayer_time_font')::numeric not between 12 and 70
    or (value->>'iqama_label_font')::numeric not between 8 and 40
    or (value->>'iqama_time_font')::numeric not between 10 and 60
    or (value->>'header_offset')::numeric not between -50 and 300
    or (value->>'countdown_offset')::numeric not between -50 and 300
    or (value->>'cards_offset')::numeric not between -50 and 300
    or (value->>'cards_width')::numeric not between 40 and 100
    or (value->>'card_gap')::numeric not between 0 and 50
    or (value->>'news_font')::numeric not between 10 and 60
    or (value->>'side_width')::numeric not between 200 and 700
    or (value->>'side_x')::numeric not between 0 and 300
    or (value->>'ticker_font')::numeric not between 12 and 60
    or (value->>'ticker_height')::numeric not between 40 and 160
  then raise exception 'Screen setting is outside the allowed range';end if;

  insert into public.mosque_screen_layouts(screen_key,settings,updated_by,updated_at)
  values(p_screen_key,value,auth.uid(),now())
  on conflict(screen_key) do update set settings=excluded.settings,updated_by=auth.uid(),updated_at=now();
end;
$$;
revoke all on function public.save_screen_layout(text,jsonb) from public;
grant execute on function public.save_screen_layout(text,jsonb) to authenticated;

grant all on public.mosque_calendar_defaults,public.mosque_screen_layouts to service_role;

commit;
