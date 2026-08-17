alter table paiements
add column if not exists origine text not null default 'api_marchand';

update paiements
set origine = 'sandbox'
where lower(coalesce(metadonnees->>'source', '')) = 'sandbox';

alter table paiements
drop constraint if exists paiements_origine_valide;

alter table paiements
add constraint paiements_origine_valide
check (origine in ('sandbox', 'api_marchand'));

create index if not exists paiements_origine_idx on paiements (origine);
