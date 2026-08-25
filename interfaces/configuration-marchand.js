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

function afficherConfigurationMarchand(champs, options = {}) {
  const groupes = grouperDefinitions(champs);
  const diagnostics = diagnosticsConfiguration(champs);
  const message = options.retabli
    ? afficherMessageRetablissement()
    : options.enregistre
      ? afficherMessageEnregistrement()
      : "";
  const erreur = options.erreur
    ? `<p class="retour-action erreur">${echapperHtml(options.erreur)}</p>`
    : "";

  return pageHtml("Configuration marchand", `
    <main>
      <div class="titre-ligne">
        <div>
          <p class="badge-modale">Configuration</p>
          <h1>Configuration marchand</h1>
          <p class="description-section">
            Modifiez ici ce que le client voit, les comptes de paiement, les cles donnees aux sites externes,
            les notifications, les controles de recus et le site de test. Les reglages de demarrage restent dans .env.
          </p>
        </div>
        <div class="actions">
          <a class="bouton-lien secondaire" href="/marchand">Tableau</a>
          <a class="bouton-lien secondaire" href="/marchand/documentation">Documentation</a>
        </div>
      </div>

      ${message}
      ${erreur}
      ${afficherDiagnostics(diagnostics)}

      <section class="boite statut-configuration">
        <h2>Application des changements</h2>
        <p>
          Les reglages de cette page sont enregistres dans la base de donnees de Paie Server.
          Ils sont utilises automatiquement pour les prochains paiements, les prochaines preuves
          et les prochaines notifications.
        </p>
        <p>
          Vous n'avez pas besoin de relancer Docker apres avoir clique sur
          <strong>Enregistrer la configuration</strong>.
        </p>
        <form
          method="post"
          action="/marchand/configuration/retablir-sandbox"
          class="formulaire-retablissement"
          data-confirmation-action
          data-confirmation-badge="Configuration sandbox"
          data-confirmation-titre="Retablir le sandbox Docker local"
          data-confirmation-texte="Retablir les adresses essentielles du sandbox Docker local ? Les cles et les comptes de paiement ne seront pas modifies."
          data-confirmation-bouton="Retablir"
        >
          <button type="submit" class="bouton-secondaire">Retablir le sandbox Docker local</button>
          <span>Remet les adresses de test et l'ID client de demo. Ne modifie aucune cle.</span>
        </form>
      </section>

      <form method="post" action="/marchand/configuration" class="formulaire-configuration">
        ${groupes.map(afficherGroupe).join("")}
        <div class="barre-actions">
          <button type="submit">Enregistrer la configuration</button>
          <a class="bouton-lien secondaire" href="/marchand">Annuler</a>
        </div>
      </form>

      <section class="boite">
        <h2>Ce qui reste dans .env</h2>
        <p class="description-section">
          Ces valeurs servent a demarrer le serveur, exposer les ports ou joindre PostgreSQL.
          Elles ne peuvent pas dependre d'une configuration stockee dans cette meme base.
        </p>
        <div class="liste-technique">
          ${VARIABLES_TECHNIQUES.map(afficherVariableTechnique).join("")}
        </div>
      </section>
    </main>

    <div id="modaleConfirmationAction" class="modale" hidden role="dialog" aria-modal="true" aria-labelledby="titreModaleConfirmation">
      <div class="modale-fond" data-fermer-confirmation></div>
      <section class="modale-contenu" tabindex="-1">
        <p id="badgeModaleConfirmation" class="badge-modale">Confirmation</p>
        <h2 id="titreModaleConfirmation">Confirmer l'action</h2>
        <p id="texteModaleConfirmation"></p>
        <div class="actions modale-actions">
          <button type="button" class="bouton-secondaire" data-annuler-confirmation>Annuler</button>
          <button type="button" id="boutonConfirmerAction">Confirmer</button>
        </div>
      </section>
    </div>

    <script>
      const modaleConfirmationAction = document.getElementById("modaleConfirmationAction");
      const badgeModaleConfirmation = document.getElementById("badgeModaleConfirmation");
      const titreModaleConfirmation = document.getElementById("titreModaleConfirmation");
      const texteModaleConfirmation = document.getElementById("texteModaleConfirmation");
      const boutonConfirmerAction = document.getElementById("boutonConfirmerAction");
      const boutonAnnulerConfirmation = modaleConfirmationAction.querySelector("[data-annuler-confirmation]");
      const fondConfirmation = modaleConfirmationAction.querySelector("[data-fermer-confirmation]");
      let formulaireConfirmationActif = null;

      document.addEventListener("click", gererActionSecret);
      document.addEventListener("submit", gererConfirmationAction);
      document.addEventListener("keydown", gererToucheConfirmation);
      boutonAnnulerConfirmation.addEventListener("click", () => fermerConfirmationAction(false));
      fondConfirmation.addEventListener("click", () => fermerConfirmationAction(false));
      boutonConfirmerAction.addEventListener("click", () => fermerConfirmationAction(true));

      function gererActionSecret(evenement) {
        const bouton = evenement.target.closest("button[data-generer-secret], button[data-afficher-secret], button[data-copier-secret]");

        if (!bouton) {
          return;
        }

        const zone = bouton.closest(".champ-secret");
        const champ = zone.querySelector("[data-secret-input]");
        const message = zone.querySelector("[data-message-copie]");

        if (bouton.matches("[data-generer-secret]")) {
          champ.value = genererCle(champ.dataset.secretPrefix || "cle");
          champ.type = "text";
          zone.querySelector("[data-afficher-secret]").textContent = "Masquer";
          champ.focus();
          champ.select();
          message.hidden = true;
          return;
        }

        if (bouton.matches("[data-afficher-secret]")) {
          const afficher = champ.type === "password";
          champ.type = afficher ? "text" : "password";
          bouton.textContent = afficher ? "Masquer" : "Afficher";
          message.hidden = true;
          return;
        }

        if (bouton.matches("[data-copier-secret]")) {
          copierTexte(champ.value).then(() => {
            message.textContent = champ.value ? "Nouvelle cle copiee." : "Aucune nouvelle cle a copier.";
            message.hidden = false;
          });
        }
      }

      function genererCle(prefixe) {
        const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const octets = new Uint8Array(32);
        crypto.getRandomValues(octets);
        let secret = "";

        for (const octet of octets) {
          secret += alphabet[octet % alphabet.length];
        }

        return prefixe + "_" + secret;
      }

      async function copierTexte(texte) {
        if (!texte) {
          return;
        }

        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(texte);
          return;
        }

        const zoneTexte = document.createElement("textarea");
        zoneTexte.value = texte;
        zoneTexte.setAttribute("readonly", "");
        zoneTexte.style.position = "fixed";
        zoneTexte.style.left = "-9999px";
        document.body.appendChild(zoneTexte);
        zoneTexte.select();
        document.execCommand("copy");
        document.body.removeChild(zoneTexte);
      }

      function gererConfirmationAction(evenement) {
        const formulaire = evenement.target.closest("form[data-confirmation-action]");

        if (!formulaire || formulaire.dataset.confirmationValidee === "1") {
          return;
        }

        evenement.preventDefault();
        formulaireConfirmationActif = formulaire;
        badgeModaleConfirmation.textContent = formulaire.dataset.confirmationBadge || "Confirmation";
        titreModaleConfirmation.textContent = formulaire.dataset.confirmationTitre || "Confirmer l'action";
        texteModaleConfirmation.textContent = formulaire.dataset.confirmationTexte || "Confirmer cette action ?";
        boutonConfirmerAction.textContent = formulaire.dataset.confirmationBouton || "Confirmer";
        boutonConfirmerAction.className = formulaire.dataset.confirmationClasse || "";
        modaleConfirmationAction.hidden = false;
        window.setTimeout(() => boutonConfirmerAction.focus(), 0);
      }

      function fermerConfirmationAction(confirmee) {
        const formulaire = formulaireConfirmationActif;
        formulaireConfirmationActif = null;
        modaleConfirmationAction.hidden = true;

        if (!confirmee || !formulaire) {
          return;
        }

        formulaire.dataset.confirmationValidee = "1";
        formulaire.submit();
      }

      function gererToucheConfirmation(evenement) {
        if (modaleConfirmationAction.hidden || evenement.key !== "Escape") {
          return;
        }

        evenement.preventDefault();
        fermerConfirmationAction(false);
      }
    </script>
  `, { themeInterface: options.themeInterface });
}

function afficherMessageRetablissement() {
  return `
    <div class="retour-action succes">
      <strong>Sandbox Docker local retabli.</strong>
      <p>
        Les adresses essentielles du sandbox ont ete remises avec les valeurs locales Docker.
        Les cles, les secrets et les comptes de paiement n'ont pas ete modifies.
        Aucun redemarrage Docker n'est necessaire.
      </p>
    </div>
  `;
}

function afficherMessageEnregistrement() {
  return `
    <div class="retour-action succes">
      <strong>Configuration mise a jour.</strong>
      <p>
        Les nouvelles valeurs sont enregistrees dans la base de donnees de Paie Server.
        Elles s'appliquent maintenant aux prochains paiements et aux prochains appels du sandbox.
        Aucun redemarrage Docker n'est necessaire.
      </p>
    </div>
  `;
}

function afficherDiagnostics(diagnostics) {
  if (diagnostics.length === 0) {
    return "";
  }

  return `
    <section class="boite diagnostic-configuration">
      <h2>Points a verifier</h2>
      ${diagnostics.map((diagnostic) => `<p>${echapperHtml(diagnostic)}</p>`).join("")}
    </section>
  `;
}

function diagnosticsConfiguration(champs) {
  const valeurs = new Map(champs.map((champ) => [champ.cle, String(champ.valeur || "").trim()]));
  const diagnostics = [];
  const urlApiSandbox = valeurs.get("URL_API_PAIEMENT_INTERNE") || "";
  const urlWebhookSandbox = valeurs.get("URL_SANDBOX_WEBHOOK") || "";
  const cleApplication = valeurs.get("CLE_API_APPLICATION") || "";
  const cleSandbox = valeurs.get("CLE_API_SANDBOX") || "";

  if (urlApiSandbox.includes("paie-server-application:") && !urlApiSandbox.includes("paie-server-application:3000")) {
    diagnostics.push("Le sandbox utilise une adresse Docker de Paie Server avec le mauvais port. Dans Docker, utilisez http://paie-server-application:3000.");
  }

  if (urlWebhookSandbox.includes("paie-server-sandbox:") && !urlWebhookSandbox.includes("paie-server-sandbox:4000")) {
    diagnostics.push("Le webhook du sandbox utilise une adresse Docker avec le mauvais port. Dans Docker, utilisez http://paie-server-sandbox:4000/webhook/paiement.");
  }

  if (!cleSandbox) {
    diagnostics.push("La cle de creation du sandbox est vide. Le sandbox ne pourra pas creer de paiement tant que la meme cle que 'Cle pour creer des paiements' n'est pas collee dans le champ sandbox.");
  } else if (cleApplication && cleSandbox !== cleApplication) {
    diagnostics.push("La cle de creation du sandbox est differente de la cle pour creer des paiements. Le sandbox risque de recevoir 'Cle API application invalide'.");
  }

  return diagnostics;
}

function afficherGroupe(groupe) {
  return `
    <section class="boite section-configuration">
      <h2>${echapperHtml(groupe.section)}</h2>
      ${afficherAideGroupe(groupe.section)}
      <div class="liste-configuration">
        ${groupe.champs.map(afficherChamp).join("")}
      </div>
    </section>
  `;
}

function afficherAideGroupe(section) {
  if (section === "Application publique") {
    return `
      <div class="aide-configuration">
        <p>
          Cette adresse est celle que le client ouvre pour payer. En local avec Docker, c'est
          <strong>http://localhost:7821</strong>. En production, c'est votre domaine public,
          par exemple <strong>https://pay.votre-domaine.com</strong>.
        </p>
      </div>
    `;
  }

  if (section === "Sandbox") {
    return `
      <div class="aide-configuration">
        <p>
          Le sandbox est un faux site marchand. Il utilise trois adresses differentes:
          l'adresse a ouvrir dans le navigateur, l'adresse qu'il utilise pour demander un paiement,
          et l'adresse ou Paie Server envoie la notification apres acceptation ou refus.
        </p>
        <p>
          Les adresses qui commencent par <strong>paie-server-...</strong> servent seulement entre
          les conteneurs Docker. Elles ne sont pas les adresses a donner aux clients.
        </p>
        <p>
          Pour un vrai site marchand, une seule URL de retour client suffit. Paie Server gere deja
          les pages preuve recue, preuve non recue et echec d'envoi; si le client abandonne,
          il peut etre renvoye vers la meme URL avec <strong>retour=envoi-abandonne</strong>.
          Apres reception du justificatif, Paie Server utilise aussi cette URL avec
          <strong>retour=preuve-envoyee</strong>. Dans les deux cas, le parametre
          <strong>commande</strong> est ajoute pour retrouver la commande cote site marchand.
          Une URL d'annulation separee reste possible, mais elle est optionnelle.
        </p>
      </div>
    `;
  }

  return "";
}

function afficherChamp(champ) {
  const valeur = champ.secret ? "" : champ.valeur;
  const source = champ.configureeEnBase ? "Configure" : "Valeur par defaut";
  const obligation = champ.obligatoire
    ? `<span class="indicateur-obligatoire">Obligatoire</span>`
    : "";
  const controle = champ.secret
    ? afficherChampSecret(champ)
    : champ.type === "boolean"
      ? afficherChampBooleen(champ)
      : champ.cle === "THEME_INTERFACE"
        ? afficherChampThemeInterface(valeur)
        : champ.type === "select"
        ? afficherChampSelection(champ, valeur)
        : champ.type === "textarea"
          ? afficherChampTextarea(champ, valeur)
          : afficherChampTexte(champ, valeur);

  return `
    <article class="champ-configuration">
      <div class="champ-configuration-entete">
        <div>
          <label for="${echapperHtml(champ.cle)}">${echapperHtml(champ.libelle)}</label>
        </div>
        <div class="badges-configuration">
          ${obligation}
          <span>${echapperHtml(source)}</span>
        </div>
      </div>
      ${controle}
      <p>${echapperHtml(champ.description)}</p>
      <p><strong>Exemple de valeur:</strong> ${echapperHtml(champ.exemple)}</p>
      <p><strong>A quoi ca sert:</strong> ${echapperHtml(champ.scenario)}</p>
    </article>
  `;
}

function afficherChampSelection(champ, valeur) {
  const options = Array.isArray(champ.options) ? champ.options : [];
  const required = champ.obligatoire ? "required" : "";
  const lignes = options
    .map((option) => {
      const selectionnee = option.valeur === valeur ? "selected" : "";
      const libelle = option.description
        ? `${option.libelle} - ${option.description}`
        : option.libelle;

      return `<option value="${echapperHtml(option.valeur)}" ${selectionnee}>${echapperHtml(libelle)}</option>`;
    })
    .join("");

  return `
    <select id="${echapperHtml(champ.cle)}" name="${echapperHtml(champ.cle)}" ${required}>
      ${lignes}
    </select>
  `;
}

function afficherChampThemeInterface(valeur) {
  return `
    <div class="grille-themes-interface">
      ${THEMES_INTERFACE.map((theme) => afficherOptionThemeInterface(theme, valeur)).join("")}
    </div>
  `;
}

function afficherOptionThemeInterface(theme, valeur) {
  const couleurs = couleursThemeInterface(theme.code);
  const coche = theme.code === valeur ? "checked" : "";
  const echantillons = [
    couleurs.fond,
    couleurs.surface,
    couleurs.primaire,
    couleurs.accent,
    couleurs.secondaire,
  ];

  return `
    <label class="option-theme-interface">
      <input class="radio-theme-interface" type="radio" name="THEME_INTERFACE" value="${echapperHtml(theme.code)}" ${coche} required>
      <span class="echantillons-theme-interface" aria-hidden="true">
        ${echantillons.map((couleur) => `<span style="background: ${echapperHtml(couleur)}"></span>`).join("")}
      </span>
      <span class="texte-theme-interface">
        <strong>${echapperHtml(theme.libelle)}</strong>
        <small>${echapperHtml(theme.description)}</small>
      </span>
    </label>
  `;
}

function afficherChampTexte(champ, valeur) {
  const type = champ.type === "url" ? "url" : champ.type === "number" ? "number" : "text";
  const required = champ.obligatoire ? "required" : "";
  const attributsNombre = champ.type === "number"
    ? [
        champ.min === undefined ? "" : `min="${echapperHtml(champ.min)}"`,
        champ.max === undefined ? "" : `max="${echapperHtml(champ.max)}"`,
        `step="${echapperHtml(champ.step || "1")}"`,
      ].filter(Boolean).join(" ")
    : "";

  return `
    <input
      id="${echapperHtml(champ.cle)}"
      name="${echapperHtml(champ.cle)}"
      type="${type}"
      value="${echapperHtml(valeur)}"
      placeholder="${echapperHtml(champ.exemple)}"
      ${required}
      ${attributsNombre}
    >
  `;
}

function afficherChampTextarea(champ, valeur) {
  const required = champ.obligatoire ? "required" : "";

  return `
    <textarea
      id="${echapperHtml(champ.cle)}"
      name="${echapperHtml(champ.cle)}"
      rows="3"
      placeholder="${echapperHtml(champ.exemple)}"
      ${required}
    >${echapperHtml(valeur)}</textarea>
  `;
}

function afficherChampBooleen(champ) {
  const coche = String(champ.valeur).toLowerCase() === "true" ? "checked" : "";

  return `
    <label class="interrupteur-configuration">
      <input id="${echapperHtml(champ.cle)}" name="${echapperHtml(champ.cle)}" type="checkbox" ${coche}>
      <span>Actif</span>
    </label>
  `;
}

function afficherChampSecret(champ) {
  const estCopieSandbox = champ.cle === "CLE_API_SANDBOX";
  const boutonGenerer = estCopieSandbox
    ? ""
    : `<button type="button" class="bouton-secondaire" data-generer-secret>Generer une nouvelle cle</button>`;
  const placeholder = estCopieSandbox
    ? "Coller ici la cle pour creer des paiements"
    : "Coller une nouvelle cle ou en generer une";
  const aide = estCopieSandbox
    ? "Laissez vide pour garder la valeur actuelle. Pour tester comme un vrai site externe, collez ici la cle pour creer des paiements."
    : "Laissez vide pour garder la valeur actuelle. Generez ou collez une nouvelle cle seulement si vous voulez la remplacer.";

  return `
    <div class="champ-secret">
      <p class="secret-masque">Valeur actuelle: <strong>${echapperHtml(champ.valeurMasquee)}</strong></p>
      <input
        id="${echapperHtml(champ.cle)}"
        name="${echapperHtml(champ.cle)}"
        type="password"
        autocomplete="off"
        data-secret-input
        data-secret-prefix="${echapperHtml(prefixeSecret(champ.cle))}"
        placeholder="${echapperHtml(placeholder)}"
      >
      <div class="actions-secret">
        ${boutonGenerer}
        <button type="button" class="bouton-secondaire" data-afficher-secret>Afficher</button>
        <button type="button" class="bouton-secondaire" data-copier-secret>Copier</button>
      </div>
      <p class="aide-champ">
        ${echapperHtml(aide)}
      </p>
      <p class="message-copie" data-message-copie hidden>Nouvelle cle copiee.</p>
    </div>
  `;
}

function prefixeSecret(cle) {
  const prefixes = {
    CLE_API_APPLICATION: "paie",
    CLE_API_SANDBOX: "paie_test",
    CLE_MARCHAND: "admin",
    CLE_ORIGINE_SANDBOX: "test",
    SECRET_WEBHOOK_SANDBOX: "whsec",
  };

  return prefixes[cle] || "cle";
}

function afficherVariableTechnique(variable) {
  return `
    <article>
      <code>${echapperHtml(variable.cle)}</code>
      <p>${echapperHtml(variable.raison)}</p>
    </article>
  `;
}

module.exports = afficherConfigurationMarchand;
