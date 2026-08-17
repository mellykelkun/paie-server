const fs = require("fs");
const path = require("path");
const chargerFichierEnv = require("../environnement");

chargerFichierEnv();

const { poolBase, fermerBase } = require("../base-de-donnees");

async function migrer() {
  const dossierMigrations = path.join(__dirname, "..", "migrations");
  const fichiers = fs
    .readdirSync(dossierMigrations)
    .filter((nom) => nom.endsWith(".sql"))
    .sort();

  await poolBase.query(`
    create table if not exists migrations_base (
      nom_fichier text primary key,
      appliquee_le timestamptz not null default now()
    )
  `);

  for (const fichier of fichiers) {
    const dejaAppliquee = await poolBase.query(
      "select 1 from migrations_base where nom_fichier = $1",
      [fichier]
    );

    if (dejaAppliquee.rowCount > 0) {
      console.log(`Migration deja appliquee: ${fichier}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(dossierMigrations, fichier), "utf8");
    const client = await poolBase.connect();

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into migrations_base (nom_fichier) values ($1)", [fichier]);
      await client.query("commit");
      console.log(`Migration appliquee: ${fichier}`);
    } catch (erreur) {
      await client.query("rollback");
      throw erreur;
    } finally {
      client.release();
    }
  }
}

migrer()
  .then(async () => {
    await fermerBase();
    console.log("Migrations terminees.");
  })
  .catch(async (erreur) => {
    console.error("Erreur migration:", erreur.message);
    await fermerBase();
    process.exit(1);
  });
