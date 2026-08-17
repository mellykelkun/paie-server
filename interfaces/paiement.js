const { pageHtml, echapperHtml, formaterMontant } = require("./commun");

function afficherPaiement(paiement) {
  const moyens = paiement.moyensPaiement.map((moyen) => `
    <label class="methode">
      <input type="radio" name="moyenPaiement" value="${echapperHtml(moyen.code)}" required>
      <strong>${echapperHtml(moyen.libelle)}</strong>
      <span class="compte-paiement">
        <span><span class="libelle-compte">Compte marchand:</span> ${echapperHtml(moyen.nomCompte)}</span>
        <span><span class="libelle-compte">Numero marchand:</span> <span class="numero-compte">${echapperHtml(formaterNumeroCompte(moyen.numeroCompte))}</span></span>
      </span>
      <small>${echapperHtml(instructionPaiementClient(moyen))}</small>
    </label>
  `).join("");
  const statutClient = libelleStatutClient(paiement.statut);

  return pageHtml("Paiement securise", `
    <main>
      <h1>Finaliser le paiement</h1>
      <section class="boite">
        <p class="montant">${formaterMontant(paiement.montant, paiement.devise)}</p>
        <p>Commande: <strong>${echapperHtml(paiement.idCommande)}</strong></p>
        <p>Statut: <strong id="statut">${echapperHtml(statutClient)}</strong></p>
        <p>Reference: <strong>${echapperHtml(paiement.referencePaiement)}</strong></p>
      </section>

      <form id="formulairePreuve" class="boite">
        <h2>Moyen de paiement</h2>
        <div>${moyens}</div>

        <div class="boite-secondaire">
          <p>Reference: <strong>${echapperHtml(paiement.referencePaiement)}</strong></p>
          <p>Montant marchand a couvrir: <strong>${formaterMontant(paiement.montant, paiement.devise)}</strong></p>
          <p>Si l'application propose un motif ou une note, indiquez la reference du paiement.</p>
          <p>Le recu doit couvrir ce montant. Les frais affiches par l'application de paiement sont controles automatiquement.</p>
          <p>Ajoutez le recu officiel complet depuis l'application du service choisi.</p>
          <p>Wave: recu de transaction ou detail avec statut, montant, date et numero destinataire visibles.</p>
          <p>Orange Money: recu Maxi It avec montant transfere, numero beneficiaire, date et reference visibles.</p>
        </div>

        <label>Justificatif de paiement
          <input name="fichierPreuve" type="file" accept="image/png,image/jpeg,image/webp" required>
        </label>
        <div id="zoneApercu" class="apercu-preuve" hidden>
          <img id="imageApercu" alt="Apercu du justificatif">
          <p id="nomFichier"></p>
        </div>

        <button type="submit">Envoyer le justificatif</button>
        <button type="submit" class="bouton-secondaire" form="formulaireAbandon">Annuler le paiement</button>
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
          return;
        }

        if (!typesAutorises.includes(fichier.type)) {
          message.textContent = "Ajoutez une image PNG, JPEG ou WebP.";
          champFichier.value = "";
          zoneApercu.hidden = true;
          imageApercu.removeAttribute("src");
          nomFichier.textContent = "";
          return;
        }

        if (fichier.size > tailleMaxPreuve) {
          message.textContent = "Ajoutez une image de moins de 5 Mo.";
          champFichier.value = "";
          zoneApercu.hidden = true;
          imageApercu.removeAttribute("src");
          nomFichier.textContent = "";
          return;
        }

        urlApercu = URL.createObjectURL(fichier);
        imageApercu.src = urlApercu;
        nomFichier.textContent = fichier.name;
        zoneApercu.hidden = false;
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

      function convertirFichierEnBase64(fichier) {
        return new Promise((resolve, reject) => {
          const lecteur = new FileReader();
          lecteur.onload = () => resolve(lecteur.result);
          lecteur.onerror = reject;
          lecteur.readAsDataURL(fichier);
        });
      }
    </script>
  `);
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
