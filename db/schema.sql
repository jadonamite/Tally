create table if not exists users (
  id           text primary key,                 -- 16 hex chars from the tally_uid cookie
  created_at   timestamptz not null default now(),
  bankroll_usd double precision not null default 100
);

create table if not exists voices (
  id            text primary key,                -- 'v_' + 12 hex
  user_id       text not null references users(id),
  kind          text not null check (kind in ('telegram','x','wallet','self','other')),
  handle        text not null,                   -- '@name', or lowercase 0x address for wallets
  display_name  text not null,
  created_at    timestamptz not null default now(),
  last_import_ts bigint,                         -- wallets: newest trade timestamp imported (unix seconds)
  unique (user_id, kind, handle)
);

create table if not exists calls (
  id              text primary key,              -- 'c_' + 16 hex
  user_id         text not null references users(id),
  voice_id        text not null references voices(id),
  source          text not null check (source in ('paste','wallet')),
  raw_text        text not null,
  market_slug     text not null,
  condition_id    text not null,
  question        text not null,
  image           text,
  outcome_index   int  not null check (outcome_index in (0,1)),
  outcome_label   text not null,
  token_id        text not null,
  lock_at         timestamptz not null,
  captured_at     timestamptz not null,
  entry_price     double precision,
  canonical       text not null,                 -- exact JSON string that was hashed
  call_hash       text not null,                 -- sha256 hex of canonical
  seal_kind       text not null check (seal_kind in ('sui','polygon','none')),
  seal_ref        text,                          -- Sui digest or Polygon tx hash
  sealed_at       timestamptz,                   -- chain time, read through Tatum
  seal_checkpoint text,                          -- Sui checkpoint or Polygon block number
  status          text not null check (status in ('open','late','unsealed','locked','graded','void')),
  close_price     double precision,
  result          text check (result in ('won','lost','void')),
  beat_close      double precision,
  pnl_per_dollar  double precision,
  graded_at       timestamptz,
  mem_call_job    text,
  mem_call_blob   text,
  mem_grade_job   text,
  mem_grade_blob  text,
  created_at      timestamptz not null default now(),
  unique (voice_id, condition_id, outcome_index)
);

create index if not exists calls_by_user   on calls (user_id, created_at desc);
create index if not exists calls_by_voice  on calls (voice_id, created_at desc);
create index if not exists calls_open      on calls (lock_at) where status = 'open';
create index if not exists calls_locked    on calls (lock_at) where status = 'locked';

create table if not exists standings (
  id              bigserial primary key,
  voice_id        text not null references voices(id),
  at              timestamptz not null default now(),
  standing        text not null check (standing in ('unproven','earned','not_earned','tombstoned')),
  n               int not null,
  mean_beat_close double precision,
  pnl_per_bet     double precision,
  mem_job         text,
  mem_blob        text
);

create index if not exists standings_by_voice on standings (voice_id, at desc);
