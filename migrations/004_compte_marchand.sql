create table if not exists comptes_marchands (
  identifiant text primary key,
  mot_de_passe_hash text not null,
  secret_2fa text not null,
  cree_le timestamptz not null,
  modifie_le timestamptz not null
);
