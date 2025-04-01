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
        content: buildSecondMessage(topic, "POUR", fightSessions.size)  ,
    },
  ];

  const againstMessages = [
    {
      role: "system",
      content: buildFirstMessage(fighterForId),
    },
    {
      role: "user",
      content:  buildSecondMessage(topic, "CONTRE", Number(fightSessions.size)) 
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
  const { sessionId } = req.body;

  if (!sessionId || !fightSessions.has(sessionId)) {
    return res.status(400).json({ error: "Invalid or missing sessionId." });
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

  // Fusion des messages pour reconstituer le débat complet
  for (
    let i = 0;
    i < Math.max(forMessages.length, againstMessages.length);
    i++
  ) {
    if (forMessages[i]) dialogue.push(forMessages[i]);
    if (againstMessages[i]) dialogue.push(againstMessages[i]);
  }

  const judgePrompt = {
    role: "system",
    content: refereeInstructions(dialogue), // Cette fonction doit générer le prompt d'arbitre complet
  };

  try {
    const clientFor = new IAClient(AI_PROVIDERS[fighterForId.toLowerCase()]);
    const clientAgainst = new IAClient(
      AI_PROVIDERS[fighterAgainstId.toLowerCase()]
    );

    const [forVerdict, againstVerdict] = await Promise.all([
      clientFor.chat([judgePrompt]),
      clientAgainst.chat([judgePrompt]),
    ]);

    // Analyse commune des deux verdicts
    const combined = `${forVerdict.text} ${againstVerdict.text}`.toLowerCase();
    let winner = "ÉGALITÉ";

    if (combined.includes("gagnant : for")) winner = "FOR";
    else if (combined.includes("gagnant : against")) winner = "AGAINST";

    const response = {
      for: {
        id: fighterForId,
        verdict: forVerdict.text,
      },
      against: {
        id: fighterAgainstId,
        verdict: againstVerdict.text,
      },
      winner,
    };

    res.json(response);
  } catch (err) {
    console.error("❌ Erreur /end-match :", err);
    res.status(500).json({ error: "Erreur lors du jugement final." });
  }
});

// Démarrage
app.listen(PORT, () => {
  console.log(`🚀 IA OF RAGE server listening at http://localhost:${PORT}`);
});
