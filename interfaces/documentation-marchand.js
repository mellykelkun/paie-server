const {
  pageHtml,
  echapperHtml,
} = require("./commun");
const {
  VARIABLES_TECHNIQUES,
  grouperDefinitions,
} = require("../configuration");
const {
  THEMES_INTERFACE,
  couleursThemeInterface,
} = require("./themes");

function afficherDocumentationMarchand(champs, options = {}) {
  const groupesConfiguration = grouperDefinitions(champs || []);

  return pageHtml("Documentation marchand", `
    <main class="documentation-marchand">
      <header class="entete-marchand">
        <div>
          <p class="sur-titre">Documentation</p>
          <h1>Utilisation complete de Paie Server</h1>
          <p>
            Guide pratique pour installer, configurer, tester, exploiter et integrer la plateforme
            avec un site marchand, une application client ou un outil interne.
          </p>
        </div>
        <div class="actions actions-entete-marchand">
          <a class="bouton-lien secondaire" href="/marchand">Tableau</a>
          <a class="bouton-lien secondaire" href="/marchand/configuration">Configuration</a>
        </div>
      </header>

      <nav class="navigation-documentation" aria-label="Sommaire documentation">
        ${[
          ["vue-generale", "Vue generale"],
          ["premiere-configuration", "Premiere configuration"],
          ["tableau-marchand", "Tableau marchand"],
          ["parcours-client", "Parcours client"],
          ["integration-api", "Integration API"],
          ["webhooks-retours", "Webhooks et retours"],
          ["sandbox", "Sandbox"],
          ["themes", "Themes"],
          ["securite", "Securite"],
          ["nettoyage", "Nettoyage"],
          ["depannage", "Depannage"],
          ["reference-configuration", "Reference configuration"],
        ].map(([ancre, libelle]) => `<a href="#${ancre}">${echapperHtml(libelle)}</a>`).join("")}
      </nav>

      ${sectionDocumentation("vue-generale", "Vue generale", `
        <div class="grille-documentation">
          ${carteDoc("Role de Paie Server", `
            <p>Paie Server organise un paiement manuel: creation du lien, page client, reception du recu, controle, decision marchand et notification finale.</p>
            <p>L'argent ne passe pas par Paie Server. Le client paie directement le compte du marchand.</p>
          `)}
          ${carteDoc("Ce que la plateforme gere", listeDoc([
            "liens de paiement pour sites ou applications externes",
            "comptes Wave, Orange Money et instructions visibles cote client",
            "televersement du justificatif client",
            "lecture OCR, controles de montant, reference, date, destinataire et doublons",
            "tableau marchand avec paiements a verifier, en attente, finalises et abandonnes",
            "webhook serveur vers le site marchand apres acceptation ou refus",
            "retour navigateur unique vers le site marchand apres preuve envoyee ou abandon",
            "sandbox pour tester le parcours complet",
            "themes globaux appliques au client, au marchand et au sandbox",
          ]))}
          ${carteDoc("Ce que la plateforme ne fait pas", listeDoc([
            "elle ne debite pas automatiquement le client",
            "elle ne credite pas automatiquement le marchand",
            "elle ne remplace pas la verification humaine finale du marchand",
            "elle ne doit pas exposer les cles API dans une page publique",
          ]))}
        </div>
      `)}

      ${sectionDocumentation("premiere-configuration", "Premiere configuration", `
        <ol class="liste-documentation">
          <li>Demarrer les conteneurs avec Docker Compose.</li>
          <li>Ouvrir <code>/marchand</code>.</li>
          <li>Initialiser le compte marchand si aucun compte n'existe.</li>
          <li>Scanner le QR code 2FA et creer le mot de passe marchand.</li>
          <li>Ouvrir <code>/marchand/configuration</code>.</li>
          <li>Configurer l'URL publique de Paie Server, les comptes de paiement et les cles API.</li>
          <li>Configurer <code>urlRetour</code> et <code>urlWebhook</code> cote site marchand.</li>
          <li>Tester le parcours dans le sandbox avant de brancher un vrai client.</li>
        </ol>
        ${codeDoc(`Application:       http://localhost:7821
Tableau marchand: http://localhost:7821/marchand
Configuration:    http://localhost:7821/marchand/configuration
Documentation:    http://localhost:7821/marchand/documentation
Sandbox:          http://localhost:7822`)}
      `)}

      ${sectionDocumentation("tableau-marchand", "Tableau marchand", `
        <div class="grille-documentation">
          ${carteDoc("Justificatifs a controler", `
            <p>Regroupe les paiements pour lesquels un recu a ete recu et analyse. Le marchand doit verifier son vrai compte de paiement, puis accepter ou refuser.</p>
            <p>Cette section n'est pas supprimable pour ne pas casser une decision en attente.</p>
          `)}
          ${carteDoc("Paiements en attente", `
            <p>Regroupe les paiements crees ou ouverts par le client, sans recu valide encore recu.</p>
            <p>Cette section n'est pas supprimable depuis le tableau, car elle represente des paiements encore actifs.</p>
          `)}
          ${carteDoc("Decisions finales", `
            <p>Regroupe les paiements acceptes ou refuses. La notification webhook peut etre renvoyee si le site marchand ne l'a pas recue.</p>
            <p>L'historique peut etre selectionne puis supprime definitivement pour liberer de l'espace.</p>
          `)}
          ${carteDoc("Paiements abandonnes", `
            <p>Regroupe les paiements arretes avant reception d'un justificatif valide.</p>
            <p>L'historique peut etre selectionne puis supprime definitivement.</p>
          `)}
        </div>
        <p class="description-section">Les listes du tableau marchand ont un scroll interne pour garder les actions visibles meme quand beaucoup de paiements sont presents.</p>
        <h3>Statuts internes</h3>
        ${tableauDoc(["Statut", "Signification", "Action marchand"], [
          ["CREE", "Le paiement vient d'etre cree.", "Aucune action tant que le client n'a pas ouvert ou envoye de recu."],
          ["EN_ATTENTE_PAIEMENT", "Le client a ouvert la page de paiement ou choisi un moyen.", "Attendre le justificatif."],
          ["PREUVE_ENVOYEE", "Le recu client a ete recu.", "Paie Server lance ou termine les controles."],
          ["EN_VERIFICATION", "Le recu est visible dans les justificatifs a controler.", "Verifier le compte reel puis accepter ou refuser."],
          ["PAYE", "Decision finale positive.", "Le site marchand doit activer la commande apres webhook."],
          ["REFUSE", "Decision finale negative.", "Le site marchand doit marquer la commande refusee apres webhook."],
          ["ABANDONNE", "Le client a arrete avant justificatif valide.", "Aucune decision marchand attendue."],
        ])}
      `)}

      ${sectionDocumentation("parcours-client", "Parcours client", `
        <ol class="liste-documentation">
          <li>Le site marchand cree un paiement avec l'API.</li>
          <li>Le client est redirige vers <code>urlPaiement</code>.</li>
          <li>Le client choisit le moyen de paiement manuel.</li>
          <li>Le client envoie l'argent directement au compte marchand affiche.</li>
          <li>Le client charge une capture ou un recu.</li>
          <li>Paie Server controle l'image et place le paiement en verification.</li>
          <li>Le client revient vers le site marchand avec un etat de retour navigateur.</li>
          <li>Le marchand prend la decision finale dans le tableau.</li>
          <li>Paie Server notifie le site marchand par webhook.</li>
        </ol>
        <div class="grille-documentation">
          ${carteDoc("Preuve recue", `<p>Le retour navigateur devient <code>retour=preuve-envoyee</code>. Le site marchand peut afficher un message d'attente, mais l'etat metier final vient du webhook.</p>`)}
          ${carteDoc("Envoi abandonne", `<p>Le retour navigateur devient <code>retour=envoi-abandonne</code>. Le site marchand peut afficher que le justificatif n'a pas ete recu.</p>`)}
          ${carteDoc("Echec d'envoi", `<p>Paie Server garde sa propre page d'echec si le recu est invalide ou impossible a traiter. Le client peut corriger et recommencer selon le cas.</p>`)}
        </div>
      `)}

      ${sectionDocumentation("integration-api", "Integration API", `
        <h3>Creation d'un paiement</h3>
        ${codeDoc(`POST /api/paiements
Header: x-cle-api: CLE_API_APPLICATION
Content-Type: application/json`)}
        ${codeDoc(JSON.stringify({
          idCommande: "commande_123",
          idClient: "client_456",
          montant: 10000,
          devise: "XOF",
          urlRetour: "https://votre-site.com/commande/retour",
          urlWebhook: "https://votre-site.com/webhook/paie-server",
          secretWebhook: "un_secret_long",
          metadonnees: {
            source: "boutique",
            panier: "A-100",
          },
        }, null, 2))}
        <p><code>urlRetour</code> et <code>urlWebhook</code> sont necessaires au bon fonctionnement complet. <code>urlAnnulation</code> est optionnelle.</p>

        <h3>Reponse de creation</h3>
        <p>La reponse contient le paiement et son <code>urlPaiement</code>. Le site marchand redirige le client vers cette URL.</p>

        <h3>Consultation et actions API marchand</h3>
        ${tableauDoc(["Route", "Acces", "Usage"], [
          ["GET /api/paiements", "x-cle-marchand", "Lister les paiements."],
          ["GET /api/paiements/:id", "x-cle-marchand", "Lire un paiement precis."],
          ["POST /api/marchand/paiements/:id/accepter", "x-cle-marchand ou session", "Accepter un paiement apres verification."],
          ["POST /api/marchand/paiements/:id/refuser", "x-cle-marchand ou session", "Refuser un paiement avec une raison."],
          ["POST /api/marchand/paiements/:id/notification/renvoyer", "x-cle-marchand ou session", "Renvoyer une notification finale non recue."],
        ])}
        <h3>Routes client gerees par Paie Server</h3>
        ${tableauDoc(["Route", "Usage"], [
          ["GET /paiement/:jeton", "Page client de paiement."],
          ["POST /api/paiements/:id/preuve", "Reception technique du justificatif envoye par la page client."],
          ["GET /paiement/:jeton/preuve-envoyee", "Page Paie Server apres preuve recue, avant retour vers le site marchand."],
          ["GET /paiement/:jeton/echec-envoi", "Page Paie Server quand l'envoi du justificatif echoue."],
          ["POST /paiement/:jeton/abandonner", "Abandon du parcours client avant justificatif valide."],
        ])}
      `)}

      ${sectionDocumentation("webhooks-retours", "Webhooks et retours client", `
        <div class="grille-documentation">
          ${carteDoc("Retour navigateur", `
            <p>Le retour navigateur sert seulement a informer le client apres l'envoi ou l'abandon.</p>
            ${codeDoc(`urlRetour?retour=preuve-envoyee&commande=commande_123
urlRetour?retour=envoi-abandonne&commande=commande_123`)}
          `)}
          ${carteDoc("Webhook metier", `
            <p>Le webhook est l'information finale pour le site marchand. Il arrive apres acceptation ou refus par le marchand.</p>
            <p>Le site marchand doit mettre a jour la commande, l'abonnement ou le service uniquement avec ce webhook.</p>
          `)}
          ${carteDoc("Signature", `
            <p>Si <code>secretWebhook</code> est fourni, Paie Server signe la notification avec HMAC SHA-256.</p>
            <p>Le site marchand doit verifier la signature avant de traiter l'evenement.</p>
          `)}
          ${carteDoc("Retry", `
            <p>Si le site marchand ne repond pas correctement, Paie Server retente selon <code>MAX_TENTATIVES_WEBHOOK</code> et <code>DELAI_RETRY_WEBHOOK_SECONDES</code>.</p>
          `)}
        </div>
        ${tableauDoc(["Evenement", "Quand", "Action attendue cote site marchand"], [
          ["paiement.paye", "Paiement accepte dans le tableau marchand.", "Activer la commande ou le service."],
          ["paiement.refuse", "Paiement refuse dans le tableau marchand.", "Marquer la commande comme refusee ou demander un nouveau paiement."],
        ])}
      `)}

      ${sectionDocumentation("sandbox", "Sandbox", `
        <p>Le sandbox est un faux site marchand inclus pour tester le parcours complet sans brancher une vraie boutique.</p>
        ${tableauDoc(["Adresse", "Role"], [
          ["http://localhost:7822", "Adresse a ouvrir dans le navigateur."],
          ["http://paie-server-application:3000", "Adresse interne Docker utilisee par le sandbox pour joindre Paie Server."],
          ["http://paie-server-sandbox:4000/webhook/paiement", "Adresse interne Docker ou Paie Server notifie le sandbox."],
        ])}
        <p>La cle de creation sandbox doit etre collee manuellement dans la configuration. C'est volontaire: cela reproduit le comportement d'un vrai site externe.</p>
        <p>Le bouton <strong>Vider l'historique</strong> du sandbox supprime seulement les commandes de test du faux site. Les scripts de nettoyage permettent de repartir de zero plus largement.</p>
      `)}

      ${sectionDocumentation("themes", "Themes", `
        <p>Le theme global se choisit uniquement dans la configuration marchand. Il s'applique au tableau marchand, a la page client, a la configuration, a la documentation et au sandbox.</p>
        <p>Les cartes de theme affichent des blocs de couleur pour aider le marchand a choisir un style adapte a son produit ou a son site.</p>
        <p>Les interfaces utilisent les variables du theme pour les textes, fonds, bordures, alertes, boutons, scrollbars et etats.</p>
        <h3>Themes disponibles</h3>
        ${afficherThemesDocumentation()}
      `)}

      ${sectionDocumentation("securite", "Securite et bonnes pratiques", `
        ${listeDoc([
          "Garder CLE_API_APPLICATION uniquement cote serveur du site marchand.",
          "Garder CLE_MARCHAND reservee aux outils de gestion de confiance.",
          "Utiliser un secret webhook long et verifier la signature cote site marchand.",
          "Changer SECRET_SESSION_MARCHAND avant une mise en production.",
          "Activer COOKIE_SECURISE quand Paie Server est expose en HTTPS.",
          "Ne jamais exposer les adresses Docker internes a un vrai client.",
          "Verifier le vrai compte de paiement avant d'accepter une preuve.",
          "Ne supprimer que les historiques finalises ou abandonnes, jamais les paiements actifs.",
        ])}
      `)}

      ${sectionDocumentation("nettoyage", "Nettoyage et maintenance", `
        <div class="grille-documentation">
          ${carteDoc("Nettoyer les donnees de test", codeDoc(`docker compose exec -T application npm run nettoyer:donnees-test -- --confirmer`))}
          ${carteDoc("Repartir de zero cote paiements", codeDoc(`docker compose exec -T application npm run nettoyer:donnees-test -- --confirmer --tout-paiements`))}
          ${carteDoc("Vider le sandbox", codeDoc(`docker compose exec -T sandbox npm run nettoyer:sandbox -- --confirmer`))}
          ${carteDoc("Verifier les conteneurs", codeDoc(`docker compose ps
docker compose logs -f application
docker compose logs -f sandbox`))}
        </div>
        <p>Le bouton de suppression du tableau marchand est fait pour nettoyer l'historique finalise ou abandonne. Les scripts servent a nettoyer un environnement de test complet.</p>
      `)}

      ${sectionDocumentation("depannage", "Depannage rapide", `
        ${tableauDoc(["Probleme", "Cause probable", "Action"], [
          ["Le sandbox ne cree pas de paiement", "Cle sandbox absente ou differente de CLE_API_APPLICATION", "Recopier la cle dans la configuration sandbox."],
          ["Le client ne revient pas au bon endroit", "urlRetour absente ou mauvaise", "Configurer une seule route retour cote site marchand."],
          ["Le site marchand ne recoit pas la decision", "urlWebhook mauvaise ou serveur externe indisponible", "Verifier les logs et renvoyer la notification depuis le tableau."],
          ["Un recu est refuse", "Image illisible, montant trop bas, doublon ou mauvais destinataire", "Demander un recu complet et net au client."],
          ["Un theme rend un texte peu visible", "Theme mal adapte au contexte", "Changer le theme dans la configuration marchand."],
          ["Connexion marchand expiree", "Duree de session atteinte", "Se reconnecter au tableau marchand."],
        ])}
      `)}

      ${sectionDocumentation("reference-configuration", "Reference configuration", `
        <p>Tous ces reglages se modifient dans <code>/marchand/configuration</code>. Les secrets ne sont jamais affiches en clair dans la documentation.</p>
        ${groupesConfiguration.map(afficherGroupeConfigurationDoc).join("")}
        <h3>Variables techniques qui restent dans .env</h3>
        ${VARIABLES_TECHNIQUES.map((variable) => `
          <article class="ligne-reference-doc">
            <strong><code>${echapperHtml(variable.cle)}</code></strong>
            <p>${echapperHtml(variable.raison)}</p>
          </article>
        `).join("")}
      `)}
    </main>
  `, { themeInterface: options.themeInterface });
}

function sectionDocumentation(id, titre, contenu) {
  return `
    <section id="${echapperHtml(id)}" class="section-documentation">
      <h2>${echapperHtml(titre)}</h2>
      ${contenu}
    </section>
  `;
}

function carteDoc(titre, contenu) {
  return `
    <article class="carte-documentation">
      <h3>${echapperHtml(titre)}</h3>
      ${contenu}
    </article>
  `;
}

function listeDoc(elements) {
  return `
    <ul class="liste-documentation">
      ${elements.map((element) => `<li>${echapperHtml(element)}</li>`).join("")}
    </ul>
  `;
}

function codeDoc(contenu) {
  return `<pre class="code-documentation"><code>${echapperHtml(contenu)}</code></pre>`;
}

function tableauDoc(entetes, lignes) {
  return `
    <div class="tableau-documentation">
      <table>
        <thead>
          <tr>${entetes.map((entete) => `<th>${echapperHtml(entete)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${lignes.map((ligne) => `
            <tr>${ligne.map((cellule) => `<td>${echapperHtml(cellule)}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function afficherGroupeConfigurationDoc(groupe) {
  return `
    <div class="groupe-reference-doc">
      <h3>${echapperHtml(groupe.section)}</h3>
      ${groupe.champs.map(afficherChampConfigurationDoc).join("")}
    </div>
  `;
}

function afficherChampConfigurationDoc(champ) {
  const badges = [
    champ.obligatoire ? "obligatoire" : "optionnel",
    champ.secret ? "secret" : "",
    champ.type || "",
  ].filter(Boolean);
  const exemple = champ.exemple || champ.defaut || "";

  return `
    <article class="ligne-reference-doc">
      <div class="ligne-reference-doc-entete">
        <strong>${echapperHtml(champ.libelle)}</strong>
        <span>${badges.map((badge) => `<small>${echapperHtml(badge)}</small>`).join("")}</span>
      </div>
      <p><code>${echapperHtml(champ.cle)}</code></p>
      <p>${echapperHtml(champ.description || "")}</p>
      ${champ.scenario ? `<p>${echapperHtml(champ.scenario)}</p>` : ""}
      ${exemple ? `<p>Exemple: <code>${echapperHtml(exemple)}</code></p>` : ""}
    </article>
  `;
}

function afficherThemesDocumentation() {
  return `
    <div class="grille-themes-interface grille-themes-documentation">
      ${THEMES_INTERFACE.map((theme) => {
        const couleurs = couleursThemeInterface(theme);

        return `
          <article class="option-theme-interface theme-documentation">
            <div class="echantillons-theme-interface" aria-hidden="true">
              ${[
                couleurs.primaire,
                couleurs.accent,
                couleurs.surface,
                couleurs.succes,
                couleurs.erreur,
              ].map((couleur) => `<span style="background:${echapperHtml(couleur)}"></span>`).join("")}
            </div>
            <div class="texte-theme-interface">
              <strong>${echapperHtml(theme.libelle)}</strong>
              <small>${echapperHtml(theme.description)}</small>
              <small><code>${echapperHtml(theme.code)}</code></small>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

module.exports = afficherDocumentationMarchand;
