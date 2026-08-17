const crypto = require("crypto");
const { verifierCodeTotp } = require("./totp");

const NOM_COOKIE_SESSION = "paie_session_marchand";
const sessions = new Map();

function creerGestionnaireSessionMarchand(options) {
  const identifiant = String(options.identifiant || "admin").trim();
  const motDePasse = String(options.motDePasse || "").trim();
  const secretTotp = String(options.secretTotp || "").trim();
  const secretSession = String(options.secretSession || "").trim();
  const dureeMinutes = Number(options.dureeMinutes || 30);
  const cookieSecurise = Boolean(options.cookieSecurise);

  nettoyerSessionsExpirees();

  return {
    nomCookie: NOM_COOKIE_SESSION,
    authentifier,
    creerSession,
    lireSession,
    detruireSession,
    viderCookieSession,
    secretTotpConfigure: Boolean(secretTotp),
  };

  function authentifier(donnees) {
    const identifiantRecu = String(donnees.identifiant || "").trim();
    const motDePasseRecu = String(donnees.motDePasse || "");
    const code2fa = String(donnees.code2fa || "").trim();

    if (identifiantRecu !== identifiant) {
      return false;
    }

    if (!motDePasse || !comparaisonSure(motDePasse, motDePasseRecu)) {
      return false;
    }

    if (!secretTotp) {
      const environnement = String(process.env.ENVIRONNEMENT || process.env.NODE_ENV || "developpement");
      return environnement !== "production" && code2fa === "000000";
    }

    return verifierCodeTotp(secretTotp, code2fa);
  }

  function creerSession(reponse) {
    const jeton = crypto.randomBytes(32).toString("base64url");
    const empreinte = signerJeton(jeton);
    const expireLe = Date.now() + dureeMinutes * 60 * 1000;

    sessions.set(empreinte, {
      expireLe,
      dernierAcces: Date.now(),
    });

    reponse.setHeader("set-cookie", construireCookie(jeton, dureeMinutes * 60));
  }

  function lireSession(requete, reponse) {
    const cookies = lireCookies(requete);
    const jeton = cookies[NOM_COOKIE_SESSION];

    if (!jeton) {
      return null;
    }

    const empreinte = signerJeton(jeton);
    const session = sessions.get(empreinte);

    if (!session || session.expireLe <= Date.now()) {
      sessions.delete(empreinte);
      if (reponse) {
        viderCookieSession(reponse);
      }
      return null;
    }

    session.dernierAcces = Date.now();
    session.expireLe = Date.now() + dureeMinutes * 60 * 1000;

    if (reponse) {
      reponse.setHeader("set-cookie", construireCookie(jeton, dureeMinutes * 60));
    }

    return session;
  }

  function detruireSession(requete, reponse) {
    const cookies = lireCookies(requete);
    const jeton = cookies[NOM_COOKIE_SESSION];

    if (jeton) {
      sessions.delete(signerJeton(jeton));
    }

    viderCookieSession(reponse);
  }

  function viderCookieSession(reponse) {
    reponse.setHeader("set-cookie", construireCookie("", 0));
  }

  function signerJeton(jeton) {
    return crypto.createHmac("sha256", secretSession || "session_marchand_dev").update(jeton).digest("hex");
  }

  function construireCookie(valeur, maxAge) {
    const morceaux = [
      `${NOM_COOKIE_SESSION}=${encodeURIComponent(valeur)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${Math.max(0, Number(maxAge) || 0)}`,
    ];

    if (cookieSecurise) {
      morceaux.push("Secure");
    }

    return morceaux.join("; ");
  }
}

function lireCookies(requete) {
  const entete = String(requete.headers.cookie || "");
  const cookies = {};

  for (const morceau of entete.split(";")) {
    const index = morceau.indexOf("=");

    if (index === -1) {
      continue;
    }

    const nom = morceau.slice(0, index).trim();
    const valeur = morceau.slice(index + 1).trim();

    if (nom) {
      cookies[nom] = decodeURIComponent(valeur);
    }
  }

  return cookies;
}

function comparaisonSure(a, b) {
  const gauche = Buffer.from(String(a));
  const droite = Buffer.from(String(b));

  if (gauche.length !== droite.length) {
    return false;
  }

  return crypto.timingSafeEqual(gauche, droite);
}

function nettoyerSessionsExpirees() {
  const maintenant = Date.now();

  for (const [cle, session] of sessions.entries()) {
    if (!session || session.expireLe <= maintenant) {
      sessions.delete(cle);
    }
  }
}

module.exports = {
  creerGestionnaireSessionMarchand,
};
