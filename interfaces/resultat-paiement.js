const { pageHtml, echapperHtml } = require("./commun");

function afficherPreuveEnvoyee(paiement, options = {}) {
  const urlRetour = options.urlRetourClient || paiement.urlRetour || "";
  const boutonRetour = urlRetour
    ? `<a class="bouton-lien" href="${echapperHtml(urlRetour)}">Retour a l'application</a>`
    : "";
  const redirection = urlRetour
    ? `
    <script>
      setTimeout(() => {
        window.location.href = ${JSON.stringify(urlRetour)};
      }, 2500);
    </script>
  `
    : "";

  return pageHtml("Justificatif envoye", `
    <main>
      <section class="boite resultat">
        <p class="badge-succes">Justificatif envoye</p>
        <h1>Justificatif recu</h1>
        <p>Votre paiement sera controle. Merci !</p>
        <p>Reference: <strong>${echapperHtml(paiement.referencePaiement)}</strong></p>
        ${boutonRetour ? `<div class="actions">${boutonRetour}</div>` : ""}
      </section>
    </main>

    ${redirection}
  `, { themeInterface: options.themeInterface });
}

function afficherEchecEnvoi(paiement, message, code, options = {}) {
  const jetonPaiement = paiement.jetonClient || paiement.jetonPaiement || paiement.id;
  const urlRelance = `/paiement/${encodeURIComponent(jetonPaiement)}`;
  const aUrlRetour = Boolean(paiement.urlAnnulation || paiement.urlRetour);
  const messageFinal = message || "Le justificatif n'a pas pu etre envoye.";
  const conseil = conseilEchec(code);
  const boutonRetour = aUrlRetour
    ? `
      <form method="post" action="/paiement/${echapperHtml(encodeURIComponent(jetonPaiement))}/abandonner">
        <button type="submit">Retour a l'application</button>
      </form>
    `
    : "";

  return pageHtml("Envoi impossible", `
    <main>
      <section class="boite resultat">
        <p class="badge-echec">Envoi impossible</p>
        <h1>Justificatif non envoye</h1>
        <p>${echapperHtml(messageFinal)}</p>
        <p>${echapperHtml(conseil)}</p>
        <p>Aucun dossier de controle n'est ouvert tant que l'image n'est pas recue correctement.</p>
        <div class="actions">
          <a class="bouton-lien" href="${echapperHtml(urlRelance)}">Reessayer</a>
          ${boutonRetour}
        </div>
      </section>
    </main>
  `, { themeInterface: options.themeInterface });
}

function conseilEchec(code) {
  const conseils = {
    IMAGE_DEJA_UTILISEE:
      "Une image deja envoyee ne peut pas etre reutilisee. Ajoutez le recu correspondant a cette commande.",
    JUSTIFICATIF_DEJA_UTILISE:
      "Une image deja envoyee ne peut pas etre reutilisee. Ajoutez le recu correspondant a cette commande.",
    REFERENCE_DEJA_UTILISEE:
      "Cette reference est deja presente dans un autre paiement. Verifiez le recu avant de reessayer.",
    TYPE_IMAGE_INVALIDE: "Ajoutez une image PNG, JPEG ou WebP.",
    IMAGE_TROP_LOURDE: "Ajoutez une image de moins de 5 Mo.",
    REQUETE_TROP_VOLUMINEUSE: "Ajoutez une image plus legere.",
    IMAGE_TROP_PETITE: "Ajoutez une capture complete et lisible du recu.",
    MOYEN_PAIEMENT_INVALIDE: "Choisissez un moyen de paiement propose sur la page.",
    CONTENU_TEST_FICTIF: "Ajoutez le recu reel fourni par l'application de paiement.",
    FORENSIQUE_IMAGE_CRITIQUE: "Ajoutez le recu officiel original depuis l'application de paiement.",
    IMAGE_VISUELLE_DEJA_UTILISEE: "Ajoutez le recu original correspondant a cette commande.",
    IMAGE_DECODE_INVALIDE: "Ajoutez une capture PNG, JPEG ou WebP lisible.",
    IMAGE_PIXELS_TROP_GRANDS: "Ajoutez une capture plus legere du recu complet.",
    PROVIDER_NON_CONFORME: "Ajoutez un recu officiel correspondant au moyen de paiement selectionne.",
    STRUCTURE_PROVIDER_INCOMPLETE: "Ajoutez une capture complete du recu officiel depuis l'application.",
    TELEPHONE_DESTINATAIRE_DIFFERENT: "Verifiez que le paiement a ete envoye au bon numero marchand.",
    MONTANT_OCR_DIFFERENT: "Ajoutez le recu correspondant au montant de cette commande.",
    MONTANT_OCR_ABSENT: "Ajoutez une capture ou le montant du recu est clairement visible.",
    DATE_RECU_INCOHERENTE: "Ajoutez le recu cree pour cette commande, pas un ancien recu.",
    REFERENCE_PROVIDER_ABSENTE: "Ajoutez une capture ou la reference du recu est visible.",
    REFERENCE_PROVIDER_DEJA_UTILISEE: "Cette reference est deja connue. Ajoutez le recu de cette commande.",
    OCR_INDISPONIBLE: "Ajoutez une capture complete, nette et lisible du recu.",
    JUSTIFICATIF_MANQUANT: "Ajoutez une image du recu avant de continuer.",
    CONNEXION_INDISPONIBLE: "Verifiez la connexion puis reessayez.",
  };

  return conseils[String(code || "")] || "Veuillez corriger le justificatif puis reessayer.";
}

module.exports = {
  afficherPreuveEnvoyee,
  afficherEchecEnvoi,
};
