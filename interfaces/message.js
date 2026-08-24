const { pageHtml, echapperHtml } = require("./commun");

function afficherMessage(message, options = {}) {
  const urlRetour = String(options.urlRetour || "").trim();
  const libelleRetour = options.libelleRetour || "OK";
  const actionRetour = urlRetour
    ? `<p><a class="bouton-lien" href="${echapperHtml(urlRetour)}">${echapperHtml(libelleRetour)}</a></p>`
    : "";

  return pageHtml(message, `
    <main>
      <h1>${echapperHtml(message)}</h1>
      ${actionRetour}
    </main>
  `, { themeInterface: options.themeInterface });
}

module.exports = afficherMessage;
