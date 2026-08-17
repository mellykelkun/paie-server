const fs = require("fs");
const path = require("path");

function chargerFichierEnv(nomFichier = ".env") {
  const cheminEnv = path.join(__dirname, nomFichier);

  if (!fs.existsSync(cheminEnv)) {
    return;
  }

  const lignes = fs.readFileSync(cheminEnv, "utf8").split(/\r?\n/);

  for (const ligne of lignes) {
    const lignePropre = ligne.trim();

    if (!lignePropre || lignePropre.startsWith("#")) {
      continue;
    }

    const positionSeparateur = lignePropre.indexOf("=");

    if (positionSeparateur === -1) {
      continue;
    }

    const cle = lignePropre.slice(0, positionSeparateur).trim();
    let valeur = lignePropre.slice(positionSeparateur + 1).trim();

    if (!cle || process.env[cle] !== undefined) {
      continue;
    }

    if (
      (valeur.startsWith('"') && valeur.endsWith('"')) ||
      (valeur.startsWith("'") && valeur.endsWith("'"))
    ) {
      valeur = valeur.slice(1, -1);
    }

    process.env[cle] = valeur;
  }
}

module.exports = chargerFichierEnv;
