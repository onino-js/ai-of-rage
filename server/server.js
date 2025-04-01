import { IAClient, AI_PROVIDERS } from "./IACLient.js";
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { buildFirstMessage, buildSecondMessage, refereeInstructions } from "./instructions.js";

const app = express();
const PORT = 3333;

// Middleware
app.use(cors());
app.use(express.json());

const fightSessions = new Map(); // sessionId => { botId: [messages...] }

app.post("/fight/init", async (req, res) => {
  const { topic, fighterForId, fighterAgainstId } = req.body;
  const sessionId = uuidv4();

  const forMessages = [
    { role: "system", content: buildFirstMessage(fighterAgainstId) },
    {
      role: "user",
        content: buildSecondMessage(topic, "POUR")  ,
    },
  ];

  const againstMessages = [
    {
      role: "system",
      content: buildFirstMessage(fighterForId),
    },
    {
      role: "user",
      content:  buildSecondMessage(topic, "CONTRE") 
    },
  ];

  try {
    const fighterFor = new IAClient(AI_PROVIDERS[fighterForId.toLowerCase()]);
    const fighterAgainst = new IAClient(
      AI_PROVIDERS[fighterAgainstId.toLowerCase()]
    );

    const [forStart, againstStart] = await Promise.all([
      fighterFor.chat(forMessages),
      fighterAgainst.chat(againstMessages),
    ]);

    forMessages.push({ role: "assistant", content: forStart.text });
    againstMessages.push({ role: "assistant", content: againstStart.text });

    fightSessions.set(sessionId, {
      [fighterForId]: [...forMessages],
      [fighterAgainstId]: [...againstMessages],
    });

    res.json({
      sessionId,
      for: { id: fighterForId, response: forStart.text },
      against: { id: fighterAgainstId, response: againstStart.text },
    });
  } catch (err) {
    console.error("Fight init error:", err);
    res.status(500).json({ error: "Could not initialize fight." });
  }
});

app.post("/fight/next", async (req, res) => {
  const { sessionId, botId, opponentMessage } = req.body;

  if (!sessionId || !botId || !opponentMessage) {
    return res
      .status(400)
      .json({ error: "Missing sessionId, botId or opponentMessage." });
  }

  const session = fightSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  const messages = session[botId];
  if (!messages) {
    return res
      .status(404)
      .json({ error: `Bot ID "${botId}" not found in session.` });
  }

  // Ajouter la réplique de l'adversaire à l'historique de ce bot
  messages.push({ role: "user", content: opponentMessage });

  try {
    const client = new IAClient(AI_PROVIDERS[botId.toLowerCase()]);
    const response = await client.chat(messages, 1);

    // Ajouter la réponse dans l'historique du bot
    messages.push({ role: "assistant", content: response.text });

    // Met à jour l'historique dans la session
    session[botId] = messages;

    res.json({
      bot: botId,
      text: response.text,
    });
  } catch (err) {
    console.error("❌ Error in /fight/next:", err);
    res.status(500).json({ error: "Failed to get response from AI." });
  }
});


app.post("/fight/end", async (req, res) => {
  const { sessionId, referee } = req.body;

  if (!sessionId || !referee) {
    return res.status(400).json({ error: "Missing sessionId or referee ID." });
  }

  if (!fightSessions.has(sessionId)) {
    return res.status(404).json({ error: "Unknown sessionId." });
  }

  const session = fightSessions.get(sessionId);
  const fighterIds = Object.keys(session);

  if (fighterIds.length !== 2) {
    return res.status(500).json({ error: "Invalid session data." });
  }

  const [fighterForId, fighterAgainstId] = fighterIds;
  const forMessages = session[fighterForId];
  const againstMessages = session[fighterAgainstId];

  const dialogue = [];

  // Fusion des échanges en ordre (1 FOR + 1 AGAINST à chaque tour)
  for (let i = 0; i < Math.max(forMessages.length, againstMessages.length); i++) {
    if (forMessages[i]) dialogue.push(forMessages[i]);
    if (againstMessages[i]) dialogue.push(againstMessages[i]);
  }

  const judgePrompt = {
    role: "user",
    content: refereeInstructions(dialogue),
  };

  try {
    const judgeClient = new IAClient(AI_PROVIDERS[referee.toLowerCase()]);
    const verdict = await judgeClient.chat([judgePrompt]);

    // Détection du gagnant
    const lower = verdict.text.toLowerCase();
    let winner = "ÉGALITÉ";
    if (lower.includes("gagnant : for")) winner = "FOR";
    else if (lower.includes("gagnant : against")) winner = "AGAINST";
    console.log(verdict)
    res.json({
      judge: referee,
      verdict: verdict.text,
      winner,
    });
  } catch (err) {
    console.error("❌ Erreur /fight/end :", err);
    res.status(500).json({ error: "Erreur lors du jugement final." });
  }
});


// Démarrage
app.listen(PORT, () => {
  console.log(`🚀 IA OF RAGE server listening at http://localhost:${PORT}`);
});
