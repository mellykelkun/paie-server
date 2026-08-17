create table if not exists paiements (
  id text primary key,
  id_commande text not null,
  id_client text not null,
  montant numeric(14, 2) not null check (montant > 0),
  devise text not null,
  statut text not null,
  moyens_paiement jsonb not null,
  url_paiement text not null,
  url_succes text,
  url_annulation text,
  url_webhook text,
  secret_webhook text,
  moyen_choisi text,
  preuve jsonb,
  verification jsonb,
  historique jsonb not null,
  raison_refus text,
  dernier_webhook jsonb,
  cree_le timestamptz not null,
  modifie_le timestamptz not null
);

create index if not exists paiements_statut_idx on paiements (statut);
create index if not exists paiements_id_commande_idx on paiements (id_commande);
create index if not exists paiements_cree_le_idx on paiements (cree_le desc);

create unique index if not exists paiements_sha256_preuve_unique
on paiements ((preuve->>'sha256'))
where preuve is not null and preuve->>'sha256' <> '';

create unique index if not exists paiements_reference_transaction_unique
on paiements ((lower(preuve->>'referenceTransaction')))
where preuve is not null and preuve->>'referenceTransaction' <> '';
