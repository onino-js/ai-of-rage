api_url = "https://7a3e-2001-861-3201-d840-8584-d007-dc28-d3d5.ngrok-free.app";

const routes = {
  call: api_url + "fight/call",
  init: api_url + "/fight/init",
  next: api_url + "/fight/next",
  end: api_url + "/fight/end",
};

const fightConfiguration = {
  topic: "",
  fighterForId: null,
  fighterAgainstId: null,
  referee: null,
  nbOfRounds: 6,
};

const fightButton = document.getElementById("fight-button");
const topicInput = document.getElementById("topic");
const fighterList = document.getElementById("fighter-list");
const imgTitle = document.getElementById("img-title");
const nextBtn = document.getElementById("next-btn");
let currentRound = 0;

function syncTopicWithInput() {
  const topicInput = document.getElementById("topic");
  if (!topicInput) return;

  topicInput.addEventListener("input", () => {
    fightConfiguration.topic = topicInput.value.trim();
  });
}

// Handle first modal
window.addEventListener("DOMContentLoaded", () => {
  syncTopicWithInput();
  checkFighterAvailability();
  showwFirstModal();
});

function showwFirstModal() {
  const modal = document.getElementById("intro-modal");
  const okButton = document.getElementById("modal-ok-button");
  document.getElementById("topic").addEventListener("input", canLaunchFight);

  okButton.addEventListener("click", () => {
    modal.style.display = "none";
    selectSound.play();
    rotatePlaceholder("topic", placeholders, (interval = 1000));
    handleDragFighter();
  });
}

function handleDragFighter() {
  // handle drag and drops
  let draggedFighter = null;

  document.querySelectorAll(".fighter").forEach((fighter) => {
    fighter.addEventListener("dragstart", () => {
      draggedFighter = fighter;
    });
  });

  document.querySelectorAll(".drop-zone").forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("hovered");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("hovered");
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("hovered");

      if (draggedFighter) {
        const imgSrc = draggedFighter.querySelector("img").src;
        const altText = draggedFighter.dataset.name;
        const fighterId = draggedFighter.dataset.name;

        zone.innerHTML = "";
        zone.classList.add("transparent");

        const img = document.createElement("img");
        img.src = imgSrc;
        img.alt = altText;
        switch (zone.id) {
          case "drop-for":
            img.classList.add("big-fighter");
            fightConfiguration.fighterForId = fighterId;
            break;

          case "drop-against":
            img.classList.add("big-fighter");
            fightConfiguration.fighterAgainstId = fighterId;
            break;

          case "referee":
            img.classList.add("referee");
            fightConfiguration.fighterAgainstId = fighterId;
            break;
        }
        zone.appendChild(img);
        canLaunchFight();
      }
    });
  });
}

async function checkFighterAvailability() {
  try {
    const res = await fetch(routes.call, {
      method: "POST",
    });
    const results = await res.json();

    Object.entries(results).forEach(([fighterId, isAvailable]) => {
      const fighterElement = document.querySelector(
        `.fighter[data-name="${
          fighterId.charAt(0).toUpperCase() + fighterId.slice(1)
        }"]`
      );
      if (fighterElement) {
        if (isAvailable) {
          fighterElement.classList.remove("disabled");
        } else {
          fighterElement.classList.add("disabled");
        }
      }
    });
  } catch (err) {
    console.error("Erreur lors de la vérification des IA :", err);
  }
}

function startFightEffect() {
  document.body.classList.add("fight-glow");
}

function stopFightEffect() {
  document.body.classList.remove("fight-glow");
}

function showFightTitle(topic) {
  const fightTitleEl = document.getElementById("topic-title");
  fightTitleEl.style.display = "block";
  fightTitleEl.innerHTML = topicInput.value.trim();
}

fightButton.addEventListener("click", async () => {
  const inputs = checkInputs();
  if (!inputs) return;

  const [topic, fighterForId, fighterAgainstId] = inputs;

  // Nettoyage UI
  topicInput.remove();
  fighterList.remove();
  fightButton.remove();
  imgTitle.remove();
  selectSound.stop();
  battleSound.play();
  startFightEffect();
  // Lancer le combat
  const session = await initFight(topic, fighterForId, fighterAgainstId);

  // À suivre : startRound(session);
});

function checkInputs() {
  const topic = document.getElementById("topic")?.value.trim();
  const forZone = document.getElementById("drop-for");
  const againstZone = document.getElementById("drop-against");

  const fighterFor = forZone.querySelector("img")?.alt;
  const fighterAgainst = againstZone.querySelector("img")?.alt;

  if (!topic) {
    alert("Please enter a topic for the fight.");
    return null;
  }

  if (!fighterFor || !fighterAgainst) {
    alert("You must select two fighters.");
    return null;
  }

  if (fighterFor === fighterAgainst) {
    alert("Fighters must be different.");
    // return null;
  }

  return [topic, fighterFor, fighterAgainst];
}

function canLaunchFight() {
  const topic = document.getElementById("topic")?.value.trim();
  const forImg = document.querySelector("#drop-for img");
  const againstImg = document.querySelector("#drop-against img");
  const refereeImg = document.querySelector("#referee img");
  const forName = forImg?.alt;
  const againstName = againstImg?.alt;
  const refereeName = refereeImg?.alt;

  const valid = topic && forName && againstName && refereeName; // && (forName !== againstName);
  const btn = document.getElementById("fight-button");
  valid && btn.classList.toggle("shown", valid);
}

function appendBubble(side, text) {
  const container = document.getElementById("outputs");
  const div = document.createElement("div");
  div.className = `output-bubble ${side}`;
  div.textContent = text;
  container.appendChild(div);
  side === "for" ? beat1Sound.play() : beat2Sound.play();
}

function showSpinner() {
  document.getElementById("spinner").classList.remove("hidden");
}

function hideSpinner() {
  document.getElementById("spinner").classList.add("hidden");
}

async function initFight(topic, fighterForId, fighterAgainstId) {
  showSpinner();
  showFightTitle();
  try {
    const response = await fetch(routes.init, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, fighterForId, fighterAgainstId }),
    });

    const data = await response.json();
    // Stocke l'identifiant de session et les premières réponses
    const sessionId = data.sessionId;
    const forText = data.for.response;
    const againstText = data.against.response;

    // Affiche dans l'interface (à adapter à ta structure)
    appendBubble("for", forText);
    appendBubble("against", againstText);

    document.getElementById("next-btn").style.display = "flex";
    setupNextRoundTrigger({
      sessionId,
      fighterForId,
      fighterAgainstId,
    });

    // Retourne la session pour l'utiliser ensuite
    return {
      sessionId,
      fighterForId,
      fighterAgainstId,
    };
  } catch (error) {
    console.error("Erreur lors de l'initialisation du combat :", error);
    alert("Failed to start fight.");
  } finally {
    hideSpinner();
  }
}

async function onClickNext() {}

function setupNextRoundTrigger(session) {
  const { sessionId, fighterForId, fighterAgainstId } = session;
  let currentRound = 0;
  let lastResponse = ""; // la dernière punchline à transmettre

  nextBtn.addEventListener("click", async () => {
    const isEven = currentRound % 2 === 0;
    const botId = isEven ? fighterForId : fighterAgainstId;
    const side = isEven ? "for" : "against";
    document.getElementById("next-btn").style.display = "none";
    showSpinner();
    try {
      const res = await fetch(routes.next, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          botId,
          opponentMessage: lastResponse || "Continue the debate.",
        }),
      });
      const data = await res.json();
      appendBubble(side, data.text);
      lastResponse = data.text;
      currentRound++;
    } catch (err) {
      console.error("❌ Error during next round:", err);
    } finally {
      document.getElementById("next-btn").style.display = "flex";

      const totalRounds = fightConfiguration.nbOfRounds;
      hideSpinner();
      if (currentRound >= totalRounds) {
        endMatch(sessionId);
        return;
      }
    }
  });
}

async function endMatch(sessionId) {
  nextBtn.remove();
  battleSound.stop();
  gameOverSound.play();
  showSpinner();
  stopFightEffect();

  const refereeImg = document.querySelector("#referee img");
  const refereeName = refereeImg?.alt;
  try {
    const res = await fetch(routes.end, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, referee: refereeName }),
    });

    const data = await res.json();
    // Affiche la modale avec le verdict
    showJudgementModal(data);
  } catch (err) {
    console.error("❌ Error during end match:", err);
  } finally {
    hideSpinner();
  }
}

function showJudgementModal(verdictData) {
  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-content">
      <h2>👨‍⚖️ Verdict by ${verdictData.judge}</h2>

      <p style="white-space: pre-wrap; font-style: italic; margin-top: 1.5rem;">
        ${verdictData.verdict}
      </p>

      <p style="margin-top: 2.5rem; font-size: 1.6rem;">
        <strong>🏆 Winner:</strong> <em>${verdictData.winner}</em>
      </p>

      <button id="close-verdict-btn" style="margin-top: 1.5rem;">OK</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("close-verdict-btn").addEventListener("click", () => {
    modal.remove();
  });
}

// MOBILE SELECTION
document.querySelectorAll(".drop-zone").forEach((zone) => {
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("highlighted-zone");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("highlighted-zone");
  });

  zone.addEventListener("drop", () => {
    zone.classList.remove("highlighted-zone");
  });
});
