const { pageHtml } = require("./commun");

function afficherAccueil(options = {}) {
  return pageHtml("Paie Server", `
    <main>
      <h1>Paie Server</h1>
      <p>Service de paiement manuel.</p>
      <ul>
        <li><a href="/api/sante">Etat du service</a></li>
      </ul>
    </main>
  `, { themeInterface: options.themeInterface });
}

module.exports = afficherAccueil;
