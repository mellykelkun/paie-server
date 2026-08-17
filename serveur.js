const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");
const chargerFichierEnv = require("./environnement");

chargerFichierEnv();

const { poolBase, executerRequete, verifierBase, fermerBase } = require("./base-de-donnees");
const afficherAccueil = require("./interfaces/accueil");
const afficherPaiement = require("./interfaces/paiement");
const afficherMarchand = require("./interfaces/marchand");
const afficherMessage = require("./interfaces/message");
const afficherConnexionMarchand = require("./interfaces/connexion-marchand");
const afficherInitialisationMarchand = require("./interfaces/initialisation-marchand");
const {
  afficherPreuveEnvoyee,
  afficherEchecEnvoi,
} = require("./interfaces/resultat-paiement");
const { creerGestionnaireSessionMarchand } = require("./securite/session-marchand");
const { verifierCodeTotp } = require("./securite/totp");
const { analyserImagePreuve } = require("./services/ocr-preuve");

const port = Number(process.env.PORT || 3000);
const urlBase = normaliserUrlPublique(
  process.env.URL_PUBLIQUE_APPLICATION || process.env.URL_BASE,
  port
);
const environnementExecution = String(process.env.ENVIRONNEMENT || process.env.NODE_ENV || "developpement");
const cleApiApplication = lireSecretEnv("CLE_API_APPLICATION", "cle_application_dev");
const cleMarchand = lireSecretEnv("CLE_MARCHAND", "cle_marchand_dev");
const cleOrigineSandbox = String(process.env.CLE_ORIGINE_SANDBOX || "").trim();
const sessionMarchand = creerGestionnaireSessionMarchand({
  identifiant: process.env.IDENTIFIANT_MARCHAND || "admin",
  motDePasse: process.env.MOT_DE_PASSE_MARCHAND || cleMarchand,
  secretTotp: process.env.SECRET_2FA_MARCHAND || process.env.SECRET_TOTP_MARCHAND || "",
  secretSession: lireSecretEnv("SECRET_SESSION_MARCHAND", cleMarchand),
  dureeMinutes: Number(process.env.DUREE_SESSION_MARCHAND_MINUTES || 30),
  cookieSecurise:
    process.env.COOKIE_SECURISE === "true" ||
    urlBase.startsWith("https://") ||
    environnementExecution === "production",
});
const maxTentativesWebhook = Number(process.env.MAX_TENTATIVES_WEBHOOK || 5);
const delaiRetryWebhookSecondes = Number(process.env.DELAI_RETRY_WEBHOOK_SECONDES || 60);
const cleInstallationMarchand = String(process.env.CLE_INSTALLATION_MARCHAND || "").trim();
const NOM_COOKIE_INITIALISATION = "paie_initialisation_marchand";
const initialisationsMarchand = new Map();

const dossierPreuves = path.join(__dirname, "televersements", "preuves");

const TAILLE_MAX_JSON = 7 * 1024 * 1024;
const TAILLE_MAX_PREUVE = 5 * 1024 * 1024;
const TAILLE_MIN_PREUVE = 5 * 1024;

const STATUTS_PAIEMENT = {
  CREE: "CREE",
  EN_ATTENTE_PAIEMENT: "EN_ATTENTE_PAIEMENT",
  PREUVE_ENVOYEE: "PREUVE_ENVOYEE",
  EN_VERIFICATION: "EN_VERIFICATION",
  PAYE: "PAYE",
  REFUSE: "REFUSE",
  ABANDONNE: "ABANDONNE",
};

function lireSecretEnv(nom, valeurDeveloppement) {
  const valeur = String(process.env[nom] || "").trim();

  if (valeur) {
    return valeur;
  }

  if (environnementExecution === "production") {
    throw new Error(`${nom} obligatoire en production.`);
  }

  return valeurDeveloppement;
}

const moyensPaiementParDefaut = [
  {
    code: "wave",
    libelle: "Wave",
    nomCompte: process.env.NOM_COMPTE_WAVE || "Nom du marchand",
    numeroCompte: process.env.NUMERO_COMPTE_WAVE || "+2250000000000",
    instructions: "Envoyez le montant de la commande en couvrant les frais Wave.",
  },
  {
    code: "orange_money",
    libelle: "Orange Money",
    nomCompte: process.env.NOM_COMPTE_ORANGE || "Nom du marchand",
    numeroCompte: process.env.NUMERO_COMPTE_ORANGE || "+2250000000000",
    instructions: "Envoyez le montant de la commande en couvrant les frais Orange Money.",
  },
];

preparerDossiers();

const serveur = http.createServer(async (requete, reponse) => {
  try {
    const url = new URL(requete.url, urlBase);

    if (requete.method === "GET" && url.pathname === "/") {
      return envoyerHtml(reponse, 200, afficherAccueil());
    }

    if (requete.method === "GET" && url.pathname === "/api/sante") {
      await verifierBase();

      return envoyerJson(reponse, 200, {
        statut: "ok",
        service: "paie-server",
        baseDeDonnees: "ok",
        date: new Date().toISOString(),
      });
    }

    if (requete.method === "GET" && url.pathname === "/marchand/initialisation") {
      if (await compteMarchandExiste()) {
        reponse.writeHead(303, { location: "/marchand/connexion" });
        return reponse.end();
      }

      return envoyerHtml(reponse, 200, await afficherEtapeInitialisation2fa(requete, reponse));
    }

    if (requete.method === "POST" && url.pathname === "/marchand/initialisation/2fa") {
      if (await compteMarchandExiste()) {
        reponse.writeHead(303, { location: "/marchand/connexion" });
        return reponse.end();
      }

      const corps = await lireCorpsFormulaire(requete);
      const initialisation = obtenirInitialisationMarchand(requete);

      if (!initialisation) {
        return envoyerHtml(reponse, 400, await afficherEtapeInitialisation2fa(requete, reponse, "Session d'initialisation expiree."));
      }

      if (cleInstallationMarchand && corps.cleInstallation !== cleInstallationMarchand) {
        return envoyerHtml(
          reponse,
          401,
          await afficherEtapeInitialisation2fa(requete, reponse, "Cle d'installation invalide.")
        );
      }

      if (!verifierCodeTotp(initialisation.secret2fa, corps.code2fa)) {
        return envoyerHtml(
          reponse,
          401,
          await afficherEtapeInitialisation2fa(requete, reponse, "Code Authenticator invalide.")
        );
      }

      initialisation.code2faValide = true;
      reponse.writeHead(303, { location: "/marchand/initialisation/compte" });
      return reponse.end();
    }

    if (requete.method === "GET" && url.pathname === "/marchand/initialisation/compte") {
      if (await compteMarchandExiste()) {
        reponse.writeHead(303, { location: "/marchand/connexion" });
        return reponse.end();
      }

      const initialisation = obtenirInitialisationMarchand(requete);

      if (!initialisation || !initialisation.code2faValide) {
        reponse.writeHead(303, { location: "/marchand/initialisation" });
        return reponse.end();
      }

      return envoyerHtml(reponse, 200, afficherEtapeCreationCompte(initialisation));
    }

    if (requete.method === "POST" && url.pathname === "/marchand/initialisation/compte") {
      if (await compteMarchandExiste()) {
        reponse.writeHead(303, { location: "/marchand/connexion" });
        return reponse.end();
      }

      const initialisation = obtenirInitialisationMarchand(requete);

      if (!initialisation || !initialisation.code2faValide) {
        reponse.writeHead(303, { location: "/marchand/initialisation" });
        return reponse.end();
      }

      const corps = await lireCorpsFormulaire(requete);
      const erreurMotDePasse = validerMotDePasseInitialisation(corps.motDePasse, corps.confirmationMotDePasse);

      if (erreurMotDePasse) {
        return envoyerHtml(reponse, 400, afficherEtapeCreationCompte(initialisation, erreurMotDePasse));
      }

      await creerCompteMarchand(initialisation.identifiant, corps.motDePasse, initialisation.secret2fa);
      initialisationsMarchand.delete(initialisation.jeton);
      sessionMarchand.creerSession(reponse);
      ajouterCookie(reponse, construireCookieInitialisation("", 0));
      reponse.writeHead(303, { location: "/marchand" });
      return reponse.end();
    }

    if (requete.method === "GET" && url.pathname === "/marchand/connexion") {
      if (!(await compteMarchandExiste())) {
        reponse.writeHead(303, { location: "/marchand/initialisation" });
        return reponse.end();
      }

      if (sessionMarchand.lireSession(requete, reponse)) {
        reponse.writeHead(303, { location: "/marchand" });
        return reponse.end();
      }

      return envoyerHtml(reponse, 200, afficherConnexionMarchand());
    }

    if (requete.method === "POST" && url.pathname === "/marchand/connexion") {
      if (!(await compteMarchandExiste())) {
        reponse.writeHead(303, { location: "/marchand/initialisation" });
        return reponse.end();
      }

      const corps = await lireCorpsFormulaire(requete);

      if (!(await authentifierCompteMarchand(corps))) {
        return envoyerHtml(
          reponse,
          401,
          afficherConnexionMarchand({
            erreur: "Identifiant ou authentification invalide.",
          })
        );
      }

      sessionMarchand.creerSession(reponse);
      reponse.writeHead(303, { location: "/marchand" });
      return reponse.end();
    }

    if (requete.method === "POST" && url.pathname === "/marchand/deconnexion") {
      sessionMarchand.detruireSession(requete, reponse);
      reponse.writeHead(303, { location: "/marchand/connexion" });
      return reponse.end();
    }

    if (requete.method === "POST" && url.pathname === "/api/paiements") {
      if (!aAccesApplication(requete)) {
        return envoyerJson(reponse, 401, { message: "Cle API application invalide." });
      }

      const corps = await lireCorpsJson(requete);
      const resultat = await creerPaiement(corps, requete);

      if (!resultat.ok) {
        return envoyerJson(reponse, 400, { message: resultat.message });
      }

      return envoyerJson(reponse, 201, resultat.paiement);
    }

    if (requete.method === "GET" && url.pathname === "/api/paiements") {
      if (!aAccesMarchand(requete, reponse)) {
        return envoyerJson(reponse, 401, { message: "Cle marchand invalide." });
      }

      return envoyerJson(reponse, 200, (await chargerPaiements()).map(paiementMarchand));
    }

    if (requete.method === "GET" && url.pathname.startsWith("/api/paiements/")) {
      const identifiantPaiement = url.pathname.split("/")[3];
      const paiement = await trouverPaiementParAccesPublic(identifiantPaiement);

      if (!paiement) {
        return envoyerJson(reponse, 404, { message: "Paiement introuvable." });
      }

      return envoyerJson(reponse, 200, paiementPublic(paiement));
    }

    if (requete.method === "POST" && url.pathname.match(/^\/api\/paiements\/[^/]+\/preuve$/)) {
      const identifiantPaiement = url.pathname.split("/")[3];
      const corps = await lireCorpsJson(requete);
      const resultat = await envoyerPreuve(identifiantPaiement, corps);

      if (!resultat.ok) {
        return envoyerJson(reponse, resultat.codeHttp || 400, {
          message: resultat.message,
          code: resultat.code || "ENVOI_PREUVE_REFUSE",
        });
      }

      return envoyerJson(reponse, 201, {
        message: "Justificatif recu.",
        paiement: paiementPublic(resultat.paiement),
        verification: resultat.paiement.verification,
      });
    }

    if (
      requete.method === "POST" &&
      url.pathname.match(/^\/api\/marchand\/paiements\/[^/]+\/accepter$/)
    ) {
      if (!aAccesMarchand(requete, reponse)) {
        return envoyerJson(reponse, 401, { message: "Cle marchand invalide." });
      }

      const idPaiement = url.pathname.split("/")[4];
      const resultat = await accepterPaiement(idPaiement);

      if (!resultat.ok) {
        return envoyerJson(reponse, resultat.codeHttp || 400, resultat);
      }

      return envoyerJson(reponse, 200, resultat);
    }

    if (
      requete.method === "POST" &&
      url.pathname.match(/^\/api\/marchand\/paiements\/[^/]+\/refuser$/)
    ) {
      if (!aAccesMarchand(requete, reponse)) {
        return envoyerJson(reponse, 401, { message: "Cle marchand invalide." });
      }

      const idPaiement = url.pathname.split("/")[4];
      const corps = await lireCorpsJson(requete);
      const resultat = await refuserPaiement(idPaiement, corps.raison);

      if (!resultat.ok) {
        return envoyerJson(reponse, resultat.codeHttp || 400, resultat);
      }

      return envoyerJson(reponse, 200, resultat);
    }

    if (
      requete.method === "POST" &&
      url.pathname.match(/^\/api\/marchand\/paiements\/[^/]+\/notification\/renvoyer$/)
    ) {
      if (!aAccesMarchand(requete, reponse)) {
        return envoyerJson(reponse, 401, { message: "Cle marchand invalide." });
      }

      const idPaiement = url.pathname.split("/")[4];
      const resultat = await renvoyerNotificationPaiement(idPaiement);

      if (!resultat.ok) {
        return envoyerJson(reponse, resultat.codeHttp || 400, resultat);
      }

      return envoyerJson(reponse, 200, resultat);
    }

    if (requete.method === "GET" && url.pathname.match(/^\/paiement\/[^/]+\/preuve-envoyee$/)) {
      const identifiantPaiement = url.pathname.split("/")[2];
      const paiement = await trouverPaiementParAccesPublic(identifiantPaiement);

      if (!paiement) {
        return envoyerHtml(reponse, 404, afficherMessage("Paiement introuvable"));
      }

      if (!paiement.preuve) {
        reponse.writeHead(303, { location: cheminPaiement(paiement) });
        return reponse.end();
      }

      return envoyerHtml(reponse, 200, afficherPreuveEnvoyee(paiement));
    }

    if (requete.method === "GET" && url.pathname.match(/^\/paiement\/[^/]+\/echec-envoi$/)) {
      const identifiantPaiement = url.pathname.split("/")[2];
      const paiement = await trouverPaiementParAccesPublic(identifiantPaiement);

      if (!paiement) {
        return envoyerHtml(reponse, 404, afficherMessage("Paiement introuvable"));
      }

      return envoyerHtml(
        reponse,
        200,
        afficherEchecEnvoi(paiement, url.searchParams.get("message"), url.searchParams.get("code"))
      );
    }

    if (requete.method === "POST" && url.pathname.match(/^\/paiement\/[^/]+\/abandonner$/)) {
      const identifiantPaiement = url.pathname.split("/")[2];
      const resultat = await abandonnerPaiement(identifiantPaiement);

      if (!resultat.ok) {
        return envoyerHtml(reponse, resultat.codeHttp || 400, afficherMessage(resultat.message));
      }

      if (!resultat.urlRedirection) {
        return envoyerHtml(reponse, 200, afficherMessage("Paiement abandonne"));
      }

      reponse.writeHead(303, { location: resultat.urlRedirection });
      return reponse.end();
    }

    if (requete.method === "GET" && url.pathname.startsWith("/paiement/")) {
      const identifiantPaiement = url.pathname.split("/")[2];
      const paiement = await trouverPaiementParAccesPublic(identifiantPaiement);

      if (!paiement) {
        return envoyerHtml(reponse, 404, afficherMessage("Paiement introuvable"));
      }

      if (paiement.preuve) {
        reponse.writeHead(303, { location: `${cheminPaiement(paiement)}/preuve-envoyee` });
        return reponse.end();
      }

      if (paiement.statut === STATUTS_PAIEMENT.ABANDONNE) {
        return envoyerHtml(
          reponse,
          410,
          afficherMessage("Ce paiement n'est plus actif", {
            urlRetour: construireUrlRetourAbandon(paiement),
            libelleRetour: "OK",
          })
        );
      }

      const paiementMisAJour = await marquerPaiementEnAttente(paiement);
      return envoyerHtml(reponse, 200, afficherPaiement(paiementMisAJour));
    }

    if (requete.method === "GET" && url.pathname === "/marchand") {
      if (!(await compteMarchandExiste())) {
        reponse.writeHead(303, { location: "/marchand/initialisation" });
        return reponse.end();
      }

      if (!aAccesMarchand(requete, reponse)) {
        reponse.writeHead(303, { location: "/marchand/connexion" });
        return reponse.end();
      }

      return envoyerHtml(
        reponse,
        200,
        afficherMarchand(await chargerPaiements())
      );
    }

    if (requete.method === "GET" && url.pathname.startsWith("/marchand/preuves/")) {
      if (!aAccesMarchand(requete, reponse)) {
        return envoyerTexte(reponse, 401, "Cle marchand invalide.");
      }

      return envoyerImagePreuve(reponse, url.pathname.split("/").pop());
    }

    return envoyerJson(reponse, 404, { message: "Route introuvable." });
  } catch (erreur) {
    if (erreur && erreur.codeHttp) {
      return envoyerJson(reponse, erreur.codeHttp, {
        message: erreur.message,
        code: erreur.code || "REQUETE_INVALIDE",
      });
    }

    console.error("Erreur serveur:", erreur);
    return envoyerJson(reponse, 500, { message: "Erreur serveur interne." });
  }
});

serveur.listen(port, () => {
  console.log(`Paie Server demarre sur ${urlBase}`);
  console.log(`Sante: ${urlBase}/api/sante`);
  console.log(`Tableau marchand: ${urlBase}/marchand`);
});

const minuteurNotificationsWebhook = setInterval(() => {
  traiterNotificationsEnAttente().catch((erreur) => {
    console.error("Erreur retry notification:", erreur.message);
  });
}, 30_000);

setTimeout(() => {
  traiterNotificationsEnAttente().catch((erreur) => {
    console.error("Erreur initialisation notifications:", erreur.message);
  });
}, 2_000);

process.on("SIGINT", arreterServeur);
process.on("SIGTERM", arreterServeur);

function arreterServeur() {
  clearInterval(minuteurNotificationsWebhook);
  serveur.close(async () => {
    await fermerBase();
    process.exit(0);
  });
}

async function creerPaiement(corps, requete) {
  if (!corps || typeof corps !== "object") {
    return { ok: false, message: "Demande invalide." };
  }

  const montant = Number(corps.montant);
  const devise = String(corps.devise || "").trim().toUpperCase();
  const idCommande = String(corps.idCommande || "").trim();
  const idClient = String(corps.idClient || "").trim();
  const origine = determinerOriginePaiement(requete);

  if (!Number.isFinite(montant) || montant <= 0) {
    return { ok: false, message: "Le montant est obligatoire et doit etre positif." };
  }

  if (!devise || devise.length < 3) {
    return { ok: false, message: "La devise est obligatoire, exemple: XOF." };
  }

  if (!idCommande) {
    return { ok: false, message: "Identifiant de commande obligatoire." };
  }

  if (!idClient) {
    return { ok: false, message: "Identifiant client obligatoire." };
  }

  const moyensPaiement = normaliserMoyensPaiement(corps.moyensPaiement);

  if (moyensPaiement.length === 0) {
    return { ok: false, message: "Aucun moyen de paiement disponible." };
  }

  const urls = validerUrlsPaiement(corps);

  if (!urls.ok) {
    return { ok: false, message: urls.message };
  }

  const maintenant = new Date().toISOString();
  const idPaiement = creerId("paiement");
  const jetonClient = creerJeton("paie");
  const paiement = {
    id: idPaiement,
    jetonClient,
    referencePaiement: creerReferencePaiement(idPaiement),
    idCommande,
    idClient,
    origine,
    metadonnees: normaliserMetadonnees(corps.metadonnees || corps.metadata),
    montant,
    devise,
    statut: STATUTS_PAIEMENT.CREE,
    moyensPaiement,
    urlPaiement: "",
    urlSucces: urls.urlSucces,
    urlAnnulation: urls.urlAnnulation,
    urlRetour: urls.urlRetour,
    urlWebhook: urls.urlWebhook,
    secretWebhook: String(corps.secretWebhook || "").trim(),
    moyenChoisi: null,
    preuve: null,
    verification: null,
    historique: [
      {
        statut: STATUTS_PAIEMENT.CREE,
        date: maintenant,
        message: "Paiement cree.",
      },
    ],
    raisonRefus: null,
    dernierWebhook: null,
    creeLe: maintenant,
    modifieLe: maintenant,
  };

  paiement.urlPaiement = `${urlBase}/paiement/${paiement.jetonClient}`;

  await creerPaiementEnBase(paiement);

  return { ok: true, paiement: paiementMarchand(paiement) };
}

async function envoyerPreuve(identifiantPaiement, corps) {
  const paiements = await chargerPaiements();
  const paiement = paiements.find((element) => {
    return element.id === identifiantPaiement || element.jetonClient === identifiantPaiement;
  });

  if (!paiement) {
    return { ok: false, codeHttp: 404, message: "Paiement introuvable." };
  }

  if (paiement.statut === STATUTS_PAIEMENT.PAYE) {
    return {
      ok: false,
      codeHttp: 409,
      code: "PAIEMENT_DEJA_CONFIRME",
      message: "Ce paiement est deja confirme.",
    };
  }

  if (paiement.statut === STATUTS_PAIEMENT.REFUSE) {
    return {
      ok: false,
      codeHttp: 409,
      code: "PAIEMENT_DEJA_REFUSE",
      message: "Ce paiement a deja ete refuse.",
    };
  }

  if (paiement.preuve) {
    return {
      ok: false,
      codeHttp: 409,
      code: "JUSTIFICATIF_DEJA_RECU",
      message: "Un justificatif a deja ete recu pour ce paiement.",
    };
  }

  if (paiement.statut === STATUTS_PAIEMENT.ABANDONNE) {
    return {
      ok: false,
      codeHttp: 409,
      code: "PAIEMENT_ABANDONNE",
      message: "Ce paiement n'est plus actif.",
    };
  }

  if (!corps || typeof corps !== "object") {
    return { ok: false, code: "DEMANDE_INVALIDE", message: "Demande invalide." };
  }

  const imageBase64 = String(corps.imageBase64 || "");
  const image = decoderImageBase64(imageBase64);

  if (!image) {
    return {
      ok: false,
      codeHttp: 422,
      code: "TYPE_IMAGE_INVALIDE",
      message: "Le justificatif doit etre une image PNG, JPEG ou WebP valide.",
    };
  }

  const maintenant = new Date().toISOString();
  const moyenPaiement = String(corps.moyenPaiement || "").trim();
  const referenceTransactionSysteme = creerReferencePaiement(paiement.id);
  const montantVu = paiement.montant;
  const payeLe = maintenant;
  const nomFichier = String(corps.nomFichier || "justificatif").trim();

  const verification = await verifierPreuve({
    paiements,
    paiement,
    image,
    moyenPaiement,
    referenceTransaction: referenceTransactionSysteme,
    montantVu,
    payeLe,
  });

  const erreurControle = trouverErreurControlePreuve(verification);

  if (erreurControle) {
    return erreurControle;
  }

  const referenceTransaction =
    verification.referenceTransactionProvider || referenceTransactionSysteme;
  const extension = verification.typeDetecte === "jpeg" ? "jpg" : verification.typeDetecte || "bin";
  const nomFichierStocke = `${paiement.id}_${Date.now()}.${extension}`;
  const cheminPreuve = path.join(dossierPreuves, nomFichierStocke);
  const preuve = {
    nomFichier,
    nomFichierStocke,
    typeMime: verification.typeMime,
    taille: image.length,
    sha256: verification.sha256,
    empreinteVisuelle: verification.empreinteVisuelle,
    referenceTransaction,
    montantVu,
    payeLe,
    envoyeeLe: maintenant,
  };
  const paiementMisAJour = {
    ...paiement,
    statut: STATUTS_PAIEMENT.EN_VERIFICATION,
    moyenChoisi: moyenPaiement,
    preuve,
    verification,
    modifieLe: maintenant,
    historique: [
      ...paiement.historique,
      {
        statut: STATUTS_PAIEMENT.PREUVE_ENVOYEE,
        date: maintenant,
        message: "Justificatif recu.",
      },
      {
        statut: STATUTS_PAIEMENT.EN_VERIFICATION,
        date: maintenant,
        message: "Controle en cours.",
      },
    ],
  };

  try {
    fs.writeFileSync(cheminPreuve, image);
    await mettreAJourPaiementEnBase(paiementMisAJour);
  } catch (erreur) {
    supprimerFichierSiPossible(cheminPreuve);

    if (erreur.code === "23505") {
      return {
        ok: false,
        codeHttp: 409,
        code: "JUSTIFICATIF_DEJA_UTILISE",
        message: "Ce justificatif a deja ete utilise pour un autre paiement.",
      };
    }

    throw erreur;
  }

  return { ok: true, paiement: paiementMisAJour };
}

async function abandonnerPaiement(identifiantPaiement) {
  const paiement = await trouverPaiementParAccesPublic(identifiantPaiement);

  if (!paiement) {
    return { ok: false, codeHttp: 404, message: "Paiement introuvable." };
  }

  if (paiement.preuve) {
    return {
      ok: true,
      urlRedirection: `${cheminPaiement(paiement)}/preuve-envoyee`,
    };
  }

  if (paiement.statut === STATUTS_PAIEMENT.PAYE || paiement.statut === STATUTS_PAIEMENT.REFUSE) {
    return {
      ok: true,
      urlRedirection: construireUrlRetourAbandon(paiement),
    };
  }

  if (paiement.statut !== STATUTS_PAIEMENT.ABANDONNE) {
    const maintenant = new Date().toISOString();
    paiement.statut = STATUTS_PAIEMENT.ABANDONNE;
    paiement.modifieLe = maintenant;
    paiement.historique.push({
      statut: STATUTS_PAIEMENT.ABANDONNE,
      date: maintenant,
      message: "Paiement abandonne par le client apres echec d'envoi.",
    });

    await mettreAJourPaiementEnBase(paiement);
  }

  return {
    ok: true,
    urlRedirection: construireUrlRetourAbandon(paiement),
  };
}

async function accepterPaiement(idPaiement) {
  return prendreDecisionPaiement(idPaiement, {
    statutFinal: STATUTS_PAIEMENT.PAYE,
    statutOppose: STATUTS_PAIEMENT.REFUSE,
    evenement: "paiement.paye",
    messageHistorique: "Paiement accepte par le marchand.",
    messageRetour: "Paiement accepte. Decision enregistree.",
    messageDejaTraite: "Paiement deja accepte. Aucune nouvelle notification envoyee.",
    messageOppose: "Decision impossible: ce paiement a deja ete refuse.",
    verifier: (paiement) => {
      if ((paiement.verification.alertesCritiques || []).length > 0) {
        return "Acceptation bloquee: le justificatif contient des anomalies critiques.";
      }

      return "";
    },
  });
}

async function refuserPaiement(idPaiement, raison) {
  return prendreDecisionPaiement(idPaiement, {
    statutFinal: STATUTS_PAIEMENT.REFUSE,
    statutOppose: STATUTS_PAIEMENT.PAYE,
    evenement: "paiement.refuse",
    messageHistorique: String(raison || "Paiement refuse par le marchand.").trim(),
    messageRetour: "Paiement refuse. Decision enregistree.",
    messageDejaTraite: "Paiement deja refuse. Aucune nouvelle notification envoyee.",
    messageOppose: "Decision impossible: ce paiement a deja ete accepte.",
    appliquer: (paiement) => {
      paiement.raisonRefus = String(raison || "Paiement refuse par le marchand.").trim();
    },
  });
}

async function prendreDecisionPaiement(idPaiement, decision) {
  const client = await poolBase.connect();
  let idNotification = null;
  let idDecision = idPaiement;

  try {
    await client.query("begin");
    const resultat = await client.query("select * from paiements where id = $1 for update", [idPaiement]);

    if (resultat.rowCount === 0) {
      await client.query("commit");
      return { ok: false, codeHttp: 404, message: "Paiement introuvable." };
    }

    const paiement = convertirLignePaiement(resultat.rows[0]);
    idDecision = paiement.id;

    if (paiement.statut === decision.statutFinal) {
      await client.query("commit");
      return reponseDecision(paiement, decision.messageDejaTraite, true);
    }

    if (paiement.statut === decision.statutOppose) {
      await client.query("commit");
      return {
        ok: false,
        codeHttp: 409,
        message: decision.messageOppose,
        paiement: paiementPublic(paiement),
        webhook: resumerWebhook(paiement),
      };
    }

    if (!paiement.preuve || !paiement.verification) {
      await client.query("commit");
      return { ok: false, message: "Aucun justificatif n'a ete soumis." };
    }

    const erreurDecision = decision.verifier ? decision.verifier(paiement) : "";

    if (erreurDecision) {
      await client.query("commit");
      return { ok: false, message: erreurDecision };
    }

    const maintenant = new Date().toISOString();
    paiement.statut = decision.statutFinal;
    paiement.modifieLe = maintenant;
    paiement.historique.push({
      statut: decision.statutFinal,
      date: maintenant,
      message: decision.messageHistorique,
    });

    if (decision.appliquer) {
      decision.appliquer(paiement);
    }

    await mettreAJourPaiementEnBaseAvecClient(client, paiement);
    idNotification = await preparerNotificationWebhookEnTransaction(client, paiement, decision.evenement);
    await client.query("commit");
  } catch (erreur) {
    await client.query("rollback");
    throw erreur;
  } finally {
    client.release();
  }

  if (idNotification) {
    await traiterNotificationWebhook(idNotification);
  }

  const paiementActualise = (await trouverPaiement(idDecision)) || (await trouverPaiement(idPaiement));
  return reponseDecision(paiementActualise, decision.messageRetour, false);
}

async function renvoyerNotificationPaiement(idPaiement) {
  const paiement = await trouverPaiement(idPaiement);

  if (!paiement) {
    return { ok: false, codeHttp: 404, message: "Paiement introuvable." };
  }

  if (!paiement.urlWebhook) {
    return {
      ok: false,
      message: "Aucune URL de notification n'est configuree pour ce paiement.",
      paiement: paiementPublic(paiement),
      webhook: resumerWebhook(paiement),
    };
  }

  const evenement =
    paiement.statut === STATUTS_PAIEMENT.PAYE
      ? "paiement.paye"
      : paiement.statut === STATUTS_PAIEMENT.REFUSE
        ? "paiement.refuse"
        : "";

  if (!evenement) {
    return {
      ok: false,
      message: "La notification peut etre renvoyee seulement apres acceptation ou refus.",
      paiement: paiementPublic(paiement),
      webhook: resumerWebhook(paiement),
    };
  }

  const client = await poolBase.connect();
  let idNotification = null;

  try {
    await client.query("begin");
    const resultat = await client.query("select * from paiements where id = $1 for update", [idPaiement]);

    if (resultat.rowCount === 0) {
      await client.query("commit");
      return { ok: false, codeHttp: 404, message: "Paiement introuvable." };
    }

    idNotification = await preparerNotificationWebhookEnTransaction(
      client,
      convertirLignePaiement(resultat.rows[0]),
      evenement
    );
    await client.query("commit");
  } catch (erreur) {
    await client.query("rollback");
    throw erreur;
  } finally {
    client.release();
  }

  if (idNotification) {
    await traiterNotificationWebhook(idNotification);
  }

  const paiementActualise = await trouverPaiement(idPaiement);

  return {
    ok: true,
    message: "Notification renvoyee.",
    paiement: paiementPublic(paiementActualise),
    webhook: resumerWebhook(paiementActualise),
  };
}

function reponseDecision(paiement, message, dejaTraite) {
  return {
    ok: true,
    message,
    dejaTraite,
    paiement: paiementPublic(paiement),
    webhook: resumerWebhook(paiement),
  };
}

function resumerWebhook(paiement) {
  if (!paiement.urlWebhook) {
    return {
      statut: "NON_CONFIGURE",
      message: "Aucune notification configuree pour ce paiement.",
    };
  }

  if (!paiement.dernierWebhook) {
    return {
      statut: "NON_ENVOYE",
      message: "Aucune notification envoyee pour ce paiement.",
    };
  }

  if (paiement.dernierWebhook.statut) {
    const statut = paiement.dernierWebhook.statut;
    const tentatives = Number(paiement.dernierWebhook.tentatives || 0);
    const suffixeTentatives = tentatives > 0 ? ` Tentative(s): ${tentatives}.` : "";

    if (statut === "RECU") {
      return {
        statut,
        evenement: paiement.dernierWebhook.evenement || null,
        codeHttp: paiement.dernierWebhook.codeHttp || null,
        envoyeLe: paiement.dernierWebhook.envoyeLe || null,
        tentatives,
        message: `Notification recue par le site marchand.${suffixeTentatives}`,
      };
    }

    return {
      statut,
      evenement: paiement.dernierWebhook.evenement || null,
      codeHttp: paiement.dernierWebhook.codeHttp || null,
      erreur: paiement.dernierWebhook.erreur || null,
      envoyeLe: paiement.dernierWebhook.envoyeLe || null,
      prochainEssaiLe: paiement.dernierWebhook.prochainEssaiLe || null,
      tentatives,
      message: `Notification non confirmee.${suffixeTentatives}`,
    };
  }

  const codeHttp = Number(paiement.dernierWebhook.codeHttp);

  if (Number.isFinite(codeHttp)) {
    const recu = codeHttp >= 200 && codeHttp < 300;

    return {
      statut: recu ? "RECU" : "ECHEC_HTTP",
      evenement: paiement.dernierWebhook.evenement || null,
      codeHttp,
      envoyeLe: paiement.dernierWebhook.envoyeLe || null,
      message: recu
        ? `Notification recue par le site marchand. Code HTTP ${codeHttp}.`
        : `Notification envoyee, mais le site marchand a repondu HTTP ${codeHttp}.`,
    };
  }

  return {
    statut: "ECHEC_ENVOI",
    evenement: paiement.dernierWebhook.evenement || null,
    erreur: paiement.dernierWebhook.erreur || "Erreur de notification inconnue.",
    envoyeLe: paiement.dernierWebhook.envoyeLe || null,
    message: `Notification non confirmee: ${paiement.dernierWebhook.erreur || "erreur inconnue"}.`,
  };
}

async function verifierPreuve(donnees) {
  const alertes = [];
  const alertesCritiques = [];
  const controles = [];
  const typeDetecte = detecterTypeImage(donnees.image);
  const sha256 = crypto.createHash("sha256").update(donnees.image).digest("hex");
  const referenceNormalisee = donnees.referenceTransaction.toLowerCase();
  const moyenSelectionne = donnees.paiement.moyensPaiement.find((moyen) => {
    return moyen.code === donnees.moyenPaiement;
  });
  const moyenExiste = Boolean(moyenSelectionne);

  ajouterControle(controles, alertes, alertesCritiques, moyenExiste, "moyen_paiement_invalide", "Moyen de paiement", "Moyen de paiement invalide.", true);
  ajouterControle(controles, alertes, alertesCritiques, Boolean(donnees.referenceTransaction), "reference_obligatoire", "Reference paiement", "Reference de transaction manquante.", true);
  ajouterControle(controles, alertes, alertesCritiques, Number.isFinite(donnees.montantVu), "montant_vu_obligatoire", "Montant detecte", "Montant controle manquant.", true);
  ajouterControle(controles, alertes, alertesCritiques, donnees.montantVu === donnees.paiement.montant, "montant_different", "Montant attendu", "Le montant ne correspond pas au montant attendu.", true);
  ajouterControle(controles, alertes, alertesCritiques, Boolean(donnees.payeLe), "date_paiement_obligatoire", "Date serveur", "Date de paiement manquante.", true);
  ajouterControle(controles, alertes, alertesCritiques, Boolean(typeDetecte), "type_image_invalide", "Type image", "Le fichier n'est pas une image PNG, JPEG ou WebP valide.", true);
  ajouterControle(controles, alertes, alertesCritiques, donnees.image.length >= TAILLE_MIN_PREUVE, "image_trop_petite", "Taille minimale", "Justificatif trop petit pour etre controle.", true);
  ajouterControle(controles, alertes, alertesCritiques, donnees.image.length <= TAILLE_MAX_PREUVE, "image_trop_lourde", "Taille maximale", "Justificatif trop lourd.", true);

  const imageDejaUtilisee = donnees.paiements.some((paiement) => {
    return paiement.id !== donnees.paiement.id && paiement.preuve && paiement.preuve.sha256 === sha256;
  });
  ajouterControle(controles, alertes, alertesCritiques, !imageDejaUtilisee, "image_deja_utilisee", "Image unique", "Ce justificatif a deja ete utilise.", true);

  if (referenceNormalisee) {
    const referenceDejaUtilisee = donnees.paiements.some((paiement) => {
      return (
        paiement.id !== donnees.paiement.id &&
        paiement.preuve &&
        String(paiement.preuve.referenceTransaction || "").toLowerCase() === referenceNormalisee
      );
    });
    ajouterControle(controles, alertes, alertesCritiques, !referenceDejaUtilisee, "reference_deja_utilisee", "Reference unique", "Cette reference de paiement a deja ete utilisee.", true);
  }

  if (donnees.payeLe) {
    const datePaiement = new Date(donnees.payeLe);
    const maintenant = new Date();
    const dateCreation = new Date(donnees.paiement.creeLe);
    const dateValide = !Number.isNaN(datePaiement.getTime());
    const pasDansLeFutur = dateValide && datePaiement.getTime() <= maintenant.getTime() + 60_000;
    const pasAvantCreation = dateValide && datePaiement.getTime() >= dateCreation.getTime() - 24 * 60 * 60 * 1000;

    ajouterControle(controles, alertes, alertesCritiques, dateValide, "date_paiement_invalide", "Date valide", "Date de paiement invalide.", true);
    ajouterControle(controles, alertes, alertesCritiques, pasDansLeFutur, "date_paiement_future", "Date non future", "Date de paiement dans le futur.", true);
    ajouterControle(controles, alertes, alertesCritiques, pasAvantCreation, "date_trop_ancienne", "Date coherente", "Date trop ancienne par rapport a la creation du paiement.", false);
  }

  const extractionTexte = await analyserImagePreuve(donnees.image, donnees.paiement, moyenSelectionne);
  const ocrObligatoire = process.env.OCR_PREUVE_OBLIGATOIRE !== "false";
  const ocrDisponible = !extractionTexte.erreur;
  const fraudeDetectee = (extractionTexte.indicesFraude || []).length === 0;
  const montantOcrLisible = !extractionTexte.active || extractionTexte.montantDetecte !== null;
  const montantOcrCorrespond =
    !extractionTexte.active || extractionTexte.montantCorrespond === null ? true : extractionTexte.montantCorrespond;
  const provider = extractionTexte.conformiteProvider || {};
  const champsProvider = provider.champs || {};
  const referenceProvider = String(provider.referenceDetectee || "");
  const analyseForensique = extractionTexte.analyseForensique || {};
  const validationImage = analyseForensique.validationImage || {};
  const empreinteVisuelle = analyseForensique.empreinteVisuelle || null;
  const signauxForensiques = Array.isArray(analyseForensique.signaux) ? analyseForensique.signaux : [];
  const signauxForensiquesCritiques = signauxForensiques.filter((signal) => {
    return (
      signal.gravite === "CRITIQUE" &&
      !["image_decode_invalide", "image_pixels_trop_grands"].includes(signal.code)
    );
  });
  const signauxForensiquesSuspects = signauxForensiques.filter((signal) => {
    return signal.gravite === "ELEVE" || signal.gravite === "MOYEN";
  });
  const preuveVisuelleProche = trouverPreuveVisuelleProche(
    donnees.paiements,
    donnees.paiement.id,
    empreinteVisuelle,
    extractionTexte
  );
  const referenceProviderDejaUtilisee = referenceProvider
    ? donnees.paiements.some((paiement) => {
        return (
          paiement.id !== donnees.paiement.id &&
          paiement.preuve &&
          String(paiement.preuve.referenceTransaction || "").toLowerCase() === referenceProvider.toLowerCase()
        );
      })
    : false;

  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !ocrObligatoire || ocrDisponible,
    "ocr_indisponible",
    "Lecture OCR",
    "Le justificatif n'a pas pu etre lu automatiquement. Envoyez une capture plus nette.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !extractionTexte.active || signauxForensiquesCritiques.length === 0,
    "forensique_image_critique",
    "Traces forensiques critiques",
    signauxForensiquesCritiques[0]
      ? signauxForensiquesCritiques[0].message
      : "Le fichier contient des traces de generation IA ou d'edition externe.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !extractionTexte.active || signauxForensiquesSuspects.length === 0,
    "forensique_image_suspecte",
    "Traces forensiques suspectes",
    signauxForensiquesSuspects[0]
      ? signauxForensiquesSuspects[0].message
      : "Le fichier presente des indices techniques a verifier.",
    false
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !extractionTexte.active || !validationImage.erreur,
    "image_decode_invalide",
    "Decodage image",
    validationImage.erreur || "Le fichier image est invalide ou corrompu.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !extractionTexte.active || !validationImage.pixelsTropGrands,
    "image_pixels_trop_grands",
    "Limite pixels",
    "L'image contient trop de pixels pour etre controlee proprement.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !preuveVisuelleProche,
    "image_visuelle_deja_utilisee",
    "Empreinte visuelle unique",
    preuveVisuelleProche
      ? `Une preuve visuellement proche existe deja: ${preuveVisuelleProche.idPaiement}.`
      : "Une preuve visuellement proche existe deja.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !extractionTexte.active || (champsProvider.providerReconnu && champsProvider.providerCorrespond),
    "provider_non_conforme",
    "Provider officiel",
    "La capture ne correspond pas au provider selectionne.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !extractionTexte.active || champsProvider.structureConforme,
    "structure_provider_incomplete",
    "Structure du recu",
    "La capture ne contient pas les champs essentiels du recu officiel.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !extractionTexte.active || champsProvider.statutEffectue,
    "statut_provider_absent",
    "Statut effectue",
    "Le statut effectue n'a pas ete lu sur le justificatif.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !extractionTexte.active || champsProvider.telephoneCorrespond,
    "telephone_destinataire_different",
    "Numero destinataire",
    "Le numero destinataire lu ne correspond pas au compte marchand attendu.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !extractionTexte.active || champsProvider.dateCoherente,
    "date_recu_incoherente",
    "Date du recu",
    "La date du recu est absente ou trop eloignee de la creation du paiement.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !provider.referenceObligatoire || Boolean(referenceProvider),
    "reference_provider_absente",
    "Reference provider",
    "La reference du recu officiel n'a pas ete lue.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    !referenceProviderDejaUtilisee,
    "reference_provider_deja_utilisee",
    "Reference provider unique",
    "Cette reference provider a deja ete utilisee pour un autre paiement.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    fraudeDetectee,
    "contenu_test_fictif",
    "Mentions de simulation",
    "Le justificatif contient des mentions de test, simulation ou document fictif.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    montantOcrLisible,
    "montant_ocr_absent",
    "Montant lisible",
    "Le montant n'a pas ete lu clairement sur le justificatif.",
    true
  );
  ajouterControle(
    controles,
    alertes,
    alertesCritiques,
    montantOcrCorrespond,
    "montant_ocr_different",
    "Montant OCR",
    "Le montant lu sur le justificatif ne correspond pas au montant attendu.",
    true
  );

  const score = Math.max(0, 100 - alertesCritiques.length * 25 - (alertes.length - alertesCritiques.length) * 10);

  return {
    score,
    alertes,
    alertesCritiques,
    controles,
    typeDetecte,
    typeMime: typeDetecte ? `image/${typeDetecte}` : "application/octet-stream",
    sha256,
    empreinteVisuelle,
    preuveVisuelleProche,
    referenceTransactionProvider: referenceProvider,
    extractionTexte,
    peutAccepter: alertesCritiques.length === 0,
    verifieLe: new Date().toISOString(),
  };
}

function trouverErreurControlePreuve(verification) {
  const alertesCritiques = verification.alertesCritiques || [];

  if (alertesCritiques.length === 0) {
    return null;
  }

  const priorites = [
    "contenu_test_fictif",
    "forensique_image_critique",
    "image_deja_utilisee",
    "image_visuelle_deja_utilisee",
    "image_decode_invalide",
    "image_pixels_trop_grands",
    "provider_non_conforme",
    "structure_provider_incomplete",
    "telephone_destinataire_different",
    "montant_ocr_different",
    "montant_ocr_absent",
    "date_recu_incoherente",
    "reference_provider_absente",
    "reference_provider_deja_utilisee",
    "ocr_indisponible",
    "reference_deja_utilisee",
    "type_image_invalide",
    "image_trop_lourde",
    "image_trop_petite",
    "moyen_paiement_invalide",
  ];
  const alerte =
    priorites.map((code) => alertesCritiques.find((element) => element.code === code)).find(Boolean) ||
    alertesCritiques[0];
  const messages = {
    contenu_test_fictif:
      "Ce justificatif contient des mentions de test, simulation ou document fictif. Envoyez le recu reel du paiement.",
    forensique_image_critique:
      "Ce justificatif contient des traces techniques de generation IA ou d'edition externe. Envoyez le recu officiel original depuis l'application de paiement.",
    image_visuelle_deja_utilisee:
      "Ce justificatif ressemble trop a une preuve deja recue. Envoyez le recu original correspondant a cette commande.",
    image_decode_invalide:
      "Le fichier image est invalide ou corrompu. Envoyez une capture PNG, JPEG ou WebP lisible.",
    image_pixels_trop_grands:
      "L'image est trop grande en resolution. Envoyez une capture plus legere du recu complet.",
    provider_non_conforme:
      "La capture ne correspond pas au moyen de paiement selectionne. Envoyez un recu officiel depuis l'application du provider.",
    structure_provider_incomplete:
      "La capture ne contient pas les champs essentiels du recu officiel. Envoyez le recu complet depuis l'application.",
    telephone_destinataire_different:
      "Le numero destinataire lu sur le recu ne correspond pas au compte marchand attendu.",
    montant_ocr_different:
      "Le montant lu sur le justificatif ne couvre pas le montant marchand ou depasse la limite de frais autorisee. Envoyez le recu correspondant a cette commande.",
    montant_ocr_absent:
      "Le montant n'a pas ete lu clairement sur le justificatif. Envoyez une capture complete du recu.",
    date_recu_incoherente:
      "La date du recu est absente ou trop eloignee de la creation du paiement. Envoyez le recu de cette commande.",
    reference_provider_absente:
      "La reference du recu officiel n'a pas ete lue. Envoyez une capture complete du recu.",
    reference_provider_deja_utilisee:
      "Cette reference provider a deja ete utilisee pour un autre paiement. Envoyez le recu correspondant a cette commande.",
    ocr_indisponible:
      "Le justificatif n'a pas pu etre lu automatiquement. Envoyez une capture complete, nette et non floue.",
    image_deja_utilisee:
      "Ce justificatif a deja ete utilise pour un autre paiement. Envoyez le recu correspondant a cette commande.",
    reference_deja_utilisee:
      "Cette reference de paiement a deja ete utilisee. Verifiez le paiement ou contactez le marchand.",
    type_image_invalide: "Le justificatif doit etre une image PNG, JPEG ou WebP valide.",
    image_trop_lourde: "L'image est trop lourde. Envoyez une image PNG, JPEG ou WebP de moins de 5 Mo.",
    image_trop_petite: "L'image est trop petite ou illisible. Envoyez une capture complete du recu.",
    moyen_paiement_invalide: "Choisissez un moyen de paiement propose sur cette page.",
  };
  const code = String(alerte.code || "justificatif_refuse").toUpperCase();
  const codeHttp = ["image_deja_utilisee", "image_visuelle_deja_utilisee", "reference_deja_utilisee"].includes(alerte.code)
    ? 409
    : 422;

  return {
    ok: false,
    codeHttp,
    code,
    message: messages[alerte.code] || alerte.message || "Le justificatif ne peut pas etre accepte.",
  };
}

function ajouterAlerte(alertes, alertesCritiques, estValide, code, message, estCritique) {
  if (estValide) {
    return;
  }

  const alerte = { code, message, critique: estCritique };
  alertes.push(alerte);

  if (estCritique) {
    alertesCritiques.push(alerte);
  }
}

function ajouterControle(controles, alertes, alertesCritiques, estValide, code, libelle, message, estCritique) {
  controles.push({
    code,
    libelle,
    statut: estValide ? "VALIDE" : "ECHEC",
    critique: estCritique,
    message: estValide ? "Controle valide." : message,
  });

  ajouterAlerte(alertes, alertesCritiques, estValide, code, message, estCritique);
}

function trouverPreuveVisuelleProche(paiements, idPaiementCourant, empreinteCourante, extractionCourante) {
  if (!empreinteCourante || !empreinteCourante.phash) {
    return null;
  }

  const seuilPHash = lireNombreConfiguration("SEUIL_DISTANCE_PHASH", 8);
  const seuilDHash = lireNombreConfiguration("SEUIL_DISTANCE_DHASH", 32);
  const seuilAHash = lireNombreConfiguration("SEUIL_DISTANCE_AHASH", 38);
  const seuilTexte = lireNombreConfiguration("SEUIL_SIMILARITE_TEXTE_PREUVE", 0.82);

  for (const paiement of paiements) {
    if (paiement.id === idPaiementCourant || !paiement.preuve) {
      continue;
    }

    const empreinteExistante = obtenirEmpreinteVisuellePaiement(paiement);

    if (!empreinteExistante || !empreinteExistante.phash) {
      continue;
    }

    const distancePHash = distanceHammingHex(empreinteCourante.phash, empreinteExistante.phash);
    const distanceDHash = distanceHammingHex(empreinteCourante.dhash, empreinteExistante.dhash);
    const distanceAHash = distanceHammingHex(empreinteCourante.ahash, empreinteExistante.ahash);
    const procheParPHash = distancePHash !== null && distancePHash <= seuilPHash;
    const procheParHashesSecondaires =
      distanceDHash !== null &&
      distanceAHash !== null &&
      distanceDHash <= seuilDHash &&
      distanceAHash <= seuilAHash;

    if (!procheParPHash && !procheParHashesSecondaires) {
      continue;
    }

    const similariteTexte = similariteTextePreuve(extractionCourante, paiement.verification && paiement.verification.extractionTexte);

    if (similariteTexte < seuilTexte) {
      continue;
    }

    return {
      idPaiement: paiement.id,
      referenceTransaction: paiement.preuve.referenceTransaction || null,
      distancePHash,
      distanceDHash,
      distanceAHash,
      similariteTexte,
    };
  }

  return null;
}

function obtenirEmpreinteVisuellePaiement(paiement) {
  return (
    (paiement.preuve && paiement.preuve.empreinteVisuelle) ||
    (paiement.verification && paiement.verification.empreinteVisuelle) ||
    (paiement.verification &&
      paiement.verification.extractionTexte &&
      paiement.verification.extractionTexte.analyseForensique &&
      paiement.verification.extractionTexte.analyseForensique.empreinteVisuelle) ||
    null
  );
}

function distanceHammingHex(gauche, droite) {
  const a = String(gauche || "");
  const b = String(droite || "");

  if (!a || !b || a.length !== b.length || !/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) {
    return null;
  }

  let distance = 0;

  for (let index = 0; index < a.length; index += 1) {
    distance += compterBits(parseInt(a[index], 16) ^ parseInt(b[index], 16));
  }

  return distance;
}

function compterBits(valeur) {
  let total = 0;
  let courant = valeur;

  while (courant > 0) {
    total += courant & 1;
    courant >>= 1;
  }

  return total;
}

function similariteTextePreuve(extractionCourante, extractionExistante) {
  const gauche = motsSignificatifsPreuve(extractionCourante);
  const droite = motsSignificatifsPreuve(extractionExistante);

  if (gauche.size === 0 || droite.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const mot of gauche) {
    if (droite.has(mot)) {
      intersection += 1;
    }
  }

  const union = new Set([...gauche, ...droite]).size;

  return union === 0 ? 0 : Number((intersection / union).toFixed(3));
}

function motsSignificatifsPreuve(extraction) {
  const texte = normaliserTexteServeur(
    [
      extraction && extraction.texte,
      extraction && extraction.json ? JSON.stringify(extraction.json.provider || {}) : "",
      extraction && extraction.json ? JSON.stringify(extraction.json.montant || {}) : "",
    ].join(" ")
  );
  const mots = texte.match(/[a-z0-9_]{2,}/g) || [];

  return new Set(
    mots.filter((mot) => {
      return !["de", "du", "la", "le", "et", "ou", "un", "une", "des", "les", "avec", "pour"].includes(mot);
    })
  );
}

function normaliserTexteServeur(valeur) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function lireNombreConfiguration(nom, defaut) {
  const valeur = Number(process.env[nom]);

  return Number.isFinite(valeur) ? valeur : defaut;
}

async function marquerPaiementEnAttente(paiement) {
  if (paiement.statut !== STATUTS_PAIEMENT.CREE) {
    return paiement;
  }

  const maintenant = new Date().toISOString();
  paiement.statut = STATUTS_PAIEMENT.EN_ATTENTE_PAIEMENT;
  paiement.modifieLe = maintenant;
  paiement.historique.push({
    statut: STATUTS_PAIEMENT.EN_ATTENTE_PAIEMENT,
    date: maintenant,
    message: "Client arrive sur la page de paiement.",
  });

  await mettreAJourPaiementEnBase(paiement);
  return paiement;
}

async function preparerNotificationWebhookEnTransaction(client, paiement, evenement) {
  if (!paiement.urlWebhook) {
    return null;
  }

  const notificationExistante = await client.query(
    "select id, statut from notifications_webhook where id_paiement = $1 and evenement = $2",
    [paiement.id, evenement]
  );

  if (notificationExistante.rowCount > 0) {
    const notification = notificationExistante.rows[0];

    if (notification.statut !== "RECU") {
      await client.query(
        `
          update notifications_webhook
          set statut = 'EN_ATTENTE',
              prochain_essai_le = now(),
              modifie_le = now()
          where id = $1
        `,
        [notification.id]
      );
    }

    return notification.id;
  }

  const maintenant = new Date().toISOString();
  const idNotification = creerId("evt");
  const chargeUtile = creerChargeUtileWebhook(paiement, evenement, idNotification);

  await client.query(
    `
      insert into notifications_webhook (
        id,
        id_paiement,
        evenement,
        charge_utile,
        url_webhook,
        statut,
        prochain_essai_le,
        cree_le,
        modifie_le
      )
      values ($1, $2, $3, $4, $5, 'EN_ATTENTE', $6, $7, $8)
    `,
    [
      idNotification,
      paiement.id,
      evenement,
      JSON.stringify(chargeUtile),
      paiement.urlWebhook,
      maintenant,
      maintenant,
      maintenant,
    ]
  );

  return idNotification;
}

async function traiterNotificationWebhook(idNotification) {
  const resultat = await executerRequete(
    `
      select
        notifications_webhook.*,
        paiements.secret_webhook
      from notifications_webhook
      join paiements on paiements.id = notifications_webhook.id_paiement
      where notifications_webhook.id = $1
    `,
    [idNotification]
  );

  if (resultat.rowCount === 0) {
    return null;
  }

  const notification = resultat.rows[0];

  if (notification.statut === "RECU" || Number(notification.tentatives) >= maxTentativesWebhook) {
    return notification;
  }

  const corps = JSON.stringify(notification.charge_utile);
  const entetes = {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(corps),
    "x-evenement-paiement": notification.evenement,
    "x-id-evenement-paiement": notification.id,
  };

  if (notification.secret_webhook) {
    entetes["x-signature-paiement"] = crypto
      .createHmac("sha256", notification.secret_webhook)
      .update(corps)
      .digest("hex");
  }

  const tentatives = Number(notification.tentatives) + 1;
  let statut = "ECHEC_ENVOI";
  let codeHttp = null;
  let erreur = null;

  try {
    const reponse = await posterJson(notification.url_webhook, corps, entetes);
    codeHttp = reponse.codeHttp;
    statut = codeHttp >= 200 && codeHttp < 300 ? "RECU" : "ECHEC_HTTP";
  } catch (erreurEnvoi) {
    erreur = limiterTexte(erreurEnvoi.message || "Erreur de notification inconnue.", 240);
  }

  const maintenant = new Date().toISOString();
  const prochainEssaiLe =
    statut === "RECU" || tentatives >= maxTentativesWebhook
      ? null
      : new Date(Date.now() + delaiRetryWebhookSecondes * 1000 * Math.min(16, 2 ** (tentatives - 1))).toISOString();

  await executerRequete(
    `
      update notifications_webhook
      set statut = $2,
          tentatives = $3,
          dernier_code_http = $4,
          derniere_erreur = $5,
          prochain_essai_le = $6,
          envoye_le = $7,
          modifie_le = $8
      where id = $1
    `,
    [notification.id, statut, tentatives, codeHttp, erreur, prochainEssaiLe, maintenant, maintenant]
  );

  const dernierWebhook = {
    idNotification: notification.id,
    evenement: notification.evenement,
    statut,
    tentatives,
    codeHttp,
    erreur,
    prochainEssaiLe,
    envoyeLe: maintenant,
  };

  await executerRequete(
    `
      update paiements
      set dernier_webhook = $2,
          modifie_le = now()
      where id = $1
    `,
    [notification.id_paiement, JSON.stringify(dernierWebhook)]
  );

  return dernierWebhook;
}

async function traiterNotificationsEnAttente() {
  const resultat = await executerRequete(
    `
      select id
      from notifications_webhook
      where statut <> 'RECU'
        and tentatives < $1
        and (prochain_essai_le is null or prochain_essai_le <= now())
      order by prochain_essai_le nulls first, cree_le
      limit 10
    `,
    [maxTentativesWebhook]
  );

  for (const ligne of resultat.rows) {
    await traiterNotificationWebhook(ligne.id);
  }
}

function creerChargeUtileWebhook(paiement, evenement, idEvenement) {
  return {
    idEvenement,
    evenement,
    idPaiement: paiement.id,
    referencePaiement: paiement.referencePaiement,
    origine: paiement.origine || "api_marchand",
    idCommande: paiement.idCommande,
    idCommandeMarchand: paiement.idCommande,
    idClient: paiement.idClient,
    idClientMarchand: paiement.idClient,
    metadonnees: paiement.metadonnees || {},
    montant: paiement.montant,
    devise: paiement.devise,
    statut: paiement.statut,
    preuve: paiement.preuve
      ? {
          referenceTransaction: paiement.preuve.referenceTransaction,
          montantVu: paiement.preuve.montantVu,
          payeLe: paiement.preuve.payeLe,
          envoyeeLe: paiement.preuve.envoyeeLe,
          moyenPaiement: paiement.moyenChoisi,
        }
      : null,
    verification: paiement.verification
      ? {
          score: paiement.verification.score,
          alertesCritiques: paiement.verification.alertesCritiques || [],
        }
      : null,
    date: new Date().toISOString(),
  };
}

function posterJson(urlCible, corps, entetes) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlCible);
    const client = url.protocol === "https:" ? https : http;

    const requete = client.request(
      {
        method: "POST",
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        headers: entetes,
        timeout: 8000,
      },
      (reponse) => {
        reponse.resume();
        reponse.on("end", () => resolve({ codeHttp: reponse.statusCode }));
      }
    );

    requete.on("timeout", () => {
      requete.destroy(new Error("Delai webhook depasse."));
    });
    requete.on("error", reject);
    requete.write(corps);
    requete.end();
  });
}

function normaliserMoyensPaiement(valeur) {
  const moyens = Array.isArray(valeur) && valeur.length > 0 ? valeur : moyensPaiementParDefaut;

  return moyens
    .map((moyen) => ({
      code: String(moyen.code || "").trim().toLowerCase(),
      libelle: String(moyen.libelle || "").trim(),
      nomCompte: String(moyen.nomCompte || "").trim(),
      numeroCompte: String(moyen.numeroCompte || "").trim(),
      instructions: instructionMoyenPaiement(moyen),
    }))
    .filter((moyen) => moyen.code && moyen.libelle && moyen.numeroCompte);
}

function instructionMoyenPaiement(moyen) {
  const instructions = String(moyen.instructions || "").trim();

  if (instructions) {
    return instructions;
  }

  const code = String(moyen.code || "").toLowerCase();
  const libelle = String(moyen.libelle || "ce service").trim();

  if (code.includes("wave")) {
    return "Envoyez le montant de la commande en couvrant les frais Wave.";
  }

  if (code.includes("orange")) {
    return "Envoyez le montant de la commande en couvrant les frais Orange Money.";
  }

  return `Envoyez le montant de la commande en couvrant les frais ${libelle}.`;
}

function paiementPublic(paiement) {
  return {
    id: paiement.id,
    jetonPaiement: paiement.jetonClient,
    referencePaiement: creerReferencePaiement(paiement.id),
    idCommande: paiement.idCommande,
    idClient: paiement.idClient,
    montant: paiement.montant,
    devise: paiement.devise,
    statut: paiement.statut,
    moyensPaiement: paiement.moyensPaiement,
    urlPaiement: paiement.urlPaiement,
    urlSucces: paiement.urlSucces,
    urlAnnulation: paiement.urlAnnulation,
    urlRetour: paiement.urlRetour,
    moyenChoisi: paiement.moyenChoisi,
    preuve: paiement.preuve
      ? {
          nomFichier: paiement.preuve.nomFichier,
          referenceTransaction: paiement.preuve.referenceTransaction,
          montantVu: paiement.preuve.montantVu,
          payeLe: paiement.preuve.payeLe,
          envoyeeLe: paiement.preuve.envoyeeLe,
        }
      : null,
    verification: paiement.verification
      ? {
          score: paiement.verification.score,
          alertes: paiement.verification.alertes,
          controles: paiement.verification.controles || [],
          extractionTexte: paiement.verification.extractionTexte || null,
          peutAccepter: paiement.verification.peutAccepter,
          verifieLe: paiement.verification.verifieLe,
        }
      : null,
    historique: paiement.historique,
    raisonRefus: paiement.raisonRefus,
    creeLe: paiement.creeLe,
    modifieLe: paiement.modifieLe,
  };
}

function paiementMarchand(paiement) {
  const copie = {
    ...paiement,
    jetonPaiement: paiement.jetonClient,
    secretWebhook: undefined,
  };

  delete copie.secretWebhook;
  return copie;
}

async function creerPaiementEnBase(paiement) {
  await executerRequete(
    `
      insert into paiements (
        id,
        jeton_client,
        id_commande,
        id_client,
        metadonnees,
        montant,
        devise,
        statut,
        moyens_paiement,
        url_paiement,
        url_succes,
        url_annulation,
        url_retour,
        url_webhook,
        secret_webhook,
        moyen_choisi,
        preuve,
        verification,
        historique,
        raison_refus,
        dernier_webhook,
        cree_le,
        modifie_le,
        origine
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
    `,
    valeursPaiement(paiement)
  );
}

async function mettreAJourPaiementEnBase(paiement) {
  await mettreAJourPaiementEnBaseAvecClient(poolBase, paiement);
}

async function mettreAJourPaiementEnBaseAvecClient(client, paiement) {
  await client.query(
    `
      update paiements
      set
        jeton_client = $2,
        id_commande = $3,
        id_client = $4,
        metadonnees = $5,
        montant = $6,
        devise = $7,
        statut = $8,
        moyens_paiement = $9,
        url_paiement = $10,
        url_succes = $11,
        url_annulation = $12,
        url_retour = $13,
        url_webhook = $14,
        secret_webhook = $15,
        moyen_choisi = $16,
        preuve = $17,
        verification = $18,
        historique = $19,
        raison_refus = $20,
        dernier_webhook = $21,
        cree_le = $22,
        modifie_le = $23,
        origine = $24
      where id = $1
    `,
    valeursPaiement(paiement)
  );
}

function valeursPaiement(paiement) {
  return [
    paiement.id,
    paiement.jetonClient,
    paiement.idCommande,
    paiement.idClient,
    JSON.stringify(paiement.metadonnees || {}),
    paiement.montant,
    paiement.devise,
    paiement.statut,
    JSON.stringify(paiement.moyensPaiement),
    paiement.urlPaiement,
    paiement.urlSucces || null,
    paiement.urlAnnulation || null,
    paiement.urlRetour || null,
    paiement.urlWebhook || null,
    paiement.secretWebhook || null,
    paiement.moyenChoisi || null,
    paiement.preuve ? JSON.stringify(paiement.preuve) : null,
    paiement.verification ? JSON.stringify(paiement.verification) : null,
    JSON.stringify(paiement.historique),
    paiement.raisonRefus || null,
    paiement.dernierWebhook ? JSON.stringify(paiement.dernierWebhook) : null,
    paiement.creeLe,
    paiement.modifieLe,
    normaliserOriginePaiement(paiement.origine),
  ];
}

async function chargerPaiements() {
  const resultat = await executerRequete("select * from paiements order by cree_le desc");
  return resultat.rows.map(convertirLignePaiement);
}

async function trouverPaiement(idPaiement) {
  const resultat = await executerRequete("select * from paiements where id = $1", [idPaiement]);

  if (resultat.rowCount === 0) {
    return null;
  }

  return convertirLignePaiement(resultat.rows[0]);
}

async function trouverPaiementParAccesPublic(identifiant) {
  const resultat = await executerRequete(
    "select * from paiements where jeton_client = $1 or id = $1",
    [identifiant]
  );

  if (resultat.rowCount === 0) {
    return null;
  }

  return convertirLignePaiement(resultat.rows[0]);
}

function convertirLignePaiement(ligne) {
  return {
    id: ligne.id,
    jetonClient: ligne.jeton_client || ligne.id,
    referencePaiement: creerReferencePaiement(ligne.id),
    idCommande: ligne.id_commande,
    idClient: ligne.id_client,
    origine: normaliserOriginePaiement(ligne.origine || origineDepuisMetadonnees(ligne.metadonnees)),
    metadonnees: ligne.metadonnees || {},
    montant: Number(ligne.montant),
    devise: ligne.devise,
    statut: ligne.statut,
    moyensPaiement: ligne.moyens_paiement || [],
    urlPaiement: ligne.url_paiement,
    urlSucces: ligne.url_succes || "",
    urlAnnulation: ligne.url_annulation || "",
    urlRetour: ligne.url_retour || "",
    urlWebhook: ligne.url_webhook || "",
    secretWebhook: ligne.secret_webhook || "",
    moyenChoisi: ligne.moyen_choisi || null,
    preuve: ligne.preuve || null,
    verification: ligne.verification || null,
    historique: ligne.historique || [],
    raisonRefus: ligne.raison_refus || null,
    dernierWebhook: ligne.dernier_webhook || null,
    creeLe: convertirDateIso(ligne.cree_le),
    modifieLe: convertirDateIso(ligne.modifie_le),
  };
}

function convertirDateIso(valeur) {
  if (valeur instanceof Date) {
    return valeur.toISOString();
  }

  return new Date(valeur).toISOString();
}

function aAccesApplication(requete) {
  return requete.headers["x-cle-api"] === cleApiApplication;
}

function determinerOriginePaiement(requete) {
  const cleRequeteSandbox = String(requete && requete.headers["x-cle-origine-sandbox"] || "").trim();

  if (cleOrigineSandbox && cleRequeteSandbox && cleRequeteSandbox === cleOrigineSandbox) {
    return "sandbox";
  }

  return "api_marchand";
}

function normaliserOriginePaiement(valeur) {
  return valeur === "sandbox" ? "sandbox" : "api_marchand";
}

function origineDepuisMetadonnees(metadonnees) {
  if (!metadonnees || typeof metadonnees !== "object") {
    return "api_marchand";
  }

  return String(metadonnees.source || "").toLowerCase() === "sandbox" ? "sandbox" : "api_marchand";
}

function aAccesMarchand(requete, reponse) {
  if (requete.headers["x-cle-marchand"] === cleMarchand) {
    return true;
  }

  return Boolean(sessionMarchand.lireSession(requete, reponse));
}

async function compteMarchandExiste() {
  const resultat = await executerRequete("select 1 from comptes_marchands limit 1");
  return resultat.rowCount > 0;
}

async function chargerCompteMarchand(identifiant) {
  const identifiantNormalise = normaliserIdentifiantMarchand(identifiant);
  const resultat = await executerRequete(
    "select * from comptes_marchands where identifiant = $1",
    [identifiantNormalise]
  );

  if (resultat.rowCount === 0) {
    return null;
  }

  return resultat.rows[0];
}

function normaliserIdentifiantMarchand(identifiant) {
  const valeur = String(identifiant || "").trim().toLowerCase();

  if (/^[a-z0-9]{8}$/.test(valeur)) {
    return `marchand_${valeur}`;
  }

  return valeur;
}

async function authentifierCompteMarchand(corps) {
  const compte = await chargerCompteMarchand(corps.identifiant);

  if (!compte) {
    return false;
  }

  if (corps.modeConnexion === "code_2fa") {
    return verifierCodeTotp(compte.secret_2fa, corps.code2fa);
  }

  return verifierMotDePasse(corps.motDePasse, compte.mot_de_passe_hash);
}

async function creerCompteMarchand(identifiant, motDePasse, secret2fa) {
  const maintenant = new Date().toISOString();

  await executerRequete(
    `
      insert into comptes_marchands (
        identifiant,
        mot_de_passe_hash,
        secret_2fa,
        cree_le,
        modifie_le
      )
      values ($1, $2, $3, $4, $5)
    `,
    [identifiant, hacherMotDePasse(motDePasse), secret2fa, maintenant, maintenant]
  );
}

function hacherMotDePasse(motDePasse) {
  const sel = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(motDePasse), sel, 64);

  return `scrypt$${sel.toString("hex")}$${hash.toString("hex")}`;
}

function verifierMotDePasse(motDePasse, hashStocke) {
  const morceaux = String(hashStocke || "").split("$");

  if (morceaux.length !== 3 || morceaux[0] !== "scrypt") {
    return false;
  }

  const sel = Buffer.from(morceaux[1], "hex");
  const hashAttendu = Buffer.from(morceaux[2], "hex");
  const hashRecu = crypto.scryptSync(String(motDePasse || ""), sel, hashAttendu.length);

  if (hashRecu.length !== hashAttendu.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashRecu, hashAttendu);
}

async function afficherEtapeInitialisation2fa(requete, reponse, erreur) {
  const initialisation = obtenirOuCreerInitialisationMarchand(requete, reponse);
  const uri = creerUriTotp(initialisation);
  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    margin: 1,
    width: 240,
    color: {
      dark: "#172026",
      light: "#ffffff",
    },
  });

  return afficherInitialisationMarchand({
    etape: "2fa",
    qrCodeDataUrl,
    secret2fa: initialisation.secret2fa,
    cleInstallationDemandee: Boolean(cleInstallationMarchand),
    erreur,
  });
}

function afficherEtapeCreationCompte(initialisation, erreur) {
  return afficherInitialisationMarchand({
    etape: "compte",
    identifiant: initialisation.identifiant,
    erreur,
  });
}

function obtenirOuCreerInitialisationMarchand(requete, reponse) {
  const existante = obtenirInitialisationMarchand(requete);

  if (existante) {
    ajouterCookie(reponse, construireCookieInitialisation(existante.jeton, 15 * 60));
    return existante;
  }

  const initialisation = {
    jeton: creerJeton("init"),
    identifiant: `marchand_${genererCodeMarchandCourt()}`,
    secret2fa: genererSecretBase32(),
    code2faValide: false,
    expireLe: Date.now() + 15 * 60 * 1000,
  };

  initialisationsMarchand.set(initialisation.jeton, initialisation);
  ajouterCookie(reponse, construireCookieInitialisation(initialisation.jeton, 15 * 60));
  return initialisation;
}

function genererCodeMarchandCourt() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";

  for (const octet of crypto.randomBytes(8)) {
    code += alphabet[octet % alphabet.length];
  }

  return code;
}

function obtenirInitialisationMarchand(requete) {
  nettoyerInitialisationsMarchand();
  const cookies = lireCookiesHttp(requete);
  const jeton = cookies[NOM_COOKIE_INITIALISATION];
  const initialisation = initialisationsMarchand.get(jeton);

  if (!initialisation || initialisation.expireLe <= Date.now()) {
    initialisationsMarchand.delete(jeton);
    return null;
  }

  initialisation.expireLe = Date.now() + 15 * 60 * 1000;
  return initialisation;
}

function nettoyerInitialisationsMarchand() {
  const maintenant = Date.now();

  for (const [jeton, initialisation] of initialisationsMarchand.entries()) {
    if (!initialisation || initialisation.expireLe <= maintenant) {
      initialisationsMarchand.delete(jeton);
    }
  }
}

function creerUriTotp(initialisation) {
  const emetteur = "Paie Server";
  const libelle = `${emetteur}:${initialisation.identifiant}`;
  const parametres = new URLSearchParams({
    secret: initialisation.secret2fa,
    issuer: emetteur,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return `otpauth://totp/${encodeURIComponent(libelle)}?${parametres.toString()}`;
}

function genererSecretBase32() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let secret = "";

  for (const octet of crypto.randomBytes(20)) {
    bits += octet.toString(2).padStart(8, "0");
  }

  for (let index = 0; index < bits.length; index += 5) {
    secret += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }

  return secret;
}

function validerMotDePasseInitialisation(motDePasse, confirmation) {
  const motDePasseTexte = String(motDePasse || "");

  if (motDePasseTexte.length < 12) {
    return "Le mot de passe doit contenir au moins 12 caracteres.";
  }

  if (motDePasseTexte !== String(confirmation || "")) {
    return "Les deux mots de passe ne correspondent pas.";
  }

  return "";
}

function construireCookieInitialisation(valeur, maxAge) {
  const morceaux = [
    `${NOM_COOKIE_INITIALISATION}=${encodeURIComponent(valeur || "")}`,
    "Path=/marchand/initialisation",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Number(maxAge) || 0)}`,
  ];

  if (process.env.COOKIE_SECURISE === "true" || urlBase.startsWith("https://") || estProduction()) {
    morceaux.push("Secure");
  }

  return morceaux.join("; ");
}

function lireCookiesHttp(requete) {
  const entete = String(requete.headers.cookie || "");
  const cookies = {};

  for (const morceau of entete.split(";")) {
    const index = morceau.indexOf("=");

    if (index === -1) {
      continue;
    }

    const nom = morceau.slice(0, index).trim();
    const valeur = morceau.slice(index + 1).trim();

    if (nom) {
      cookies[nom] = decodeURIComponent(valeur);
    }
  }

  return cookies;
}

function ajouterCookie(reponse, cookie) {
  const courant = reponse.getHeader("set-cookie");

  if (!courant) {
    reponse.setHeader("set-cookie", cookie);
    return;
  }

  if (Array.isArray(courant)) {
    reponse.setHeader("set-cookie", [...courant, cookie]);
    return;
  }

  reponse.setHeader("set-cookie", [courant, cookie]);
}

function lireCorpsJson(requete) {
  return new Promise((resolve, reject) => {
    let corps = "";

    requete.on("data", (morceau) => {
      corps += morceau.toString();

      if (Buffer.byteLength(corps) > TAILLE_MAX_JSON) {
        const erreur = new Error("La requete est trop volumineuse. Envoyez une image plus legere.");
        erreur.codeHttp = 413;
        erreur.code = "REQUETE_TROP_VOLUMINEUSE";
        requete.destroy();
        reject(erreur);
      }
    });

    requete.on("end", () => {
      if (!corps) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(corps));
      } catch {
        const erreur = new Error("Demande invalide.");
        erreur.codeHttp = 400;
        erreur.code = "JSON_INVALIDE";
        reject(erreur);
      }
    });

    requete.on("error", reject);
  });
}

function lireCorpsFormulaire(requete) {
  return lireCorpsTexte(requete).then((corps) => {
    const parametres = new URLSearchParams(corps);
    const donnees = {};

    for (const [cle, valeur] of parametres.entries()) {
      donnees[cle] = valeur;
    }

    return donnees;
  });
}

function lireCorpsTexte(requete) {
  return new Promise((resolve, reject) => {
    let corps = "";

    requete.on("data", (morceau) => {
      corps += morceau.toString();

      if (Buffer.byteLength(corps) > 64 * 1024) {
        const erreur = new Error("La requete est trop volumineuse.");
        erreur.codeHttp = 413;
        erreur.code = "REQUETE_TROP_VOLUMINEUSE";
        requete.destroy();
        reject(erreur);
      }
    });

    requete.on("end", () => resolve(corps));
    requete.on("error", reject);
  });
}

function decoderImageBase64(valeur) {
  const texte = String(valeur || "");
  const contenu = texte.includes(",") ? texte.split(",").pop() : texte;

  if (!contenu || !/^[a-zA-Z0-9+/=\s]+$/.test(contenu)) {
    return null;
  }

  return Buffer.from(contenu.replace(/\s/g, ""), "base64");
}

function detecterTypeImage(image) {
  if (image.length < 12) {
    return null;
  }

  if (image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) {
    return "jpeg";
  }

  if (image[0] === 0x89 && image[1] === 0x50 && image[2] === 0x4e && image[3] === 0x47) {
    return "png";
  }

  if (image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }

  return null;
}

function nettoyerUrl(valeur) {
  const texte = String(valeur || "").trim();

  if (!texte) {
    return "";
  }

  try {
    const url = new URL(texte);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function validerUrlsPaiement(corps) {
  const urlSucces = validerUrlMarchand(corps.urlSucces, "urlSucces");
  const urlAnnulation = validerUrlMarchand(corps.urlAnnulation, "urlAnnulation");
  const urlRetour = validerUrlMarchand(corps.urlRetour, "urlRetour");
  const urlWebhook = validerUrlMarchand(corps.urlWebhook, "urlWebhook");
  const urls = [urlSucces, urlAnnulation, urlRetour, urlWebhook];
  const invalide = urls.find((element) => !element.ok);

  if (invalide) {
    return invalide;
  }

  const retourFinal = urlRetour.url || urlAnnulation.url;
  const urlsRetourClient = [urlSucces.url, urlAnnulation.url, retourFinal].filter(Boolean);

  if (urlWebhook.url && urlsRetourClient.includes(urlWebhook.url)) {
    return {
      ok: false,
      message:
        "urlWebhook doit etre differente des URLs de retour client. Utilisez une URL serveur dediee a la notification.",
    };
  }

  return {
    ok: true,
    urlSucces: urlSucces.url,
    urlAnnulation: urlAnnulation.url,
    urlRetour: retourFinal,
    urlWebhook: urlWebhook.url,
  };
}

function validerUrlMarchand(valeur, nomChamp) {
  const texte = String(valeur || "").trim();

  if (!texte) {
    return { ok: true, url: "" };
  }

  let url;

  try {
    url = new URL(texte);
  } catch {
    return { ok: false, message: `${nomChamp} doit etre une URL valide.` };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, message: `${nomChamp} doit utiliser http ou https.` };
  }

  if (estProduction()) {
    if (url.protocol !== "https:") {
      return { ok: false, message: `${nomChamp} doit utiliser HTTPS en production.` };
    }

    if (hostnameLocalOuPrive(url.hostname)) {
      return {
        ok: false,
        message: `${nomChamp} ne peut pas utiliser localhost, une IP privee ou un domaine local en production.`,
      };
    }
  }

  return { ok: true, url: url.toString() };
}

function estProduction() {
  return environnementExecution === "production";
}

function hostnameLocalOuPrive(hostname) {
  const hote = String(hostname || "").toLowerCase();

  if (
    hote === "localhost" ||
    hote === "::1" ||
    hote.endsWith(".local") ||
    hote.endsWith(".localhost")
  ) {
    return true;
  }

  if (/^127\./.test(hote) || /^10\./.test(hote) || /^192\.168\./.test(hote)) {
    return true;
  }

  const match172 = hote.match(/^172\.(\d+)\./);

  if (match172) {
    const secondOctet = Number(match172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function construireUrlRetourAbandon(paiement) {
  if (paiement.urlAnnulation) {
    return paiement.urlAnnulation;
  }

  if (!paiement.urlRetour) {
    return "";
  }

  try {
    const url = new URL(paiement.urlRetour);
    url.searchParams.set("retour", "envoi-abandonne");

    if (paiement.idCommande) {
      url.searchParams.set("commande", paiement.idCommande);
    }

    return url.toString();
  } catch {
    return paiement.urlRetour;
  }
}

function normaliserUrlPublique(valeur, portDefaut) {
  const texte = String(valeur || "").trim();

  if (!texte) {
    return `http://localhost:${portDefaut}`;
  }

  const avecProtocole = /^https?:\/\//i.test(texte) ? texte : `https://${texte}`;

  try {
    const url = new URL(avecProtocole);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return `http://localhost:${portDefaut}`;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return `http://localhost:${portDefaut}`;
  }
}

function creerId(prefixe) {
  return `${prefixe}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function creerJeton(prefixe) {
  return `${prefixe}_${crypto.randomBytes(24).toString("base64url")}`;
}

function creerReferencePaiement(idPaiement) {
  const empreinte = crypto.createHash("sha256").update(idPaiement).digest("hex").slice(0, 8);
  return `REF-${empreinte.toUpperCase()}`;
}

function cheminPaiement(paiement) {
  return `/paiement/${encodeURIComponent(paiement.jetonClient || paiement.id)}`;
}

function normaliserMetadonnees(valeur) {
  if (!valeur || typeof valeur !== "object" || Array.isArray(valeur)) {
    return {};
  }

  const texte = JSON.stringify(valeur);

  if (Buffer.byteLength(texte) > 16 * 1024) {
    return {};
  }

  return JSON.parse(texte);
}

function limiterTexte(valeur, tailleMax) {
  const texte = String(valeur || "");

  if (texte.length <= tailleMax) {
    return texte;
  }

  return `${texte.slice(0, tailleMax - 3)}...`;
}

function preparerDossiers() {
  fs.mkdirSync(dossierPreuves, { recursive: true });
}

function supprimerFichierSiPossible(cheminFichier) {
  try {
    if (fs.existsSync(cheminFichier)) {
      fs.unlinkSync(cheminFichier);
    }
  } catch {
    return;
  }
}

function envoyerJson(reponse, codeHttp, donnees) {
  const corps = JSON.stringify(donnees, null, 2);
  reponse.writeHead(codeHttp, {
    "content-type": "application/json; charset=utf-8",
  });
  reponse.end(corps);
}

function envoyerHtml(reponse, codeHttp, html) {
  reponse.writeHead(codeHttp, {
    "content-type": "text/html; charset=utf-8",
  });
  reponse.end(html);
}

function envoyerTexte(reponse, codeHttp, texte) {
  reponse.writeHead(codeHttp, {
    "content-type": "text/plain; charset=utf-8",
  });
  reponse.end(texte);
}

function envoyerImagePreuve(reponse, nomFichierStocke) {
  const nomSur = path.basename(nomFichierStocke || "");
  const cheminFichier = path.join(dossierPreuves, nomSur);

  if (!nomSur || !fs.existsSync(cheminFichier)) {
    return envoyerTexte(reponse, 404, "Image introuvable.");
  }

  const extension = path.extname(nomSur).toLowerCase();
  const typeMime = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";

  reponse.writeHead(200, { "content-type": typeMime });
  fs.createReadStream(cheminFichier).pipe(reponse);
}
