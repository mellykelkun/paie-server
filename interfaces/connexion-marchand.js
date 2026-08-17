const { pageHtml, echapperHtml } = require("./commun");

function afficherConnexionMarchand(options = {}) {
  const erreur = options.erreur
    ? `<p class="retour-action erreur">${echapperHtml(options.erreur)}</p>`
    : "";

  return pageHtml("Connexion marchand", `
    <main class="page-centree">
      <section class="boite carte-connexion">
        <p class="badge-modale">Espace marchand</p>
        <h1>Connexion marchand</h1>
        <p class="texte-secondaire">Acces reserve au controle des paiements et des justificatifs.</p>
        ${erreur}
        <form method="post" action="/marchand/connexion" class="formulaire-vertical">
          <fieldset class="choix-connexion">
            <legend>Mode de connexion</legend>
            <label>
              <input type="radio" name="modeConnexion" value="mot_de_passe" checked>
              Identifiant et mot de passe
            </label>
            <label>
              <input type="radio" name="modeConnexion" value="code_2fa">
              Identifiant et code Authenticator
            </label>
          </fieldset>
          <label>Identifiant
            <input name="identifiant" type="text" autocomplete="username" required autofocus>
            <small class="aide-champ">
              Ouvrez votre application Authenticator. Le compte apparait comme
              Paie Server : marchand_2g08ji45. Vous pouvez saisir marchand_2g08ji45
              ou seulement les 8 caracteres 2g08ji45.
            </small>
          </label>
          <label data-champ-mot-de-passe>Mot de passe
            <input name="motDePasse" type="password" autocomplete="current-password" required>
          </label>
          <label data-champ-code-2fa hidden>Code Authenticator
            <input name="code2fa" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code">
          </label>
          <button type="submit">Se connecter</button>
        </form>
      </section>
    </main>

    <script>
      const modesConnexion = document.querySelectorAll('input[name="modeConnexion"]');
      const champMotDePasse = document.querySelector("[data-champ-mot-de-passe]");
      const champCode2fa = document.querySelector("[data-champ-code-2fa]");
      const inputMotDePasse = champMotDePasse.querySelector("input");
      const inputCode2fa = champCode2fa.querySelector("input");

      modesConnexion.forEach((mode) => {
        mode.addEventListener("change", synchroniserModeConnexion);
      });

      synchroniserModeConnexion();

      function synchroniserModeConnexion() {
        const mode = document.querySelector('input[name="modeConnexion"]:checked').value;
        const utiliseCode2fa = mode === "code_2fa";
        champMotDePasse.hidden = utiliseCode2fa;
        champCode2fa.hidden = !utiliseCode2fa;
        inputMotDePasse.required = !utiliseCode2fa;
        inputCode2fa.required = utiliseCode2fa;
      }
    </script>
  `);
}

module.exports = afficherConnexionMarchand;
