alter table paiements
add column if not exists jeton_client text,
add column if not exists metadonnees jsonb not null default '{}'::jsonb;

update paiements
set jeton_client = id
where jeton_client is null;

create unique index if not exists paiements_jeton_client_unique
on paiements (jeton_client)
where jeton_client is not null and jeton_client <> '';

create table if not exists notifications_webhook (
  id text primary key,
  id_paiement text not null references paiements(id) on delete cascade,
  evenement text not null,
  charge_utile jsonb not null,
  url_webhook text not null,
  statut text not null,
  tentatives integer not null default 0,
  dernier_code_http integer,
  derniere_erreur text,
  prochain_essai_le timestamptz,
  envoye_le timestamptz,
  cree_le timestamptz not null,
  modifie_le timestamptz not null
);

create unique index if not exists notifications_webhook_paiement_evenement_unique
on notifications_webhook (id_paiement, evenement);

create index if not exists notifications_webhook_statut_idx
on notifications_webhook (statut, prochain_essai_le);
