# Paie Server

Paie Server est une application self-hosted pour gerer des paiements manuels.
Elle aide un marchand a accepter un paiement Mobile Money ou un paiement manuel sans passer par un agregateur.

Le principe est simple: le client paie directement le marchand, puis envoie son recu dans Paie Server. Le marchand verifie, accepte ou refuse le paiement depuis son tableau de bord. Le site marchand est ensuite prevenu automatiquement.

Important: l'argent ne passe pas par Paie Server. Paie Server organise le parcours, les preuves, les statuts et les notifications.

## Ce que fait l'application

- Cree des liens de paiement pour un site ou une application externe.
- Affiche au client les comptes Wave, Orange Money ou autres moyens manuels du marchand.
- Recoit une capture ou un recu de paiement.
- Aide a verifier le montant, le moyen de paiement, la reference et les doublons.
- Donne au marchand une interface pour accepter ou refuser les paiements.
- Informe le site marchand par notification apres la decision.
- Fournit un sandbox pour tester l'integration comme avec un vrai site externe.
- Garde les reglages marchand dans l'interface, pas dans le fichier `.env`.

## A quoi ca sert

Paie Server est pense pour les marchands et developpeurs qui veulent un moyen de paiement portable, deployable sur un VPS, et utilisable par plusieurs sites ou applications.

Exemples:

- boutique en ligne qui accepte Wave ou Orange Money;
- application SaaS qui attend une validation manuelle;
- outil interne qui veut suivre des paiements sans ouvrir le tableau de bord;
- environnement de test avant de brancher un vrai site marchand.

## Demarrage depuis GitHub

Prerequis: Docker et Docker Compose.

```bash
git clone https://github.com/mellykelkun/paie-server.git
cd paie-server
cp .env.example .env
cp .env.sandbox.example .env.sandbox
docker compose up -d --build
```

Ouvrez ensuite:

```txt
Application:       http://localhost:7821
Tableau marchand: http://localhost:7821/marchand
Configuration:    http://localhost:7821/marchand/configuration
Sandbox:          http://localhost:7822
```

Les ports visibles sur votre machine sont `7821` pour Paie Server et `7822` pour le sandbox. Ils sont choisis pour eviter les conflits avec les sites locaux qui utilisent souvent `3000`, `4000`, `5173`, `8000` ou `8080`.

Les ports internes des conteneurs restent `3000` et `4000`. Ils ne derangent pas les autres services du VPS tant qu'ils ne sont pas exposes directement sur l'hote.

## Demarrage depuis Docker Hub

Quand l'image publique Docker Hub est publiee, le code source n'est plus obligatoire. Il suffit d'avoir un dossier avec `.env`, `.env.sandbox` et `docker-compose.hub.yml`.

```bash
mkdir paie-server
cd paie-server
curl -fsSLO https://raw.githubusercontent.com/mellykelkun/paie-server/main/.env.example
curl -fsSLO https://raw.githubusercontent.com/mellykelkun/paie-server/main/.env.sandbox.example
curl -fsSLO https://raw.githubusercontent.com/mellykelkun/paie-server/main/docker-compose.hub.yml
cp .env.example .env
cp .env.sandbox.example .env.sandbox
docker compose -f docker-compose.hub.yml up -d
```

La commande Docker Compose finale est donc:

```bash
docker compose -f docker-compose.hub.yml up -d
```

Si l'image Docker Hub change de nom, modifiez seulement cette ligne dans `.env`:

```env
PAIE_SERVER_IMAGE=mellykelkun/paie-server:latest
```

## Ce qui reste dans `.env`

Le fichier `.env` sert uniquement au demarrage technique. Il contient ce que l'application doit connaitre avant de pouvoir afficher l'interface.

```env
PAIE_SERVER_IMAGE=mellykelkun/paie-server:latest
PORT=3000
PORT_PUBLIC_APPLICATION=7821
PORT_PUBLIC_SANDBOX=7822
ENVIRONNEMENT=developpement
CLE_INSTALLATION_MARCHAND=
SECRET_SESSION_MARCHAND=remplacer_par_un_secret_session_long
DUREE_SESSION_MARCHAND_MINUTES=30
COOKIE_SECURISE=false

HOTE_BASE_DE_DONNEES=localhost
PORT_BASE_DE_DONNEES=5432
NOM_BASE_DE_DONNEES=paie_server
UTILISATEUR_BASE_DE_DONNEES=paie_server
MOT_DE_PASSE_BASE_DE_DONNEES=remplacer_par_un_mot_de_passe_long
MAX_CONNEXIONS_BASE_DE_DONNEES=10
```

Avant une vraie mise en ligne, changez au minimum:

- `MOT_DE_PASSE_BASE_DE_DONNEES`: mot de passe de la base de donnees.
- `SECRET_SESSION_MARCHAND`: secret qui protege la connexion au tableau marchand.
- `CLE_INSTALLATION_MARCHAND`: protection conseillee pour la premiere creation du compte marchand.
- `ENVIRONNEMENT=production`: a utiliser quand l'application est exposee publiquement en HTTPS.
- `COOKIE_SECURISE=true`: a utiliser en production derriere HTTPS.

Le fichier `.env.sandbox` garde seulement le port interne du sandbox:

```env
PORT_SANDBOX=4000
```

## Ce qui se configure dans l'interface

Apres le premier lancement, ouvrez:

```txt
http://localhost:7821/marchand/configuration
```

Cette page remplace les anciennes configurations metier dans `.env`.

A configurer dans l'interface:

- comptes de paiement affiches au client;
- instructions Wave, Orange Money ou autre moyen manuel;
- URL publique de Paie Server;
- cle pour creer des paiements;
- cle d'administration API;
- reglages de notification;
- controles du recu et verification OCR;
- configuration du sandbox.

Ces valeurs sont gardees en base de donnees. Le marchand peut les modifier sans ouvrir les fichiers du serveur.

## Premiere utilisation

1. Ouvrez le tableau marchand:

```txt
http://localhost:7821/marchand
```

2. Si aucun compte marchand n'existe encore, Paie Server affiche la page d'initialisation.

3. Scannez le QR code avec une application Authenticator.

4. Creez l'acces marchand.

5. Allez dans la page de configuration.

6. Renseignez au minimum:

- l'URL publique de Paie Server;
- les comptes de paiement;
- la cle pour creer des paiements;
- la cle d'administration API si un service externe doit piloter les paiements;
- les URLs et secrets du sandbox si vous voulez tester le parcours complet.

## Les deux cles importantes

La cle pour creer des paiements sert au site marchand. C'est elle que le serveur de la boutique utilise pour demander a Paie Server de creer un lien de paiement. Elle ne doit jamais etre mise dans une page visible par les clients.

La cle d'administration API sert a un outil de gestion externe. Elle permet de consulter les paiements, suivre les evenements et effectuer des actions d'administration sans ouvrir le tableau marchand. Elle est plus sensible et doit rester reservee aux outils de confiance.

Dans le sandbox, la cle de creation est collee manuellement pour reproduire le comportement d'un vrai site externe. Si elle est vide ou fausse, le sandbox ne peut pas creer de paiement. C'est volontaire.

## Configuration du site marchand externe

Le site marchand est votre boutique, votre application ou votre service. C'est lui qui demande la creation d'un paiement a Paie Server.

Configuration minimale conseillee dans le site marchand:

```env
PAIE_SERVER_URL=https://pay.votre-domaine.com
PAIE_SERVER_CLE_API=la_cle_pour_creer_des_paiements
PAIE_SERVER_DEVISE=XOF
PAIE_SERVER_ID_CLIENT_DEFAUT=client_invite
PAIE_SERVER_MODE=production
PAIE_SERVER_URL_RETOUR=https://votre-site.com/paiement/retour
PAIE_SERVER_URL_WEBHOOK=https://votre-site.com/webhook/paie-server
PAIE_SERVER_SECRET_WEBHOOK=un_secret_long_choisi_par_le_site_marchand
# Optionnel: page separee si vous ne voulez pas reutiliser PAIE_SERVER_URL_RETOUR pour les abandons.
PAIE_SERVER_URL_ANNULATION=
```

Explication simple:

- `PAIE_SERVER_URL`: adresse publique de Paie Server.
- `PAIE_SERVER_CLE_API`: cle que Paie Server demande pour creer un paiement.
- `PAIE_SERVER_DEVISE`: devise par defaut, par exemple `XOF`.
- `PAIE_SERVER_ID_CLIENT_DEFAUT`: identifiant du client final si votre site n'a pas encore de compte client. Ce n'est pas l'identifiant du site marchand.
- `PAIE_SERVER_MODE`: `production` pour le vrai service, `sandbox` ou `test` pour vos essais si votre integration le prevoit.
- `PAIE_SERVER_URL_RETOUR`: page obligatoire ou le client revient apres avoir envoye son recu ou abandonne. Paie Server ajoute `retour=preuve-envoyee` ou `retour=envoi-abandonne`.
- `PAIE_SERVER_URL_ANNULATION`: optionnel. Si vide, Paie Server reutilise `PAIE_SERVER_URL_RETOUR` et ajoute `retour=envoi-abandonne`.
- `PAIE_SERVER_URL_WEBHOOK`: adresse serveur obligatoire que Paie Server appelle apres acceptation ou refus.
- `PAIE_SERVER_SECRET_WEBHOOK`: secret partage entre votre site et Paie Server pour verifier que la notification vient bien de Paie Server.

Pour creer un paiement, le site marchand appelle:

```txt
POST /api/paiements
Header: x-cle-api
```

Le corps contient au minimum ces champs. `urlRetour` et `urlWebhook` ne sont pas optionnels: sans eux, Paie Server refuse la creation du paiement. `urlAnnulation` est optionnelle; si elle est absente, Paie Server renvoie le client vers `urlRetour`.

Paie Server ajoute automatiquement un etat au retour navigateur:

```txt
urlRetour?retour=preuve-envoyee&commande=commande_123
urlRetour?retour=envoi-abandonne&commande=commande_123
```

Ces retours servent seulement a afficher un message cote site marchand. L'etat final metier reste le webhook.

```json
{
  "idCommande": "commande_123",
  "idClient": "client_456",
  "montant": 10000,
  "devise": "XOF",
  "urlRetour": "https://votre-site.com/paiement/retour",
  "urlWebhook": "https://votre-site.com/webhook/paie-server",
  "secretWebhook": "un_secret_long"
}
```

Paie Server repond avec `urlPaiement`. Le site marchand redirige ensuite le client vers cette URL.

## Parcours de paiement

1. Le site marchand cree une commande.
2. Le site marchand demande un lien de paiement a Paie Server.
3. Le client ouvre le lien.
4. Le client paie directement le marchand.
5. Le client envoie son recu dans Paie Server.
6. Le marchand accepte ou refuse depuis le tableau marchand.
7. Paie Server notifie le site marchand.
8. Le site marchand active la commande, l'abonnement ou le service.

## Sandbox

Le sandbox est un faux site marchand inclus pour tester le parcours.

```txt
http://localhost:7822
```

Dans le sandbox, il faut distinguer trois adresses:

- adresse du sandbox dans le navigateur: `http://localhost:7822`;
- adresse que le sandbox utilise pour demander un paiement a Paie Server: `http://paie-server-application:3000` quand tout tourne dans Docker;
- adresse ou Paie Server envoie la notification du sandbox: `http://paie-server-sandbox:4000/webhook/paiement` quand tout tourne dans Docker.

Les adresses qui commencent par `paie-server-...` sont des adresses internes Docker. Elles servent seulement aux conteneurs pour se parler entre eux. Un client, un telephone ou un vrai site externe ne doit pas utiliser ces adresses.

Pour un vrai site marchand, utilisez plutot des adresses publiques:

```env
PAIE_SERVER_URL=https://pay.votre-domaine.com
PAIE_SERVER_URL_WEBHOOK=https://votre-site.com/webhook/paie-server
```

Il permet de verifier:

- la creation d'une commande;
- l'appel a Paie Server;
- la redirection vers la page de paiement;
- l'envoi du recu;
- la decision marchand;
- la notification retour vers le site marchand de test.

Dans la page de configuration marchand, collez manuellement la meme cle que la cle de creation des paiements dans le champ sandbox prevu pour cela. Ce test volontairement strict montre ce qui se passerait avec un vrai site externe mal configure.

Si le sandbox ne cree plus de paiement apres une modification, utilisez le bouton
`Retablir le sandbox Docker local` dans la page configuration. Il remet les adresses
de test essentielles, sans modifier les cles ni les comptes de paiement.

## Commandes utiles

Voir l'etat:

```bash
docker compose ps
```

Voir les logs:

```bash
docker compose logs -f application
docker compose logs -f sandbox
```

Redemarrer apres modification:

```bash
docker compose up -d --build
```

Arreter sans supprimer les donnees:

```bash
docker compose down
```

Supprimer aussi les donnees:

```bash
docker compose down -v
```

Utilisez `docker compose down -v` seulement si vous voulez repartir de zero.
