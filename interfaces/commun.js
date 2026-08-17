function pageHtml(titre, contenu) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${echapperHtml(titre)}</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      color: #172026;
      background: #f5f7f8;
    }
    [hidden] {
      display: none !important;
    }
    main {
      width: min(960px, calc(100% - 32px));
      margin: 32px auto;
    }
    .page-centree {
      min-height: calc(100vh - 64px);
      display: grid;
      align-items: center;
    }
    h1, h2 {
      margin: 0 0 16px;
    }
    a {
      color: #0f766e;
    }
    .bouton-lien {
      display: inline-block;
      padding: 10px 14px;
      border-radius: 6px;
      color: white;
      background: #0f766e;
      text-decoration: none;
      font-weight: 700;
    }
    .bouton-lien.secondaire {
      color: #172026;
      background: #e8eef0;
    }
    .boite, .paiement {
      background: white;
      border: 1px solid #d8e0e3;
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
    }
    .montant {
      font-size: 28px;
      font-weight: 700;
    }
    .boite-secondaire {
      padding: 14px;
      margin: 14px 0;
      border: 1px solid #d8e0e3;
      border-radius: 8px;
      background: #f7faf9;
    }
    .boite-secondaire p {
      margin: 0 0 8px;
    }
    .boite-secondaire p:last-child {
      margin-bottom: 0;
    }
    .carte-connexion {
      width: min(480px, 100%);
      margin: 0 auto;
    }
    .texte-secondaire {
      color: #526066;
    }
    .formulaire-vertical {
      display: grid;
      gap: 12px;
    }
    .qr-2fa {
      display: grid;
      place-items: center;
      margin: 18px 0;
      padding: 14px;
      border: 1px solid #d8e0e3;
      border-radius: 8px;
      background: #ffffff;
    }
    .qr-2fa img {
      width: min(240px, 100%);
      height: auto;
    }
    .secret-2fa {
      overflow-wrap: anywhere;
      padding: 0 12px 12px;
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #172026;
    }
    .titre-ligne {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }
    .titre-ligne form {
      margin: 0;
    }
    .barre-actions {
      position: sticky;
      bottom: 0;
      z-index: 5;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: flex-end;
      padding: 14px 0;
      background: #f5f7f8;
    }
    .section-marchand {
      margin: 22px 0;
    }
    .section-configuration {
      padding-bottom: 8px;
    }
    .aide-configuration {
      display: grid;
      gap: 8px;
      margin: 8px 0 14px;
      padding: 12px;
      border: 1px solid #cddce3;
      border-radius: 8px;
      background: #f6fbfd;
    }
    .aide-configuration p {
      margin: 0;
      color: #415058;
      line-height: 1.45;
    }
    .aide-configuration strong {
      color: #172026;
    }
    .formulaire-configuration {
      display: grid;
      gap: 10px;
    }
    .liste-configuration {
      display: grid;
      gap: 12px;
    }
    .champ-configuration {
      display: grid;
      gap: 8px;
      padding: 14px;
      border: 1px solid #d8e0e3;
      border-radius: 8px;
      background: #fbfcfc;
    }
    .champ-configuration-entete {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .champ-configuration-entete div {
      display: grid;
      gap: 4px;
    }
    .champ-configuration-entete label {
      margin: 0;
      font-weight: 700;
    }
    .champ-configuration-entete span {
      color: #526066;
      font-size: 13px;
      text-align: right;
    }
    .champ-configuration p {
      margin: 0;
      color: #526066;
      line-height: 1.45;
    }
    .champ-configuration strong {
      color: #172026;
    }
    .champ-configuration code,
    .liste-technique code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #172026;
      overflow-wrap: anywhere;
    }
    .champ-secret {
      display: grid;
      gap: 8px;
    }
    .actions-secret {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .actions-secret button {
      min-height: 40px;
    }
    .secret-masque {
      padding: 8px 10px;
      border: 1px solid #d8e0e3;
      border-radius: 6px;
      background: #ffffff;
    }
    .message-copie {
      margin: 0;
      color: #0f5132;
      font-weight: 700;
    }
    .case-ligne,
    .interrupteur-configuration {
      display: flex;
      grid-template-columns: none;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #526066;
    }
    .case-ligne input,
    .interrupteur-configuration input {
      width: auto;
    }
    .liste-technique {
      display: grid;
      gap: 10px;
    }
    .liste-technique article {
      padding: 12px;
      border: 1px solid #d8e0e3;
      border-radius: 8px;
      background: #fbfcfc;
    }
    .liste-technique p {
      margin: 6px 0 0;
      color: #526066;
      line-height: 1.45;
    }
    .description-section {
      max-width: 760px;
      margin: 6px 0 14px;
      color: #5c6670;
      font-size: 0.95rem;
      line-height: 1.45;
    }
    details.section-marchand > summary {
      margin-bottom: 12px;
      cursor: pointer;
      font-weight: 700;
    }
    label, .methode {
      display: grid;
      gap: 6px;
      margin: 12px 0;
    }
    .compte-paiement {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
      align-items: center;
      color: #526066;
    }
    .libelle-compte {
      color: #172026;
      font-weight: 700;
    }
    .numero-compte {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #172026;
      letter-spacing: 0;
    }
    fieldset {
      margin: 0;
      padding: 12px;
      border: 1px solid #d8e0e3;
      border-radius: 8px;
    }
    legend {
      padding: 0 6px;
      font-weight: 700;
    }
    .choix-connexion label {
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
    }
    .aide-champ {
      color: #526066;
      line-height: 1.45;
    }
    input, textarea {
      padding: 10px;
      border: 1px solid #b7c2c7;
      border-radius: 6px;
      font: inherit;
    }
    textarea {
      resize: vertical;
    }
    button {
      padding: 10px 14px;
      border: 0;
      border-radius: 6px;
      color: white;
      background: #0f766e;
      cursor: pointer;
      font: inherit;
    }
    button:disabled {
      background: #9aa7ad;
      cursor: not-allowed;
    }
    button.bouton-secondaire {
      color: #172026;
      background: #e8eef0;
    }
    button.bouton-danger {
      color: #ffffff;
      background: #b42318;
    }
    .modale {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: center;
      padding: 20px;
    }
    .modale[hidden] {
      display: none;
    }
    .modale-fond {
      position: absolute;
      inset: 0;
      background: rgba(23, 32, 38, 0.56);
    }
    .modale-contenu {
      position: relative;
      width: min(520px, 100%);
      padding: 22px;
      border: 1px solid #d8e0e3;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 18px 50px rgba(23, 32, 38, 0.22);
    }
    .modale-contenu h2 {
      margin-bottom: 8px;
    }
    .badge-modale {
      display: inline-block;
      margin: 0 0 10px;
      padding: 4px 8px;
      border-radius: 6px;
      color: #172026;
      background: #eef2f4;
      font-size: 13px;
      font-weight: 700;
    }
    .champ-modale {
      margin: 16px 0;
    }
    .champ-modale label {
      margin-bottom: 8px;
      font-weight: 700;
    }
    .champ-modale textarea {
      width: 100%;
      box-sizing: border-box;
    }
    .erreur-champ {
      margin: 8px 0 0;
      color: #842029;
      font-weight: 700;
    }
    .modale-actions {
      justify-content: flex-end;
      margin-top: 18px;
    }
    .paiement {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 20px;
    }
    .paiement img {
      width: 100%;
      max-height: 360px;
      object-fit: contain;
      border: 1px solid #d8e0e3;
      background: #ffffff;
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .actions form {
      margin: 0;
    }
    .retour-action {
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid #d8e0e3;
      background: #f7faf9;
      font-weight: 700;
    }
    .retour-action p {
      margin: 6px 0 0;
      font-weight: 400;
      line-height: 1.45;
    }
    .retour-action.succes {
      color: #0f5132;
      border-color: #badbcc;
      background: #d9f4e7;
    }
    .retour-action.erreur {
      color: #842029;
      border-color: #f5c2c7;
      background: #f8d7da;
    }
    .retour-action.avertissement, .retour-action.info {
      color: #7c2d12;
      border-color: #fed7aa;
      background: #ffedd5;
    }
    .statut-configuration {
      border-color: #badbcc;
      background: #f3fbf7;
    }
    .statut-configuration p {
      margin: 8px 0 0;
      color: #335044;
      line-height: 1.45;
    }
    .formulaire-retablissement {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #badbcc;
    }
    .formulaire-retablissement span {
      color: #526066;
      line-height: 1.4;
    }
    .diagnostic-configuration {
      border-color: #fed7aa;
      background: #fff7ed;
    }
    .diagnostic-configuration p {
      margin: 8px 0 0;
      color: #7c2d12;
      line-height: 1.45;
    }
    .etat-decision {
      display: inline-block;
      margin: 8px 0;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
    }
    .etat-decision.succes {
      color: #0f5132;
      background: #d9f4e7;
    }
    .etat-decision.erreur {
      color: #842029;
      background: #f8d7da;
    }
    .etat-decision.attente {
      color: #7c2d12;
      background: #ffedd5;
    }
    .etat-decision.neutre {
      color: #526066;
      background: #eef2f4;
    }
    .etat-notification {
      margin: 10px 0;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #d8e0e3;
      background: #f8faf9;
    }
    .etat-notification p {
      margin: 5px 0 0;
      color: #526066;
    }
    .etat-notification.succes {
      border-color: #badbcc;
      background: #f2fbf6;
    }
    .etat-notification.erreur {
      border-color: #f5c2c7;
      background: #fff5f5;
    }
    .etat-notification.attente {
      border-color: #fed7aa;
      background: #fff7ed;
    }
    .etat-notification.neutre {
      border-color: #d8e0e3;
      background: #f8faf9;
    }
    .details-controle {
      margin: 12px 0;
      border: 1px solid #d8e0e3;
      border-radius: 8px;
      background: #fbfcfc;
    }
    .details-controle summary {
      padding: 10px 12px;
      cursor: pointer;
      font-weight: 700;
    }
    .liste-controles {
      display: grid;
      gap: 6px;
      padding: 0 12px 12px;
      margin: 0;
      list-style: none;
    }
    .liste-controles li {
      display: grid;
      grid-template-columns: 70px 1fr;
      gap: 4px 10px;
      padding: 8px;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid #e1e7ea;
    }
    .liste-controles small {
      grid-column: 2;
      color: #526066;
    }
    .controle-ok strong {
      color: #0f5132;
    }
    .controle-echec strong {
      color: #842029;
    }
    .bloc-json {
      max-height: 260px;
      overflow: auto;
      margin: 0 12px 12px;
      padding: 12px;
      border-radius: 6px;
      background: #172026;
      color: #ffffff;
      white-space: pre-wrap;
    }
    .resultat {
      max-width: 680px;
    }
    .badge-succes, .badge-echec {
      display: inline-block;
      margin-bottom: 12px;
      padding: 5px 9px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
    }
    .badge-succes {
      color: #0f5132;
      background: #d9f4e7;
    }
    .badge-echec {
      color: #842029;
      background: #f8d7da;
    }
    .apercu-preuve {
      margin: 14px 0;
    }
    .apercu-preuve img {
      width: min(100%, 420px);
      max-height: 320px;
      object-fit: contain;
      border: 1px solid #d8e0e3;
      border-radius: 8px;
      background: #ffffff;
    }
    .apercu-preuve p {
      margin: 8px 0 0;
      color: #526066;
    }
    @media (max-width: 720px) {
      .paiement {
        grid-template-columns: 1fr;
      }
      .titre-ligne {
        display: grid;
      }
      .titre-ligne form,
      .titre-ligne button {
        width: 100%;
      }
      .liste-controles li {
        grid-template-columns: 1fr;
      }
      .liste-controles small {
        grid-column: auto;
      }
    }
  </style>
</head>
<body>
  ${contenu}
</body>
</html>`;
}

function echapperHtml(valeur) {
  return String(valeur)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formaterMontant(montant, devise) {
  return `${Number(montant).toLocaleString("fr-FR")} ${echapperHtml(devise)}`;
}

module.exports = {
  pageHtml,
  echapperHtml,
  formaterMontant,
};
