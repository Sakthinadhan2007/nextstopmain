-- StopMate Chennai SQL schema
-- Transport tables requested: bus_routes, metro_routes, train_routes, custom_routes

create table if not exists users (
  id serial primary key,
  name varchar(120) not null,
  email varchar(255) not null unique,
  home_city varchar(120) not null default 'Chennai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bus_routes (
  id serial primary key,
  route_code varchar(24) not null unique,
  route_name varchar(160) not null,
  start_terminal varchar(160) not null,
  end_terminal varchar(160) not null,
  city varchar(120) not null default 'Chennai',
  updated_at timestamptz not null default now()
);

create table if not exists bus_stops (
  id serial primary key,
  route_id int not null references bus_routes(id) on delete cascade,
  stop_name varchar(160) not null,
  stop_sequence int not null,
  latitude double precision not null,
  longitude double precision not null,
  pre_alert_meters int not null default 500,
  unique(route_id, stop_sequence)
);

create table if not exists metro_routes (
  id serial primary key,
  line_code varchar(24) not null unique,
  line_name varchar(160) not null,
  start_terminal varchar(160) not null,
  end_terminal varchar(160) not null,
  city varchar(120) not null default 'Chennai',
  updated_at timestamptz not null default now()
);

create table if not exists metro_stops (
  id serial primary key,
  route_id int not null references metro_routes(id) on delete cascade,
  station_name varchar(160) not null,
  station_sequence int not null,
  latitude double precision not null,
  longitude double precision not null,
  pre_alert_meters int not null default 800,
  unique(route_id, station_sequence)
);

create table if not exists train_routes (
  id serial primary key,
  line_code varchar(24) not null unique,
  line_name varchar(160) not null,
  start_terminal varchar(160) not null,
  end_terminal varchar(160) not null,
  city varchar(120) not null default 'Chennai',
  updated_at timestamptz not null default now()
);

create table if not exists train_stops (
  id serial primary key,
  route_id int not null references train_routes(id) on delete cascade,
  station_name varchar(160) not null,
  station_sequence int not null,
  latitude double precision not null,
  longitude double precision not null,
  pre_alert_meters int not null default 600,
  unique(route_id, station_sequence)
);

create table if not exists custom_routes (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  route_name varchar(160) not null,
  city varchar(120) not null default 'Chennai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists custom_stops (
  id serial primary key,
  route_id int not null references custom_routes(id) on delete cascade,
  stop_name varchar(160) not null,
  stop_sequence int not null,
  latitude double precision not null,
  longitude double precision not null,
  pre_alert_meters int not null default 600,
  unique(route_id, stop_sequence)
);

create table if not exists saved_alerts (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  mode varchar(24) not null check (mode in ('bus', 'train', 'metro', 'custom')),
  stop_ref_id int not null,
  is_active boolean not null default true,
  vibration_enabled boolean not null default true,
  sound_enabled boolean not null default true,
  last_triggered_at timestamptz
);

create index if not exists idx_bus_stops_route on bus_stops(route_id);
create index if not exists idx_metro_stops_route on metro_stops(route_id);
create index if not exists idx_train_stops_route on train_stops(route_id);
create index if not exists idx_custom_stops_route on custom_stops(route_id);
create index if not exists idx_alerts_user_mode on saved_alerts(user_id, mode);
