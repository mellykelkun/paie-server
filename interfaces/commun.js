const {
  styleThemeInterface,
  valeurThemeInterface,
} = require("./themes");

function pageHtml(titre, contenu, options = {}) {
  const themeInterface = valeurThemeInterface(options.themeInterface || process.env.THEME_INTERFACE);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${echapperHtml(titre)}</title>
  <style id="styleThemeInterfaceTempsReel">
    ${styleThemeInterface(themeInterface)}
  </style>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      color: var(--couleur-texte);
      background: var(--couleur-fond);
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
      color: var(--couleur-primaire);
    }
    .bouton-lien {
      display: inline-block;
      padding: 10px 14px;
      border-radius: 6px;
      color: var(--couleur-primaire-texte);
      background: var(--couleur-primaire);
      text-decoration: none;
      font-weight: 700;
    }
    .bouton-lien.secondaire {
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-secondaire);
    }
    .boite, .paiement {
      background: var(--couleur-surface);
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
    }
    .montant {
      font-size: 28px;
      font-weight: 700;
    }
    .page-paiement-client {
      width: min(920px, calc(100% - 32px));
    }
    .entete-paiement-client {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      margin: 0 0 14px;
      padding: 20px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
      box-shadow: 0 1px 3px var(--ombre-interface);
    }
    .entete-paiement-client h1 {
      margin-bottom: 8px;
      font-size: 34px;
      line-height: 1.08;
    }
    .entete-paiement-client p {
      max-width: 620px;
      margin: 0;
      color: var(--couleur-texte-secondaire);
      line-height: 1.5;
    }
    .montant-client {
      flex: 0 0 230px;
      align-self: stretch;
      display: grid;
      align-content: center;
      gap: 6px;
      padding: 14px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
    }
    .montant-client span,
    .resume-paiement-client span {
      color: var(--couleur-texte-secondaire);
      font-size: 13px;
      font-weight: 700;
    }
    .montant-client strong {
      color: var(--couleur-texte);
      font-size: 28px;
      line-height: 1;
    }
    .resume-paiement-client {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: 0 0 14px;
    }
    .resume-paiement-client div {
      min-width: 0;
      display: grid;
      gap: 6px;
      padding: 13px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
    }
    .resume-paiement-client strong {
      color: var(--couleur-texte);
      overflow-wrap: anywhere;
    }
    .formulaire-paiement-client {
      display: grid;
      gap: 14px;
    }
    .etape-client {
      display: grid;
      gap: 14px;
      padding: 18px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
      box-shadow: 0 1px 3px var(--ombre-interface);
    }
    .entete-etape-client {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 12px;
      align-items: start;
    }
    .entete-etape-client > span {
      display: grid;
      width: 32px;
      height: 32px;
      place-items: center;
      border-radius: 999px;
      color: var(--couleur-primaire-texte);
      background: var(--couleur-primaire);
      font-weight: 800;
    }
    .entete-etape-client h2 {
      margin: 0 0 5px;
      font-size: 21px;
      line-height: 1.18;
    }
    .entete-etape-client p {
      margin: 0;
      color: var(--couleur-texte-secondaire);
      line-height: 1.45;
    }
    .liste-methodes-client {
      display: grid;
      gap: 10px;
    }
    .methode-client {
      position: relative;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 12px;
      margin: 0;
      padding: 14px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
      cursor: pointer;
    }
    .methode-client:has(.radio-methode-client:checked) {
      border-color: var(--couleur-primaire);
      background: var(--couleur-surface);
      box-shadow: inset 0 0 0 1px var(--couleur-primaire);
    }
    .radio-methode-client {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
    .radio-visible-client {
      display: grid;
      width: 22px;
      height: 22px;
      margin-top: 1px;
      place-items: center;
      border: 2px solid var(--couleur-bordure-forte);
      border-radius: 999px;
      background: var(--couleur-surface);
    }
    .radio-visible-client::after {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--couleur-primaire);
      transform: scale(0);
    }
    .radio-methode-client:checked + .radio-visible-client {
      border-color: var(--couleur-primaire);
    }
    .radio-methode-client:checked + .radio-visible-client::after {
      transform: scale(1);
    }
    .radio-methode-client:focus-visible + .radio-visible-client {
      outline: 3px solid var(--couleur-focus);
      outline-offset: 3px;
    }
    .contenu-methode-client {
      display: grid;
      gap: 9px;
      min-width: 0;
    }
    .titre-methode-client {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: baseline;
    }
    .titre-methode-client strong {
      color: var(--couleur-texte);
      font-size: 18px;
    }
    .titre-methode-client span {
      color: var(--couleur-texte-secondaire);
      font-size: 13px;
      font-weight: 700;
    }
    .methode-client small {
      color: var(--couleur-texte-secondaire);
      line-height: 1.45;
    }
    .instructions-client {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: instructions-client;
    }
    .instructions-client li {
      counter-increment: instructions-client;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 10px;
      padding: 12px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
    }
    .instructions-client li::before {
      content: counter(instructions-client);
      grid-row: span 2;
      display: grid;
      width: 26px;
      height: 26px;
      place-items: center;
      border-radius: 999px;
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-secondaire);
      font-size: 13px;
      font-weight: 800;
    }
    .instructions-client strong {
      color: var(--couleur-texte);
    }
    .instructions-client span {
      color: var(--couleur-texte-secondaire);
      line-height: 1.45;
    }
    .reference-client {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 6px;
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-secondaire);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .zone-upload-preuve {
      position: relative;
      display: grid;
    }
    .champ-fichier-preuve {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
    .bouton-upload-preuve {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 12px;
      align-items: center;
      margin: 0;
      padding: 16px;
      border: 1px dashed var(--couleur-bordure-forte);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
      cursor: pointer;
    }
    .champ-fichier-preuve:focus-visible + .bouton-upload-preuve {
      outline: 3px solid var(--couleur-focus);
      outline-offset: 3px;
    }
    .icone-upload-preuve {
      display: grid;
      width: 42px;
      height: 42px;
      place-items: center;
      border-radius: 999px;
      color: var(--couleur-primaire-texte);
      background: var(--couleur-primaire);
      font-size: 28px;
      line-height: 1;
    }
    .bouton-upload-preuve strong,
    .bouton-upload-preuve small {
      display: block;
    }
    .bouton-upload-preuve strong {
      color: var(--couleur-texte);
    }
    .bouton-upload-preuve small {
      margin-top: 4px;
      color: var(--couleur-texte-secondaire);
      overflow-wrap: anywhere;
    }
    .actions-paiement-client {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      justify-content: flex-end;
    }
    .actions-paiement-client button {
      min-height: 42px;
      font-weight: 700;
    }
    .formulaire-paiement-client #message {
      margin: 0;
      color: var(--couleur-texte-secondaire);
      font-weight: 700;
    }
    .boite-secondaire {
      padding: 14px;
      margin: 14px 0;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
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
      color: var(--couleur-texte-secondaire);
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
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
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
      color: var(--couleur-texte);
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
      background: var(--couleur-fond);
    }
    .section-marchand {
      margin: 18px 0;
      padding: 18px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
      box-shadow: 0 1px 2px var(--ombre-interface);
    }
    .tableau-marchand {
      width: min(1180px, calc(100% - 32px));
    }
    .entete-marchand {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }
    .entete-marchand h1 {
      margin-bottom: 8px;
      font-size: 38px;
      line-height: 1.05;
    }
    .entete-marchand p {
      margin: 0;
      max-width: 680px;
      color: var(--couleur-texte-secondaire);
      line-height: 1.5;
    }
    .sur-titre,
    .sur-titre-paiement {
      margin: 0 0 6px;
      color: var(--couleur-texte-secondaire);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .actions-entete-marchand {
      justify-content: flex-end;
      min-width: 260px;
    }
    .resume-marchand {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin: 0 0 18px;
    }
    .carte-statistique {
      min-width: 0;
      padding: 14px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
    }
    .carte-statistique span,
    .carte-statistique small {
      display: block;
      color: var(--couleur-texte-secondaire);
      font-size: 13px;
    }
    .carte-statistique strong {
      display: block;
      margin: 8px 0 4px;
      color: var(--couleur-texte);
      font-size: 30px;
      line-height: 1;
    }
    .carte-statistique.succes {
      border-color: var(--couleur-bordure);
      background: var(--couleur-succes-fond);
    }
    .carte-statistique.erreur {
      border-color: var(--couleur-bordure);
      background: var(--couleur-erreur-fond);
    }
    .carte-statistique.attente {
      border-color: var(--couleur-bordure);
      background: var(--couleur-attente-fond);
    }
    .section-prioritaire {
      border-color: var(--couleur-bordure);
      background: var(--couleur-surface-alt);
    }
    .entete-section-marchand,
    details.section-marchand > summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .entete-section-marchand h2 {
      margin-bottom: 0;
    }
    .compteur-section {
      display: inline-grid;
      min-width: 32px;
      height: 32px;
      padding: 0 9px;
      place-items: center;
      border-radius: 999px;
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-secondaire);
      font-size: 14px;
      font-weight: 800;
    }
    .section-configuration {
      padding-bottom: 8px;
    }
    .aide-configuration {
      display: grid;
      gap: 8px;
      margin: 8px 0 14px;
      padding: 12px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
    }
    .aide-configuration p {
      margin: 0;
      color: var(--couleur-texte-secondaire);
      line-height: 1.45;
    }
    .aide-configuration strong {
      color: var(--couleur-texte);
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
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
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
      color: var(--couleur-texte-secondaire);
      font-size: 13px;
      text-align: right;
    }
    .badges-configuration {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      flex-wrap: wrap;
      min-width: 140px;
    }
    .champ-configuration-entete .indicateur-obligatoire {
      padding: 3px 7px;
      border-radius: 999px;
      color: var(--couleur-primaire-texte);
      background: var(--couleur-primaire);
      font-weight: 700;
    }
    .champ-configuration p {
      margin: 0;
      color: var(--couleur-texte-secondaire);
      line-height: 1.45;
    }
    .champ-configuration strong {
      color: var(--couleur-texte);
    }
    .champ-configuration code,
    .liste-technique code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--couleur-texte);
      overflow-wrap: anywhere;
    }
    .grille-themes-interface {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 10px;
      margin: 2px 0;
    }
    .option-theme-interface {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      align-items: center;
      margin: 0;
      padding: 11px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
      cursor: pointer;
    }
    .option-theme-interface:has(.radio-theme-interface:checked) {
      border-color: var(--couleur-primaire);
      box-shadow: inset 0 0 0 1px var(--couleur-primaire);
    }
    .radio-theme-interface {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
    .echantillons-theme-interface {
      display: grid;
      grid-template-columns: repeat(5, 18px);
      gap: 3px;
      padding: 4px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
    }
    .echantillons-theme-interface span {
      width: 18px;
      height: 24px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 5px;
    }
    .texte-theme-interface {
      min-width: 0;
      display: grid;
      gap: 3px;
    }
    .texte-theme-interface strong {
      color: var(--couleur-texte);
      font-size: 14px;
    }
    .texte-theme-interface small {
      color: var(--couleur-texte-secondaire);
      line-height: 1.35;
    }
    .radio-theme-interface:focus-visible + .echantillons-theme-interface {
      outline: 3px solid var(--couleur-focus);
      outline-offset: 3px;
    }
    .theme-documentation {
      cursor: default;
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
      border: 1px solid var(--couleur-bordure);
      border-radius: 6px;
      background: var(--couleur-surface);
    }
    .message-copie {
      margin: 0;
      color: var(--couleur-succes);
      font-weight: 700;
    }
    .case-ligne,
    .interrupteur-configuration {
      display: flex;
      grid-template-columns: none;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: var(--couleur-texte-secondaire);
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
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
    }
    .liste-technique p {
      margin: 6px 0 0;
      color: var(--couleur-texte-secondaire);
      line-height: 1.45;
    }
    .documentation-marchand {
      width: min(1180px, calc(100% - 32px));
    }
    .navigation-documentation {
      position: sticky;
      top: 0;
      z-index: 4;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 0 0 18px;
      padding: 10px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
      box-shadow: 0 1px 3px var(--ombre-interface);
    }
    .navigation-documentation a {
      padding: 7px 9px;
      border-radius: 6px;
      color: var(--couleur-texte);
      background: var(--couleur-surface-alt);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }
    .navigation-documentation a:hover,
    .navigation-documentation a:focus-visible {
      color: var(--couleur-primaire-texte);
      background: var(--couleur-primaire);
    }
    .section-documentation {
      padding: 24px 0;
      border-top: 1px solid var(--couleur-bordure);
    }
    .section-documentation h2 {
      margin-bottom: 10px;
    }
    .section-documentation h3 {
      margin: 0 0 8px;
      color: var(--couleur-texte);
      font-size: 18px;
    }
    .section-documentation p {
      color: var(--couleur-texte-secondaire);
      line-height: 1.5;
    }
    .grille-documentation {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
      margin: 12px 0;
    }
    .carte-documentation,
    .ligne-reference-doc {
      padding: 14px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
    }
    .carte-documentation p,
    .ligne-reference-doc p {
      margin: 8px 0 0;
    }
    .liste-documentation {
      display: grid;
      gap: 8px;
      margin: 12px 0;
      padding-left: 20px;
      color: var(--couleur-texte-secondaire);
      line-height: 1.5;
    }
    .code-documentation {
      max-height: 420px;
      overflow: auto;
      margin: 12px 0;
      padding: 12px;
      border-radius: 8px;
      color: var(--couleur-code-texte);
      background: var(--couleur-code-fond);
      white-space: pre-wrap;
    }
    .code-documentation code,
    .section-documentation code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      overflow-wrap: anywhere;
    }
    .tableau-documentation {
      overflow-x: auto;
      margin: 12px 0;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
    }
    .tableau-documentation table {
      width: 100%;
      border-collapse: collapse;
      min-width: 680px;
    }
    .tableau-documentation th,
    .tableau-documentation td {
      padding: 10px;
      border-bottom: 1px solid var(--couleur-bordure);
      text-align: left;
      vertical-align: top;
    }
    .tableau-documentation th {
      color: var(--couleur-texte);
      background: var(--couleur-surface-alt);
      font-size: 13px;
    }
    .tableau-documentation td {
      color: var(--couleur-texte-secondaire);
      line-height: 1.45;
    }
    .tableau-documentation tr:last-child td {
      border-bottom: 0;
    }
    .groupe-reference-doc {
      display: grid;
      gap: 10px;
      margin: 18px 0;
    }
    .ligne-reference-doc-entete {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .ligne-reference-doc-entete span {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .ligne-reference-doc-entete small {
      padding: 3px 7px;
      border-radius: 999px;
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-secondaire);
      font-weight: 700;
    }
    .description-section {
      max-width: 760px;
      margin: 8px 0 14px;
      color: var(--couleur-texte-secondaire);
      font-size: 0.95rem;
      line-height: 1.45;
    }
    details.section-marchand > summary {
      cursor: pointer;
      font-weight: 700;
      list-style-position: inside;
    }
    details.section-marchand[open] > summary {
      margin-bottom: 12px;
    }
    .liste-paiements-marchand {
      display: grid;
      gap: 12px;
      max-height: min(72vh, 760px);
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-right: 4px;
      scrollbar-color: var(--couleur-bordure-forte) transparent;
      scrollbar-gutter: stable;
      scrollbar-width: thin;
    }
    .liste-paiements-marchand::-webkit-scrollbar {
      width: 8px;
    }
    .liste-paiements-marchand::-webkit-scrollbar-track {
      background: transparent;
    }
    .liste-paiements-marchand::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: var(--couleur-bordure-forte);
    }
    .formulaire-suppression-historique {
      display: grid;
      gap: 12px;
      margin: 0;
    }
    .barre-suppression-historique {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 10px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
    }
    .selection-tout-historique,
    .selection-paiement-historique {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: var(--couleur-texte);
      font-weight: 700;
    }
    .selection-tout-historique {
      margin-right: auto;
    }
    .selection-paiement-historique {
      width: fit-content;
      padding: 8px 10px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
      font-size: 13px;
    }
    .selection-tout-historique input,
    .selection-paiement-historique input {
      width: 18px;
      height: 18px;
      accent-color: var(--couleur-danger);
    }
    .compteur-selection-historique {
      color: var(--couleur-texte-secondaire);
      font-size: 13px;
      font-weight: 700;
    }
    .etat-vide-marchand {
      padding: 18px;
      border: 1px dashed var(--couleur-bordure-forte);
      border-radius: 8px;
      color: var(--couleur-texte-secondaire);
      background: var(--couleur-surface-alt);
    }
    .etat-vide-marchand strong {
      display: block;
      margin-bottom: 4px;
      color: var(--couleur-texte);
    }
    .etat-vide-marchand p {
      margin: 0;
      line-height: 1.45;
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
      color: var(--couleur-texte-secondaire);
    }
    .libelle-compte {
      color: var(--couleur-texte);
      font-weight: 700;
    }
    .numero-compte {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--couleur-texte);
      letter-spacing: 0;
    }
    fieldset {
      margin: 0;
      padding: 12px;
      border: 1px solid var(--couleur-bordure);
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
      color: var(--couleur-texte-secondaire);
      line-height: 1.45;
    }
    input, textarea, select {
      padding: 10px;
      border: 1px solid var(--couleur-bordure-forte);
      border-radius: 6px;
      color: var(--couleur-texte);
      background: var(--couleur-surface);
      font: inherit;
    }
    textarea {
      resize: vertical;
    }
    button {
      padding: 10px 14px;
      border: 0;
      border-radius: 6px;
      color: var(--couleur-primaire-texte);
      background: var(--couleur-primaire);
      cursor: pointer;
      font: inherit;
    }
    button:disabled {
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-bordure-forte);
      cursor: not-allowed;
    }
    button.bouton-secondaire {
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-secondaire);
    }
    button.bouton-secondaire:disabled {
      color: var(--couleur-texte-secondaire);
      background: var(--couleur-secondaire);
    }
    button.bouton-danger {
      color: var(--couleur-danger-texte);
      background: var(--couleur-danger);
    }
    button.bouton-danger:disabled {
      color: var(--couleur-texte-secondaire);
      background: var(--couleur-bordure-forte);
      cursor: not-allowed;
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
      background: var(--couleur-voile-modal);
    }
    .modale-contenu {
      position: relative;
      width: min(520px, 100%);
      padding: 22px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
      box-shadow: 0 18px 50px var(--ombre-interface);
    }
    .modale-contenu h2 {
      margin-bottom: 8px;
    }
    .badge-modale {
      display: inline-block;
      margin: 0 0 10px;
      padding: 4px 8px;
      border-radius: 6px;
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-secondaire);
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
      color: var(--couleur-erreur);
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
      border: 1px solid var(--couleur-bordure);
      background: var(--couleur-surface);
    }
    .paiement-marchand {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 16px;
      padding: 16px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: linear-gradient(180deg, var(--etat-fond, var(--couleur-surface-alt)) 0, var(--couleur-surface) 76px);
      box-shadow: 0 1px 3px var(--ombre-interface);
    }
    .paiement-marchand.paiement-attente {
      --etat-fond: var(--couleur-attente-fond);
    }
    .paiement-marchand.paiement-succes {
      --etat-fond: var(--couleur-succes-fond);
    }
    .paiement-marchand.paiement-erreur {
      --etat-fond: var(--couleur-erreur-fond);
    }
    .paiement-marchand-corps {
      min-width: 0;
      display: grid;
      gap: 12px;
    }
    .paiement-marchand-entete {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .paiement-marchand h3 {
      margin: 0;
      color: var(--couleur-texte);
      font-size: 22px;
      line-height: 1.15;
    }
    .sur-titre-paiement {
      overflow-wrap: anywhere;
      text-transform: none;
    }
    .pastille-statut {
      flex: 0 0 auto;
      padding: 6px 9px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .pastille-statut.succes {
      color: var(--couleur-succes);
      background: var(--couleur-succes-fond);
    }
    .pastille-statut.erreur {
      color: var(--couleur-erreur);
      background: var(--couleur-erreur-fond);
    }
    .pastille-statut.attente {
      color: var(--couleur-attente);
      background: var(--couleur-attente-fond);
    }
    .pastille-statut.neutre {
      color: var(--couleur-neutre);
      background: var(--couleur-neutre-fond);
    }
    .infos-paiement-marchand {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin: 0;
    }
    .infos-paiement-marchand div {
      min-width: 0;
      padding: 10px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
    }
    .infos-paiement-marchand dt {
      margin: 0 0 4px;
      color: var(--couleur-texte-secondaire);
      font-size: 12px;
      font-weight: 700;
    }
    .infos-paiement-marchand dd {
      margin: 0;
      color: var(--couleur-texte);
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .ligne-etats-marchand {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .apercu-preuve-marchand {
      display: grid;
      gap: 8px;
      align-content: start;
      color: var(--couleur-primaire);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }
    .apercu-preuve-marchand img {
      width: 100%;
      height: 210px;
      object-fit: contain;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
    }
    .apercu-preuve-marchand.vide {
      min-height: 210px;
      place-items: center;
      border: 1px dashed var(--couleur-bordure-forte);
      border-radius: 8px;
      color: var(--couleur-texte-secondaire);
      background: var(--couleur-surface-alt);
    }
    .liste-alertes-marchand {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .liste-alertes-marchand li,
    .note-paiement-marchand {
      margin: 0;
      padding: 9px 10px;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      color: var(--couleur-texte-secondaire);
      background: var(--couleur-surface-alt);
      line-height: 1.4;
    }
    .liste-alertes-marchand li.critique {
      color: var(--couleur-erreur);
      border-color: var(--couleur-erreur-bordure);
      background: var(--couleur-erreur-fond);
      font-weight: 700;
    }
    .liste-alertes-marchand li.simple {
      color: var(--couleur-attente);
      border-color: var(--couleur-attente-bordure);
      background: var(--couleur-attente-fond);
    }
    .actions-paiement-marchand {
      padding-top: 2px;
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
      border: 1px solid var(--couleur-bordure);
      background: var(--couleur-surface-alt);
      font-weight: 700;
    }
    .retour-action p {
      margin: 6px 0 0;
      font-weight: 400;
      line-height: 1.45;
    }
    .retour-action.succes {
      color: var(--couleur-succes);
      border-color: var(--couleur-succes-bordure);
      background: var(--couleur-succes-fond);
    }
    .retour-action.erreur {
      color: var(--couleur-erreur);
      border-color: var(--couleur-erreur-bordure);
      background: var(--couleur-erreur-fond);
    }
    .retour-action.avertissement, .retour-action.info {
      color: var(--couleur-attente);
      border-color: var(--couleur-attente-bordure);
      background: var(--couleur-attente-fond);
    }
    .statut-configuration {
      border-color: var(--couleur-succes-bordure);
      background: var(--couleur-succes-fond);
    }
    .statut-configuration p {
      margin: 8px 0 0;
      color: var(--couleur-succes);
      line-height: 1.45;
    }
    .formulaire-retablissement {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--couleur-succes-bordure);
    }
    .formulaire-retablissement span {
      color: var(--couleur-texte-secondaire);
      line-height: 1.4;
    }
    .diagnostic-configuration {
      border-color: var(--couleur-attente-bordure);
      background: var(--couleur-attente-fond);
    }
    .diagnostic-configuration p {
      margin: 8px 0 0;
      color: var(--couleur-attente);
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
      color: var(--couleur-succes);
      background: var(--couleur-succes-fond);
    }
    .etat-decision.erreur {
      color: var(--couleur-erreur);
      background: var(--couleur-erreur-fond);
    }
    .etat-decision.attente {
      color: var(--couleur-attente);
      background: var(--couleur-attente-fond);
    }
    .etat-decision.info {
      color: var(--couleur-secondaire-texte);
      background: var(--couleur-secondaire);
    }
    .etat-decision.neutre {
      color: var(--couleur-neutre);
      background: var(--couleur-neutre-fond);
    }
    .etat-notification {
      margin: 10px 0;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--couleur-bordure);
      background: var(--couleur-surface-alt);
    }
    .etat-notification p {
      margin: 5px 0 0;
      color: var(--couleur-texte-secondaire);
    }
    .etat-notification.succes {
      border-color: var(--couleur-succes-bordure);
      background: var(--couleur-succes-fond);
    }
    .etat-notification.erreur {
      border-color: var(--couleur-erreur-bordure);
      background: var(--couleur-erreur-fond);
    }
    .etat-notification.attente {
      border-color: var(--couleur-attente-bordure);
      background: var(--couleur-attente-fond);
    }
    .etat-notification.neutre {
      border-color: var(--couleur-bordure);
      background: var(--couleur-surface-alt);
    }
    .details-controle {
      margin: 12px 0;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface-alt);
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
      background: var(--couleur-surface);
      border: 1px solid var(--couleur-bordure);
    }
    .liste-controles small {
      grid-column: 2;
      color: var(--couleur-texte-secondaire);
    }
    .controle-ok strong {
      color: var(--couleur-succes);
    }
    .controle-echec strong {
      color: var(--couleur-erreur);
    }
    .bloc-json {
      max-height: 260px;
      overflow: auto;
      margin: 0 12px 12px;
      padding: 12px;
      border-radius: 6px;
      background: var(--couleur-code-fond);
      color: var(--couleur-code-texte);
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
      color: var(--couleur-succes);
      background: var(--couleur-succes-fond);
    }
    .badge-echec {
      color: var(--couleur-erreur);
      background: var(--couleur-erreur-fond);
    }
    .apercu-preuve {
      margin: 14px 0;
    }
    .apercu-preuve img {
      width: min(100%, 420px);
      max-height: 320px;
      object-fit: contain;
      border: 1px solid var(--couleur-bordure);
      border-radius: 8px;
      background: var(--couleur-surface);
    }
    .apercu-preuve p {
      margin: 8px 0 0;
      color: var(--couleur-texte-secondaire);
    }
    @media (max-width: 720px) {
      .paiement {
        grid-template-columns: 1fr;
      }
      .page-paiement-client {
        width: min(100% - 24px, 920px);
        margin-top: 20px;
      }
      .entete-paiement-client,
      .titre-methode-client {
        display: grid;
      }
      .entete-paiement-client h1 {
        font-size: 29px;
      }
      .montant-client {
        width: auto;
        flex-basis: auto;
      }
      .resume-paiement-client {
        grid-template-columns: 1fr;
      }
      .etape-client {
        padding: 14px;
      }
      .methode-client {
        grid-template-columns: 1fr;
      }
      .radio-visible-client {
        margin: 0;
      }
      .instructions-client li {
        grid-template-columns: 1fr;
      }
      .instructions-client li::before {
        grid-row: auto;
      }
      .actions-paiement-client {
        display: grid;
      }
      .actions-paiement-client button {
        width: 100%;
      }
      .grille-themes-interface {
        grid-template-columns: 1fr;
      }
      .option-theme-interface {
        grid-template-columns: 1fr;
      }
      .echantillons-theme-interface {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
      .echantillons-theme-interface span {
        width: auto;
      }
      .entete-marchand,
      .paiement-marchand,
      .paiement-marchand-entete {
        grid-template-columns: 1fr;
        display: grid;
      }
      .entete-marchand h1 {
        font-size: 30px;
      }
      .actions-entete-marchand {
        min-width: 0;
        justify-content: stretch;
      }
      .actions-entete-marchand form {
        width: 100%;
      }
      .actions-entete-marchand a,
      .actions-entete-marchand button {
        width: 100%;
        box-sizing: border-box;
        text-align: center;
      }
      .resume-marchand {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .infos-paiement-marchand {
        grid-template-columns: 1fr;
      }
      .pastille-statut {
        justify-self: start;
      }
      .titre-ligne {
        display: grid;
      }
      .titre-ligne form,
      .titre-ligne button {
        width: 100%;
      }
      .barre-suppression-historique {
        align-items: stretch;
        display: grid;
      }
      .selection-tout-historique {
        margin-right: 0;
      }
      .barre-suppression-historique button {
        width: 100%;
      }
      .selection-paiement-historique {
        width: auto;
      }
      .navigation-documentation {
        position: static;
      }
      .ligne-reference-doc-entete {
        display: grid;
      }
      .ligne-reference-doc-entete span {
        justify-content: flex-start;
      }
      .liste-paiements-marchand {
        max-height: min(72vh, 620px);
        padding-right: 0;
      }
      .apercu-preuve-marchand img,
      .apercu-preuve-marchand.vide {
        height: 240px;
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
<body data-theme-interface="${echapperHtml(themeInterface)}">
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
