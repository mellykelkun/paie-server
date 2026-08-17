const { createWorker } = require("tesseract.js");
const donneesFrancaises = require("@tesseract.js-data/fra");
const jpeg = require("jpeg-js");
const { PNG } = require("pngjs");

let workerPromise = null;
let fileReconnaissance = Promise.resolve();

async function analyserImagePreuve(image, paiement, moyenPaiement) {
  if (process.env.OCR_PREUVE_ACTIVE === "false") {
    return {
      active: false,
      texte: "",
      json: null,
      message: "OCR desactive par configuration.",
      indicesFraude: [],
      montantDetecte: null,
      montantCorrespond: null,
      analyseMontant: null,
      conformiteProvider: null,
      analyseForensique: null,
      analyseZones: null,
    };
  }

  const analyseForensique = analyserForensiqueImage(image);
  const providerAttendu = determinerProviderAttendu(moyenPaiement);
  const validationImage = analyseForensique.validationImage || {};

  if (validationImage.ok === false) {
    return {
      active: true,
      texte: "",
      json: {
        confiance: 0,
        montantDetecte: null,
        montantsDetectes: [],
        montant: null,
        montantAttendu: Number(paiement.montant),
        deviseAttendue: paiement.devise,
        indicesFraude: [],
        provider: null,
        forensique: analyseForensique,
        zones: null,
      },
      message: validationImage.erreur || "Image non exploitable par le controle automatique.",
      indicesFraude: [],
      montantDetecte: null,
      montantCorrespond: null,
      analyseMontant: null,
      conformiteProvider: null,
      analyseForensique,
      analyseZones: null,
      erreur: true,
    };
  }

  try {
    const resultat = await executerReconnaissance(image);
    const texte = limiterTexte(resultat.data.text || "", 5000);
    const analyseZones = await reconnaitreZones(image, providerAttendu, analyseForensique.infosImage);
    const texteAnalyse = [texte, analyseZones.texte].filter(Boolean).join("\n");
    const texteNormalise = normaliserTexte(texteAnalyse);
    const indicesFraude = detecterIndicesFraude(texteNormalise);
    const montantsDetectes = detecterMontants(texteNormalise);
    const analyseMontant = analyserMontantsDetectes(montantsDetectes, paiement.montant);
    const montantDetecte = analyseMontant.montantPrincipal;
    const montantCorrespond = analyseMontant.correspond;
    const conformiteProvider = analyserConformiteProvider({
      texteNormalise,
      paiement,
      moyenPaiement,
      montantsDetectes,
      analyseMontant,
    });

    return {
      active: true,
      texte,
      json: {
        confiance: Math.round(Number(resultat.data.confidence || 0)),
        montantDetecte,
        montantsDetectes,
        montant: analyseMontant,
        montantAttendu: Number(paiement.montant),
        deviseAttendue: paiement.devise,
        indicesFraude,
        provider: conformiteProvider,
        forensique: analyseForensique,
        zones: analyseZones,
      },
      message: "OCR execute.",
      indicesFraude,
      montantDetecte,
      montantCorrespond,
      analyseMontant,
      conformiteProvider,
      analyseForensique,
      analyseZones,
    };
  } catch (erreur) {
    return {
      active: true,
      texte: "",
      json: null,
      message: `OCR indisponible: ${limiterTexte(erreur.message || "erreur inconnue", 180)}`,
      indicesFraude: [],
      montantDetecte: null,
      montantCorrespond: null,
      analyseMontant: null,
      conformiteProvider: null,
      analyseForensique,
      analyseZones: null,
      erreur: true,
    };
  }
}

function executerReconnaissance(image, options = {}) {
  fileReconnaissance = fileReconnaissance.then(async () => {
    const worker = await obtenirWorker();
    return worker.recognize(image, options);
  });

  return fileReconnaissance;
}

async function obtenirWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("fra", undefined, {
      langPath: donneesFrancaises.langPath,
      gzip: donneesFrancaises.gzip,
      logger: () => {},
    });
  }

  return workerPromise;
}

async function reconnaitreZones(image, providerAttendu, infosImage) {
  if (process.env.OCR_ZONES_ACTIVE === "false") {
    return {
      active: false,
      providerAttendu,
      texte: "",
      zones: [],
      message: "OCR par zones desactive par configuration.",
    };
  }

  const zones = construireZonesOcr(providerAttendu, infosImage);

  if (zones.length === 0) {
    return {
      active: true,
      providerAttendu,
      texte: "",
      zones: [],
      message: "Aucune zone OCR exploitable.",
    };
  }

  const resultats = [];

  for (const zone of zones) {
    const resultat = await executerReconnaissance(image, { rectangle: zone.rectangle });
    const texte = limiterTexte(resultat.data.text || "", 1200);

    resultats.push({
      nom: zone.nom,
      rectangle: zone.rectangle,
      confiance: Math.round(Number(resultat.data.confidence || 0)),
      texte,
    });
  }

  return {
    active: true,
    providerAttendu,
    texte: resultats.map((zone) => zone.texte).filter(Boolean).join("\n"),
    zones: resultats,
    message: "OCR par zones execute.",
  };
}

function construireZonesOcr(providerAttendu, infosImage) {
  if (!infosImage || !infosImage.largeur || !infosImage.hauteur) {
    return [];
  }

  if (providerAttendu === "wave") {
    return [
      creerZoneOcr("wave_entete", infosImage, 0.18, 0.03, 0.64, 0.24),
      creerZoneOcr("wave_montant", infosImage, 0.06, 0.18, 0.88, 0.22),
      creerZoneOcr("wave_client", infosImage, 0.06, 0.35, 0.88, 0.22),
      creerZoneOcr("wave_statut_date", infosImage, 0.06, 0.50, 0.88, 0.25),
      creerZoneOcr("wave_detail_reference", infosImage, 0.04, 0.57, 0.92, 0.24),
    ];
  }

  if (providerAttendu === "maxi_it_orange") {
    return [
      creerZoneOcr("orange_entete", infosImage, 0.02, 0.08, 0.96, 0.20),
      creerZoneOcr("orange_montant_beneficiaire", infosImage, 0.03, 0.22, 0.94, 0.30),
      creerZoneOcr("orange_details_transaction", infosImage, 0.03, 0.45, 0.94, 0.34),
      creerZoneOcr("orange_details_compte", infosImage, 0.03, 0.62, 0.94, 0.28),
    ];
  }

  return [
    creerZoneOcr("haut", infosImage, 0.03, 0.05, 0.94, 0.30),
    creerZoneOcr("milieu", infosImage, 0.03, 0.30, 0.94, 0.40),
    creerZoneOcr("bas", infosImage, 0.03, 0.58, 0.94, 0.35),
  ];
}

function creerZoneOcr(nom, infosImage, gauche, haut, largeur, hauteur) {
  const left = Math.max(0, Math.round(infosImage.largeur * gauche));
  const top = Math.max(0, Math.round(infosImage.hauteur * haut));
  const width = Math.min(infosImage.largeur - left, Math.round(infosImage.largeur * largeur));
  const height = Math.min(infosImage.hauteur - top, Math.round(infosImage.hauteur * hauteur));

  return {
    nom,
    rectangle: { left, top, width, height },
  };
}

function determinerProviderAttendu(moyenPaiement) {
  const codeMoyen = String(moyenPaiement && moyenPaiement.code).toLowerCase();

  if (codeMoyen.includes("orange")) {
    return "maxi_it_orange";
  }

  if (codeMoyen.includes("wave")) {
    return "wave";
  }

  return "";
}

function analyserMontantsDetectes(montantsDetectes, montantAttendu) {
  const attendu = Number(montantAttendu);
  const tolerancePourcent = lireNombreEnv("TOLERANCE_FRAIS_MONTANT_POURCENT", 30);
  const montants = [...new Set((montantsDetectes || []).map(Number).filter((montant) => Number.isFinite(montant) && montant > 0))];

  if (!Number.isFinite(attendu) || attendu <= 0 || montants.length === 0) {
    return {
      montantPrincipal: montants.length > 0 ? Math.max(...montants) : null,
      montantLePlusProche: null,
      correspond: montants.length === 0 ? null : false,
      ecart: null,
      ecartPourcent: null,
      tolerancePourcent,
      fraisMaxAcceptes: null,
      borneBasse: null,
      borneHaute: null,
    };
  }

  const fraisMaxAcceptes = attendu * (Math.max(0, tolerancePourcent) / 100);
  const borneBasse = attendu;
  const borneHaute = attendu + fraisMaxAcceptes;
  const montantsTries = [...montants].sort((a, b) => Math.abs(a - attendu) - Math.abs(b - attendu));
  const montantLePlusProche = montantsTries[0];
  const ecart = montantLePlusProche - attendu;
  const ecartPourcent = Number(((Math.abs(ecart) / attendu) * 100).toFixed(2));
  const correspond = montants.some((montant) => montant >= borneBasse && montant <= borneHaute);

  return {
    montantPrincipal: Math.max(...montants),
    montantLePlusProche,
    correspond,
    ecart,
    ecartPourcent,
    tolerancePourcent,
    fraisMaxAcceptes: Number(fraisMaxAcceptes.toFixed(2)),
    borneBasse: Number(borneBasse.toFixed(2)),
    borneHaute: Number(borneHaute.toFixed(2)),
  };
}

function lireNombreEnv(nom, defaut) {
  const valeur = Number(process.env[nom]);

  return Number.isFinite(valeur) ? valeur : defaut;
}

function detecterIndicesFraude(texteNormalise) {
  const motifs = [
    ["paiement de test", "Mention paiement de test"],
    ["simulation", "Mention simulation"],
    ["donnees de test", "Mention donnees de test"],
    ["donnee de test", "Mention donnee de test"],
    ["document fictif", "Mention document fictif"],
    ["aucune valeur financiere", "Mention aucune valeur financiere"],
    ["test-wave", "Reference de test Wave"],
    ["test wave", "Reference de test Wave"],
  ];

  return motifs
    .filter(([motif]) => texteNormalise.includes(motif))
    .map(([, libelle]) => libelle);
}

function analyserForensiqueImage(image) {
  const infosImage = lireInfosImage(image);
  const chaines = extraireChainesLisibles(image);
  const texteBrut = normaliserTexte(chaines.join(" "));
  const signaux = [];
  const validationImage = validerImageDecodee(image, infosImage);
  const empreinteVisuelle = validationImage.ok ? calculerEmpreinteVisuelle(validationImage) : null;
  const metadonnees = {
    c2paPresent: /\bc2pa\b|content credentials|jumbf/.test(texteBrut),
    exifPresent: /\bexif\b/.test(texteBrut),
    xmpPresent: /\bxmp\b|http:\/\/ns\.adobe\.com\/xap/.test(texteBrut),
    photoshopPresent: /photoshop|8bim|adobe image resource/.test(texteBrut),
    logicielDetecte: [],
    provenanceIA: [],
  };

  const outilsIA = [
    ["openai", "OpenAI"],
    ["gpt-image", "gpt-image"],
    ["chatgpt", "ChatGPT"],
    ["dall-e", "DALL-E"],
    ["dalle", "DALL-E"],
    ["trainedalgorithmicmedia", "C2PA trainedAlgorithmicMedia"],
    ["stable diffusion", "Stable Diffusion"],
    ["comfyui", "ComfyUI"],
    ["automatic1111", "Automatic1111"],
    ["midjourney", "Midjourney"],
    ["leonardo", "Leonardo AI"],
    ["ideogram", "Ideogram"],
    ["firefly", "Adobe Firefly"],
    ["flux", "Flux"],
  ];
  const outilsEdition = [
    ["adobe photoshop", "Adobe Photoshop"],
    ["photoshop", "Photoshop"],
    ["photopea", "Photopea"],
    ["canva", "Canva"],
    ["gimp", "GIMP"],
    ["picsart", "Picsart"],
    ["pixlr", "Pixlr"],
    ["pixelmator", "Pixelmator"],
    ["snapseed", "Snapseed"],
    ["lightroom", "Lightroom"],
    ["krita", "Krita"],
    ["figma", "Figma"],
    ["imagemagick", "ImageMagick"],
    ["paint.net", "Paint.NET"],
    ["capcut", "CapCut"],
  ];
  const outilsIaDetectes = detecterMotifs(texteBrut, outilsIA);
  const outilsEditionDetectes = detecterMotifs(texteBrut, outilsEdition);

  metadonnees.provenanceIA = outilsIaDetectes;
  metadonnees.logicielDetecte = outilsEditionDetectes;

  if (validationImage.erreur) {
    ajouterSignalForensique(
      signaux,
      "image_decode_invalide",
      "CRITIQUE",
      "Decodage image",
      validationImage.erreur,
      55
    );
  }

  if (validationImage.pixelsTropGrands) {
    ajouterSignalForensique(
      signaux,
      "image_pixels_trop_grands",
      "CRITIQUE",
      "Dimensions image",
      `L'image contient ${validationImage.totalPixels} pixels, au-dessus de la limite ${validationImage.maxPixels}.`,
      35
    );
  }

  if (outilsIaDetectes.length > 0) {
    ajouterSignalForensique(
      signaux,
      "provenance_ia_detectee",
      "CRITIQUE",
      "Generation IA",
      `Le fichier contient une trace de generation IA: ${outilsIaDetectes.join(", ")}.`,
      55
    );
  }

  if (outilsEditionDetectes.length > 0) {
    ajouterSignalForensique(
      signaux,
      "logiciel_edition_detecte",
      "CRITIQUE",
      "Logiciel d'edition",
      `Le fichier contient une trace d'edition externe: ${outilsEditionDetectes.join(", ")}.`,
      45
    );
  }

  if (metadonnees.c2paPresent && outilsIaDetectes.length === 0 && outilsEditionDetectes.length === 0) {
    ajouterSignalForensique(
      signaux,
      "c2pa_present",
      "MOYEN",
      "Provenance C2PA",
      "Le fichier contient des metadonnees C2PA. Elles doivent etre consultees avec les autres controles.",
      10
    );
  }

  if (infosImage.format === "png" && metadonnees.c2paPresent) {
    ajouterSignalForensique(
      signaux,
      "png_c2pa",
      outilsIaDetectes.length > 0 ? "CRITIQUE" : "MOYEN",
      "PNG avec provenance",
      "Le PNG contient un bloc de provenance integre. Verifiez son origine dans les details.",
      outilsIaDetectes.length > 0 ? 35 : 8
    );
  }

  if (!infosImage.largeur || !infosImage.hauteur) {
    ajouterSignalForensique(
      signaux,
      "dimensions_non_lues",
      "MOYEN",
      "Dimensions image",
      "Les dimensions du fichier n'ont pas pu etre lues depuis l'en-tete image.",
      12
    );
  } else {
    const ratio = Number((infosImage.hauteur / infosImage.largeur).toFixed(2));
    infosImage.ratioHauteurLargeur = ratio;

    if (infosImage.largeur < 360 || infosImage.hauteur < 600) {
      ajouterSignalForensique(
        signaux,
        "dimensions_faibles",
        "MOYEN",
        "Resolution faible",
        "La resolution est faible pour un recu mobile complet.",
        12
      );
    }

    if (ratio < 1.25 || ratio > 2.8) {
      ajouterSignalForensique(
        signaux,
        "ratio_atypique",
        "FAIBLE",
        "Ratio atypique",
        "Le cadrage ne ressemble pas a une capture mobile verticale classique.",
        5
      );
    }
  }

  if (infosImage.format === "webp") {
    ajouterSignalForensique(
      signaux,
      "format_webp",
      "FAIBLE",
      "Format WebP",
      "Le fichier est en WebP. Ce format peut indiquer une conversion par une application intermediaire.",
      5
    );
  }

  if (infosImage.format === "jpeg" && infosImage.nombreTablesQuantification > 4) {
    ajouterSignalForensique(
      signaux,
      "tables_jpeg_nombreuses",
      "FAIBLE",
      "Compression JPEG",
      "Le JPEG contient plus de tables de quantification que la plupart des captures simples.",
      5
    );
  }

  const score = Math.max(0, 100 - signaux.reduce((total, signal) => total + signal.poids, 0));

  return {
    score,
    niveau: niveauForensique(signaux),
    signaux,
    infosImage,
    validationImage: {
      ok: validationImage.ok,
      formatDecode: validationImage.formatDecode,
      largeurDecodee: validationImage.largeur,
      hauteurDecodee: validationImage.hauteur,
      totalPixels: validationImage.totalPixels,
      maxPixels: validationImage.maxPixels,
      erreur: validationImage.erreur || null,
    },
    empreinteVisuelle,
    metadonnees,
  };
}

function detecterMotifs(texteNormalise, motifs) {
  return motifs
    .filter(([motif]) => texteNormalise.includes(motif))
    .map(([, libelle]) => libelle)
    .filter((libelle, index, liste) => liste.indexOf(libelle) === index);
}

function ajouterSignalForensique(signaux, code, gravite, libelle, message, poids) {
  signaux.push({
    code,
    gravite,
    libelle,
    message,
    poids,
  });
}

function niveauForensique(signaux) {
  const gravites = signaux.map((signal) => signal.gravite);

  if (gravites.includes("CRITIQUE")) return "CRITIQUE";
  if (gravites.includes("ELEVE")) return "ELEVE";
  if (gravites.includes("MOYEN")) return "MOYEN";
  if (gravites.includes("FAIBLE")) return "FAIBLE";

  return "OK";
}

function lireInfosImage(image) {
  if (!Buffer.isBuffer(image)) {
    return { format: "inconnu", largeur: null, hauteur: null };
  }

  if (estPng(image)) {
    return lireInfosPng(image);
  }

  if (estJpeg(image)) {
    return lireInfosJpeg(image);
  }

  if (estWebp(image)) {
    return lireInfosWebp(image);
  }

  return { format: "inconnu", largeur: null, hauteur: null };
}

function estPng(image) {
  return image.length >= 24 && image.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function estJpeg(image) {
  return image.length >= 4 && image[0] === 0xff && image[1] === 0xd8;
}

function estWebp(image) {
  return image.length >= 16 && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP";
}

function lireInfosPng(image) {
  const infos = {
    format: "png",
    largeur: image.readUInt32BE(16),
    hauteur: image.readUInt32BE(20),
    chunks: [],
  };
  let position = 8;

  while (position + 8 <= image.length && infos.chunks.length < 80) {
    const longueur = image.readUInt32BE(position);
    const type = image.toString("ascii", position + 4, position + 8);
    infos.chunks.push(type);
    position += 12 + longueur;

    if (type === "IEND" || position > image.length) {
      break;
    }
  }

  return infos;
}

function lireInfosJpeg(image) {
  const infos = {
    format: "jpeg",
    largeur: null,
    hauteur: null,
    progressif: false,
    segments: [],
    nombreTablesQuantification: 0,
    exifPresent: false,
    xmpPresent: false,
    photoshopPresent: false,
  };
  let position = 2;

  while (position + 4 < image.length && infos.segments.length < 160) {
    if (image[position] !== 0xff) {
      position += 1;
      continue;
    }

    while (image[position] === 0xff) {
      position += 1;
    }

    const marqueur = image[position];
    position += 1;

    if (marqueur === 0xd9 || marqueur === 0xda) {
      break;
    }

    if (marqueur >= 0xd0 && marqueur <= 0xd7) {
      continue;
    }

    if (position + 2 > image.length) {
      break;
    }

    const longueur = image.readUInt16BE(position);
    const debut = position + 2;
    const fin = position + longueur;

    if (longueur < 2 || fin > image.length) {
      break;
    }

    const nomMarqueur = `ff${marqueur.toString(16).padStart(2, "0")}`;
    infos.segments.push(nomMarqueur);

    if (marqueur === 0xdb) {
      infos.nombreTablesQuantification += compterTablesQuantification(image.slice(debut, fin));
    }

    if (marqueur === 0xe1) {
      const entete = image.toString("latin1", debut, Math.min(fin, debut + 80));
      infos.exifPresent = infos.exifPresent || entete.includes("Exif");
      infos.xmpPresent = infos.xmpPresent || entete.includes("http://ns.adobe.com/xap");
    }

    if (marqueur === 0xed) {
      infos.photoshopPresent = true;
    }

    if (estMarqueurSof(marqueur) && debut + 7 <= fin) {
      infos.hauteur = image.readUInt16BE(debut + 1);
      infos.largeur = image.readUInt16BE(debut + 3);
      infos.progressif = marqueur === 0xc2;
    }

    position = fin;
  }

  return infos;
}

function estMarqueurSof(marqueur) {
  return [
    0xc0,
    0xc1,
    0xc2,
    0xc3,
    0xc5,
    0xc6,
    0xc7,
    0xc9,
    0xca,
    0xcb,
    0xcd,
    0xce,
    0xcf,
  ].includes(marqueur);
}

function compterTablesQuantification(segment) {
  let position = 0;
  let total = 0;

  while (position < segment.length) {
    const precision = segment[position] >> 4;
    const taille = precision === 0 ? 65 : 129;
    total += 1;
    position += taille;
  }

  return total;
}

function lireInfosWebp(image) {
  const infos = { format: "webp", largeur: null, hauteur: null, chunks: [] };
  let position = 12;

  while (position + 8 <= image.length && infos.chunks.length < 80) {
    const type = image.toString("ascii", position, position + 4);
    const longueur = image.readUInt32LE(position + 4);
    const debut = position + 8;
    infos.chunks.push(type.trim());

    if (type === "VP8X" && debut + 10 <= image.length) {
      infos.largeur = 1 + lireUInt24LE(image, debut + 4);
      infos.hauteur = 1 + lireUInt24LE(image, debut + 7);
    }

    if (type === "VP8 " && debut + 10 <= image.length) {
      infos.largeur = image.readUInt16LE(debut + 6) & 0x3fff;
      infos.hauteur = image.readUInt16LE(debut + 8) & 0x3fff;
    }

    if (type === "VP8L" && debut + 5 <= image.length && image[debut] === 0x2f) {
      const b1 = image[debut + 1];
      const b2 = image[debut + 2];
      const b3 = image[debut + 3];
      const b4 = image[debut + 4];
      infos.largeur = 1 + (((b2 & 0x3f) << 8) | b1);
      infos.hauteur = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    }

    position = debut + longueur + (longueur % 2);
  }

  return infos;
}

function lireUInt24LE(image, position) {
  return image[position] | (image[position + 1] << 8) | (image[position + 2] << 16);
}

function extraireChainesLisibles(image) {
  if (!Buffer.isBuffer(image) || image.length === 0) {
    return [];
  }

  return (image.toString("latin1").match(/[\x20-\x7e]{4,}/g) || []).slice(0, 1500);
}

function validerImageDecodee(image, infosImage) {
  const format = infosImage && infosImage.format;
  const maxPixels = lireNombreEnv("MAX_PIXELS_PREUVE", 6_000_000);
  const base = {
    ok: false,
    formatDecode: format || "inconnu",
    largeur: null,
    hauteur: null,
    totalPixels: null,
    maxPixels,
    pixelsTropGrands: false,
    donnees: null,
    erreur: null,
  };

  if (format === "webp") {
    const totalPixels = infosImage.largeur && infosImage.hauteur ? infosImage.largeur * infosImage.hauteur : null;
    const pixelsTropGrands = totalPixels !== null && totalPixels > maxPixels;

    return {
      ...base,
      ok: !pixelsTropGrands,
      largeur: infosImage.largeur || null,
      hauteur: infosImage.hauteur || null,
      totalPixels,
      pixelsTropGrands,
      erreur: null,
    };
  }

  try {
    const decodee = decoderPixelsImage(image, format);

    if (!decodee) {
      return {
        ...base,
        erreur: "Le format image ne peut pas etre decode par le controle local.",
      };
    }

    const totalPixels = decodee.largeur * decodee.hauteur;

    return {
      ...base,
      ok: totalPixels <= maxPixels,
      largeur: decodee.largeur,
      hauteur: decodee.hauteur,
      totalPixels,
      pixelsTropGrands: totalPixels > maxPixels,
      donnees: decodee.donnees,
      erreur: totalPixels > maxPixels ? null : null,
    };
  } catch (erreur) {
    return {
      ...base,
      erreur: `Le fichier image est invalide ou corrompu: ${limiterTexte(erreur.message || "decodage impossible", 160)}`,
    };
  }
}

function decoderPixelsImage(image, format) {
  if (format === "jpeg") {
    const decodee = jpeg.decode(image, { useTArray: true, maxMemoryUsageInMB: 128 });

    return {
      largeur: decodee.width,
      hauteur: decodee.height,
      donnees: decodee.data,
    };
  }

  if (format === "png") {
    const decodee = PNG.sync.read(image);

    return {
      largeur: decodee.width,
      hauteur: decodee.height,
      donnees: decodee.data,
    };
  }

  return null;
}

function calculerEmpreinteVisuelle(imageDecodee) {
  if (!imageDecodee || !imageDecodee.donnees || !imageDecodee.largeur || !imageDecodee.hauteur) {
    return null;
  }

  const miniature32 = redimensionnerGris(imageDecodee, 32, 32);
  const miniature17x16 = redimensionnerGris(imageDecodee, 17, 16);
  const miniature16 = redimensionnerGris(imageDecodee, 16, 16);

  return {
    algorithmes: ["phash_dct_8x8", "dhash_17x16", "ahash_16x16"],
    phash: calculerPHashDct(miniature32),
    dhash: calculerDHash(miniature17x16),
    ahash: calculerAHash(miniature16),
    largeur: imageDecodee.largeur,
    hauteur: imageDecodee.hauteur,
  };
}

function redimensionnerGris(imageDecodee, largeurCible, hauteurCible) {
  const pixels = new Array(largeurCible * hauteurCible);
  const largeurSource = imageDecodee.largeur;
  const hauteurSource = imageDecodee.hauteur;
  const donnees = imageDecodee.donnees;

  for (let y = 0; y < hauteurCible; y += 1) {
    const sourceYDebut = Math.floor((y * hauteurSource) / hauteurCible);
    const sourceYFin = Math.max(sourceYDebut + 1, Math.floor(((y + 1) * hauteurSource) / hauteurCible));

    for (let x = 0; x < largeurCible; x += 1) {
      const sourceXDebut = Math.floor((x * largeurSource) / largeurCible);
      const sourceXFin = Math.max(sourceXDebut + 1, Math.floor(((x + 1) * largeurSource) / largeurCible));
      let total = 0;
      let poids = 0;

      for (let sourceY = sourceYDebut; sourceY < sourceYFin && sourceY < hauteurSource; sourceY += 1) {
        for (let sourceX = sourceXDebut; sourceX < sourceXFin && sourceX < largeurSource; sourceX += 1) {
          const position = (sourceY * largeurSource + sourceX) * 4;
          const rouge = donnees[position];
          const vert = donnees[position + 1];
          const bleu = donnees[position + 2];
          const alpha = donnees[position + 3] === undefined ? 255 : donnees[position + 3];
          const gris = 0.299 * rouge + 0.587 * vert + 0.114 * bleu;
          const poidsAlpha = alpha / 255;

          total += gris * poidsAlpha + 255 * (1 - poidsAlpha);
          poids += 1;
        }
      }

      pixels[y * largeurCible + x] = poids > 0 ? total / poids : 255;
    }
  }

  return { largeur: largeurCible, hauteur: hauteurCible, pixels };
}

function calculerPHashDct(miniature) {
  const taille = 32;
  const coefficients = [];

  for (let v = 0; v < 8; v += 1) {
    for (let u = 0; u < 8; u += 1) {
      coefficients.push(dctCoefficient(miniature.pixels, taille, u, v));
    }
  }

  const sansDc = coefficients.slice(1);
  const mediane = calculerMediane(sansDc);
  const bits = coefficients.map((coefficient, index) => {
    if (index === 0) return 0;
    return coefficient > mediane ? 1 : 0;
  });

  return bitsVersHex(bits);
}

function dctCoefficient(pixels, taille, u, v) {
  let somme = 0;

  for (let y = 0; y < taille; y += 1) {
    for (let x = 0; x < taille; x += 1) {
      const pixelCentre = pixels[y * taille + x] - 128;
      somme +=
        pixelCentre *
        Math.cos(((2 * x + 1) * u * Math.PI) / (2 * taille)) *
        Math.cos(((2 * y + 1) * v * Math.PI) / (2 * taille));
    }
  }

  const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
  const cv = v === 0 ? 1 / Math.sqrt(2) : 1;

  return (2 / taille) * cu * cv * somme;
}

function calculerDHash(miniature) {
  const bits = [];

  for (let y = 0; y < miniature.hauteur; y += 1) {
    for (let x = 0; x < miniature.largeur - 1; x += 1) {
      const gauche = miniature.pixels[y * miniature.largeur + x];
      const droite = miniature.pixels[y * miniature.largeur + x + 1];
      bits.push(gauche > droite ? 1 : 0);
    }
  }

  return bitsVersHex(bits);
}

function calculerAHash(miniature) {
  const moyenne = miniature.pixels.reduce((total, pixel) => total + pixel, 0) / miniature.pixels.length;
  const bits = miniature.pixels.map((pixel) => (pixel >= moyenne ? 1 : 0));

  return bitsVersHex(bits);
}

function calculerMediane(valeurs) {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);

  return triees.length % 2 === 0 ? (triees[milieu - 1] + triees[milieu]) / 2 : triees[milieu];
}

function bitsVersHex(bits) {
  let hex = "";

  for (let index = 0; index < bits.length; index += 4) {
    const quartet = bits.slice(index, index + 4);
    while (quartet.length < 4) {
      quartet.push(0);
    }

    hex += parseInt(quartet.join(""), 2).toString(16);
  }

  return hex;
}

function analyserConformiteProvider(donnees) {
  const codeMoyen = String(donnees.moyenPaiement && donnees.moyenPaiement.code).toLowerCase();
  const providerAttendu = codeMoyen.includes("orange") ? "maxi_it_orange" : codeMoyen.includes("wave") ? "wave" : "";
  const numeroAttendu = normaliserNumeroTelephone(donnees.moyenPaiement && donnees.moyenPaiement.numeroCompte);
  const numerosDetectes = detecterNumerosTelephone(donnees.texteNormalise);
  const referenceDetectee = detecterReference(donnees.texteNormalise, providerAttendu);
  const dateDetectee = detecterDate(donnees.texteNormalise);
  const analyseMontant = donnees.analyseMontant || analyserMontantsDetectes(donnees.montantsDetectes, donnees.paiement.montant);
  const montantCorrespond = analyseMontant.correspond;
  const telephoneCorrespond =
    !numeroAttendu || numerosDetectes.some((numero) => numerosEgaux(numero, numeroAttendu));
  const providerDetecte = detecterProvider(donnees.texteNormalise);
  const dateCoherente = dateDetectee
    ? dateDansFenetrePaiement(dateDetectee, donnees.paiement)
    : false;
  const statutEffectue =
    /\beffectu[ée]?[e]?\b/.test(donnees.texteNormalise) ||
    (providerAttendu === "maxi_it_orange" &&
      donnees.texteNormalise.includes("recu de transaction") &&
      Boolean(referenceDetectee));
  const champs = {
    providerReconnu: Boolean(providerDetecte),
    providerCorrespond: !providerAttendu || providerDetecte === providerAttendu,
    statutEffectue,
    montantPresent: donnees.montantsDetectes.length > 0,
    montantCorrespond,
    telephonePresent: numerosDetectes.length > 0,
    telephoneCorrespond,
    datePresente: Boolean(dateDetectee),
    dateCoherente,
    referencePresente: Boolean(referenceDetectee),
    structureConforme: structureProviderConforme(donnees.texteNormalise, providerAttendu),
  };
  const referenceObligatoire = providerAttendu === "maxi_it_orange";
  const champsManquants = [];

  if (!champs.providerReconnu) champsManquants.push("provider_non_reconnu");
  if (!champs.providerCorrespond) champsManquants.push("provider_incorrect");
  if (!champs.structureConforme) champsManquants.push("structure_provider_incomplete");
  if (!champs.statutEffectue) champsManquants.push("statut_effectue_absent");
  if (!champs.montantPresent) champsManquants.push("montant_absent");
  if (!champs.montantCorrespond) champsManquants.push("montant_different");
  if (numeroAttendu && !champs.telephonePresent) champsManquants.push("telephone_absent");
  if (numeroAttendu && !champs.telephoneCorrespond) champsManquants.push("telephone_destinataire_different");
  if (!champs.datePresente) champsManquants.push("date_absente");
  if (champs.datePresente && !champs.dateCoherente) champsManquants.push("date_recu_incoherente");
  if (referenceObligatoire && !champs.referencePresente) champsManquants.push("reference_absente");

  return {
    providerAttendu,
    providerDetecte,
    champs,
    champsManquants,
    conforme: champsManquants.length === 0,
    numeroAttendu,
    numerosDetectes,
    referenceDetectee,
    referenceObligatoire,
    dateDetectee: dateDetectee ? dateDetectee.toISOString() : null,
    montant: analyseMontant,
  };
}

function detecterProvider(texteNormalise) {
  const estMaxiOrange =
    texteNormalise.includes("montant transfere") ||
    texteNormalise.includes("coordonnees du beneficiaire") ||
    texteNormalise.includes("details de la transaction") ||
    /\bpp\d{6}\.\d{4}\.[a-z0-9]+\b/i.test(texteNormalise);

  if (estMaxiOrange) {
    return "maxi_it_orange";
  }

  const estWave =
    texteNormalise.includes("wave") ||
    texteNormalise.includes("en partenariat avec uba") ||
    /\bt[_-][a-z0-9]{8,}/i.test(texteNormalise);

  if (estWave) {
    return "wave";
  }

  return "";
}

function structureProviderConforme(texteNormalise, providerAttendu) {
  if (providerAttendu === "wave") {
    const blocsWave = [
      texteNormalise.includes("recu de transaction") || texteNormalise.includes("id de transaction"),
      texteNormalise.includes("montant"),
      texteNormalise.includes("statut"),
      texteNormalise.includes("date et heure"),
      texteNormalise.includes("client") || texteNormalise.includes("montant recu") || texteNormalise.includes("a "),
    ];

    return blocsWave.filter(Boolean).length >= 4;
  }

  if (providerAttendu === "maxi_it_orange") {
    const blocsOrange = [
      texteNormalise.includes("recu de transaction") || texteNormalise.includes("details de la transaction"),
      texteNormalise.includes("montant transfere") || texteNormalise.includes("montant recu"),
      texteNormalise.includes("coordonnees du beneficiaire"),
      texteNormalise.includes("numero"),
      texteNormalise.includes("type de service") || texteNormalise.includes("transfert d'argent"),
      texteNormalise.includes("reference") || /\bpp\d{6}\.\d{4}\.[a-z0-9]+\b/i.test(texteNormalise),
    ];

    return blocsOrange.filter(Boolean).length >= 5;
  }

  return true;
}

function detecterMontants(texteNormalise) {
  const montants = [];
  const expression = /[-+]?(\d[\d\s.,]*)\s*(?:f\s*cfa|fcfa|cfa|xof|rer|rcra|f\b)/gi;
  let resultat = expression.exec(texteNormalise);

  while (resultat) {
    const valeur = Number(resultat[1].replace(/[\s.]/g, "").replace(",", "."));

    if (Number.isFinite(valeur) && valeur > 0) {
      montants.push(valeur);
    }

    resultat = expression.exec(texteNormalise);
  }

  return [...new Set(montants)];
}

function detecterNumerosTelephone(texteNormalise) {
  const numeros = [];
  const expression = /(?:\+?\d[\d\s]{7,}\d)/g;
  let resultat = expression.exec(texteNormalise);

  while (resultat) {
    const numero = normaliserNumeroTelephone(resultat[0]);

    if (numero && numero.length >= 8 && numero.length <= 10) {
      numeros.push(numero);
    }

    resultat = expression.exec(texteNormalise);
  }

  return [...new Set(numeros)];
}

function normaliserNumeroTelephone(valeur) {
  let chiffres = String(valeur || "").replace(/\D/g, "");

  if (!chiffres) {
    return "";
  }

  if (chiffres.startsWith("225") && chiffres.length > 10) {
    chiffres = chiffres.slice(3);
  }

  if (chiffres.length === 9) {
    chiffres = `0${chiffres}`;
  }

  if (chiffres.length > 10) {
    chiffres = chiffres.slice(-10);
  }

  return chiffres;
}

function numerosEgaux(a, b) {
  const gauche = normaliserNumeroTelephone(a);
  const droite = normaliserNumeroTelephone(b);

  return Boolean(gauche && droite && gauche === droite);
}

function detecterReference(texteNormalise, providerAttendu) {
  if (providerAttendu === "maxi_it_orange") {
    const reference = texteNormalise.match(/\bpp\d{6}\.\d{4}\.[a-z0-9]+\b/i);
    return reference ? reference[0].toUpperCase() : "";
  }

  if (providerAttendu === "wave") {
    const reference = texteNormalise.match(/\bt[_-][a-z0-9]{8,}/i);
    return reference ? reference[0].replace(/\s/g, "").toUpperCase() : "";
  }

  return "";
}

function detecterDate(texteNormalise) {
  const numerique = texteNormalise.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:a|à|-)?\s*(\d{1,2})[:h](\d{2})\b/);

  if (numerique) {
    return creerDate(Number(numerique[3]), Number(numerique[2]), Number(numerique[1]), Number(numerique[4]), Number(numerique[5]));
  }

  const mois = {
    janvier: 1,
    fevrier: 2,
    février: 2,
    mars: 3,
    avril: 4,
    mai: 5,
    juin: 6,
    juillet: 7,
    aout: 8,
    août: 8,
    septembre: 9,
    octobre: 10,
    novembre: 11,
    decembre: 12,
    décembre: 12,
  };
  const texteMois = texteNormalise.match(
    /\b(\d{1,2})\s+(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre)\s+(\d{4})(?:\s*(?:-|a|à)?\s*(\d{1,2})[:h](\d{2})\s*(am|pm)?)?/
  );

  if (!texteMois) {
    return null;
  }

  let heure = Number(texteMois[4] || 0);
  const minute = Number(texteMois[5] || 0);
  const periode = String(texteMois[6] || "").toLowerCase();

  if (periode === "pm" && heure < 12) {
    heure += 12;
  }

  if (periode === "am" && heure === 12) {
    heure = 0;
  }

  return creerDate(Number(texteMois[3]), mois[texteMois[2]], Number(texteMois[1]), heure, minute);
}

function creerDate(annee, mois, jour, heure, minute) {
  const date = new Date(Date.UTC(annee, mois - 1, jour, heure || 0, minute || 0));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function dateDansFenetrePaiement(dateRecu, paiement) {
  const margeAvantHeures = Number(process.env.DELAI_RECU_AVANT_CREATION_HEURES || 12);
  const creation = new Date(paiement.creeLe);

  if (!dateRecu || Number.isNaN(creation.getTime())) {
    return false;
  }

  return (
    dateRecu.getTime() >= creation.getTime() - margeAvantHeures * 60 * 60 * 1000 &&
    dateRecu.getTime() <= Date.now() + 5 * 60 * 1000
  );
}

function normaliserTexte(texte) {
  return String(texte || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function limiterTexte(valeur, tailleMax) {
  const texte = String(valeur || "");

  if (texte.length <= tailleMax) {
    return texte;
  }

  return `${texte.slice(0, tailleMax - 3)}...`;
}

module.exports = {
  analyserImagePreuve,
};
