api_url = "https://176.160.247.132";
const routes = {
  init: api_url + "/fight/init",
  next: api_url + "/fight/next",
  end: api_url + "/fight/end",
};

const fightConfiguration = {
  topic: "",
  fighterForId: null,
  fighterAgainstId: null,
  referee: null,
  nbOfRounds: 4,
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
  const modal = document.getElementById("intro-modal");
  const okButton = document.getElementById("modal-ok-button");
  document.getElementById("topic").addEventListener("input", canLaunchFight);

  okButton.addEventListener("click", () => {
    modal.style.display = "none";
    selectSound.play();
  });
  rotatePlaceholder("topic", placeholders, (interval = 1000));
});

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

function startFightEffect() {
  document.body.classList.add("fight-glow");
}

function stopFightEffect() {
  document.body.classList.remove("fight-glow");
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
    return null;
  }

  return [topic, fighterFor, fighterAgainst];
}

function canLaunchFight() {
  const topic = document.getElementById("topic")?.value.trim();
  const forImg = document.querySelector("#drop-for img");
  const againstImg = document.querySelector("#drop-against img");

  const forName = forImg?.alt;
  const againstName = againstImg?.alt;

  const valid = topic && forName && againstName && forName !== againstName;

  const btn = document.getElementById("fight-button");
  btn.classList.toggle("shown", valid);
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
  try {
    const res = await fetch(routes.end, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
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
      <h2>👑 Final Judgement</h2>

      <div style="margin-top: 1.5rem;">
        <h3>🟢 ${verdictData.for.id} (FOR)</h3>
        <p style="white-space: pre-wrap; font-style: italic;">${verdictData.for.verdict}</p>
      </div>

      <div style="margin-top: 2rem;">
        <h3>🔴 ${verdictData.against.id} (AGAINST)</h3>
        <p style="white-space: pre-wrap; font-style: italic;">${verdictData.against.verdict}</p>
      </div>

      <p style="margin-top: 2.5rem; font-size: 2rem;"><strong>🏆 Verdict final :</strong> <em>${verdictData.winner}</em></p>

      <button id="close-verdict-btn" style="margin-top: 1.5rem;">OK</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("close-verdict-btn").addEventListener("click", () => {
    modal.remove();
  });
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = 1; // 0 à 1
  utterance.rate = 1; // vitesse
  utterance.pitch = 1; // tonalité
  utterance.lang = "en-US";

  // Tu peux choisir une voix custom si dispo
  const voices = speechSynthesis.getVoices();
  const englishVoice = voices.find(
    (voice) => voice.lang.startsWith("en") && voice.name.includes("Male")
  );
  if (englishVoice) utterance.voice = englishVoice;

  speechSynthesis.speak(utterance);
}
