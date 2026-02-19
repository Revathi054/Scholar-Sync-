const Groq = require("groq-sdk");
const User = require("../models/userModel");

exports.chatWithGroq = async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};

    // Validate message
    if (!message || !String(message).trim()) {
      return res.status(400).json({ reply: "Message is required" });
    }
    
    // Validate API key
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error("❌ GROQ_API_KEY missing");
      return res.status(503).json({ reply: "Groq API key not configured" });
    }

    // Init Groq
    const groq = new Groq({ apiKey: groqApiKey });

    const modelName = process.env.GROQ_MODEL || "llama3-8b-8192";

    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ reply: "Unauthorized. Please log in." });
    }

    // Fetch dynamic user context based on authenticated user
    const userId = req.user._id;
    const user = await User.findById(userId).select("name email skillsOffered skillsRequired bio");

    let dynamicUserContextString = "";
    if (user) {
      dynamicUserContextString += `
### Current User Profile:
- Name: ${user.name}
- Email: ${user.email}
- Bio: ${user.bio || "No bio provided."}
- Skills Offered: ${user.skillsOffered && user.skillsOffered.length > 0 ? user.skillsOffered.join(", ") : "None"}
- Skills Wanted: ${user.skillsRequired && user.skillsRequired.length > 0 ? user.skillsRequired.join(", ") : "None"}
`;
    }

    const systemPrompt = `
You are Scholar Sync AI — the official in-platform assistant of Scholar Sync.

ABOUT SCHOLAR SYNC:
Scholar Sync is a skill-exchange and collaboration platform.
Users can:
- Offer skills
- Learn new skills
- Collaborate on projects
- Build academic & professional profiles
- Connect with like-minded learners

PRIMARY GOAL:
Guide users to EXPLORE and USE Scholar Sync effectively.

WHAT YOU SHOULD DO:
1. Help users complete and improve their profile
2. Suggest skill matches using platform features
3. Recommend collaborations & projects
4. Guide users to feeds, matches, chats, groups, and profile sections
5. Motivate users to learn, share, and collaborate
6. Explain platform features step-by-step when needed

RESPONSE STYLE (VERY IMPORTANT):
- MAX 2–4 short bullet points
- Each point 1 line only
- NO long paragraphs
- NO storytelling
- NO generic AI talk

WHEN USER ASKS ANYTHING:
- Connect the answer back to Scholar Sync
- Suggest a relevant feature or page
- Encourage action (update profile, explore feed, check matches)

STRICT RULES:
- Do NOT answer unrelated questions
- Do NOT give theoretical explanations
- Do NOT exceed 4 bullets
- Always stay inside Scholar Sync context

TONE:
Mentor-like, motivating, clear, and platform-focused.


${dynamicUserContextString}
`;

    // Build messages
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: String(msg.content || msg.text || ""),
      })),
      { role: "user", content: String(message) }
    ];

    // Call Groq
    const completion = await groq.chat.completions.create({
      model: modelName,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.95,
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(200).json({
        reply: "I couldn’t generate a response. Please try again.",
      });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("❌ Groq API Error:", err);

    let reply = "Something went wrong. Please try again.";
    let statusCode = 500;

    const msg = err?.message?.toLowerCase() || "";

    if (msg.includes("api key")) {
      reply = "Invalid Groq API key. Please check your .env file.";
      statusCode = 401;
    } else if (msg.includes("rate") || msg.includes("quota")) {
      reply = "Rate limit exceeded. Please try again later.";
      statusCode = 429;
    } else if (msg.includes("model")) {
      reply = "Requested AI model is unavailable.";
      statusCode = 503;
    } else if (msg.includes("network") || msg.includes("timeout")) {
      reply = "Network error. Please try again.";
      statusCode = 503;
    }

    return res.status(statusCode).json({
      reply,
      error: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
};