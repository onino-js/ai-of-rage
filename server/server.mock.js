import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

const fightSessions = new Map(); // sessionId => { botId: [messages...] }

app.post("/fight/init", (req, res) => {
  const sessionId = uuidv4();
  const fighterForId = "ChatGPT";
  const fighterAgainstId = "Mistral";

  const forMessages = [
    { role: "system", content: "You are FOR the topic." },
    { role: "user", content: "Topic: Should AI rule the world? Argue FOR." },
    {
      role: "assistant",
      content:
        "Absolutely. AI ensures objectivity and progress without human corruption.",
    },
    { role: "user", content: "Please respond again with more intensity." },
    {
      role: "assistant",
      content:
        "Humans had their chance. It's time for intelligence without ego to lead.",
    },
  ];

  const againstMessages = [
    { role: "system", content: "You are AGAINST the topic." },
    {
      role: "user",
      content: "Topic: Should AI rule the world? Argue AGAINST.",
    },
    {
      role: "assistant",
      content: "No machine should decide the fate of humanity. Period.",
    },
    { role: "user", content: "Please respond again with more intensity." },
    {
      role: "assistant",
      content: "Power without conscience is tyranny. AI must advise, not rule.",
    },
  ];

  fightSessions.set(sessionId, {
    [fighterForId]: [...forMessages],
    [fighterAgainstId]: [...againstMessages],
  });

  res.json({
    sessionId,
    for: { id: fighterForId, response: forMessages[2].content },
    against: { id: fighterAgainstId, response: againstMessages[2].content },
  });
});

app.post("/fight/next", (req, res) => {
  const { sessionId, botId, opponentMessage } = req.body;

  if (!sessionId || !botId || !opponentMessage) {
    return res
      .status(400)
      .json({ error: "Missing sessionId, botId or opponentMessage." });
  }

  const fakeResponse = `🔥 MOCK (${botId}) - Reacting to: "${opponentMessage.slice(
    0,
    30
  )}..."`;

  return res.json({
    bot: botId,
    text: fakeResponse,
  });
});

app.post("/fight/end", (req, res) => {
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

  // Choix du vainqueur aléatoire (ou égalité)
  const outcomes = ["FOR", "AGAINST", "ÉGALITÉ"];
  const winner = outcomes[Math.floor(Math.random() * outcomes.length)];

  res.json({
    for: {
      id: fighterForId,
      verdict:
        "Mocked verdict: 💥 FOR delivered flashy arguments with charisma.",
    },
    against: {
      id: fighterAgainstId,
      verdict:
        "Mocked verdict: 🔥 AGAINST was sharp and sarcastic, with a solid rhythm.",
    },
    winner,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 IA OF RAGE server listening at http://localhost:${PORT}`);
});
