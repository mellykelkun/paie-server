alter table paiements
add column if not exists url_retour text;

update paiements
set url_retour = url_annulation
where url_retour is null and url_annulation is not null;
