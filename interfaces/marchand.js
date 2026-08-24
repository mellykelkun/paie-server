const { pageHtml, echapperHtml, formaterMontant } = require("./commun");

function afficherMarchand(paiements, options = {}) {
  const paiementsTries = [...paiements].sort((a, b) => b.creeLe.localeCompare(a.creeLe));
  const paiementsFinalises = paiementsTries.filter((paiement) => {
    return paiement.statut === "PAYE" || paiement.statut === "REFUSE";
  });
  const paiementsAbandonnes = paiementsTries.filter((paiement) => paiement.statut === "ABANDONNE");
  const paiementsAControler = paiementsTries.filter((paiement) => {
    return Boolean(
      paiement.preuve &&
      paiement.verification &&
      paiement.statut !== "PAYE" &&
      paiement.statut !== "REFUSE" &&
      paiement.statut !== "ABANDONNE"
    );
  });
  const paiementsEnAttente = paiementsTries.filter((paiement) => {
    return (
      paiement.statut !== "ABANDONNE" &&
      paiement.statut !== "PAYE" &&
      paiement.statut !== "REFUSE" &&
      (!paiement.preuve || !paiement.verification)
    );
  });
  const lignesAControler = paiementsAControler.map(afficherLignePaiement).join("");
  const lignesEnAttente = paiementsEnAttente.map(afficherLignePaiement).join("");
  const lignesFinalisees = paiementsFinalises.map(afficherLignePaiement).join("");
  const lignesAbandonnees = paiementsAbandonnes.map(afficherLignePaiement).join("");
  const statistiques = construireStatistiquesMarchand({
    paiements: paiementsTries,
    paiementsAControler,
    paiementsEnAttente,
    paiementsFinalises,
    paiementsAbandonnes,
  });

  return pageHtml("Tableau marchand", `
    <main class="tableau-marchand">
      <header class="entete-marchand">
        <div>
          <p class="sur-titre">Espace marchand</p>
          <h1>Tableau marchand</h1>
          <p>Suivi rapide des paiements manuels, justificatifs, decisions et notifications.</p>
        </div>
        <div class="actions actions-entete-marchand">
          <a class="bouton-lien secondaire" href="/marchand/configuration">Configuration</a>
          <form method="post" action="/marchand/deconnexion">
            <button type="submit" class="bouton-secondaire">Deconnexion</button>
          </form>
        </div>
      </header>

      <section class="resume-marchand" aria-label="Resume marchand">
        ${statistiques.map(afficherCarteStatistique).join("")}
      </section>

      <p id="messageAction" class="retour-action" hidden></p>

      <section class="section-marchand section-prioritaire">
        <div class="entete-section-marchand">
          <div>
            <p class="sur-titre">Priorite</p>
            <h2>Justificatifs a controler</h2>
          </div>
          ${afficherCompteurSection(paiementsAControler.length)}
        </div>
        <p class="description-section">Paiements avec recu recu. Verifiez votre compte de paiement, puis acceptez ou refusez.</p>
        <div class="liste-paiements-marchand">
          ${lignesAControler || afficherEtatVide("Aucun justificatif a controler", "Les nouvelles preuves apparaitront ici des leur reception.")}
        </div>
      </section>

      <details class="section-marchand" ${paiementsAControler.length === 0 ? "open" : ""}>
        <summary>
          <span>Paiements en attente du justificatif</span>
          ${afficherCompteurSection(paiementsEnAttente.length)}
        </summary>
        <p class="description-section">Paiements crees ou ouverts par le client, mais sans recu valide envoye. Aucune decision marchand n'est attendue ici.</p>
        <div class="liste-paiements-marchand">
          ${lignesEnAttente || afficherEtatVide("Aucun paiement en attente", "Les paiements sans preuve seront regroupes ici.")}
        </div>
      </details>

      <details class="section-marchand">
        <summary>
          <span>Decisions finales</span>
          ${afficherCompteurSection(paiementsFinalises.length)}
        </summary>
        <p class="description-section">Paiements deja acceptes ou refuses. Les notifications peuvent etre renvoyees si le site marchand ne les a pas recues.</p>
        <div class="liste-paiements-marchand">
          ${lignesFinalisees || afficherEtatVide("Aucune decision finale", "Les paiements acceptes ou refuses apparaitront ici.")}
        </div>
      </details>

      <details class="section-marchand">
        <summary>
          <span>Paiements abandonnes</span>
          ${afficherCompteurSection(paiementsAbandonnes.length)}
        </summary>
        <p class="description-section">Paiements arretes avant reception d'un justificatif valide, souvent apres annulation ou retour du client vers l'application marchande.</p>
        <div class="liste-paiements-marchand">
          ${lignesAbandonnees || afficherEtatVide("Aucun paiement abandonne", "Les abandons client seront archives dans cette section.")}
        </div>
      </details>
    </main>

    <div id="modaleDecision" class="modale" hidden role="dialog" aria-modal="true" aria-labelledby="titreModaleDecision">
      <div class="modale-fond" data-fermer-modale></div>
      <section class="modale-contenu" tabindex="-1">
        <p id="badgeModaleDecision" class="badge-modale">Decision finale</p>
        <h2 id="titreModaleDecision">Confirmer la decision</h2>
        <p id="texteModaleDecision"></p>
        <div id="zoneRaisonRefus" class="champ-modale" hidden>
          <label for="raisonRefusDecision">Raison du refus</label>
          <textarea id="raisonRefusDecision" rows="4"></textarea>
          <p id="erreurRaisonRefus" class="erreur-champ" hidden>Indiquez une raison de refus.</p>
        </div>
        <div class="actions modale-actions">
          <button type="button" class="bouton-secondaire" data-annuler-modale>Annuler</button>
          <button type="button" id="confirmerModaleDecision">Confirmer</button>
        </div>
      </section>
    </div>

    <script>
      const modaleDecision = document.getElementById("modaleDecision");
      const contenuModaleDecision = modaleDecision.querySelector(".modale-contenu");
      const badgeModaleDecision = document.getElementById("badgeModaleDecision");
      const titreModaleDecision = document.getElementById("titreModaleDecision");
      const texteModaleDecision = document.getElementById("texteModaleDecision");
      const zoneRaisonRefus = document.getElementById("zoneRaisonRefus");
      const champRaisonRefus = document.getElementById("raisonRefusDecision");
      const erreurRaisonRefus = document.getElementById("erreurRaisonRefus");
      const boutonConfirmerModale = document.getElementById("confirmerModaleDecision");
      const boutonAnnulerModale = modaleDecision.querySelector("[data-annuler-modale]");
      const fondModale = modaleDecision.querySelector("[data-fermer-modale]");
      let fermetureModaleActive = null;

      afficherMessageMemorise();
      document.addEventListener("click", gererClicDecision);
      document.addEventListener("click", gererClicNotification);
      document.addEventListener("keydown", gererToucheModale);
      boutonAnnulerModale.addEventListener("click", () => fermerModaleDecision(false));
      fondModale.addEventListener("click", () => fermerModaleDecision(false));

      async function gererClicDecision(evenement) {
        const bouton = evenement.target.closest("button[data-action-decision]");

        if (!bouton || bouton.disabled) {
          return;
        }

        const action = bouton.dataset.actionDecision;
        const idPaiement = bouton.dataset.idPaiement;
        const decision = await demanderConfirmationDecision(action, idPaiement);

        if (!decision.confirmee) {
          return;
        }

        const raison = decision.raison || "";
        const boutonsPaiement = listerBoutonsPaiement(idPaiement);
        boutonsPaiement.forEach((element) => {
          element.disabled = true;
        });
        afficherMessageAction("Traitement de la decision...", "info");

        try {
          const options = {
            method: "POST",
            headers: {}
          };

          if (action === "refuser") {
            options.headers["content-type"] = "application/json";
            options.body = JSON.stringify({ raison });
          }

          const reponse = await fetch("/api/marchand/paiements/" + idPaiement + "/" + action, options);
          const resultat = await lireJson(reponse);
          const message = construireMessageDecision(resultat);
          const type = reponse.ok ? typeMessageWebhook(resultat.webhook) : "erreur";

          if (!reponse.ok && reponse.status !== 409) {
            afficherMessageAction(message, type);
            boutonsPaiement.forEach((element) => {
              element.disabled = false;
            });
            return;
          }

          memoriserMessageAction(message, type);
          window.location.reload();
        } catch {
          afficherMessageAction("Connexion indisponible. La decision n'a pas ete confirmee.", "erreur");
          boutonsPaiement.forEach((element) => {
            element.disabled = false;
          });
        }
      }

      async function gererClicNotification(evenement) {
        const bouton = evenement.target.closest("button[data-action-notification]");

        if (!bouton || bouton.disabled) {
          return;
        }

        const idPaiement = bouton.dataset.idPaiement;
        bouton.disabled = true;
        afficherMessageAction("Renvoi de la notification...", "info");

        try {
          const reponse = await fetch("/api/marchand/paiements/" + idPaiement + "/notification/renvoyer", {
            method: "POST"
          });
          const resultat = await lireJson(reponse);
          const message = construireMessageDecision(resultat);
          const type = reponse.ok ? typeMessageWebhook(resultat.webhook) : "erreur";

          if (!reponse.ok) {
            afficherMessageAction(message, type);
            bouton.disabled = false;
            return;
          }

          memoriserMessageAction(message, type);
          window.location.reload();
        } catch {
          afficherMessageAction("Connexion indisponible. La notification n'a pas ete renvoyee.", "erreur");
          bouton.disabled = false;
        }
      }

      function demanderConfirmationDecision(action, idPaiement) {
        return new Promise((resolve) => {
          const estRefus = action === "refuser";
          modaleDecision.hidden = false;
          badgeModaleDecision.textContent = estRefus ? "Refus du paiement" : "Acceptation du paiement";
          titreModaleDecision.textContent = estRefus ? "Confirmer le refus" : "Confirmer l'acceptation";
          texteModaleDecision.textContent =
            (estRefus ? "Refuser le paiement " : "Accepter le paiement ") +
            idPaiement +
            ". Cette decision est finale.";
          zoneRaisonRefus.hidden = !estRefus;
          erreurRaisonRefus.hidden = true;
          champRaisonRefus.value = estRefus ? "Justificatif non valide." : "";
          boutonConfirmerModale.textContent = estRefus ? "Refuser" : "Accepter";
          boutonConfirmerModale.className = estRefus ? "bouton-danger" : "";

          fermetureModaleActive = (confirmee) => {
            if (!confirmee) {
              resolve({ confirmee: false, raison: "" });
              return;
            }

            const raison = champRaisonRefus.value.trim();

            if (estRefus && !raison) {
              erreurRaisonRefus.hidden = false;
              champRaisonRefus.focus();
              return;
            }

            resolve({ confirmee: true, raison });
            fermerModaleDecision(false, true);
          };

          boutonConfirmerModale.onclick = () => fermetureModaleActive(true);
          window.setTimeout(() => {
            if (estRefus) {
              champRaisonRefus.focus();
              champRaisonRefus.select();
              return;
            }

            boutonConfirmerModale.focus();
          }, 0);
        });
      }

      function fermerModaleDecision(confirmee, dejaResolue) {
        modaleDecision.hidden = true;
        boutonConfirmerModale.onclick = null;

        if (!dejaResolue && fermetureModaleActive) {
          const fermer = fermetureModaleActive;
          fermetureModaleActive = null;
          fermer(confirmee);
          return;
        }

        fermetureModaleActive = null;
      }

      function gererToucheModale(evenement) {
        if (modaleDecision.hidden || evenement.key !== "Escape") {
          return;
        }

        evenement.preventDefault();
        fermerModaleDecision(false);
      }

      function listerBoutonsPaiement(idPaiement) {
        return Array.from(document.querySelectorAll("button[data-id-paiement]")).filter((bouton) => {
          return bouton.dataset.idPaiement === idPaiement;
        });
      }

      async function lireJson(reponse) {
        try {
          return await reponse.json();
        } catch {
          return { message: "Reponse du service invalide." };
        }
      }

      function construireMessageDecision(resultat) {
        const morceaux = [resultat.message || "Decision traitee."];

        if (resultat.webhook && resultat.webhook.message) {
          morceaux.push(resultat.webhook.message);
        }

        return morceaux.join(" ");
      }

      function typeMessageWebhook(webhook) {
        if (!webhook || webhook.statut === "RECU") {
          return "succes";
        }

        if (webhook.statut === "NON_CONFIGURE" || webhook.statut === "NON_ENVOYE") {
          return "avertissement";
        }

        return "erreur";
      }

      function afficherMessageAction(message, type) {
        const zoneMessage = document.getElementById("messageAction");
        zoneMessage.textContent = message;
        zoneMessage.className = "retour-action " + (type || "info");
        zoneMessage.hidden = false;
      }

      function memoriserMessageAction(message, type) {
        window.localStorage.setItem("messageActionMarchand", JSON.stringify({ message, type }));
      }

      function afficherMessageMemorise() {
        const messageMemoire = window.localStorage.getItem("messageActionMarchand");

        if (!messageMemoire) {
          return;
        }

        window.localStorage.removeItem("messageActionMarchand");

        try {
          const donnees = JSON.parse(messageMemoire);
          afficherMessageAction(donnees.message, donnees.type);
        } catch {
          return;
        }
      }
    </script>
  `, { themeInterface: options.themeInterface });
}

function construireStatistiquesMarchand(donnees) {
  const notificationsEnEchec = donnees.paiements.filter((paiement) => {
    const statut = paiement.dernierWebhook && paiement.dernierWebhook.statut;
    return statut === "ECHEC_HTTP" || statut === "ECHEC_ENVOI";
  });
  const paiementsPayes = donnees.paiementsFinalises.filter((paiement) => paiement.statut === "PAYE");
  const paiementsRefuses = donnees.paiementsFinalises.filter((paiement) => paiement.statut === "REFUSE");

  return [
    {
      libelle: "A controler",
      valeur: donnees.paiementsAControler.length,
      detail: "preuve recue",
      classe: donnees.paiementsAControler.length > 0 ? "attente" : "neutre",
    },
    {
      libelle: "En attente",
      valeur: donnees.paiementsEnAttente.length,
      detail: "cote client",
      classe: "neutre",
    },
    {
      libelle: "Acceptes",
      valeur: paiementsPayes.length,
      detail: resumerMontantsPayes(paiementsPayes),
      classe: "succes",
    },
    {
      libelle: "Refuses",
      valeur: paiementsRefuses.length,
      detail: `${donnees.paiementsAbandonnes.length} abandonne(s)`,
      classe: paiementsRefuses.length > 0 ? "erreur" : "neutre",
    },
    {
      libelle: "Notifications",
      valeur: notificationsEnEchec.length,
      detail: notificationsEnEchec.length > 0 ? "a surveiller" : "aucun echec",
      classe: notificationsEnEchec.length > 0 ? "erreur" : "succes",
    },
  ];
}

function afficherCarteStatistique(statistique) {
  return `
    <article class="carte-statistique ${echapperHtml(statistique.classe)}">
      <span>${echapperHtml(statistique.libelle)}</span>
      <strong>${echapperHtml(statistique.valeur)}</strong>
      <small>${echapperHtml(statistique.detail)}</small>
    </article>
  `;
}

function resumerMontantsPayes(paiementsPayes) {
  const totaux = new Map();

  for (const paiement of paiementsPayes) {
    const devise = paiement.devise || "";
    totaux.set(devise, (totaux.get(devise) || 0) + Number(paiement.montant || 0));
  }

  if (totaux.size === 0) {
    return "0 encaisse";
  }

  const morceaux = Array.from(totaux.entries())
    .slice(0, 2)
    .map(([devise, montant]) => formaterMontant(montant, devise));
  const suffixe = totaux.size > 2 ? " +" : "";

  return `${morceaux.join(" + ")}${suffixe}`;
}

function afficherCompteurSection(nombre) {
  return `<span class="compteur-section">${Number(nombre) || 0}</span>`;
}

function afficherEtatVide(titre, description) {
  return `
    <div class="etat-vide-marchand">
      <strong>${echapperHtml(titre)}</strong>
      <p>${echapperHtml(description)}</p>
    </div>
  `;
}

function afficherLignePaiement(paiement) {
  const alertesVerification = paiement.verification && Array.isArray(paiement.verification.alertes)
    ? paiement.verification.alertes
    : [];
  const alertes = paiement.verification
    ? afficherAlertes(alertesVerification)
    : `<p class="note-paiement-marchand">Aucun justificatif recu.</p>`;
  const controles = paiement.verification ? afficherControles(paiement.verification) : "";
  const extractionTexte = paiement.verification ? afficherExtractionTexte(paiement.verification.extractionTexte) : "";
  const imagePreuve = paiement.preuve
    ? `
      <a class="apercu-preuve-marchand" href="/marchand/preuves/${echapperHtml(paiement.preuve.nomFichierStocke)}" target="_blank" rel="noopener">
        <img src="/marchand/preuves/${echapperHtml(paiement.preuve.nomFichierStocke)}" alt="Justificatif de paiement">
        <span>Ouvrir la preuve</span>
      </a>
    `
    : `
      <div class="apercu-preuve-marchand vide">
        <span>Aucune preuve</span>
      </div>
    `;
  const decisionFinale = paiement.statut === "PAYE" || paiement.statut === "REFUSE";
  const preuveEnvoyee = Boolean(paiement.preuve && paiement.verification);
  const peutAccepter = !decisionFinale && preuveEnvoyee && paiement.verification.peutAccepter;
  const peutRefuser = !decisionFinale && preuveEnvoyee;
  const raisonAccepter = raisonBoutonAccepter(paiement, decisionFinale, preuveEnvoyee);
  const raisonRefuser = raisonBoutonRefuser(paiement, decisionFinale, preuveEnvoyee);
  const decision = afficherDecision(paiement);
  const webhook = afficherWebhook(paiement);
  const origine = afficherOrigine(paiement.origine);
  const metadonnees = afficherMetadonnees(paiement.metadonnees);
  const score = paiement.verification ? paiement.verification.score : "-";
  const referencePreuve = paiement.preuve ? paiement.preuve.referenceTransaction : "-";
  const moyenPaiement = paiement.moyenChoisi || "-";
  const dateCreation = formaterDate(paiement.creeLe);
  const dateModification = formaterDate(paiement.modifieLe);
  const peutRenvoyerNotification =
    decisionFinale &&
    Boolean(paiement.urlWebhook) &&
    (!paiement.dernierWebhook || paiement.dernierWebhook.statut !== "RECU");

  return `
    <article class="paiement-marchand ${classePaiement(paiement)}">
      <div class="paiement-marchand-corps">
        <div class="paiement-marchand-entete">
          <div>
            <p class="sur-titre-paiement">${echapperHtml(paiement.id)}</p>
            <h3>${formaterMontant(paiement.montant, paiement.devise)}</h3>
          </div>
          ${afficherPastilleStatut(paiement.statut)}
        </div>

        <dl class="infos-paiement-marchand">
          <div>
            <dt>Commande</dt>
            <dd>${echapperHtml(paiement.idCommande)}</dd>
          </div>
          <div>
            <dt>Client</dt>
            <dd>${echapperHtml(paiement.idClient)}</dd>
          </div>
          <div>
            <dt>Moyen</dt>
            <dd>${echapperHtml(moyenPaiement)}</dd>
          </div>
          <div>
            <dt>Reference preuve</dt>
            <dd>${echapperHtml(referencePreuve)}</dd>
          </div>
          <div>
            <dt>Score controle</dt>
            <dd>${echapperHtml(score)}</dd>
          </div>
          <div>
            <dt>Dates</dt>
            <dd>Cree ${echapperHtml(dateCreation)} - maj ${echapperHtml(dateModification)}</dd>
          </div>
        </dl>

        <div class="ligne-etats-marchand">
          ${origine}
          ${decision}
        </div>
        ${metadonnees}
        ${webhook}
        ${alertes}
        ${controles}
        ${extractionTexte}
        <div class="actions actions-paiement-marchand">
          <button
            type="button"
            data-action-decision="accepter"
            data-id-paiement="${echapperHtml(paiement.id)}"
            ${attributBouton(peutAccepter, raisonAccepter)}
          >Accepter</button>
          <button
            type="button"
            data-action-decision="refuser"
            data-id-paiement="${echapperHtml(paiement.id)}"
            ${attributBouton(peutRefuser, raisonRefuser)}
          >Refuser</button>
          <button
            type="button"
            class="bouton-secondaire"
            data-action-notification="renvoyer"
            data-id-paiement="${echapperHtml(paiement.id)}"
            ${attributBouton(peutRenvoyerNotification, "Notification deja recue ou decision non finale.")}
          >Renvoyer notification</button>
        </div>
      </div>
      ${imagePreuve}
    </article>
  `;
}

function classePaiement(paiement) {
  if (paiement.statut === "PAYE") {
    return "paiement-succes";
  }

  if (paiement.statut === "REFUSE") {
    return "paiement-erreur";
  }

  if (paiement.statut === "ABANDONNE") {
    return "paiement-neutre";
  }

  if (paiement.preuve && paiement.verification) {
    return "paiement-attente";
  }

  return "paiement-neutre";
}

function afficherPastilleStatut(statut) {
  const statuts = {
    CREE: { libelle: "Cree", classe: "neutre" },
    EN_ATTENTE_PAIEMENT: { libelle: "En attente client", classe: "attente" },
    PREUVE_ENVOYEE: { libelle: "Preuve recue", classe: "attente" },
    EN_VERIFICATION: { libelle: "A verifier", classe: "attente" },
    PAYE: { libelle: "Accepte", classe: "succes" },
    REFUSE: { libelle: "Refuse", classe: "erreur" },
    ABANDONNE: { libelle: "Abandonne", classe: "neutre" },
  };
  const details = statuts[statut] || { libelle: statut || "Inconnu", classe: "neutre" };

  return `<span class="pastille-statut ${echapperHtml(details.classe)}">${echapperHtml(details.libelle)}</span>`;
}

function afficherAlertes(alertes) {
  if (!Array.isArray(alertes) || alertes.length === 0) {
    return `<p class="note-paiement-marchand">Aucune alerte detectee.</p>`;
  }

  return `
    <ul class="liste-alertes-marchand">
      ${alertes.map(afficherAlerte).join("")}
    </ul>
  `;
}

function afficherAlerte(alerte) {
  const prefixe = alerte.critique ? "Critique: " : "";
  const classe = alerte.critique ? "critique" : "simple";

  return `<li class="${classe}">${prefixe}${echapperHtml(alerte.message)}</li>`;
}

function afficherControles(verification) {
  const controles = Array.isArray(verification.controles) ? verification.controles : [];

  if (controles.length === 0) {
    return "";
  }

  const lignes = controles
    .map((controle) => {
      const classe = controle.statut === "VALIDE" ? "controle-ok" : "controle-echec";
      const statut = controle.statut === "VALIDE" ? "OK" : "Echec";

      return `
        <li class="${classe}">
          <strong>${echapperHtml(statut)}</strong>
          <span>${echapperHtml(controle.libelle || controle.code)}</span>
          <small>${echapperHtml(controle.message || "")}</small>
        </li>
      `;
    })
    .join("");

  return `
    <details class="details-controle">
      <summary>Details des controles (${controles.length})</summary>
      <ul class="liste-controles">${lignes}</ul>
    </details>
  `;
}

function afficherExtractionTexte(extractionTexte) {
  if (!extractionTexte) {
    return "";
  }

  const contenu = extractionTexte.json
    ? JSON.stringify(extractionTexte.json, null, 2)
    : extractionTexte.texte || extractionTexte.message || "Aucun texte extrait.";

  return `
    <details class="details-controle">
      <summary>Texte extrait du justificatif</summary>
      <pre class="bloc-json">${echapperHtml(contenu)}</pre>
    </details>
  `;
}

function afficherMetadonnees(metadonnees) {
  if (!metadonnees || typeof metadonnees !== "object" || Object.keys(metadonnees).length === 0) {
    return "";
  }

  return `
    <details class="details-controle details-metadonnees">
      <summary>Metadonnees</summary>
      <pre class="bloc-json">${echapperHtml(JSON.stringify(metadonnees, null, 2))}</pre>
    </details>
  `;
}

function afficherOrigine(origine) {
  const estSandbox = origine === "sandbox";
  const libelle = estSandbox ? "Sandbox de test" : "Application marchande";
  const classe = estSandbox ? "neutre" : "info";

  return `<span class="etat-decision ${classe}">Origine: ${echapperHtml(libelle)}</span>`;
}

function afficherDecision(paiement) {
  if (paiement.statut === "PAYE") {
    return `<span class="etat-decision succes">Decision finale: paiement accepte</span>`;
  }

  if (paiement.statut === "REFUSE") {
    return `<span class="etat-decision erreur">Decision finale: paiement refuse</span>`;
  }

  if (paiement.statut === "ABANDONNE") {
    return `<span class="etat-decision neutre">Paiement abandonne</span>`;
  }

  if (paiement.preuve) {
    return `<span class="etat-decision attente">Decision finale: en attente</span>`;
  }

  return `<span class="etat-decision neutre">Decision finale: aucun justificatif recu</span>`;
}

function afficherWebhook(paiement) {
  const webhook = decrireWebhook(paiement);

  return `
    <div class="etat-notification ${echapperHtml(webhook.classe)}">
      <strong>${echapperHtml(webhook.titre)}</strong>
      <p>${echapperHtml(webhook.description)}</p>
    </div>
  `;
}

function decrireWebhook(paiement) {
  if (!paiement.urlWebhook) {
    return {
      classe: "neutre",
      titre: "Notification: non configuree",
      description: "Aucune URL de notification n'est configuree pour ce paiement.",
    };
  }

  if (!paiement.dernierWebhook) {
    if (paiement.statut === "ABANDONNE") {
      return {
        classe: "neutre",
        titre: "Notification: non envoyee",
        description: "Le paiement a ete abandonne avant reception du justificatif.",
      };
    }

    return {
      classe: paiement.statut === "PAYE" || paiement.statut === "REFUSE" ? "erreur" : "attente",
      titre: "Notification: pas encore envoyee",
      description:
        paiement.statut === "PAYE" || paiement.statut === "REFUSE"
          ? "La decision est finale, mais aucune notification n'est tracee."
          : "La notification sera envoyee apres acceptation ou refus.",
    };
  }

  const codeHttp = Number(paiement.dernierWebhook.codeHttp);
  const dateEnvoi = formaterDate(paiement.dernierWebhook.envoyeLe);
  const statutNotification = paiement.dernierWebhook.statut || "";
  const tentatives = Number(paiement.dernierWebhook.tentatives || 0);
  const prochaineTentative = formaterDate(paiement.dernierWebhook.prochainEssaiLe);

  if (statutNotification === "RECU") {
    return {
      classe: "succes",
      titre: "Notification: recue par le site marchand",
      description: `Evenement ${paiement.dernierWebhook.evenement || "-"} - tentative(s) ${tentatives} - ${dateEnvoi}.`,
    };
  }

  if (statutNotification === "ECHEC_HTTP" || statutNotification === "ECHEC_ENVOI") {
    const detailErreur = paiement.dernierWebhook.erreur
      ? ` - ${paiement.dernierWebhook.erreur}`
      : Number.isFinite(codeHttp)
        ? ` - HTTP ${codeHttp}`
        : "";

    return {
      classe: "erreur",
      titre: "Notification: en echec",
      description: `Tentative(s) ${tentatives}${detailErreur} - dernier envoi ${dateEnvoi} - prochain essai ${prochaineTentative}.`,
    };
  }

  if (Number.isFinite(codeHttp)) {
    const recu = codeHttp >= 200 && codeHttp < 300;

    return {
      classe: recu ? "succes" : "erreur",
      titre: recu ? "Notification: recue par le site marchand" : "Notification: reponse en echec",
      description: `Evenement ${paiement.dernierWebhook.evenement || "-"} - HTTP ${codeHttp} - ${dateEnvoi}.`,
    };
  }

  return {
    classe: "erreur",
    titre: "Notification: non confirmee",
    description: `${paiement.dernierWebhook.erreur || "Erreur inconnue"} - ${dateEnvoi}.`,
  };
}

function raisonBoutonAccepter(paiement, decisionFinale, preuveEnvoyee) {
  if (decisionFinale) {
    return "Decision deja prise.";
  }

  if (paiement.statut === "ABANDONNE") {
    return "Paiement abandonne.";
  }

  if (!preuveEnvoyee) {
    return "Aucun justificatif a verifier.";
  }

  if (!paiement.verification.peutAccepter) {
    return "Acceptation bloquee par les alertes critiques.";
  }

  return "";
}

function raisonBoutonRefuser(paiement, decisionFinale, preuveEnvoyee) {
  if (decisionFinale) {
    return "Decision deja prise.";
  }

  if (paiement.statut === "ABANDONNE") {
    return "Paiement abandonne.";
  }

  if (!preuveEnvoyee) {
    return "Aucun justificatif a refuser.";
  }

  return "";
}

function attributBouton(actif, raison) {
  if (actif) {
    return "";
  }

  return `disabled title="${echapperHtml(raison || "Action indisponible.")}"`;
}

function formaterDate(valeur) {
  if (!valeur) {
    return "-";
  }

  const date = new Date(valeur);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

module.exports = afficherMarchand;
