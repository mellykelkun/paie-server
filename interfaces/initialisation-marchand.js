const { pageHtml, echapperHtml } = require("./commun");

function afficherInitialisationMarchand(options) {
  if (options.etape === "compte") {
    return afficherCreationCompte(options);
  }

  return afficherActivation2fa(options);
}

function afficherActivation2fa(options) {
  const erreur = afficherErreur(options.erreur);
  const champInstallation = options.cleInstallationDemandee
    ? `
      <label>Cle d'installation
        <input name="cleInstallation" type="password" autocomplete="off" required>
      </label>
    `
    : "";

  return pageHtml("Initialisation marchand", `
    <main class="page-centree">
      <section class="boite carte-connexion">
        <p class="badge-modale">Premiere configuration</p>
        <h1>Activer le code Authenticator</h1>
        <p class="texte-secondaire">Scannez le QR code avec votre application d'authentification, puis entrez le code a 6 chiffres.</p>
        ${erreur}
        <div class="qr-2fa">
          <img src="${echapperHtml(options.qrCodeDataUrl)}" alt="QR code Authenticator">
        </div>
        <details class="details-controle">
          <summary>Configuration manuelle</summary>
          <p class="secret-2fa">${echapperHtml(options.secret2fa)}</p>
        </details>
        <form method="post" action="/marchand/initialisation/2fa" class="formulaire-vertical">
          ${champInstallation}
          <label>Code Authenticator
            <input name="code2fa" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required autofocus>
          </label>
          <button type="submit">Valider le code</button>
        </form>
      </section>
    </main>
  `, { themeInterface: options.themeInterface });
}

function afficherCreationCompte(options) {
  const erreur = afficherErreur(options.erreur);

  return pageHtml("Creation du compte marchand", `
    <main class="page-centree">
      <section class="boite carte-connexion">
        <p class="badge-modale">Compte marchand</p>
        <h1>Creer l'acces marchand</h1>
        <p class="texte-secondaire">L'identifiant est genere automatiquement. Conservez-le avec votre mot de passe.</p>
        ${erreur}
        <form method="post" action="/marchand/initialisation/compte" class="formulaire-vertical">
          <label>Identifiant marchand
            <input type="text" value="${echapperHtml(options.identifiant)}" readonly aria-readonly="true">
            <small class="aide-champ">
              Dans Authenticator, ce compte apparaitra comme Paie Server : ${echapperHtml(options.identifiant)}.
              Les 8 caracteres apres marchand_ permettent de retrouver rapidement cet acces.
            </small>
          </label>
          <label>Mot de passe
            <input name="motDePasse" type="password" minlength="12" autocomplete="new-password" required autofocus>
          </label>
          <label>Confirmer le mot de passe
            <input name="confirmationMotDePasse" type="password" minlength="12" autocomplete="new-password" required>
          </label>
          <button type="submit">Creer le compte</button>
        </form>
      </section>
    </main>
  `, { themeInterface: options.themeInterface });
}

function afficherErreur(message) {
  return message ? `<p class="retour-action erreur">${echapperHtml(message)}</p>` : "";
}

module.exports = afficherInitialisationMarchand;
