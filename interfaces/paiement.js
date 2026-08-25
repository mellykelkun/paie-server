const { pageHtml, echapperHtml, formaterMontant } = require("./commun");

function afficherPaiement(paiement, options = {}) {
  const moyens = paiement.moyensPaiement.map(afficherMethodePaiement).join("");
  const statutClient = libelleStatutClient(paiement.statut);

  return pageHtml("Paiement securise", `
    <main class="page-paiement-client">
      <section class="entete-paiement-client">
        <div>
          <p class="badge-modale">Paiement securise</p>
          <h1>Reglez votre commande</h1>
          <p>
            Payez directement le marchand avec l'application de votre choix,
            puis ajoutez ici le recu officiel pour validation.
          </p>
        </div>
        <div class="montant-client">
          <span>Montant a payer</span>
          <strong>${formaterMontant(paiement.montant, paiement.devise)}</strong>
        </div>
      </section>

      <section class="resume-paiement-client">
        <div>
          <span>Commande</span>
          <strong>${echapperHtml(paiement.idCommande)}</strong>
        </div>
        <div>
          <span>Reference a indiquer</span>
          <strong>${echapperHtml(paiement.referencePaiement)}</strong>
        </div>
        <div>
          <span>Etat</span>
          <strong id="statut">${echapperHtml(statutClient)}</strong>
        </div>
      </section>

      <form id="formulairePreuve" class="formulaire-paiement-client">
        <section class="etape-client">
          <div class="entete-etape-client">
            <span>1</span>
            <div>
              <h2>Choisissez comment vous allez payer</h2>
              <p>Selectionnez le service utilise, puis envoyez le montant au compte marchand affiche.</p>
            </div>
          </div>
          <div class="liste-methodes-client">${moyens}</div>
        </section>

        <section class="etape-client">
          <div class="entete-etape-client">
            <span>2</span>
            <div>
              <h2>Effectuez le transfert</h2>
              <p>Gardez cette page ouverte pendant le paiement. Elle vous servira a envoyer le recu ensuite.</p>
            </div>
          </div>
          <ol class="instructions-client">
            <li>
              <strong>Payez le montant demande.</strong>
              <span>Le transfert doit couvrir ${formaterMontant(paiement.montant, paiement.devise)}. Si l'application ajoute des frais, incluez-les dans le paiement.</span>
            </li>
            <li>
              <strong>Ajoutez la reference si une note est proposee.</strong>
              <span>Utilisez <span class="reference-client">${echapperHtml(paiement.referencePaiement)}</span> pour aider le marchand a retrouver la commande.</span>
            </li>
            <li>
              <strong>Conservez le recu officiel complet.</strong>
              <span>Le recu doit afficher le statut, le montant, la date, la reference et le numero destinataire.</span>
            </li>
          </ol>
        </section>

        <section class="etape-client">
          <div class="entete-etape-client">
            <span>3</span>
            <div>
              <h2>Ajoutez le recu de paiement</h2>
              <p>Envoyez une capture lisible du recu officiel. Formats acceptes: PNG, JPEG ou WebP, moins de 5 Mo.</p>
            </div>
          </div>

          <div class="zone-upload-preuve">
            <input id="fichierPreuve" class="champ-fichier-preuve" name="fichierPreuve" type="file" accept="image/png,image/jpeg,image/webp" required>
            <label for="fichierPreuve" class="bouton-upload-preuve">
              <span class="icone-upload-preuve">+</span>
              <span>
                <strong>Choisir le recu officiel</strong>
                <small id="nomFichierUpload">Aucun fichier choisi</small>
              </span>
            </label>
          </div>

          <div id="zoneApercu" class="apercu-preuve" hidden>
            <img id="imageApercu" alt="Apercu du justificatif">
            <p id="nomFichier"></p>
          </div>
        </section>

        <div class="actions-paiement-client">
          <button type="submit">Envoyer le recu</button>
          <button type="submit" class="bouton-secondaire" form="formulaireAbandon">Annuler le paiement</button>
        </div>
        <p id="message"></p>
      </form>
      <form id="formulaireAbandon" method="post" action="/paiement/${echapperHtml(encodeURIComponent(paiement.jetonClient || paiement.jetonPaiement || paiement.id))}/abandonner"></form>
    </main>

    <script>
      const formulaire = document.getElementById("formulairePreuve");
      const message = document.getElementById("message");
      const texteStatut = document.getElementById("statut");
      const champFichier = formulaire.elements.fichierPreuve;
      const zoneApercu = document.getElementById("zoneApercu");
      const imageApercu = document.getElementById("imageApercu");
      const nomFichier = document.getElementById("nomFichier");
      const nomFichierUpload = document.getElementById("nomFichierUpload");
      const jetonPaiement = ${JSON.stringify(paiement.jetonClient || paiement.jetonPaiement || paiement.id)};
      const libellesStatuts = {
        CREE: "En attente de paiement",
        EN_ATTENTE_PAIEMENT: "En attente de paiement",
        PREUVE_ENVOYEE: "Justificatif recu",
        EN_VERIFICATION: "Controle en cours",
        PAYE: "Paiement confirme",
        REFUSE: "Paiement refuse",
        ABANDONNE: "Paiement abandonne"
      };
      const tailleMaxPreuve = 5 * 1024 * 1024;
      const typesAutorises = ["image/png", "image/jpeg", "image/webp"];
      let urlApercu = "";
      let envoiPreuveEnCours = false;

      initialiserTempsReelPaiement();

      champFichier.addEventListener("change", () => {
        const fichier = champFichier.files[0];

        if (urlApercu) {
          URL.revokeObjectURL(urlApercu);
          urlApercu = "";
        }

        if (!fichier) {
          zoneApercu.hidden = true;
          imageApercu.removeAttribute("src");
          nomFichier.textContent = "";
          nomFichierUpload.textContent = "Aucun fichier choisi";
          return;
        }

        if (!typesAutorises.includes(fichier.type)) {
          message.textContent = "Ajoutez une image PNG, JPEG ou WebP.";
          champFichier.value = "";
          zoneApercu.hidden = true;
          imageApercu.removeAttribute("src");
          nomFichier.textContent = "";
          nomFichierUpload.textContent = "Aucun fichier choisi";
          return;
        }

        if (fichier.size > tailleMaxPreuve) {
          message.textContent = "Ajoutez une image de moins de 5 Mo.";
          champFichier.value = "";
          zoneApercu.hidden = true;
          imageApercu.removeAttribute("src");
          nomFichier.textContent = "";
          nomFichierUpload.textContent = "Aucun fichier choisi";
          return;
        }

        urlApercu = URL.createObjectURL(fichier);
        imageApercu.src = urlApercu;
        nomFichier.textContent = fichier.name;
        nomFichierUpload.textContent = fichier.name;
        zoneApercu.hidden = false;
        message.textContent = "";
      });

      formulaire.addEventListener("submit", async (evenement) => {
        evenement.preventDefault();
        message.textContent = "Envoi en cours...";

        try {
          const donnees = new FormData(formulaire);
          const fichier = donnees.get("fichierPreuve");

          if (!fichier || !fichier.size) {
            redirigerEchec("Ajoutez un justificatif avant de continuer.", "JUSTIFICATIF_MANQUANT");
            return;
          }

          envoiPreuveEnCours = true;
          const imageBase64 = await convertirFichierEnBase64(fichier);

          const reponse = await fetch("/api/paiements/${encodeURIComponent(paiement.jetonClient || paiement.jetonPaiement || paiement.id)}/preuve", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              moyenPaiement: donnees.get("moyenPaiement"),
              nomFichier: fichier.name,
              imageBase64
            })
          });

          const resultat = await reponse.json();

          if (!reponse.ok) {
            redirigerEchec(
              resultat.message || "Le justificatif n'a pas pu etre envoye.",
              resultat.code || "ENVOI_PREUVE_REFUSE"
            );
            return;
          }

          verrouillerFormulaire();
          message.textContent = "Justificatif recu. Redirection en cours...";

          if (resultat.paiement) {
            texteStatut.textContent = libelleStatut(resultat.paiement.statut);
          }

          window.location.href = "/paiement/" + encodeURIComponent(jetonPaiement) + "/preuve-envoyee";
        } catch {
          envoiPreuveEnCours = false;
          redirigerEchec("Connexion indisponible. Veuillez reessayer.", "CONNEXION_INDISPONIBLE");
        }
      });

      function libelleStatut(statut) {
        return libellesStatuts[statut] || statut;
      }

      function redirigerEchec(messageErreur, codeErreur) {
        const parametres = new URLSearchParams({
          message: messageErreur,
          code: codeErreur || "ENVOI_PREUVE_REFUSE"
        });
        window.location.href = "/paiement/" + encodeURIComponent(jetonPaiement) + "/echec-envoi?" + parametres.toString();
      }

      function verrouillerFormulaire() {
        for (const element of formulaire.elements) {
          element.disabled = true;
        }
      }

      function initialiserTempsReelPaiement() {
        if (!window.EventSource) {
          return;
        }

        const source = new EventSource("/api/temps-reel/paiements/" + encodeURIComponent(jetonPaiement));
        const gererPaiement = (evenement) => {
          try {
            const donnees = JSON.parse(evenement.data);
            actualiserEtatPaiement(donnees.paiement);
          } catch {
            return;
          }
        };

        source.addEventListener("paiement.snapshot", gererPaiement);
        source.addEventListener("paiement.maj", gererPaiement);
        source.addEventListener("theme.modifie", appliquerThemeTempsReelDepuisEvenement);
      }

      function actualiserEtatPaiement(paiement) {
        if (!paiement || !paiement.statut) {
          return;
        }

        texteStatut.textContent = libelleStatut(paiement.statut);

        if (envoiPreuveEnCours) {
          return;
        }

        if (paiement.preuve || paiement.statut === "PREUVE_ENVOYEE" || paiement.statut === "EN_VERIFICATION") {
          verrouillerFormulaire();
          message.textContent = "Justificatif recu. Le marchand va le verifier.";
          return;
        }

        if (paiement.statut === "PAYE") {
          verrouillerFormulaire();
          message.textContent = "Paiement deja confirme par le marchand.";
          return;
        }

        if (paiement.statut === "REFUSE") {
          verrouillerFormulaire();
          message.textContent = "Paiement refuse. Contactez le marchand si besoin.";
          return;
        }

        if (paiement.statut === "ABANDONNE") {
          verrouillerFormulaire();
          message.textContent = "Ce paiement n'est plus actif.";
        }
      }

      function appliquerThemeTempsReelDepuisEvenement(evenement) {
        try {
          const donnees = JSON.parse(evenement.data);
          appliquerThemeTempsReel(donnees.theme || donnees);
        } catch {
          return;
        }
      }

      function appliquerThemeTempsReel(theme) {
        if (!theme || !theme.css) {
          return;
        }

        const styleTheme = document.getElementById("styleThemeInterfaceTempsReel");

        if (styleTheme) {
          styleTheme.textContent = theme.css;
        }

        if (theme.themeInterface) {
          document.body.dataset.themeInterface = theme.themeInterface;
        }
      }

      function convertirFichierEnBase64(fichier) {
        return new Promise((resolve, reject) => {
          const lecteur = new FileReader();
          lecteur.onload = () => resolve(lecteur.result);
          lecteur.onerror = reject;
          lecteur.readAsDataURL(fichier);
        });
      }
    </script>
  `, { themeInterface: options.themeInterface });
}

function libelleStatutClient(statut) {
  const libelles = {
    CREE: "En attente de paiement",
    EN_ATTENTE_PAIEMENT: "En attente de paiement",
    PREUVE_ENVOYEE: "Justificatif recu",
    EN_VERIFICATION: "Controle en cours",
    PAYE: "Paiement confirme",
    REFUSE: "Paiement refuse",
    ABANDONNE: "Paiement abandonne",
  };

  return libelles[statut] || statut;
}

function afficherMethodePaiement(moyen) {
  return `
    <label class="methode-client">
      <input class="radio-methode-client" type="radio" name="moyenPaiement" value="${echapperHtml(moyen.code)}" required>
      <span class="radio-visible-client" aria-hidden="true"></span>
      <span class="contenu-methode-client">
        <span class="titre-methode-client">
          <strong>${echapperHtml(moyen.libelle)}</strong>
          <span>Compte marchand</span>
        </span>
        <span class="compte-paiement">
          <span><span class="libelle-compte">Nom:</span> ${echapperHtml(moyen.nomCompte)}</span>
          <span><span class="libelle-compte">Numero:</span> <span class="numero-compte">${echapperHtml(formaterNumeroCompte(moyen.numeroCompte))}</span></span>
        </span>
        <small>${echapperHtml(instructionPaiementClient(moyen))}</small>
      </span>
    </label>
  `;
}

module.exports = afficherPaiement;

function instructionPaiementClient(moyen) {
  const service = String(moyen.libelle || "ce service").trim();
  const instructions = String(moyen.instructions || "").trim();
  const texteNormalise = normaliserTexte(instructions);
  const instructionFrais = `Envoyez le montant marchand en couvrant les frais ${service}.`;

  if (!instructions || texteNormalise.includes("montant exact")) {
    return instructionFrais;
  }

  if (texteNormalise.includes("frais")) {
    return instructions;
  }

  return `${instructions} Le montant paye doit couvrir le montant marchand et les frais ${service}.`;
}

function formaterNumeroCompte(numero) {
  const texte = String(numero || "").trim();
  let chiffres = texte.replace(/\D/g, "");

  if (!chiffres) {
    return texte;
  }

  const aIndicatifIvoirien = chiffres.startsWith("225") && chiffres.length > 10;

  if (aIndicatifIvoirien) {
    chiffres = chiffres.slice(3);
  }

  if (chiffres.length === 10) {
    const groupes = chiffres.match(/.{1,2}/g).join(" ");
    return aIndicatifIvoirien ? `+225 ${groupes}` : groupes;
  }

  return texte.replace(/\s+/g, " ");
}

function normaliserTexte(valeur) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
