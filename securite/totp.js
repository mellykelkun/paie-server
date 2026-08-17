const crypto = require("crypto");

const ALPHABET_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function verifierCodeTotp(secretBase32, codeRecu, options = {}) {
  const secret = String(secretBase32 || "").replace(/\s/g, "").toUpperCase();
  const code = String(codeRecu || "").replace(/\s/g, "");
  const periode = Number(options.periode || 30);
  const chiffres = Number(options.chiffres || 6);
  const fenetre = Number(options.fenetre || 1);

  if (!secret || !/^\d{6}$/.test(code)) {
    return false;
  }

  const secretBuffer = decoderBase32(secret);

  if (!secretBuffer.length) {
    return false;
  }

  const compteurCourant = Math.floor(Date.now() / 1000 / periode);

  for (let decalage = -fenetre; decalage <= fenetre; decalage += 1) {
    const attendu = genererCodeTotp(secretBuffer, compteurCourant + decalage, chiffres);

    if (comparaisonSure(attendu, code)) {
      return true;
    }
  }

  return false;
}

function genererCodeTotp(secretBuffer, compteur, chiffres) {
  const tamponCompteur = Buffer.alloc(8);
  tamponCompteur.writeUInt32BE(Math.floor(compteur / 0x100000000), 0);
  tamponCompteur.writeUInt32BE(compteur & 0xffffffff, 4);

  const hmac = crypto.createHmac("sha1", secretBuffer).update(tamponCompteur).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaire =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const modulo = 10 ** chiffres;

  return String(binaire % modulo).padStart(chiffres, "0");
}

function decoderBase32(secret) {
  let bits = "";
  const octets = [];

  for (const caractere of secret.replace(/=+$/, "")) {
    const valeur = ALPHABET_BASE32.indexOf(caractere);

    if (valeur === -1) {
      return Buffer.alloc(0);
    }

    bits += valeur.toString(2).padStart(5, "0");
  }

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    octets.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(octets);
}

function comparaisonSure(a, b) {
  const gauche = Buffer.from(String(a));
  const droite = Buffer.from(String(b));

  if (gauche.length !== droite.length) {
    return false;
  }

  return crypto.timingSafeEqual(gauche, droite);
}

module.exports = {
  verifierCodeTotp,
};
