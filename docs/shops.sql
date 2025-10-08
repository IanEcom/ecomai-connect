create table public.shops (
  id uuid not null default gen_random_uuid (),
  owner_user_id uuid null,
  shop_gid text null,
  shop_domain public.citext not null,
  custom_domain public.citext null,
  name text null,
  email text null,
  country_code character(2) null,
  currency_code character(3) null,
  timezone text null,
  plan_name text null,
  shop_owner text null,
  access_scopes text[] not null default '{}'::text[],
  is_active boolean not null default true,
  access_token bytea null,
  token_created_at timestamp with time zone null,
  token_updated_at timestamp with time zone null,
  webhook_shared_secret_hash text null,
  last_full_import_at timestamp with time zone null,
  last_delta_sync_at timestamp with time zone null,
  products_cursor text null,
  variants_cursor text null,
  bulk_operation_id text null,
  bulk_operation_status text null,
  bulk_operation_url text null,
  last_bulk_started_at timestamp with time zone null,
  last_bulk_completed_at timestamp with time zone null,
  products_count integer null,
  variants_count integer null,
  shopify_created_at timestamp with time zone null,
  shopify_updated_at timestamp with time zone null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  deleted_at timestamp with time zone null,
  constraint shops_pkey primary key (id),
  constraint shops_shop_domain_key unique (shop_domain),
  constraint shops_shop_gid_key unique (shop_gid),
  constraint shops_owner_user_id_fkey foreign KEY (owner_user_id) references auth.users (id) on delete set null,
  constraint shops_bulk_operation_status_check check (
    (
      bulk_operation_status = any (
        array[
          'CREATED'::text,
          'RUNNING'::text,
          'COMPLETED'::text,
          'FAILED'::text,
          'CANCELED'::text
        ]
      )
    )
  ),
  constraint shops_domain_format_chk check (
    (
      shop_domain ~* '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'::citext
    )
  )
) TABLESPACE pg_default;

create index IF not exists shops_is_active_idx on public.shops using btree (is_active) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists shops_owner_user_id_idx on public.shops using btree (owner_user_id) TABLESPACE pg_default;

create index IF not exists shops_last_delta_sync_at_idx on public.shops using btree (last_delta_sync_at desc) TABLESPACE pg_default;

create index IF not exists shops_deleted_at_idx on public.shops using btree (deleted_at) TABLESPACE pg_default;

create trigger set_timestamp BEFORE
update on shops for EACH row
execute FUNCTION tg_set_timestamp ();