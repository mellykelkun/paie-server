const { Pool } = require("pg");

const environnementExecution = String(process.env.ENVIRONNEMENT || process.env.NODE_ENV || "developpement");
const estProduction = environnementExecution === "production";

const poolBase = new Pool({
  host: process.env.HOTE_BASE_DE_DONNEES || "localhost",
  port: Number(process.env.PORT_BASE_DE_DONNEES || 5432),
  database: process.env.NOM_BASE_DE_DONNEES || "paie_server",
  user: process.env.UTILISATEUR_BASE_DE_DONNEES || "paie_server",
  password: lireSecretEnv("MOT_DE_PASSE_BASE_DE_DONNEES", "paie_server_dev"),
  max: Number(process.env.MAX_CONNEXIONS_BASE_DE_DONNEES || 10),
});

function lireSecretEnv(nom, valeurDeveloppement) {
  const valeur = String(process.env[nom] || "").trim();

  if (valeur) {
    return valeur;
  }

  if (estProduction) {
    throw new Error(`${nom} obligatoire en production.`);
  }

  return valeurDeveloppement;
}

function executerRequete(texte, valeurs) {
  return poolBase.query(texte, valeurs);
}

async function verifierBase() {
  await executerRequete("select 1");
}

async function fermerBase() {
  await poolBase.end();
}

module.exports = {
  poolBase,
  executerRequete,
  verifierBase,
  fermerBase,
};
