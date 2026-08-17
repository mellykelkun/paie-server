create table if not exists configuration_application (
  cle text primary key,
  valeur text not null,
  est_secret boolean not null default false,
  modifie_le timestamptz not null default now()
);

create index if not exists configuration_application_modifie_le_idx
on configuration_application (modifie_le desc);
