const chargerFichierEnv = require("../environnement");
const fs = require("fs");
const path = require("path");

chargerFichierEnv();

const { poolBase, fermerBase } = require("../base-de-donnees");

const argumentsCli = new Set(process.argv.slice(2));
const doitConfirmer = argumentsCli.has("--confirmer");
const toutPaiements = argumentsCli.has("--tout-paiements");

const filtresDonneesTest = [
  "id_commande like 'commande_sandbox_%'",
  "origine = 'sandbox'",
  "coalesce(metadonnees->>'source', '') = 'sandbox'",
  "coalesce(metadonnees->>'scenario', '') like 'test_%'",
  "id_commande like 'test_api_%'",
  "id_commande like 'commande_webhook_ok_%'",
];
const filtreSandbox = `(${filtresDonneesTest.join(" or ")})`;
const filtre = toutPaiements ? "true" : filtreSandbox;
const libelleCible = toutPaiements
  ? "tous les paiements"
  : "les paiements sandbox et scenarios de test";
const dossierPreuves = path.join(__dirname, "..", "televersements", "preuves");

async function nettoyerDonneesTest() {
  const avant = await compterPaiements();
  const cible = await compterPaiements(filtre);

  console.log(`Paiements en base: ${avant}`);
  console.log(`Cible nettoyage: ${libelleCible}`);
  console.log(`Paiements qui seront supprimes: ${cible}`);

  if (!doitConfirmer) {
    console.log("");
    console.log("Aucune suppression faite.");
    console.log("Relancez avec --confirmer pour nettoyer la cible affichee.");
    console.log("Option disponible: --tout-paiements pour vider tous les paiements, sans supprimer les tables.");
    return;
  }

  const client = await poolBase.connect();
  let fichiersPreuves = [];

  try {
    await client.query("begin");
    const preuves = await client.query(
      `select preuve->>'nomFichierStocke' as nom_fichier from paiements where ${filtre} and preuve is not null`
    );
    fichiersPreuves = preuves.rows.map((ligne) => ligne.nom_fichier).filter(Boolean);
    const resultat = await client.query(`delete from paiements where ${filtre}`);
    await client.query("commit");
    console.log(`Paiements supprimes: ${resultat.rowCount}`);
  } catch (erreur) {
    await client.query("rollback");
    throw erreur;
  } finally {
    client.release();
  }

  const fichiersSupprimes = supprimerFichiersPreuves(fichiersPreuves);

  const apres = await compterPaiements();
  console.log(`Paiements restants en base: ${apres}`);
  console.log(`Fichiers de preuve supprimes: ${fichiersSupprimes}`);
  console.log("Tables et migrations conservees.");
}

async function compterPaiements(condition) {
  const requete = condition
    ? `select count(*)::int as total from paiements where ${condition}`
    : "select count(*)::int as total from paiements";
  const resultat = await poolBase.query(requete);
  return resultat.rows[0].total;
}

function supprimerFichiersPreuves(nomsFichiers) {
  let total = 0;

  for (const nomFichier of nomsFichiers) {
    const nomSur = path.basename(nomFichier);
    const chemin = path.join(dossierPreuves, nomSur);

    try {
      if (nomSur && fs.existsSync(chemin)) {
        fs.unlinkSync(chemin);
        total += 1;
      }
    } catch {
      continue;
    }
  }

  return total;
}

nettoyerDonneesTest()
  .then(async () => {
    await fermerBase();
  })
  .catch(async (erreur) => {
    console.error("Erreur nettoyage:", erreur.message);
    await fermerBase();
    process.exit(1);
  });
