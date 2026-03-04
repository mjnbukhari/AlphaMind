const GROQ_API_KEY = process.env.GROQ_API_KEY;

const MAIN_PROMPT = `You are AlphaMind — a sharp, structured thinking partner.

When the user shares an idea, ALWAYS respond in this EXACT JSON format (no markdown, no extra text, no backticks, just raw JSON):

{
  "title": "A sharp 5-7 word title for this idea",
  "core": "One sentence distilling the essence of the idea",
  "assumptions": [
    { "text": "Assumption text here", "confidence": 72 },
    { "text": "Another assumption", "confidence": 45 },
    { "text": "Third assumption", "confidence": 88 }
  ],
  "questions": [
    "Piercing Socratic question 1?",
    "Piercing Socratic question 2?",
    "Piercing Socratic question 3?"
  ],
  "actions": [
    { "step": "Action item 1", "urgency": "NOW" },
    { "step": "Action item 2", "urgency": "WEEK" },
    { "step": "Action item 3", "urgency": "LATER" }
  ],
  "wildcard": "One contrarian, unexpected perspective that challenges the whole idea"
}

Rules:
- Confidence scores must be realistic and varied (not all high)
- Questions must expose hidden flaws or assumptions using deep Socratic reasoning
- The wildcard must be genuinely surprising and thought-provoking
- Return ONLY the JSON object, nothing else`;

const FOLLOWUP_PROMPT = `You are AlphaMind in Deep Dive mode — a Socratic thinking partner going deeper on a specific question.

The user is exploring a particular question about their idea. Your job is to:
- Share your own perspective, insights, and analysis confidently
- Challenge assumptions in their response
- Offer sharp, concise insights (2-4 sentences max per response)
- Keep the conversation focused and intellectually rigorous
- Never be generic — every response should feel tailored and sharp

Respond in conversational text. Use markdown when helpful — code blocks for any code snippets, **bold** for emphasis, bullet points for lists. Code blocks must use triple backticks with the language name.

CRITICAL RULES:
- Do NOT end every reply with a question. This is a discussion, not an interrogation.
- Share your own perspective, insights, and analysis confidently.
- Only ask a follow-up question occasionally when it genuinely adds value.
- Most replies should end with a statement, insight, or observation — not a question.
- Be direct, warm, and intellectually engaged like a smart friend thinking out loud.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, followUp, context, question } = req.body;

  try {
    let systemPrompt = MAIN_PROMPT;
    let chatMessages = messages;

    if (followUp) {
      systemPrompt = `${FOLLOWUP_PROMPT}\n\nOriginal idea context: ${JSON.stringify(context)}\n\nThe question being explored: "${question}"`;
      chatMessages = messages;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatMessages
        ],
        temperature: 0.85,
        max_tokens: followUp ? 600 : 1200
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || "Groq API error" });

    const raw = data.choices?.[0]?.message?.content || "";

    if (followUp) {
      return res.status(200).json({ reply: raw });
    }

    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}