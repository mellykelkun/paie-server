const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const chargerFichierEnv = require("../environnement");

chargerFichierEnv();
chargerFichierEnv(".env.sandbox");

const {
  chargerConfigurationApplication,
  valeurConfiguration,
} = require("../configuration");
const {
  styleThemeInterface,
  valeurThemeInterface,
} = require("../interfaces/themes");

const port = Number(process.env.PORT_SANDBOX || 4000);
const urlSandboxPublicDemarrage = process.env.URL_SANDBOX_PUBLIC || `http://localhost:${port}`;

const dossierDonnees = path.join(__dirname, "donnees");
const fichierCommandes = path.join(dossierDonnees, "commandes.json");
const TAILLE_MAX_CORPS = 1024 * 1024;

const offres = [
  {
    code: "produit",
    type: "PRODUIT",
    nom: "Kit Starter No-Code",
    description: "Un produit numerique simple pour tester un paiement unique.",
    montant: 10000,
    devise: "XOF",
  },
  {
    code: "abonnement",
    type: "ABONNEMENT",
    nom: "Abonnement Pro mensuel",
    description: "Un abonnement de demonstration pour tester une activation apres paiement.",
    montant: 15000,
    devise: "XOF",
  },
];

preparerStockage();

const serveur = http.createServer(async (requete, reponse) => {
  try {
    const url = new URL(requete.url, urlSandboxPublicDemarrage);

    if (requete.method === "GET" && url.pathname === "/") {
      return envoyerHtml(reponse, 200, await afficherAccueil(url.searchParams));
    }

    if (requete.method === "GET" && url.pathname === "/commandes") {
      return envoyerJson(reponse, 200, chargerCommandes());
    }

    if (requete.method === "POST" && url.pathname === "/commander") {
      const corps = await lireCorpsFormulaire(requete);
      const resultat = await creerCommandeSandbox(corps.offre);

      if (!resultat.ok) {
        return envoyerHtml(reponse, 400, await afficherMessage(resultat.message));
      }

      reponse.writeHead(303, { location: resultat.urlPaiement });
      return reponse.end();
    }

    if (requete.method === "POST" && url.pathname === "/abandonner-commande") {
      const corps = await lireCorpsFormulaire(requete);
      const resultat = await abandonnerCommandeSandbox(corps.idCommande);

      if (!resultat.ok) {
        return envoyerHtml(reponse, resultat.codeHttp || 400, await afficherMessage(resultat.message));
      }

      reponse.writeHead(303, { location: `/?commande=${encodeURIComponent(resultat.idCommande)}&retour=envoi-abandonne` });
      return reponse.end();
    }

    if (requete.method === "POST" && url.pathname === "/webhook/paiement") {
      const corpsTexte = await lireCorpsTexte(requete);

      if (!(await signatureValide(corpsTexte, requete.headers["x-signature-paiement"]))) {
        return envoyerJson(reponse, 401, { message: "Signature de notification invalide." });
      }

      const evenement = JSON.parse(corpsTexte || "{}");
      enregistrerWebhook(evenement);

      return envoyerJson(reponse, 200, { recu: true });
    }

    return envoyerHtml(reponse, 404, await afficherMessage("Page introuvable"));
  } catch (erreur) {
    console.error("Erreur sandbox:", erreur);
    return envoyerHtml(reponse, 500, await afficherMessage("Erreur interne"));
  }
});

serveur.listen(port, () => {
  const urlExposee = construireUrlLocaleExposee(process.env.PORT_PUBLIC_SANDBOX, port);
  const urlOuverte = urlExposee || urlSandboxPublicDemarrage;

  console.log(`Sandbox marchand demarre dans le conteneur: http://localhost:${port}`);
  console.log(`Adresse a ouvrir sur cette machine: ${urlOuverte}`);
  console.log("API paiement et webhook lus depuis la configuration marchand.");
});

async function chargerConfigurationSandbox() {
  try {
    return await chargerConfigurationApplication();
  } catch (erreur) {
    console.error("Configuration sandbox indisponible, fallback .env:", erreur.message);
    return {};
  }
}

async function creerCommandeSandbox(codeOffre) {
  const configuration = await chargerConfigurationSandbox();
  const offre = offres.find((element) => element.code === codeOffre);

  if (!offre) {
    return { ok: false, message: "Offre indisponible." };
  }

  const maintenant = new Date().toISOString();
  const commande = {
    id: creerId("commande_sandbox"),
    idClient: valeurConfiguration(configuration, "ID_CLIENT_SANDBOX", "client_sandbox_demo"),
    offre: offre.code,
    type: offre.type,
    nom: offre.nom,
    montant: offre.montant,
    devise: offre.devise,
    statutCommande: "EN_ATTENTE_PAIEMENT",
    statutPaiement: "NON_CREE",
    idPaiement: null,
    jetonPaiement: null,
    urlPaiement: null,
    dernierEvenement: null,
    creeLe: maintenant,
    modifieLe: maintenant,
  };

  let paiement;

  try {
    paiement = await appelerCreationPaiement(commande, configuration);
  } catch (erreur) {
    return {
      ok: false,
      codeHttp: 400,
      message: `Creation du paiement impossible: ${erreur.message}`,
    };
  }

  commande.idPaiement = paiement.id;
  commande.jetonPaiement = paiement.jetonPaiement || paiement.jetonClient || paiement.id;
  commande.urlPaiement = paiement.urlPaiement;
  commande.statutPaiement = paiement.statut;
  commande.modifieLe = new Date().toISOString();

  const commandes = chargerCommandes();
  commandes.unshift(commande);
  enregistrerCommandes(commandes);

  return { ok: true, urlPaiement: commande.urlPaiement };
}

async function abandonnerCommandeSandbox(idCommande) {
  const configuration = await chargerConfigurationSandbox();
  const commandes = chargerCommandes();
  const commande = commandes.find((element) => element.id === idCommande);

  if (!commande) {
    return { ok: false, codeHttp: 404, message: "Commande introuvable." };
  }

  if (!paiementContinuable(commande)) {
    return {
      ok: false,
      codeHttp: 409,
      message: "Ce paiement ne peut plus etre abandonne.",
    };
  }

  if (commande.idPaiement) {
    const identifiantPaiement = commande.jetonPaiement || commande.idPaiement;
    const urlApiPaiement = valeurConfiguration(configuration, "URL_API_PAIEMENT_INTERNE", "http://localhost:3000");
    const reponse = await fetch(
      `${urlApiPaiement}/paiement/${encodeURIComponent(identifiantPaiement)}/abandonner`,
      {
        method: "POST",
        redirect: "manual",
      }
    );

    if (!reponse.ok && reponse.status !== 303) {
      return {
        ok: false,
        codeHttp: reponse.status,
        message: "Abandon du paiement impossible.",
      };
    }
  }

  commande.statutPaiement = "ABANDONNE";
  commande.statutCommande = "EN_ATTENTE_PAIEMENT";
  commande.modifieLe = new Date().toISOString();
  enregistrerCommandes(commandes);

  return { ok: true, idCommande: commande.id };
}

async function appelerCreationPaiement(commande, configuration) {
  const urlApiPaiement = valeurConfiguration(configuration, "URL_API_PAIEMENT_INTERNE", "http://localhost:3000");
  const urlSandboxPublic = valeurConfiguration(configuration, "URL_SANDBOX_PUBLIC", `http://localhost:${port}`);
  const urlWebhookSandbox = valeurConfiguration(
    configuration,
    "URL_SANDBOX_WEBHOOK",
    `${urlSandboxPublic}/webhook/paiement`
  );
  const cleApiSandbox = valeurConfiguration(configuration, "CLE_API_SANDBOX", "");
  const cleOrigineSandbox = valeurConfiguration(configuration, "CLE_ORIGINE_SANDBOX", "");
  const secretWebhookSandbox = valeurConfiguration(configuration, "SECRET_WEBHOOK_SANDBOX", "secret_sandbox_dev");
  const entetes = {
    "content-type": "application/json",
  };

  if (cleApiSandbox) {
    entetes["x-cle-api"] = cleApiSandbox;
  }

  if (cleOrigineSandbox) {
    entetes["x-cle-origine-sandbox"] = cleOrigineSandbox;
  }

  const reponse = await fetch(`${urlApiPaiement}/api/paiements`, {
    method: "POST",
    headers: entetes,
    body: JSON.stringify({
      idCommande: commande.id,
      idClient: commande.idClient,
      montant: commande.montant,
      devise: commande.devise,
      metadonnees: {
        source: "sandbox",
        offre: commande.offre,
        type: commande.type,
        nom: commande.nom,
      },
      urlRetour: `${urlSandboxPublic}/`,
      urlWebhook: urlWebhookSandbox,
      secretWebhook: secretWebhookSandbox,
    }),
  });

  const resultat = await reponse.json();

  if (!reponse.ok) {
    throw new Error(resultat.message || "Creation du paiement impossible.");
  }

  return resultat;
}

function enregistrerWebhook(evenement) {
  const commandes = chargerCommandes();
  const commande = commandes.find((element) => element.id === evenement.idCommande);

  if (!commande) {
    return;
  }

  commande.statutPaiement = evenement.statut || commande.statutPaiement;
  commande.dernierEvenement = evenement.evenement || null;
  commande.modifieLe = new Date().toISOString();

  if (evenement.evenement === "paiement.paye") {
    commande.statutCommande = commande.type === "ABONNEMENT" ? "ABONNEMENT_ACTIVE" : "PRODUIT_DISPONIBLE";
    commande.decisionMarchand = "ACCEPTE";
    commande.decisionMarchandLe = commande.modifieLe;
  }

  if (evenement.evenement === "paiement.refuse") {
    commande.statutCommande = "PAIEMENT_REFUSE";
    commande.decisionMarchand = "REFUSE";
    commande.decisionMarchandLe = commande.modifieLe;
  }

  enregistrerCommandes(commandes);
}

async function signatureValide(corps, signatureRecue) {
  const configuration = await chargerConfigurationSandbox();
  const secretWebhookSandbox = valeurConfiguration(configuration, "SECRET_WEBHOOK_SANDBOX", "secret_sandbox_dev");

  if (!secretWebhookSandbox) {
    return true;
  }

  if (!signatureRecue) {
    return false;
  }

  const signatureAttendue = crypto
    .createHmac("sha256", secretWebhookSandbox)
    .update(corps)
    .digest("hex");

  if (signatureAttendue.length !== String(signatureRecue).length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(signatureAttendue), Buffer.from(signatureRecue));
}

async function afficherAccueil(parametres) {
  const commandes = chargerCommandes();
  const configuration = await chargerConfigurationSandbox();
  const optionsInterface = optionsInterfaceSandbox(configuration);
  traiterRetourClient(parametres, commandes);
  const cartesOffres = offres.map(afficherOffre).join("");
  const lignesCommandes = commandes.map(afficherCommande).join("");
  const messageRetour = afficherMessageRetour(parametres, commandes);

  return pageHtml("Site marchand de test", `
    <main>
      <section class="entete">
        <p class="badge">Environnement de test</p>
        <h1>Site marchand de test</h1>
        <p>Choisissez une offre et finalisez un paiement de demonstration.</p>
      </section>

      <section class="grille">
        ${cartesOffres}
      </section>

      ${messageRetour}

      <section class="bloc">
        <div class="titre-ligne">
          <h2>Commandes de test</h2>
          <a href="/">Actualiser</a>
        </div>
        ${lignesCommandes || "<p>Aucune commande de test pour le moment.</p>"}
      </section>
    </main>
  `, optionsInterface);
}

function afficherOffre(offre) {
  return `
    <article class="offre">
      <p class="badge">${echapperHtml(offre.type)}</p>
      <h2>${echapperHtml(offre.nom)}</h2>
      <p>${echapperHtml(offre.description)}</p>
      <p class="prix">${formaterMontant(offre.montant, offre.devise)}</p>
      <form method="post" action="/commander">
        <input type="hidden" name="offre" value="${echapperHtml(offre.code)}">
        <button type="submit">Tester le paiement</button>
      </form>
    </article>
  `;
}

function afficherMessageRetour(parametres, commandes) {
  if (!parametres) {
    return "";
  }

  const typeRetour = parametres.get("retour");

  if (typeRetour !== "preuve-envoyee" && typeRetour !== "envoi-abandonne") {
    return "";
  }

  const idCommande = parametres.get("commande") || "";
  const commande = commandes.find((element) => element.id === idCommande);
  const detailCommande = commande ? `<p>Commande: <strong>${echapperHtml(commande.id)}</strong></p>` : "";

  if (typeRetour === "envoi-abandonne") {
    return `
      <section class="bloc message-retour">
        <p class="badge badge-neutre">Envoi non finalise</p>
        <h2>Justificatif non recu</h2>
        <p>Aucun justificatif n'a ete transmis. La commande reste inactive.</p>
        ${detailCommande}
      </section>
    `;
  }

  return `
    <section class="bloc message-retour">
      <p class="badge badge-attente">Justificatif recu</p>
      <h2>Paiement en controle</h2>
      <p>La commande sera mise a jour apres decision.</p>
      ${detailCommande}
    </section>
  `;
}

function traiterRetourClient(parametres, commandes) {
  if (!parametres) {
    return;
  }

  const idCommande = parametres.get("commande") || "";
  const commande = commandes.find((element) => element.id === idCommande);

  if (!commande || estDecisionFinale(commande)) {
    return;
  }

  const typeRetour = parametres.get("retour");

  if (typeRetour === "preuve-envoyee") {
    commande.statutPaiement = "EN_VERIFICATION";
    commande.modifieLe = new Date().toISOString();
    enregistrerCommandes(commandes);
    return;
  }

  if (typeRetour === "envoi-abandonne") {
    commande.statutPaiement = "ABANDONNE";
    commande.statutCommande = "EN_ATTENTE_PAIEMENT";
    commande.modifieLe = new Date().toISOString();
    enregistrerCommandes(commandes);
  }
}

function afficherCommande(commande) {
  const decision = decrireDecisionCommande(commande);
  const actionPaiement = afficherActionPaiement(commande);

  return `
    <article class="commande">
      <div>
        <strong>${echapperHtml(commande.nom)}</strong>
        <p>${echapperHtml(commande.id)}</p>
        <p class="decision ${echapperHtml(decision.classe)}">${echapperHtml(decision.titre)}</p>
        <p>${echapperHtml(decision.description)}</p>
        <div class="details-commande">
          <span>Paiement: ${echapperHtml(commande.statutPaiement)}</span>
          <span>Commande: ${echapperHtml(commande.statutCommande)}</span>
          <span>Mise a jour: ${formaterDate(commande.modifieLe)}</span>
        </div>
      </div>
      <div>
        ${actionPaiement}
      </div>
    </article>
  `;
}

function afficherActionPaiement(commande) {
  if (paiementContinuable(commande)) {
    return `
      <div class="actions-commande">
        <a href="${echapperHtml(commande.urlPaiement)}">Continuer le paiement</a>
        <form method="post" action="/abandonner-commande">
          <input type="hidden" name="idCommande" value="${echapperHtml(commande.id)}">
          <button type="submit" class="bouton-secondaire">Abandonner</button>
        </form>
      </div>
    `;
  }

  const libelles = {
    EN_VERIFICATION: "Justificatif recu",
    PAYE: "Paiement accepte",
    REFUSE: "Paiement refuse",
    ABANDONNE: "Paiement abandonne",
  };

  return `<span class="action-indisponible">${echapperHtml(libelles[commande.statutPaiement] || "Paiement indisponible")}</span>`;
}

function paiementContinuable(commande) {
  return (
    Boolean(commande.urlPaiement) &&
    !estDecisionFinale(commande) &&
    (commande.statutPaiement === "CREE" || commande.statutPaiement === "EN_ATTENTE_PAIEMENT")
  );
}

function decrireDecisionCommande(commande) {
  if (commande.dernierEvenement === "paiement.paye" || commande.decisionMarchand === "ACCEPTE") {
    return {
      classe: "decision-ok",
      titre: "Decision du marchand: paiement accepte",
      description:
        commande.type === "ABONNEMENT"
          ? "L'abonnement est actif."
          : "Le produit est disponible.",
    };
  }

  if (commande.dernierEvenement === "paiement.refuse" || commande.decisionMarchand === "REFUSE") {
    return {
      classe: "decision-refus",
      titre: "Decision du marchand: paiement refuse",
      description: "Le paiement a ete refuse.",
    };
  }

  if (commande.statutPaiement === "ABANDONNE") {
    return {
      classe: "decision-neutre",
      titre: "Paiement non finalise",
      description: "Aucun justificatif n'a ete recu pour cette commande.",
    };
  }

  if (commande.statutPaiement === "EN_VERIFICATION") {
    return {
      classe: "decision-attente",
      titre: "Decision du marchand: en attente",
      description: "La commande sera mise a jour apres acceptation ou refus.",
    };
  }

  if (commande.idPaiement) {
    return {
      classe: "decision-attente",
      titre: "Paiement en cours",
      description: "Le justificatif n'a pas encore ete recu.",
    };
  }

  return {
    classe: "decision-attente",
    titre: "Paiement non cree",
    description: "Aucun paiement n'est associe a cette commande.",
  };
}

function estDecisionFinale(commande) {
  return (
    commande.dernierEvenement === "paiement.paye" ||
    commande.dernierEvenement === "paiement.refuse" ||
    commande.decisionMarchand === "ACCEPTE" ||
    commande.decisionMarchand === "REFUSE"
  );
}

async function afficherMessage(message) {
  const configuration = await chargerConfigurationSandbox();

  return pageHtml(message, `
    <main>
      <section class="bloc">
        <h1>${echapperHtml(message)}</h1>
        <p><a href="/">Retour aux offres</a></p>
      </section>
    </main>
  `, optionsInterfaceSandbox(configuration));
}

function optionsInterfaceSandbox(configuration) {
  return {
    themeInterface: valeurConfiguration(configuration, "THEME_INTERFACE", "paie_clair"),
  };
}

function pageHtml(titre, contenu, options = {}) {
  const themeInterface = valeurThemeInterface(options.themeInterface || process.env.THEME_INTERFACE);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${echapperHtml(titre)}</title>
  <style>
    ${styleThemeInterface(themeInterface)}
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      color: var(--couleur-texte);
      background: var(--couleur-fond);
    }
    main {
      width: min(1040px, calc(100% - 32px));
      margin: 32px auto;
    }
    h1, h2, p {
      margin-top: 0;
    }
    a {
      color: var(--couleur-primaire);
      font-weight: 700;
    }
    .action-indisponible {
      display: inline-block;
      padding: 4px 0;
      color: var(--couleur-texte-secondaire);
      font-weight: 700;
    }
    .entete, .bloc, .offre {
      background: var(--couleur-surface);
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      padding: 22px;
      margin-bottom: 18px;
    }
    .grille {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .badge {
      display: inline-block;
      margin-bottom: 10px;
      padding: 4px 8px;
      border-radius: 6px;
      color: var(--couleur-primaire-texte);
      background: var(--couleur-primaire);
      font-size: 13px;
      font-weight: 700;
    }
    .badge-attente {
      color: var(--couleur-attente);
      background: var(--couleur-attente-fond);
    }
    .badge-neutre {
      color: var(--couleur-neutre);
      background: var(--couleur-neutre-fond);
    }
    .prix {
      font-size: 30px;
      font-weight: 800;
    }
    button {
      padding: 11px 16px;
      border: 0;
      border-radius: 6px;
      color: var(--couleur-primaire-texte);
      background: var(--couleur-primaire);
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }
    button.bouton-secondaire {
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-secondaire);
    }
    .actions-commande {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }
    .actions-commande form {
      margin: 0;
    }
    .titre-ligne, .commande {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .commande {
      padding: 14px 0;
      border-top: 1px solid var(--couleur-bordure);
    }
    .message-retour {
      border-color: var(--couleur-attente-bordure);
      background: var(--couleur-attente-fond);
    }
    .commande p {
      margin-bottom: 4px;
      color: var(--couleur-texte-secondaire);
    }
    .decision {
      display: inline-block;
      margin: 8px 0;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
    }
    .decision-ok, .commande .decision-ok {
      color: var(--couleur-succes);
      background: var(--couleur-succes-fond);
    }
    .decision-refus, .commande .decision-refus {
      color: var(--couleur-erreur);
      background: var(--couleur-erreur-fond);
    }
    .decision-attente, .commande .decision-attente {
      color: var(--couleur-attente);
      background: var(--couleur-attente-fond);
    }
    .decision-neutre, .commande .decision-neutre {
      color: var(--couleur-neutre);
      background: var(--couleur-neutre-fond);
    }
    .details-commande {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
      color: var(--couleur-texte-secondaire);
      font-size: 14px;
    }
    .details-commande span {
      padding: 4px 7px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 6px;
      background: var(--couleur-surface-alt);
    }
    @media (max-width: 760px) {
      .grille, .titre-ligne, .commande {
        display: block;
      }
    }
  </style>
</head>
<body data-theme-interface="${echapperHtml(themeInterface)}">
  ${contenu}
</body>
</html>`;
}

function lireCorpsTexte(requete) {
  return new Promise((resolve, reject) => {
    let corps = "";

    requete.on("data", (morceau) => {
      corps += morceau.toString();

      if (Buffer.byteLength(corps) > TAILLE_MAX_CORPS) {
        requete.destroy();
        reject(new Error("Corps trop volumineux."));
      }
    });

    requete.on("end", () => resolve(corps));
    requete.on("error", reject);
  });
}

async function lireCorpsFormulaire(requete) {
  const corps = await lireCorpsTexte(requete);
  const donnees = new URLSearchParams(corps);
  return Object.fromEntries(donnees.entries());
}

function chargerCommandes() {
  try {
    const contenu = fs.readFileSync(fichierCommandes, "utf8");
    const commandes = JSON.parse(contenu);
    return Array.isArray(commandes) ? commandes : [];
  } catch {
    return [];
  }
}

function enregistrerCommandes(commandes) {
  fs.writeFileSync(fichierCommandes, JSON.stringify(commandes, null, 2));
}

function preparerStockage() {
  fs.mkdirSync(dossierDonnees, { recursive: true });

  if (!fs.existsSync(fichierCommandes)) {
    fs.writeFileSync(fichierCommandes, "[]");
  }
}

function envoyerJson(reponse, codeHttp, donnees) {
  reponse.writeHead(codeHttp, { "content-type": "application/json; charset=utf-8" });
  reponse.end(JSON.stringify(donnees, null, 2));
}

function envoyerHtml(reponse, codeHttp, html) {
  reponse.writeHead(codeHttp, { "content-type": "text/html; charset=utf-8" });
  reponse.end(html);
}

function creerId(prefixe) {
  return `${prefixe}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function echapperHtml(valeur) {
  return String(valeur)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formaterDate(valeur) {
  if (!valeur) {
    return "-";
  }

  const date = new Date(valeur);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formaterMontant(montant, devise) {
  return `${Number(montant).toLocaleString("fr-FR")} ${echapperHtml(devise)}`;
}

function construireUrlLocaleExposee(portPublic, portInterne) {
  const port = Number(portPublic);

  if (!Number.isFinite(port) || port <= 0 || port === Number(portInterne)) {
    return "";
  }

  return `http://localhost:${port}`;
}
