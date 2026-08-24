const { executerRequete } = require("./base-de-donnees");
const {
  OPTIONS_THEME_INTERFACE,
  valeurThemeInterface,
} = require("./interfaces/themes");

const DEFINITIONS_CONFIGURATION = [
  {
    section: "Comptes de paiement",
    cle: "NOM_COMPTE_WAVE",
    libelle: "Nom du compte Wave",
    type: "text",
    defaut: "Nom du marchand",
    description: "Nom que le client doit voir dans son application Wave au moment d'envoyer l'argent.",
    exemple: "Boutique KELKUN",
    scenario: "Mettez le nom exact du compte marchand. Si le client voit un autre nom dans Wave, il doit arreter le paiement.",
  },
  {
    section: "Comptes de paiement",
    cle: "NUMERO_COMPTE_WAVE",
    libelle: "Numero Wave",
    type: "text",
    defaut: "+2250000000000",
    description: "Numero Wave sur lequel le client doit envoyer l'argent.",
    exemple: "+2250700000000",
    scenario: "Ce numero est affiche au client. Il est aussi compare avec le numero lu sur le recu pour eviter les paiements envoyes au mauvais compte.",
  },
  {
    section: "Comptes de paiement",
    cle: "INSTRUCTIONS_COMPTE_WAVE",
    libelle: "Instructions Wave",
    type: "textarea",
    defaut: "Envoyez le montant de la commande en couvrant les frais Wave.",
    description: "Message affiche au client sous le choix Wave.",
    exemple: "Envoyez le montant marchand en couvrant les frais Wave.",
    scenario: "Utilisez ce texte pour expliquer simplement quoi faire: montant a envoyer, frais a couvrir, reference a mettre en note si l'application le propose.",
  },
  {
    section: "Comptes de paiement",
    cle: "NOM_COMPTE_ORANGE",
    libelle: "Nom du compte Orange Money",
    type: "text",
    defaut: "Nom du marchand",
    description: "Nom que le client doit voir dans Orange Money ou Maxi It au moment d'envoyer l'argent.",
    exemple: "Boutique KELKUN",
    scenario: "Mettez le nom exact du compte marchand. Si le client voit un autre beneficiaire, il doit arreter le paiement.",
  },
  {
    section: "Comptes de paiement",
    cle: "NUMERO_COMPTE_ORANGE",
    libelle: "Numero Orange Money",
    type: "text",
    defaut: "+2250000000000",
    description: "Numero Orange Money sur lequel le client doit envoyer l'argent.",
    exemple: "+2250500000000",
    scenario: "Ce numero est affiche au client. Il est aussi compare avec le numero lu sur le recu Maxi It pour eviter les erreurs de destinataire.",
  },
  {
    section: "Comptes de paiement",
    cle: "INSTRUCTIONS_COMPTE_ORANGE",
    libelle: "Instructions Orange Money",
    type: "textarea",
    defaut: "Envoyez le montant de la commande en couvrant les frais Orange Money.",
    description: "Message affiche au client sous le choix Orange Money.",
    exemple: "Envoyez le montant marchand en couvrant les frais Orange Money.",
    scenario: "Utilisez ce texte pour demander un recu complet avec montant, date, reference et numero beneficiaire visibles.",
  },
  {
    section: "Application publique",
    cle: "URL_PUBLIQUE_APPLICATION",
    libelle: "URL publique de Paie Server",
    type: "url",
    obligatoire: true,
    defaut: "http://localhost:7821",
    description: "Adresse que le client et le site marchand doivent pouvoir ouvrir pour arriver sur Paie Server.",
    exemple: "https://pay.votre-domaine.com",
    scenario: "En Docker local, utilisez http://localhost:7821: c'est le port visible sur votre machine. En production, mettez le vrai domaine public, par exemple https://pay.votre-domaine.com. Ne mettez pas http://paie-server-application:3000 ici: cette adresse est reservee aux conteneurs Docker.",
  },
  {
    section: "Apparence",
    cle: "THEME_INTERFACE",
    libelle: "Theme global de l'interface",
    type: "select",
    defaut: "paie_clair",
    options: OPTIONS_THEME_INTERFACE,
    description: "Theme visuel applique a Paie Server, au parcours client, au tableau marchand, a la configuration et au sandbox.",
    exemple: "paie_clair",
    scenario: "Choisissez le theme qui s'accorde le mieux avec votre site ou votre application. Le client ne choisit rien: ce reglage marchand s'applique partout.",
  },
  {
    section: "Acces API",
    cle: "CLE_API_APPLICATION",
    libelle: "Cle pour creer des paiements",
    type: "secret",
    defaut: "cle_application_dev",
    secret: true,
    description: "Mot de passe donne au site ou a l'application qui doit creer des paiements sur Paie Server.",
    exemple: "paie_live_une_valeur_longue_aleatoire",
    scenario: "A donner seulement au serveur du site marchand. Ne jamais mettre cette cle dans une page client, une app publique ou une capture d'ecran. Si elle est remplacee, le site marchand devra utiliser la nouvelle valeur pour continuer a creer des paiements.",
  },
  {
    section: "Acces API",
    cle: "CLE_MARCHAND",
    libelle: "Cle d'administration API",
    type: "secret",
    defaut: "cle_marchand_dev",
    secret: true,
    description: "Mot de passe donne a un service de gestion externe pour consulter ou piloter les paiements sans ouvrir le tableau marchand.",
    exemple: "marchand_live_une_valeur_longue_aleatoire",
    scenario: "A donner uniquement a vos propres outils de gestion. Elle permet de lister les paiements, consulter leur etat, accepter, refuser ou renvoyer une notification. Ne jamais la donner a un client.",
  },
  {
    section: "Notifications webhook",
    cle: "MAX_TENTATIVES_WEBHOOK",
    libelle: "Nombre maximum d'envois de notification",
    type: "number",
    defaut: "5",
    min: 1,
    max: 20,
    description: "Nombre de fois ou Paie Server essaie de prevenir le site marchand apres une acceptation ou un refus.",
    exemple: "5",
    scenario: "Si le site marchand ne repond pas, Paie Server recommence plus tard. Cela evite de perdre une decision de paiement pendant une courte panne.",
  },
  {
    section: "Notifications webhook",
    cle: "DELAI_RETRY_WEBHOOK_SECONDES",
    libelle: "Attente avant de renvoyer une notification",
    type: "number",
    defaut: "60",
    min: 5,
    max: 86400,
    description: "Temps d'attente, en secondes, avant une nouvelle tentative si le site marchand n'a pas recu la notification.",
    exemple: "60",
    scenario: "60 veut dire: attendre environ une minute avant de reessayer. Gardez une valeur courte pour que les commandes se mettent a jour rapidement apres une panne.",
  },
  {
    section: "Controle des justificatifs",
    cle: "OCR_PREUVE_ACTIVE",
    libelle: "Lecture automatique des recus",
    type: "boolean",
    defaut: "true",
    description: "Permet a Paie Server de lire le texte du recu envoye par le client.",
    exemple: "true",
    scenario: "Gardez actif pour verifier le montant, le numero destinataire, la date et la reference du recu. Desactivez seulement si vous voulez tout verifier manuellement.",
  },
  {
    section: "Controle des justificatifs",
    cle: "OCR_PREUVE_OBLIGATOIRE",
    libelle: "Lecture automatique obligatoire",
    type: "boolean",
    defaut: "true",
    description: "Refuse le recu si Paie Server n'arrive pas a le lire correctement.",
    exemple: "true",
    scenario: "Gardez actif si vous voulez eviter les captures floues ou incompletes. Si vous le desactivez, plus de recus arriveront au tableau marchand, mais vous devrez les verifier vous-meme.",
  },
  {
    section: "Controle des justificatifs",
    cle: "OCR_ZONES_ACTIVE",
    libelle: "Lecture renforcee du recu",
    type: "boolean",
    defaut: "true",
    description: "Demande a Paie Server de relire certaines parties importantes du recu.",
    exemple: "true",
    scenario: "Utile pour mieux retrouver le montant, la date, la reference ou le numero sur les recus mobiles.",
  },
  {
    section: "Controle des justificatifs",
    cle: "TOLERANCE_FRAIS_MONTANT_POURCENT",
    libelle: "Frais acceptes au-dessus du montant",
    type: "number",
    defaut: "30",
    min: 0,
    max: 100,
    description: "Marge acceptee quand le client paie un peu plus que le prix pour couvrir les frais du service.",
    exemple: "30",
    scenario: "Exemple: pour une commande de 15000 XOF, la valeur 30 accepte un recu entre 15000 et 19500 XOF. Un montant plus bas que 15000 XOF est refuse.",
  },
  {
    section: "Controle des justificatifs",
    cle: "MAX_PIXELS_PREUVE",
    libelle: "Taille maximale de l'image du recu",
    type: "number",
    defaut: "6000000",
    min: 100000,
    max: 50000000,
    description: "Limite les images trop grandes pour garder le controle rapide et stable.",
    exemple: "6000000",
    scenario: "Une capture d'ecran mobile normale passe. Une image enorme, mal exportee ou trop lourde peut etre refusee.",
  },
  {
    section: "Controle des justificatifs",
    cle: "SEUIL_DISTANCE_PHASH",
    libelle: "Detection de recu deja utilisee",
    type: "number",
    defaut: "8",
    min: 0,
    max: 64,
    description: "Reglage principal pour repérer si un client essaie de reutiliser une image deja envoyee.",
    exemple: "8",
    scenario: "Gardez la valeur par defaut sauf si vous voyez trop de recus bloques a tort ou trop de doublons qui passent.",
  },
  {
    section: "Controle des justificatifs",
    cle: "SEUIL_DISTANCE_DHASH",
    libelle: "Detection de recu recadree",
    type: "number",
    defaut: "32",
    min: 0,
    max: 256,
    description: "Aide a repérer un recu deja utilise mais legerement recadre ou modifie.",
    exemple: "32",
    scenario: "Ce reglage complete la detection principale. Gardez la valeur par defaut si vous n'avez pas de cas concret a corriger.",
  },
  {
    section: "Controle des justificatifs",
    cle: "SEUIL_DISTANCE_AHASH",
    libelle: "Detection de recu similaire",
    type: "number",
    defaut: "38",
    min: 0,
    max: 256,
    description: "Aide a comparer l'apparence generale des recus deja envoyes.",
    exemple: "38",
    scenario: "Ajustez seulement si les controles de recus proches sont trop stricts ou pas assez stricts.",
  },
  {
    section: "Controle des justificatifs",
    cle: "SEUIL_SIMILARITE_TEXTE_PREUVE",
    libelle: "Texte minimum pour confirmer un doublon",
    type: "number",
    defaut: "0.82",
    min: 0,
    max: 1,
    step: "0.01",
    description: "Aide a confirmer qu'une image proche est vraiment le meme recu, en comparant aussi le texte lu.",
    exemple: "0.82",
    scenario: "Evite de bloquer deux recus qui se ressemblent visuellement mais qui ne concernent pas la meme transaction.",
  },
  {
    section: "Controle des justificatifs",
    cle: "DELAI_RECU_AVANT_CREATION_HEURES",
    libelle: "Recus crees avant la commande",
    type: "number",
    defaut: "12",
    min: 0,
    max: 168,
    description: "Nombre d'heures acceptees si le recu semble avoir ete cree avant la demande de paiement.",
    exemple: "12",
    scenario: "Utile si un client paie juste avant de lancer la commande. Un recu trop ancien reste refuse.",
  },
  {
    section: "Sandbox",
    cle: "URL_SANDBOX_PUBLIC",
    libelle: "Adresse du site de test dans le navigateur",
    type: "url",
    obligatoire: true,
    defaut: "http://localhost:7822",
    description: "Adresse a ouvrir dans votre navigateur pour utiliser le site de demonstration.",
    exemple: "http://localhost:7822",
    scenario: "En Docker local, gardez http://localhost:7822. Pour tester depuis un telephone ou une autre machine, mettez une adresse que cet appareil peut ouvrir.",
  },
  {
    section: "Sandbox",
    cle: "URL_API_PAIEMENT_INTERNE",
    libelle: "Adresse que le site de test utilise pour joindre Paie Server",
    type: "url",
    obligatoire: true,
    defaut: "http://paie-server-application:3000",
    description: "Adresse utilisee par le sandbox pour demander a Paie Server de creer un paiement.",
    exemple: "http://paie-server-application:3000",
    scenario: "Si le sandbox tourne dans le meme Docker Compose que Paie Server, gardez http://paie-server-application:3000. C'est une adresse interne Docker: elle ne sert pas au navigateur. Si le site de test tourne hors Docker mais sur la meme machine, utilisez l'adresse visible de Paie Server, par exemple http://localhost:7821.",
  },
  {
    section: "Sandbox",
    cle: "CLE_API_SANDBOX",
    libelle: "Cle de creation utilisee par le site de test",
    type: "secret",
    defaut: "",
    secret: true,
    description: "Copie manuelle de la cle que le site de test utilise pour demander la creation d'un paiement.",
    exemple: "paie_live_une_valeur_longue_aleatoire",
    scenario: "Pour tester comme un vrai site externe, collez ici la meme valeur que la cle pour creer des paiements. Si cette cle est vide ou fausse, le sandbox ne pourra pas creer de paiement.",
  },
  {
    section: "Sandbox",
    cle: "URL_SANDBOX_WEBHOOK",
    libelle: "Adresse ou Paie Server notifie le site de test",
    type: "url",
    obligatoire: true,
    defaut: "http://paie-server-sandbox:4000/webhook/paiement",
    description: "Adresse appelee par Paie Server apres acceptation ou refus du paiement.",
    exemple: "http://paie-server-sandbox:4000/webhook/paiement",
    scenario: "Dans Docker, gardez http://paie-server-sandbox:4000/webhook/paiement. Pour un vrai site marchand, ce role correspond a PAIE_SERVER_URL_WEBHOOK dans la configuration du site marchand, par exemple https://votre-site.com/webhook/paie-server.",
  },
  {
    section: "Sandbox",
    cle: "CLE_ORIGINE_SANDBOX",
    libelle: "Cle du mode test",
    type: "secret",
    defaut: "",
    secret: true,
    description: "Mot de passe utilise uniquement par le site de test pour dire: ce paiement est une demonstration.",
    exemple: "sandbox_une_valeur_longue_aleatoire",
    scenario: "Ne donnez pas cette cle a un vrai site marchand. Elle sert a separer les tests des vrais paiements.",
  },
  {
    section: "Sandbox",
    cle: "SECRET_WEBHOOK_SANDBOX",
    libelle: "Secret de notification du site de test",
    type: "secret",
    defaut: "secret_sandbox_dev",
    secret: true,
    description: "Mot de passe partage entre Paie Server et le site de test pour verifier que les notifications sont bien legitimes.",
    exemple: "whsec_sandbox_une_valeur_longue",
    scenario: "Si quelqu'un envoie un faux message au site de test, ce secret permet de le refuser.",
  },
  {
    section: "Sandbox",
    cle: "ID_CLIENT_SANDBOX",
    libelle: "Client utilise dans le site de test",
    type: "text",
    defaut: "client_sandbox_demo",
    description: "Nom du client fictif utilise quand le site de test cree une commande.",
    exemple: "client_sandbox_demo",
    scenario: "Pratique pour retrouver facilement les paiements de demonstration dans le tableau marchand.",
  },
];

const VARIABLES_TECHNIQUES = [
  {
    cle: "PORT",
    raison: "Numero utilise par Paie Server pour demarrer. Il doit etre connu avant l'ouverture de l'interface.",
  },
  {
    cle: "PORT_PUBLIC_APPLICATION",
    raison: "Numero d'acces expose par Docker pour ouvrir Paie Server depuis la machine ou le VPS.",
  },
  {
    cle: "PORT_PUBLIC_SANDBOX",
    raison: "Numero d'acces expose par Docker pour ouvrir le site de test.",
  },
  {
    cle: "PORT_SANDBOX",
    raison: "Numero utilise par le site de test pour demarrer.",
  },
  {
    cle: "ENVIRONNEMENT",
    raison: "Indique si l'installation est en test ou en production. En production, Paie Server applique des protections plus strictes.",
  },
  {
    cle: "HOTE_BASE_DE_DONNEES",
    raison: "Adresse de la base de donnees. Paie Server doit la connaitre avant de pouvoir lire la configuration.",
  },
  {
    cle: "PORT_BASE_DE_DONNEES",
    raison: "Numero d'acces de la base de donnees.",
  },
  {
    cle: "NOM_BASE_DE_DONNEES",
    raison: "Nom de la base ou Paie Server stocke les paiements et la configuration.",
  },
  {
    cle: "UTILISATEUR_BASE_DE_DONNEES",
    raison: "Nom du compte utilise par Paie Server pour ouvrir la base de donnees.",
  },
  {
    cle: "MOT_DE_PASSE_BASE_DE_DONNEES",
    raison: "Mot de passe de la base de donnees. Il doit rester dans .env car il sert justement a ouvrir la base.",
  },
  {
    cle: "MAX_CONNEXIONS_BASE_DE_DONNEES",
    raison: "Nombre maximum de connexions ouvertes vers la base. La valeur par defaut suffit pour commencer.",
  },
  {
    cle: "SECRET_SESSION_MARCHAND",
    raison: "Secret qui protege la connexion au tableau marchand. Le changer deconnecte les utilisateurs connectes.",
  },
  {
    cle: "COOKIE_SECURISE",
    raison: "Option de securite pour les connexions navigateur. A activer quand Paie Server est servi en HTTPS.",
  },
  {
    cle: "DUREE_SESSION_MARCHAND_MINUTES",
    raison: "Temps d'inactivite avant deconnecter automatiquement le marchand.",
  },
  {
    cle: "CLE_INSTALLATION_MARCHAND",
    raison: "Mot de passe optionnel demande seulement lors de la toute premiere creation du compte marchand.",
  },
];

const CLES_RETABLISSEMENT_SANDBOX_DOCKER = [
  "URL_PUBLIQUE_APPLICATION",
  "URL_SANDBOX_PUBLIC",
  "URL_API_PAIEMENT_INTERNE",
  "URL_SANDBOX_WEBHOOK",
  "ID_CLIENT_SANDBOX",
];

function lireDefinition(cle) {
  return DEFINITIONS_CONFIGURATION.find((definition) => definition.cle === cle) || null;
}

async function chargerConfigurationApplication() {
  const lignes = await lireLignesConfiguration();
  const valeursBase = new Map(lignes.map((ligne) => [ligne.cle, ligne.valeur]));
  const configuration = {};

  for (const definition of DEFINITIONS_CONFIGURATION) {
    configuration[definition.cle] = valeurEffective(definition, valeursBase);
  }

  return configuration;
}

async function chargerConfigurationPourInterface() {
  const lignes = await lireLignesConfiguration();
  const valeursBase = new Map(lignes.map((ligne) => [ligne.cle, ligne.valeur]));

  return DEFINITIONS_CONFIGURATION.map((definition) => {
    const valeurStockee = valeursBase.get(definition.cle);
    const valeur = valeurEffective(definition, valeursBase);

    return {
      ...definition,
      valeur,
      valeurStockee: valeurStockee === undefined ? "" : valeurStockee,
      configureeEnBase: valeurStockee !== undefined,
      valeurMasquee: definition.secret ? masquerSecret(valeur) : "",
    };
  });
}

async function enregistrerConfigurationApplication(valeurs) {
  const maintenant = new Date().toISOString();

  for (const definition of DEFINITIONS_CONFIGURATION) {
    const cle = definition.cle;
    const doitVider = valeurs[`vider_${cle}`] === "on";
    let valeur = valeurs[cle];

    if (definition.secret && !doitVider && !String(valeur || "").trim()) {
      continue;
    }

    if (definition.type === "boolean") {
      valeur = valeurs[cle] === "on" ? "true" : "false";
    } else if (doitVider) {
      valeur = "";
    } else {
      valeur = String(valeur || "").trim();
    }

    valeur = normaliserValeur(definition, valeur);

    await executerRequete(
      `
        insert into configuration_application (cle, valeur, est_secret, modifie_le)
        values ($1, $2, $3, $4)
        on conflict (cle)
        do update set valeur = excluded.valeur,
                      est_secret = excluded.est_secret,
                      modifie_le = excluded.modifie_le
      `,
      [cle, valeur, Boolean(definition.secret), maintenant]
    );
  }
}

async function retablirConfigurationSandboxDocker() {
  const maintenant = new Date().toISOString();
  const clesRetablies = [];

  for (const cle of CLES_RETABLISSEMENT_SANDBOX_DOCKER) {
    const definition = lireDefinition(cle);

    if (!definition || definition.secret) {
      continue;
    }

    const valeur = normaliserValeur(definition, definition.defaut);

    await executerRequete(
      `
        insert into configuration_application (cle, valeur, est_secret, modifie_le)
        values ($1, $2, $3, $4)
        on conflict (cle)
        do update set valeur = excluded.valeur,
                      est_secret = excluded.est_secret,
                      modifie_le = excluded.modifie_le
      `,
      [cle, valeur, false, maintenant]
    );

    clesRetablies.push(cle);
  }

  return clesRetablies;
}

function grouperDefinitions(definitions) {
  const groupes = [];

  for (const definition of definitions) {
    let groupe = groupes.find((element) => element.section === definition.section);

    if (!groupe) {
      groupe = { section: definition.section, champs: [] };
      groupes.push(groupe);
    }

    groupe.champs.push(definition);
  }

  return groupes;
}

function valeurConfiguration(configuration, cle, defaut = "") {
  const definition = lireDefinition(cle);

  if (!definition) {
    return String(configuration && configuration[cle] !== undefined ? configuration[cle] : process.env[cle] || defaut);
  }

  return String(configuration && configuration[cle] !== undefined ? configuration[cle] : valeurEnv(definition, defaut));
}

function booleenConfiguration(configuration, cle, defaut = false) {
  const valeur = valeurConfiguration(configuration, cle, defaut ? "true" : "false").toLowerCase();
  return valeur === "true" || valeur === "1" || valeur === "oui" || valeur === "on";
}

function nombreConfiguration(configuration, cle, defaut) {
  const valeur = Number(valeurConfiguration(configuration, cle, defaut));
  return Number.isFinite(valeur) ? valeur : defaut;
}

function valeurEffective(definition, valeursBase) {
  if (valeursBase.has(definition.cle)) {
    return valeursBase.get(definition.cle);
  }

  return valeurEnv(definition, definition.defaut);
}

function valeurEnv(definition, defaut) {
  const valeur = String(process.env[definition.cle] || "").trim();

  if (valeur) {
    return valeur;
  }

  return String(defaut || "");
}

function normaliserValeur(definition, valeur) {
  if (definition.obligatoire && !String(valeur || "").trim()) {
    return String(definition.defaut || "");
  }

  if (definition.cle === "THEME_INTERFACE") {
    return valeurThemeInterface(valeur);
  }

  if (definition.type === "select") {
    const options = Array.isArray(definition.options) ? definition.options : [];
    const valeurNormalisee = String(valeur || "").trim();
    const optionExiste = options.some((option) => option.valeur === valeurNormalisee);

    return optionExiste ? valeurNormalisee : String(definition.defaut || "");
  }

  if (definition.type !== "number") {
    return valeur;
  }

  const nombre = Number(valeur);

  if (!Number.isFinite(nombre)) {
    return String(definition.defaut || "0");
  }

  const minimum = definition.min === undefined ? nombre : Number(definition.min);
  const maximum = definition.max === undefined ? nombre : Number(definition.max);

  return String(Math.min(maximum, Math.max(minimum, nombre)));
}

async function lireLignesConfiguration() {
  try {
    const resultat = await executerRequete("select cle, valeur, est_secret from configuration_application");
    return resultat.rows;
  } catch (erreur) {
    if (erreur && erreur.code === "42P01") {
      return [];
    }

    throw erreur;
  }
}

function masquerSecret(valeur) {
  const texte = String(valeur || "");

  if (!texte) {
    return "Non configure";
  }

  if (texte.length <= 6) {
    return "******";
  }

  return `${"*".repeat(Math.min(12, texte.length - 4))}${texte.slice(-4)}`;
}

module.exports = {
  DEFINITIONS_CONFIGURATION,
  VARIABLES_TECHNIQUES,
  chargerConfigurationApplication,
  chargerConfigurationPourInterface,
  enregistrerConfigurationApplication,
  retablirConfigurationSandboxDocker,
  grouperDefinitions,
  valeurConfiguration,
  booleenConfiguration,
  nombreConfiguration,
};
