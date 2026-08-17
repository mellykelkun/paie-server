# Paie Server

Serveur de paiement manuel self-hosted pour tester et integrer des paiements sans agregateur de paiement.

L'argent ne passe pas par ce serveur. Le client paie directement le marchand avec Wave, Orange Money ou un autre moyen manuel. Le serveur gere la creation du paiement, l'interface client, la preuve, la verification, la validation marchand et les webhooks.

## Stack

```txt
Node.js       -> API, interfaces, logique paiement
PostgreSQL   -> paiements, preuves, historique, webhooks
Docker       -> application, base de donnees, sandbox
```

Les captures de paiement sont stockees dans un volume fichier Docker. PostgreSQL stocke les metadonnees et les statuts.

## Structure utile

```txt
paie-server/
  serveur.js
  base-de-donnees.js
  environnement.js
  interfaces/
    accueil.js
    paiement.js
    resultat-paiement.js
    marchand.js
    message.js
    commun.js
  bac-a-sable/
    serveur-demo.js
  migrations/
    001_creation_base.sql
    002_ajout_url_retour.sql
  scripts/
    migrer.js
  docker-compose.yml
  Dockerfile
  .env.example
  .env.sandbox.example
```

## Configuration

Copier les fichiers d'exemple :

```bash
cp .env.example .env
cp .env.sandbox.example .env.sandbox
```

Puis modifier les valeurs dans `.env` :

```env
PORT=3000
PORT_PUBLIC_APPLICATION=3000
PORT_PUBLIC_SANDBOX=4000
URL_PUBLIQUE_APPLICATION=http://localhost:3000
URL_BASE=http://localhost:3000

CLE_API_APPLICATION=remplacer_par_une_cle_application_longue
CLE_ORIGINE_SANDBOX=remplacer_par_une_cle_interne_sandbox_longue
CLE_MARCHAND=remplacer_par_une_cle_marchand_longue
ENVIRONNEMENT=developpement
CLE_INSTALLATION_MARCHAND=
SECRET_SESSION_MARCHAND=remplacer_par_un_secret_session_long
OCR_PREUVE_ACTIVE=true
OCR_PREUVE_OBLIGATOIRE=true
OCR_ZONES_ACTIVE=true
TOLERANCE_FRAIS_MONTANT_POURCENT=30
MAX_PIXELS_PREUVE=6000000
SEUIL_DISTANCE_PHASH=8
SEUIL_DISTANCE_DHASH=32
SEUIL_DISTANCE_AHASH=38
SEUIL_SIMILARITE_TEXTE_PREUVE=0.82
DELAI_RECU_AVANT_CREATION_HEURES=12

NOM_BASE_DE_DONNEES=paie_server
UTILISATEUR_BASE_DE_DONNEES=paie_server
MOT_DE_PASSE_BASE_DE_DONNEES=remplacer_par_un_mot_de_passe_long

NOM_COMPTE_WAVE=Nom du marchand
NUMERO_COMPTE_WAVE=+2250000000000
```

En production, `CLE_API_APPLICATION`, `CLE_MARCHAND`, `SECRET_SESSION_MARCHAND`,
`MOT_DE_PASSE_BASE_DE_DONNEES`, `CLE_ORIGINE_SANDBOX` et
`SECRET_WEBHOOK_SANDBOX` doivent etre renseignes. Les valeurs de developpement
ne sont acceptees que quand `ENVIRONNEMENT` n'est pas `production`.

Modifier aussi `.env.sandbox` si besoin :

```env
PORT_SANDBOX=4000
URL_SANDBOX_PUBLIC=http://localhost:4000
URL_API_PAIEMENT_INTERNE=http://localhost:3000
URL_SANDBOX_WEBHOOK=http://localhost:4000/webhook/paiement
SECRET_WEBHOOK_SANDBOX=remplacer_par_un_secret_webhook_sandbox
ID_CLIENT_SANDBOX=client_sandbox_demo
```

En Docker, `docker-compose.yml` remplace automatiquement certaines URLs sandbox pour que les conteneurs communiquent entre eux.

`URL_PUBLIQUE_APPLICATION` est le domaine public de Paie Server. C'est cette valeur qui est utilisee pour generer les liens de paiement renvoyes aux sites marchands.

En local :

```env
URL_PUBLIQUE_APPLICATION=http://localhost:3000
```

En ligne :

```env
URL_PUBLIQUE_APPLICATION=https://pay.votre-domaine.com
```

Exemple : si Paie Server tourne dans Docker sur le port interne `3000`, mais qu'un reverse proxy expose l'application sur `https://pay.votre-domaine.com`, gardez :

```env
PORT=3000
URL_PUBLIQUE_APPLICATION=https://pay.votre-domaine.com
```

Les sites marchands recevront alors des liens comme :

```txt
https://pay.votre-domaine.com/paiement/paie_...
```

Evitez `localhost` des qu'un client, un site marchand ou une application externe doit ouvrir le lien depuis une autre machine.

Si `URL_PUBLIQUE_APPLICATION` n'est pas renseignee, l'ancien nom `URL_BASE` reste supporte par compatibilite.

## Lancement Docker

```bash
docker compose up -d --build
```

Voir les conteneurs :

```bash
docker compose ps
```

Voir les logs de l'application :

```bash
docker compose logs -f application
```

Voir les logs du sandbox :

```bash
docker compose logs -f sandbox
```

Arreter les conteneurs :

```bash
docker compose down
```

Ne pas utiliser cette commande sauf si vous voulez supprimer les donnees :

```bash
docker compose down -v
```

## Noms Docker du projet

Les noms sont marques pour eviter de melanger avec d'autres projets :

```txt
paie-server-application
paie-server-postgres
paie-server-sandbox
paie-server-postgres-donnees
paie-server-preuves
paie-server-sandbox-donnees
paie-server-reseau
```

## Interfaces

Application paiement :

```txt
http://localhost:3000
```

Sante serveur :

```txt
http://localhost:3000/api/sante
```

Tableau marchand :

```txt
http://localhost:3000/marchand
```

L'acces au tableau marchand passe par une connexion admin avec session navigateur, code 2FA et deconnexion automatique.
`CLE_MARCHAND` reste reservee aux appels API en header `x-cle-marchand`.

Lors du premier acces, si aucun compte marchand n'existe encore, Paie Server ouvre une initialisation :

```txt
http://localhost:3000/marchand/initialisation
```

Le marchand scanne d'abord le QR code Authenticator, valide le code a 6 chiffres, puis cree son compte avec un identifiant genere automatiquement et un mot de passe.

Apres initialisation, deux modes de connexion sont disponibles :

```txt
identifiant + mot de passe
identifiant + code Authenticator
```

Sandbox marchand :

```txt
http://localhost:4000
```

## Les 4 instances a distinguer

Notre application Paie Server :
API, stockage PostgreSQL, stockage des preuves, verification automatique et declenchement des webhooks.

Site ou application marchand :
Application externe du developpeur. Dans le sandbox, c'est `http://localhost:4000`.

Tableau de bord marchand dans Paie Server :
Interface de validation manuelle disponible sur `http://localhost:3000/marchand` apres connexion.

Page client de paiement dans Paie Server :
Interface ou le client choisit le moyen de paiement et envoie sa capture, par exemple `http://localhost:3000/paiement/paie_...`.

## Scenario de test avec le sandbox

1. Ouvrir le sandbox :

```txt
http://localhost:4000
```

2. Choisir un produit ou un abonnement.

3. Cliquer sur `Tester le paiement`.

4. Le sandbox cree une commande de test puis appelle :

```txt
POST http://paie-server-application:3000/api/paiements
```

5. Paie Server cree le paiement et renvoie une URL :

```txt
http://localhost:3000/paiement/paie_...
```

L'ID interne du paiement reste conserve en base et dans les webhooks pour le marchand, mais il n'est plus le secret d'acces de la page client.

6. Le navigateur est redirige vers la page de paiement.

7. Le client de test choisit un moyen de paiement et envoie une capture.

La reference est generee par Paie Server. Le montant n'est pas modifiable par le client. La date de preuve est enregistree automatiquement par le serveur au moment de l'envoi.

8. Paie Server recoit la preuve et verifie la capture :

```txt
type image
taille
decodage strict PNG/JPEG et limite pixels
hash anti-doublon
empreinte visuelle proche anti-reutilisation
reference anti-doublon
lecture OCR
lecture OCR par zones du service de paiement
mentions test/simulation/document fictif
traces de generation IA ou d'edition externe
metadonnees C2PA/EXIF/XMP quand elles existent
dimensions et structure technique du fichier
service de paiement officiel attendu
structure du recu Wave ou Maxi It
numero destinataire marchand
montant lu sur le recu
ecart de montant tolere pour frais du service de paiement
date lue sur le recu
reference du service de paiement quand elle existe
montant attendu verrouille
date serveur
moyen de paiement
```

Si l'OCR detecte un document de simulation, des donnees de test, un document fictif, une provenance IA, un outil d'edition externe, une image corrompue, une preuve visuellement proche deja utilisee, un service de paiement incorrect, un numero destinataire different, une date trop ancienne, une reference deja utilisee ou un montant hors tolerance, l'envoi est refuse et aucun dossier de controle marchand n'est ouvert.

La tolerance de frais est controlee par `TOLERANCE_FRAIS_MONTANT_POURCENT`. Par defaut elle vaut `30`, donc un montant lu sur le recu doit etre au moins egal au montant marchand et peut aller jusqu'a 30% au-dessus pour couvrir les frais. Un montant inferieur au prix marchand est refuse.

Paie Server marque aussi l'origine du paiement lui-meme :

```txt
sandbox
api_marchand
```

Le sandbox utilise `CLE_ORIGINE_SANDBOX` pour etre classe comme paiement de test. Les vraies applications marchandes n'ont pas cette cle, donc elles sont classees en `api_marchand`.

Les signaux forensiques faibles ou moyens ne prouvent pas seuls une fraude. Ils sont affiches dans le tableau marchand pour aider la decision sans bloquer automatiquement le client.

Si l'envoi reussit, le client voit la page Paie Server :

```txt
/paiement/:id/preuve-envoyee
```

Cette page signifie uniquement :

```txt
preuve recue par Paie Server
```

Elle ne signifie pas :

```txt
paiement accepte par le marchand
```

Apres quelques secondes, le client est renvoye vers `urlRetour`. Dans le sandbox :

```txt
urlRetour=http://localhost:4000/?commande=...&retour=preuve-envoyee
urlAnnulation=http://localhost:4000/?commande=...&retour=envoi-abandonne
```

Aucun webhook n'est envoye a cette etape. Le statut reste en verification.

Le sandbox affiche alors un message temporaire indiquant que la preuve a ete envoyee et que le controle marchand est encore en attente. Il ne valide pas la commande a partir de ce simple retour client.

Si l'envoi echoue immediatement, le client voit :

```txt
/paiement/:id/echec-envoi
```

La page affiche le message client et propose deux choix :

```txt
Reessayer
Retour a l'application
```

`Reessayer` garde le meme ticket de paiement pour permettre au client d'envoyer un justificatif correct.

`Retour a l'application` abandonne le paiement s'il n'a aucun justificatif recu, puis redirige vers `urlAnnulation`. Si `urlAnnulation` n'est pas configuree, Paie Server utilise une URL de retour derivee de `urlRetour` avec `retour=envoi-abandonne`.

Dans ce cas, Paie Server ne conserve pas le fichier et ne passe pas le paiement en controle marchand. Cela concerne par exemple une image deja utilisee, un fichier invalide, une image trop lourde, une image trop petite ou un moyen de paiement invalide. Le tableau marchand retire ces paiements de la zone active `Paiements en attente du justificatif` et les place dans `Paiements abandonnes`.

9. Ouvrir le tableau marchand :

```txt
http://localhost:3000/marchand
```

Au premier test, Paie Server demande d'abord d'initialiser le compte marchand : scanner le QR code Authenticator, valider le code, puis definir le mot de passe. Ensuite, le marchand peut se connecter avec `identifiant + mot de passe` ou `identifiant + code Authenticator`.

10. Accepter ou refuser le paiement.

11. Seulement apres cette decision marchand, Paie Server envoie un webhook au sandbox :

```txt
POST http://paie-server-sandbox:4000/webhook/paiement
```

12. Retourner sur le sandbox :

```txt
http://localhost:4000
```

La commande doit passer par exemple de :

```txt
EN_ATTENTE_PAIEMENT
```

a :

```txt
PRODUIT_DISPONIBLE
```

ou :

```txt
ABONNEMENT_ACTIVE
```

Dans le sandbox, ces URLs sont configurees automatiquement :

```txt
urlRetour=http://localhost:4000/?commande=...&retour=preuve-envoyee
urlAnnulation=http://localhost:4000/?commande=...&retour=envoi-abandonne
urlWebhook=http://paie-server-sandbox:4000/webhook/paiement
```

Dans la liste des commandes sandbox, la ligne `Decision marchand` permet de savoir si la commande est encore en attente, acceptee par le marchand ou refusee par le marchand.

Dans l'historique sandbox, le lien de paiement reste disponible seulement tant que le client peut encore envoyer un justificatif. Des que le justificatif est recu, refuse, accepte ou abandonne, le sandbox affiche un etat statique au lieu de rouvrir la page de paiement Paie Server.

Si une commande sandbox a ete creee mais que le client ne veut plus continuer le paiement, le bouton `Abandonner` marque le paiement `ABANDONNE` et laisse la commande inactive. Aucun webhook final n'est envoye.

Dans le tableau marchand Paie Server, une decision finale bloque ensuite les boutons `Accepter` et `Refuser`. La meme action repetee est idempotente, et l'action inverse est refusee. Chaque paiement affiche aussi le dernier etat de notification :

```txt
Notification: recue par le site marchand
Notification: en echec
Notification: non confirmee
Notification: pas encore envoyee
```

Si la notification echoue, le client ne voit rien. Le tableau marchand affiche l'erreur courte, le nombre de tentatives, le prochain essai et un bouton de renvoi manuel.

## Integration API pour un developpeur

Creation d'un paiement :

```http
POST /api/paiements
x-cle-api: CLE_API_APPLICATION
content-type: application/json
```

Corps JSON :

```json
{
  "idCommande": "commande_123",
  "idClient": "client_456",
  "montant": 10000,
  "devise": "XOF",
  "metadonnees": {
    "offre": "abonnement_pro",
    "plan": "mensuel"
  },
  "urlRetour": "https://votre-site.com/",
  "urlAnnulation": "https://votre-site.com/paiement-non-finalise",
  "urlWebhook": "https://votre-site.com/webhook/paiement",
  "secretWebhook": "secret_webhook"
}
```

`urlRetour` est l'URL du site ou de l'application marchand vers laquelle le client revient apres reception de sa preuve par Paie Server. Ce retour client ne valide pas le paiement.

`urlAnnulation` est l'URL utilisee quand le client quitte le parcours apres un echec d'envoi de justificatif. Dans ce cas, le paiement est marque `ABANDONNE` et aucun webhook final n'est envoye.

`urlWebhook` est appelee uniquement apres acceptation ou refus manuel depuis le tableau marchand. C'est le site marchand qui active ensuite le produit, l'abonnement ou le refus cote client.

Par compatibilite, si `urlRetour` est absent, Paie Server utilise `urlAnnulation` comme URL de retour client.

En production, les URLs externes doivent etre en HTTPS et ne doivent pas pointer vers `localhost`, une IP privee ou un domaine local. `urlWebhook` doit etre differente des URLs de retour client.

Reponse :

```json
{
  "id": "paiement_...",
  "jetonPaiement": "paie_...",
  "referencePaiement": "REF-1234ABCD",
  "statut": "CREE",
  "urlPaiement": "http://localhost:3000/paiement/paie_..."
}
```

Webhook recu apres validation marchand :

```json
{
  "idEvenement": "evt_...",
  "evenement": "paiement.paye",
  "idPaiement": "paiement_...",
  "referencePaiement": "REF-1234ABCD",
  "idCommande": "commande_123",
  "idCommandeMarchand": "commande_123",
  "idClient": "client_456",
  "idClientMarchand": "client_456",
  "metadonnees": {
    "offre": "abonnement_pro",
    "plan": "mensuel"
  },
  "montant": 10000,
  "devise": "XOF",
  "statut": "PAYE"
}
```

Le webhook est signe avec l'entete :

```txt
x-signature-paiement
x-evenement-paiement
x-id-evenement-paiement
```

La signature est un HMAC SHA-256 du corps JSON avec `secretWebhook`.

## Commandes utiles sans Docker

Installer :

```bash
npm install
```

Lancer les migrations :

```bash
npm run migrer
```

Voir les donnees de test sandbox qui peuvent etre nettoyees :

```bash
npm run nettoyer:donnees-test
```

Nettoyer uniquement les paiements de test sandbox en base, sans supprimer les tables ni les migrations :

```bash
npm run nettoyer:donnees-test -- --confirmer
```

Vider tous les paiements de la base de developpement, toujours sans supprimer les tables :

```bash
npm run nettoyer:donnees-test -- --tout-paiements --confirmer
```

Voir les commandes stockees dans le sandbox :

```bash
npm run nettoyer:sandbox
```

Vider les commandes du sandbox sans supprimer son fichier de stockage :

```bash
npm run nettoyer:sandbox -- --confirmer
```

En Docker, utilisez les conteneurs concernes :

```bash
docker compose exec application npm run nettoyer:donnees-test -- --confirmer
docker compose exec sandbox npm run nettoyer:sandbox -- --confirmer
```

Lancer l'application :

```bash
npm start
```

Lancer le sandbox :

```bash
npm run sandbox
```

En local sans Docker, PostgreSQL doit deja tourner et les variables de `.env` doivent pointer vers cette base.
