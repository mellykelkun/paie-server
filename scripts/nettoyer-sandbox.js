const fs = require("fs");
const path = require("path");

const argumentsCli = new Set(process.argv.slice(2));
const doitConfirmer = argumentsCli.has("--confirmer");

const dossierDonnees = path.join(__dirname, "..", "bac-a-sable", "donnees");
const fichierCommandes = path.join(dossierDonnees, "commandes.json");

function nettoyerSandbox() {
  preparerFichierCommandes();

  const commandes = chargerCommandes();

  console.log(`Commandes sandbox trouvees: ${commandes.length}`);

  if (!doitConfirmer) {
    console.log("");
    console.log("Aucune suppression faite.");
    console.log("Relancez avec --confirmer pour vider les commandes du sandbox.");
    return;
  }

  enregistrerCommandes([]);
  console.log(`Commandes sandbox supprimees: ${commandes.length}`);
  console.log("Fichier de stockage conserve.");
}

function preparerFichierCommandes() {
  fs.mkdirSync(dossierDonnees, { recursive: true });

  if (!fs.existsSync(fichierCommandes)) {
    fs.writeFileSync(fichierCommandes, "[]");
  }
}

function chargerCommandes() {
  try {
    const contenu = fs.readFileSync(fichierCommandes, "utf8");
    const commandes = JSON.parse(contenu);
    return Array.isArray(commandes) ? commandes : [];
  } catch {
    return [];
  }
}

function enregistrerCommandes(commandes) {
  fs.writeFileSync(fichierCommandes, JSON.stringify(commandes, null, 2));
}

nettoyerSandbox();
