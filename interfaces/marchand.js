const { pageHtml, echapperHtml, formaterMontant } = require("./commun");

function afficherMarchand(paiements) {
  const paiementsTries = [...paiements].sort((a, b) => b.creeLe.localeCompare(a.creeLe));
  const paiementsAbandonnes = paiementsTries.filter((paiement) => paiement.statut === "ABANDONNE");
  const paiementsAControler = paiementsTries.filter((paiement) => Boolean(paiement.preuve && paiement.verification));
  const paiementsEnAttente = paiementsTries.filter((paiement) => {
    return paiement.statut !== "ABANDONNE" && (!paiement.preuve || !paiement.verification);
  });
  const lignesAControler = paiementsAControler.map(afficherLignePaiement).join("");
  const lignesEnAttente = paiementsEnAttente.map(afficherLignePaiement).join("");
  const lignesAbandonnees = paiementsAbandonnes.map(afficherLignePaiement).join("");

  return pageHtml("Tableau marchand", `
    <main>
      <div class="titre-ligne">
        <div>
          <h1>Tableau marchand</h1>
          <p>
            ${paiementsAControler.length} justificatif(s) a controler -
            ${paiementsEnAttente.length} paiement(s) en attente du client
          </p>
        </div>
        <form method="post" action="/marchand/deconnexion">
          <button type="submit" class="bouton-secondaire">Deconnexion</button>
        </form>
      </div>
      <p id="messageAction" class="retour-action" hidden></p>
      <section class="section-marchand">
        <h2>Justificatifs a controler</h2>
        <p class="description-section">Paiements pour lesquels le client a envoye un recu. Verifiez votre compte de paiement, puis acceptez ou refusez.</p>
        ${lignesAControler || "<p>Aucun justificatif a controler.</p>"}
      </section>
      <details class="section-marchand">
        <summary>Paiements en attente du justificatif (${paiementsEnAttente.length})</summary>
        <p class="description-section">Paiements crees ou ouverts par le client, mais sans recu valide envoye. Aucune decision marchand n'est attendue ici.</p>
        ${lignesEnAttente || "<p>Aucun paiement en attente.</p>"}
      </details>
      <details class="section-marchand">
        <summary>Paiements abandonnes (${paiementsAbandonnes.length})</summary>
        <p class="description-section">Paiements arretes avant reception d'un justificatif valide, souvent apres annulation ou retour du client vers l'application marchande.</p>
        ${lignesAbandonnees || "<p>Aucun paiement abandonne.</p>"}
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
  `);
}

function afficherLignePaiement(paiement) {
  const alertes = paiement.verification
    ? paiement.verification.alertes.map(afficherAlerte).join("")
    : "<li>Aucun justificatif recu.</li>";
  const controles = paiement.verification ? afficherControles(paiement.verification) : "";
  const extractionTexte = paiement.verification ? afficherExtractionTexte(paiement.verification.extractionTexte) : "";
  const imagePreuve = paiement.preuve
    ? `<img src="/marchand/preuves/${echapperHtml(paiement.preuve.nomFichierStocke)}" alt="Justificatif de paiement">`
    : "";
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
  const peutRenvoyerNotification =
    decisionFinale &&
    Boolean(paiement.urlWebhook) &&
    (!paiement.dernierWebhook || paiement.dernierWebhook.statut !== "RECU");

  return `
    <article class="paiement">
      <div>
        <h2>${echapperHtml(paiement.id)}</h2>
        <p>${formaterMontant(paiement.montant, paiement.devise)} - ${echapperHtml(paiement.statut)}</p>
        ${origine}
        <p>Commande: ${echapperHtml(paiement.idCommande)} | Client: ${echapperHtml(paiement.idClient)}</p>
        ${metadonnees}
        <p>Reference paiement: ${echapperHtml(paiement.preuve ? paiement.preuve.referenceTransaction : "-")}</p>
        <p>Score de controle: ${paiement.verification ? paiement.verification.score : "-"}</p>
        ${decision}
        ${webhook}
        <ul>${alertes}</ul>
        ${controles}
        ${extractionTexte}
        <div class="actions">
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

function afficherAlerte(alerte) {
  const prefixe = alerte.critique ? "Critique: " : "";
  return `<li>${prefixe}${echapperHtml(alerte.message)}</li>`;
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

  return `<p>Metadonnees: <code>${echapperHtml(JSON.stringify(metadonnees))}</code></p>`;
}

function afficherOrigine(origine) {
  const estSandbox = origine === "sandbox";
  const libelle = estSandbox ? "Sandbox de test" : "Application marchande";
  const classe = estSandbox ? "neutre" : "succes";

  return `<p class="etat-decision ${classe}">Origine: ${echapperHtml(libelle)}</p>`;
}

function afficherDecision(paiement) {
  if (paiement.statut === "PAYE") {
    return `<p class="etat-decision succes">Decision finale: paiement accepte</p>`;
  }

  if (paiement.statut === "REFUSE") {
    return `<p class="etat-decision erreur">Decision finale: paiement refuse</p>`;
  }

  if (paiement.statut === "ABANDONNE") {
    return `<p class="etat-decision neutre">Paiement abandonne</p>`;
  }

  if (paiement.preuve) {
    return `<p class="etat-decision attente">Decision finale: en attente</p>`;
  }

  return `<p class="etat-decision neutre">Decision finale: aucun justificatif recu</p>`;
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
