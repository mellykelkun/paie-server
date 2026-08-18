# Scripts de nettoyage

Ce dossier contient les scripts utiles pour nettoyer les donnees de test sans supprimer l'installation.

Ils servent surtout apres des essais avec le sandbox, quand on veut repartir sur une liste de paiements et de commandes plus propre.

## Ce qui est conserve

Les scripts de nettoyage ne suppriment pas:

- les tables PostgreSQL;
- les migrations appliquees;
- la configuration marchand;
- les cles et secrets;
- le compte marchand;
- les volumes Docker.

## Nettoyer les paiements de test

Commande Docker:

```bash
docker compose exec application npm run nettoyer:donnees-test -- --confirmer
```

Ce script supprime les paiements reconnus comme donnees de test:

- paiements crees par le sandbox;
- paiements avec origine `sandbox`;
- scenarios de test internes;
- fichiers de preuve lies a ces paiements, quand ils existent.

Avant suppression, le script affiche le nombre de paiements en base et le nombre de paiements concernes.

Pour voir ce qui serait nettoye sans supprimer:

```bash
docker compose exec application npm run nettoyer:donnees-test
```

## Vider les commandes du sandbox

Commande Docker:

```bash
docker compose exec sandbox npm run nettoyer:sandbox -- --confirmer
```

Ce script vide l'historique des commandes du site de test sandbox.

Il ne supprime pas les paiements dans Paie Server. Pour nettoyer le parcours complet de test, lancez les deux scripts:

```bash
docker compose exec application npm run nettoyer:donnees-test -- --confirmer
docker compose exec sandbox npm run nettoyer:sandbox -- --confirmer
```

## Vider tous les paiements

Commande plus forte:

```bash
docker compose exec application npm run nettoyer:donnees-test -- --tout-paiements --confirmer
```

Cette option supprime tous les paiements, pas seulement ceux du sandbox.

A utiliser seulement en environnement de developpement ou de test. Ne l'utilisez pas sur une installation marchand en production.

## Apres nettoyage

Verifiez que l'application repond encore:

```bash
curl http://localhost:7821/api/sante
```

Verifiez que le sandbox est vide:

```bash
curl http://localhost:7822/commandes
```

Si vous voulez tester a nouveau, ouvrez:

```txt
http://localhost:7822
```
