const THEMES_INTERFACE = [
  {
    code: "paie_clair",
    libelle: "Paie clair",
    description: "Clair professionnel, adapte aux interfaces sobres.",
    couleurs: {
      fond: "#f5f7f8",
      surface: "#ffffff",
      surfaceAlt: "#f7faf9",
      texte: "#172026",
      texteSecondaire: "#526066",
      bordure: "#d8e0e3",
      bordureForte: "#b7c2c7",
      primaire: "#0f766e",
      primaireTexte: "#ffffff",
      secondaire: "#e8eef0",
      secondaireTexte: "#172026",
      accent: "#0ea5e9",
      accentTexte: "#075985",
      focus: "#14b8a6",
      ombre: "rgba(23, 32, 38, 0.08)",
    },
  },
  {
    code: "encre",
    libelle: "Encre",
    description: "Bleu encre calme pour SaaS, portails et services B2B.",
    couleurs: {
      fond: "#eef3f8",
      surface: "#ffffff",
      surfaceAlt: "#f6f8fb",
      texte: "#102033",
      texteSecondaire: "#526273",
      bordure: "#d4dde8",
      bordureForte: "#aab8c8",
      primaire: "#1d4ed8",
      primaireTexte: "#ffffff",
      secondaire: "#e2e8f0",
      secondaireTexte: "#102033",
      accent: "#0891b2",
      accentTexte: "#164e63",
      focus: "#2563eb",
      ombre: "rgba(16, 32, 51, 0.10)",
    },
  },
  {
    code: "graphite",
    libelle: "Graphite",
    description: "Neutre, dense et tres lisible pour outils internes.",
    couleurs: {
      fond: "#f1f3f5",
      surface: "#ffffff",
      surfaceAlt: "#f8f9fa",
      texte: "#16181d",
      texteSecondaire: "#5b6470",
      bordure: "#d8dde3",
      bordureForte: "#aeb7c1",
      primaire: "#334155",
      primaireTexte: "#ffffff",
      secondaire: "#e5e7eb",
      secondaireTexte: "#16181d",
      accent: "#ca8a04",
      accentTexte: "#713f12",
      focus: "#64748b",
      ombre: "rgba(22, 24, 29, 0.10)",
    },
  },
  {
    code: "ocean",
    libelle: "Ocean",
    description: "Bleu vif pour marketplaces, finance et services publics.",
    couleurs: {
      fond: "#eef8fb",
      surface: "#ffffff",
      surfaceAlt: "#f5fbfd",
      texte: "#0f2537",
      texteSecondaire: "#50687a",
      bordure: "#cce4ed",
      bordureForte: "#9dc6d5",
      primaire: "#0369a1",
      primaireTexte: "#ffffff",
      secondaire: "#dff2f8",
      secondaireTexte: "#0f2537",
      accent: "#0d9488",
      accentTexte: "#134e4a",
      focus: "#0284c7",
      ombre: "rgba(3, 105, 161, 0.12)",
    },
  },
  {
    code: "foret",
    libelle: "Foret",
    description: "Naturel et rassurant pour commerces locaux et services.",
    couleurs: {
      fond: "#f2f6f0",
      surface: "#ffffff",
      surfaceAlt: "#f8fbf6",
      texte: "#17251b",
      texteSecondaire: "#526452",
      bordure: "#d5e1d2",
      bordureForte: "#a9bca4",
      primaire: "#2f6f3e",
      primaireTexte: "#ffffff",
      secondaire: "#e7eee3",
      secondaireTexte: "#17251b",
      accent: "#b45309",
      accentTexte: "#78350f",
      focus: "#3f8f52",
      ombre: "rgba(47, 111, 62, 0.12)",
    },
  },
  {
    code: "indigo",
    libelle: "Indigo",
    description: "Tech, premium et adapte aux apps modernes.",
    couleurs: {
      fond: "#f4f4fb",
      surface: "#ffffff",
      surfaceAlt: "#f8f7ff",
      texte: "#17172f",
      texteSecondaire: "#5d6078",
      bordure: "#dcdcf0",
      bordureForte: "#b9b8d8",
      primaire: "#4f46e5",
      primaireTexte: "#ffffff",
      secondaire: "#e7e7fb",
      secondaireTexte: "#17172f",
      accent: "#f59e0b",
      accentTexte: "#78350f",
      focus: "#6366f1",
      ombre: "rgba(79, 70, 229, 0.12)",
    },
  },
  {
    code: "rubis",
    libelle: "Rubis",
    description: "Energie commerciale pour vente, billetterie et promo.",
    couleurs: {
      fond: "#fff4f5",
      surface: "#ffffff",
      surfaceAlt: "#fff8f8",
      texte: "#2b1318",
      texteSecondaire: "#72525a",
      bordure: "#f0d1d8",
      bordureForte: "#dca8b4",
      primaire: "#be123c",
      primaireTexte: "#ffffff",
      secondaire: "#f7e4e8",
      secondaireTexte: "#2b1318",
      accent: "#0f766e",
      accentTexte: "#134e4a",
      focus: "#e11d48",
      ombre: "rgba(190, 18, 60, 0.12)",
    },
  },
  {
    code: "saas",
    libelle: "SaaS",
    description: "Calme, dense et efficace pour logiciels web.",
    couleurs: {
      fond: "#f6f8fb",
      surface: "#ffffff",
      surfaceAlt: "#f9fafc",
      texte: "#111827",
      texteSecondaire: "#5b6575",
      bordure: "#dfe5ee",
      bordureForte: "#b9c3d1",
      primaire: "#2563eb",
      primaireTexte: "#ffffff",
      secondaire: "#edf2f7",
      secondaireTexte: "#111827",
      accent: "#7c3aed",
      accentTexte: "#4c1d95",
      focus: "#3b82f6",
      ombre: "rgba(37, 99, 235, 0.10)",
    },
  },
  {
    code: "commerce",
    libelle: "Commerce",
    description: "Conversion et vente, sans surcharge visuelle.",
    couleurs: {
      fond: "#f4f8f3",
      surface: "#ffffff",
      surfaceAlt: "#fbfdf7",
      texte: "#172017",
      texteSecondaire: "#586556",
      bordure: "#dce7d4",
      bordureForte: "#b6c8a8",
      primaire: "#15803d",
      primaireTexte: "#ffffff",
      secondaire: "#eaf2e4",
      secondaireTexte: "#172017",
      accent: "#f97316",
      accentTexte: "#7c2d12",
      focus: "#22c55e",
      ombre: "rgba(21, 128, 61, 0.12)",
    },
  },
  {
    code: "education",
    libelle: "Education",
    description: "Accessible pour formations, cours et plateformes contenu.",
    couleurs: {
      fond: "#f6f3fb",
      surface: "#ffffff",
      surfaceAlt: "#fbf8ff",
      texte: "#241735",
      texteSecondaire: "#655772",
      bordure: "#e3d8f0",
      bordureForte: "#c5aedc",
      primaire: "#7e22ce",
      primaireTexte: "#ffffff",
      secondaire: "#eee5f7",
      secondaireTexte: "#241735",
      accent: "#0d9488",
      accentTexte: "#134e4a",
      focus: "#9333ea",
      ombre: "rgba(126, 34, 206, 0.12)",
    },
  },
  {
    code: "sante",
    libelle: "Sante",
    description: "Doux et fiable pour services bien-etre et medical.",
    couleurs: {
      fond: "#effaf7",
      surface: "#ffffff",
      surfaceAlt: "#f7fdfb",
      texte: "#10241f",
      texteSecondaire: "#526a63",
      bordure: "#cfe7df",
      bordureForte: "#a3c7bb",
      primaire: "#047857",
      primaireTexte: "#ffffff",
      secondaire: "#e0f2ed",
      secondaireTexte: "#10241f",
      accent: "#0284c7",
      accentTexte: "#075985",
      focus: "#10b981",
      ombre: "rgba(4, 120, 87, 0.12)",
    },
  },
  {
    code: "luxe",
    libelle: "Luxe",
    description: "Sobre, contraste fort, accent dore.",
    couleurs: {
      fond: "#f5f3ef",
      surface: "#ffffff",
      surfaceAlt: "#fbfaf7",
      texte: "#181512",
      texteSecondaire: "#675f56",
      bordure: "#ded7cc",
      bordureForte: "#b9aa95",
      primaire: "#1c1917",
      primaireTexte: "#ffffff",
      secondaire: "#ebe5db",
      secondaireTexte: "#181512",
      accent: "#b45309",
      accentTexte: "#78350f",
      focus: "#a16207",
      ombre: "rgba(28, 25, 23, 0.12)",
    },
  },
  {
    code: "minimal",
    libelle: "Minimal",
    description: "Noir, blanc, peu d'effets, tres polyvalent.",
    couleurs: {
      fond: "#f7f7f7",
      surface: "#ffffff",
      surfaceAlt: "#fafafa",
      texte: "#111111",
      texteSecondaire: "#5f6368",
      bordure: "#dddddd",
      bordureForte: "#b9b9b9",
      primaire: "#111111",
      primaireTexte: "#ffffff",
      secondaire: "#eeeeee",
      secondaireTexte: "#111111",
      accent: "#525252",
      accentTexte: "#262626",
      focus: "#404040",
      ombre: "rgba(17, 17, 17, 0.08)",
    },
  },
  {
    code: "solaire",
    libelle: "Solaire",
    description: "Chaud et lumineux pour tourisme, food et evenements.",
    couleurs: {
      fond: "#fff8ed",
      surface: "#ffffff",
      surfaceAlt: "#fffaf2",
      texte: "#2a1c0f",
      texteSecondaire: "#705a3f",
      bordure: "#efd9ba",
      bordureForte: "#d5b17a",
      primaire: "#c2410c",
      primaireTexte: "#ffffff",
      secondaire: "#f8ecd9",
      secondaireTexte: "#2a1c0f",
      accent: "#0f766e",
      accentTexte: "#134e4a",
      focus: "#ea580c",
      ombre: "rgba(194, 65, 12, 0.12)",
    },
  },
  {
    code: "corail",
    libelle: "Corail",
    description: "Frais, humain et adapte aux apps lifestyle.",
    couleurs: {
      fond: "#fff5f2",
      surface: "#ffffff",
      surfaceAlt: "#fffafa",
      texte: "#2a1715",
      texteSecondaire: "#705754",
      bordure: "#efd4cf",
      bordureForte: "#dcaea6",
      primaire: "#e11d48",
      primaireTexte: "#ffffff",
      secondaire: "#fae5e2",
      secondaireTexte: "#2a1715",
      accent: "#0891b2",
      accentTexte: "#164e63",
      focus: "#f43f5e",
      ombre: "rgba(225, 29, 72, 0.12)",
    },
  },
  {
    code: "lavande",
    libelle: "Lavande",
    description: "Doux pour creatifs, services perso et communautes.",
    couleurs: {
      fond: "#f8f5ff",
      surface: "#ffffff",
      surfaceAlt: "#fcfaff",
      texte: "#241936",
      texteSecondaire: "#645a73",
      bordure: "#e5daf4",
      bordureForte: "#c9b6e3",
      primaire: "#8b5cf6",
      primaireTexte: "#ffffff",
      secondaire: "#efe8fb",
      secondaireTexte: "#241936",
      accent: "#db2777",
      accentTexte: "#831843",
      focus: "#a78bfa",
      ombre: "rgba(139, 92, 246, 0.12)",
    },
  },
  {
    code: "azur",
    libelle: "Azur",
    description: "Tres clair pour apps mobiles, services rapides et support.",
    couleurs: {
      fond: "#f0f9ff",
      surface: "#ffffff",
      surfaceAlt: "#f7fcff",
      texte: "#0f2433",
      texteSecondaire: "#526879",
      bordure: "#d2e8f6",
      bordureForte: "#a6cde2",
      primaire: "#0284c7",
      primaireTexte: "#ffffff",
      secondaire: "#e3f3fb",
      secondaireTexte: "#0f2433",
      accent: "#4f46e5",
      accentTexte: "#3730a3",
      focus: "#38bdf8",
      ombre: "rgba(2, 132, 199, 0.12)",
    },
  },
  {
    code: "citron",
    libelle: "Citron",
    description: "Tonique et jeune, adapte aux produits digitaux.",
    couleurs: {
      fond: "#f8faef",
      surface: "#ffffff",
      surfaceAlt: "#fcfdf5",
      texte: "#192113",
      texteSecondaire: "#606a54",
      bordure: "#dfe8c7",
      bordureForte: "#bdca8f",
      primaire: "#4d7c0f",
      primaireTexte: "#ffffff",
      secondaire: "#edf4d6",
      secondaireTexte: "#192113",
      accent: "#2563eb",
      accentTexte: "#1e40af",
      focus: "#65a30d",
      ombre: "rgba(77, 124, 15, 0.12)",
    },
  },
  {
    code: "nuit",
    libelle: "Nuit",
    description: "Sombre, serieux et confortable en faible lumiere.",
    couleurs: {
      fond: "#0f172a",
      surface: "#111827",
      surfaceAlt: "#172033",
      texte: "#f8fafc",
      texteSecondaire: "#cbd5e1",
      bordure: "#334155",
      bordureForte: "#475569",
      primaire: "#38bdf8",
      primaireTexte: "#082f49",
      secondaire: "#1e293b",
      secondaireTexte: "#f8fafc",
      accent: "#f59e0b",
      accentTexte: "#fef3c7",
      focus: "#7dd3fc",
      ombre: "rgba(0, 0, 0, 0.28)",
    },
  },
  {
    code: "neon",
    libelle: "Neon",
    description: "Sombre et digital pour produits tech et gaming soft.",
    couleurs: {
      fond: "#0b1020",
      surface: "#111827",
      surfaceAlt: "#151f32",
      texte: "#f7fbff",
      texteSecondaire: "#b9c6d8",
      bordure: "#2b3954",
      bordureForte: "#44546f",
      primaire: "#22d3ee",
      primaireTexte: "#083344",
      secondaire: "#1f2937",
      secondaireTexte: "#f7fbff",
      accent: "#a3e635",
      accentTexte: "#365314",
      focus: "#67e8f9",
      ombre: "rgba(34, 211, 238, 0.16)",
    },
  },
  {
    code: "moka",
    libelle: "Moka",
    description: "Chaleureux pour restauration, artisanat et services premium.",
    couleurs: {
      fond: "#f7f2ed",
      surface: "#ffffff",
      surfaceAlt: "#fbf8f4",
      texte: "#241914",
      texteSecondaire: "#675b53",
      bordure: "#e1d4c7",
      bordureForte: "#bfae9c",
      primaire: "#7c2d12",
      primaireTexte: "#ffffff",
      secondaire: "#efe5dc",
      secondaireTexte: "#241914",
      accent: "#0f766e",
      accentTexte: "#134e4a",
      focus: "#9a3412",
      ombre: "rgba(124, 45, 18, 0.12)",
    },
  },
  {
    code: "rose",
    libelle: "Rose",
    description: "Editorial, social et doux pour marques lifestyle.",
    couleurs: {
      fond: "#fdf2f8",
      surface: "#ffffff",
      surfaceAlt: "#fff8fb",
      texte: "#2a1521",
      texteSecondaire: "#725568",
      bordure: "#efd1df",
      bordureForte: "#dca8c0",
      primaire: "#db2777",
      primaireTexte: "#ffffff",
      secondaire: "#f7e4ee",
      secondaireTexte: "#2a1521",
      accent: "#2563eb",
      accentTexte: "#1e40af",
      focus: "#ec4899",
      ombre: "rgba(219, 39, 119, 0.12)",
    },
  },
  {
    code: "terminal",
    libelle: "Terminal",
    description: "Developpeur, console et outils techniques.",
    couleurs: {
      fond: "#08110d",
      surface: "#0d1b14",
      surfaceAlt: "#12251b",
      texte: "#ecfdf5",
      texteSecondaire: "#b5c9bf",
      bordure: "#234332",
      bordureForte: "#3e674f",
      primaire: "#22c55e",
      primaireTexte: "#052e16",
      secondaire: "#183225",
      secondaireTexte: "#ecfdf5",
      accent: "#38bdf8",
      accentTexte: "#082f49",
      focus: "#4ade80",
      ombre: "rgba(34, 197, 94, 0.16)",
    },
  },
  {
    code: "ivoire",
    libelle: "Ivoire",
    description: "Tres clair, calme et elegant pour contenus premium.",
    couleurs: {
      fond: "#faf7f0",
      surface: "#fffefd",
      surfaceAlt: "#fbf8f1",
      texte: "#211d18",
      texteSecondaire: "#696157",
      bordure: "#e4dccf",
      bordureForte: "#c4b7a7",
      primaire: "#374151",
      primaireTexte: "#ffffff",
      secondaire: "#eee7dc",
      secondaireTexte: "#211d18",
      accent: "#0f766e",
      accentTexte: "#134e4a",
      focus: "#6b7280",
      ombre: "rgba(33, 29, 24, 0.08)",
    },
  },
  {
    code: "atelier",
    libelle: "Atelier",
    description: "Creatif et propre pour portfolios, studios et agences.",
    couleurs: {
      fond: "#f5f5f4",
      surface: "#ffffff",
      surfaceAlt: "#fafaf9",
      texte: "#1c1917",
      texteSecondaire: "#65615d",
      bordure: "#dedbd7",
      bordureForte: "#b9b2aa",
      primaire: "#0f172a",
      primaireTexte: "#ffffff",
      secondaire: "#e7e5e4",
      secondaireTexte: "#1c1917",
      accent: "#ea580c",
      accentTexte: "#7c2d12",
      focus: "#f97316",
      ombre: "rgba(28, 25, 23, 0.10)",
    },
  },
  {
    code: "data",
    libelle: "Data",
    description: "Froid, analytique et clair pour dashboards chiffres.",
    couleurs: {
      fond: "#f1f5f9",
      surface: "#ffffff",
      surfaceAlt: "#f8fafc",
      texte: "#0f172a",
      texteSecondaire: "#5d6b7d",
      bordure: "#dbe3ee",
      bordureForte: "#b3c0d0",
      primaire: "#0f766e",
      primaireTexte: "#ffffff",
      secondaire: "#e6edf5",
      secondaireTexte: "#0f172a",
      accent: "#7c3aed",
      accentTexte: "#4c1d95",
      focus: "#14b8a6",
      ombre: "rgba(15, 23, 42, 0.10)",
    },
  },
];

const OPTIONS_THEME_INTERFACE = THEMES_INTERFACE.map((theme) => ({
  valeur: theme.code,
  libelle: theme.libelle,
  description: theme.description,
}));

function obtenirThemeInterface(code) {
  const codeNormalise = String(code || "").trim();
  return THEMES_INTERFACE.find((theme) => theme.code === codeNormalise) || THEMES_INTERFACE[0];
}

function valeurThemeInterface(code) {
  return obtenirThemeInterface(code).code;
}

function couleursThemeInterface(code) {
  const theme = obtenirThemeInterface(code);
  return preparerCouleursTheme(theme.couleurs);
}

function styleThemeInterface(code) {
  const theme = obtenirThemeInterface(code);
  const couleurs = couleursThemeInterface(theme.code);

  return `
    :root {
      --couleur-fond: ${couleurs.fond};
      --couleur-surface: ${couleurs.surface};
      --couleur-surface-alt: ${couleurs.surfaceAlt};
      --couleur-texte: ${couleurs.texte};
      --couleur-texte-secondaire: ${couleurs.texteSecondaire};
      --couleur-bordure: ${couleurs.bordure};
      --couleur-bordure-forte: ${couleurs.bordureForte};
      --couleur-primaire: ${couleurs.primaire};
      --couleur-primaire-texte: ${couleurs.primaireTexte};
      --couleur-secondaire: ${couleurs.secondaire};
      --couleur-secondaire-texte: ${couleurs.secondaireTexte};
      --couleur-accent: ${couleurs.accent};
      --couleur-accent-texte: ${couleurs.accentTexte};
      --couleur-focus: ${couleurs.focus};
      --ombre-interface: ${couleurs.ombre};
      --couleur-danger: ${couleurs.danger};
      --couleur-danger-texte: ${couleurs.dangerTexte};
      --couleur-voile-modal: ${couleurs.voileModal};
      --couleur-code-fond: ${couleurs.codeFond};
      --couleur-code-texte: ${couleurs.codeTexte};
      --couleur-succes: ${couleurs.succes};
      --couleur-succes-fond: ${couleurs.succesFond};
      --couleur-succes-bordure: ${couleurs.succesBordure};
      --couleur-erreur: ${couleurs.erreur};
      --couleur-erreur-fond: ${couleurs.erreurFond};
      --couleur-erreur-bordure: ${couleurs.erreurBordure};
      --couleur-attente: ${couleurs.attente};
      --couleur-attente-fond: ${couleurs.attenteFond};
      --couleur-attente-bordure: ${couleurs.attenteBordure};
      --couleur-neutre: var(--couleur-texte-secondaire);
      --couleur-neutre-fond: var(--couleur-secondaire);
    }
  `;
}

function preparerCouleursTheme(couleursBase) {
  const fondSombre = luminositeCouleur(couleursBase.fond) < 0.28;
  const primaire = renforcerCouleur(couleursBase.primaire, fondSombre);
  const accent = renforcerCouleur(couleursBase.accent, fondSombre);
  const focus = renforcerCouleur(couleursBase.focus, fondSombre);
  const surfaceAlt = melangerCouleurs(couleursBase.surfaceAlt, primaire, fondSombre ? 0.16 : 0.08);
  const secondaire = melangerCouleurs(couleursBase.secondaire, primaire, fondSombre ? 0.14 : 0.08);
  const danger = fondSombre ? "#f87171" : "#b91c1c";
  const etats = fondSombre ? etatsThemeSombre() : etatsThemeClair();

  return {
    ...couleursBase,
    surfaceAlt,
    primaire,
    primaireTexte: choisirTexteLisible(primaire),
    secondaire,
    secondaireTexte: choisirTexteLisible(secondaire),
    accent,
    accentTexte: choisirTexteLisible(accent),
    focus,
    danger,
    dangerTexte: choisirTexteLisible(danger),
    voileModal: fondSombre ? "rgba(2, 6, 23, 0.72)" : "rgba(15, 23, 42, 0.58)",
    codeFond: fondSombre ? "#020617" : "#111827",
    codeTexte: "#f8fafc",
    ...etats,
  };
}

function etatsThemeClair() {
  return {
    succes: "#065f46",
    succesFond: "#c9f7dc",
    succesBordure: "#5ee19b",
    erreur: "#9f1239",
    erreurFond: "#ffe1e7",
    erreurBordure: "#fb7185",
    attente: "#9a3412",
    attenteFond: "#ffdfb8",
    attenteBordure: "#fb923c",
  };
}

function etatsThemeSombre() {
  return {
    succes: "#86efac",
    succesFond: "#143321",
    succesBordure: "#22c55e",
    erreur: "#fca5a5",
    erreurFond: "#3d1518",
    erreurBordure: "#ef4444",
    attente: "#fdba74",
    attenteFond: "#3a2412",
    attenteBordure: "#f97316",
  };
}

function renforcerCouleur(couleur, fondSombre) {
  const hsl = hexVersHsl(couleur);

  if (!hsl) {
    return couleur;
  }

  const saturationRenforcee = hsl.s < 0.08 ? hsl.s : Math.min(0.92, hsl.s * 1.22 + 0.04);
  const lumiere = fondSombre
    ? Math.max(0.46, Math.min(0.72, hsl.l + 0.08))
    : Math.max(0.28, Math.min(0.48, hsl.l - 0.06));

  return hslVersHex({
    h: hsl.h,
    s: saturationRenforcee,
    l: lumiere,
  });
}

function choisirTexteLisible(couleurFond) {
  const sombre = "#020617";
  const clair = "#ffffff";
  const contrasteSombre = contrasteCouleurs(sombre, couleurFond);
  const contrasteClair = contrasteCouleurs(clair, couleurFond);

  return contrasteSombre >= contrasteClair ? sombre : clair;
}

function melangerCouleurs(couleurA, couleurB, poidsB) {
  const a = hexVersRgb(couleurA);
  const b = hexVersRgb(couleurB);

  if (!a || !b) {
    return couleurA;
  }

  const poids = Math.max(0, Math.min(1, poidsB));
  const melange = {
    r: Math.round(a.r * (1 - poids) + b.r * poids),
    g: Math.round(a.g * (1 - poids) + b.g * poids),
    b: Math.round(a.b * (1 - poids) + b.b * poids),
  };

  return rgbVersHex(melange);
}

function contrasteCouleurs(couleurA, couleurB) {
  const a = luminositeCouleur(couleurA);
  const b = luminositeCouleur(couleurB);
  const clair = Math.max(a, b);
  const sombre = Math.min(a, b);

  return (clair + 0.05) / (sombre + 0.05);
}

function luminositeCouleur(couleur) {
  const rgb = hexVersRgb(couleur);

  if (!rgb) {
    return 1;
  }

  const valeurs = [rgb.r, rgb.g, rgb.b].map((valeur) => {
    const canal = valeur / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * valeurs[0] + 0.7152 * valeurs[1] + 0.0722 * valeurs[2];
}

function hexVersRgb(couleur) {
  const valeur = String(couleur || "").trim().replace(/^#/, "");
  const normalisee = valeur.length === 3
    ? valeur.split("").map((caractere) => caractere + caractere).join("")
    : valeur;

  if (!/^[0-9a-fA-F]{6}$/.test(normalisee)) {
    return null;
  }

  return {
    r: parseInt(normalisee.slice(0, 2), 16),
    g: parseInt(normalisee.slice(2, 4), 16),
    b: parseInt(normalisee.slice(4, 6), 16),
  };
}

function rgbVersHex(rgb) {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((valeur) => Math.max(0, Math.min(255, valeur)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexVersHsl(couleur) {
  const rgb = hexVersRgb(couleur);

  if (!rgb) {
    return null;
  }

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;

  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }

  return { h: h / 6, s, l };
}

function hslVersHex(hsl) {
  if (hsl.s === 0) {
    const valeur = Math.round(hsl.l * 255);
    return rgbVersHex({ r: valeur, g: valeur, b: valeur });
  }

  const q = hsl.l < 0.5 ? hsl.l * (1 + hsl.s) : hsl.l + hsl.s - hsl.l * hsl.s;
  const p = 2 * hsl.l - q;
  const r = teinteVersRgb(p, q, hsl.h + 1 / 3);
  const g = teinteVersRgb(p, q, hsl.h);
  const b = teinteVersRgb(p, q, hsl.h - 1 / 3);

  return rgbVersHex({
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  });
}

function teinteVersRgb(p, q, t) {
  let teinte = t;

  if (teinte < 0) {
    teinte += 1;
  }

  if (teinte > 1) {
    teinte -= 1;
  }

  if (teinte < 1 / 6) {
    return p + (q - p) * 6 * teinte;
  }

  if (teinte < 1 / 2) {
    return q;
  }

  if (teinte < 2 / 3) {
    return p + (q - p) * (2 / 3 - teinte) * 6;
  }

  return p;
}

module.exports = {
  THEMES_INTERFACE,
  OPTIONS_THEME_INTERFACE,
  obtenirThemeInterface,
  valeurThemeInterface,
  couleursThemeInterface,
  styleThemeInterface,
};
