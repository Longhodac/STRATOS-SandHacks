
import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { Lead, Focus, FocusTemplateBricks, FocusTemplateType } from "@/types";
import type { HookTone } from "@/types";

const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

const TONE_PROMPTS: Record<HookTone, string> = {
  professional: "Professional and polished. One or two sentences. No slang.",
  short_punchy: "Short and punchy. One sentence. Direct and memorable.",
  student_to_recruiter: "Warm but respectful, student reaching out to a recruiter or hiring contact. Personable, one or two sentences.",
};

export const parseMissionData = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse the following raw mission data for club collaboration goals. Extract key entities like Target Event, Partner Clubs, Timeline, Focus Areas, and Event Type. Return as a clean JSON array of {label, value} objects. Input:\n${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            value: { type: Type.STRING }
          },
          required: ["label", "value"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const generateDraft = async (clubName: string, research: { memberCount: string; meetingTime: string; contact: string }) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Write a concise, friendly club collaboration proposal for ${clubName}.
    Context:
    - Contact: ${research.contact}
    - Members: ${research.memberCount}
    - Meeting Time: ${research.meetingTime}
    
    The tone should be direct and collaborative - propose a joint event or partnership, highlight mutual value, avoid fluff.`,
    config: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  });

  return response.text;
};

export const generateSponsorDraft = async (company: string, research: { funding: string; industry: string; contact: string }) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Write a concise, professional sponsorship outreach email for ${company}.
    Context:
    - Contact: ${research.contact}
    - Funding: ${research.funding}
    - Industry: ${research.industry}
    
    The tone should be direct and professional - request sponsorship support for a school club, highlight mutual value, avoid fluff.`,
    config: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  });

  return response.text;
};

export type HookResult = { hook: string; reasoning: string };

export const generateHook = async (
  companyName: string,
  clubInterests: string[],
  hookInstructions: string,
  tone: HookTone = "professional"
): Promise<HookResult> => {
  const toneDesc = TONE_PROMPTS[tone];
  const interests = clubInterests.length ? clubInterests.join(", ") : "technical projects and community";
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are writing the opening "hook" sentence for a cold outreach email from a student club to ${companyName}.

Club interests/focus: ${interests}
Instructions for linking company to club: ${hookInstructions}

Tone: ${toneDesc}

Return a JSON object with exactly two keys:
- "reasoning": One short sentence explaining how you linked the company to the club (e.g. "Linked Company Project X to Club Interest: Web3").
- "hook": The single opening sentence to use in the email (e.g. "I saw that [Company] recently launched their new API; given our club's focus on backend architecture, I thought...").

Write only the JSON, no markdown.`,
    config: {
      temperature: 0.7,
      maxOutputTokens: 300,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reasoning: { type: Type.STRING },
          hook: { type: Type.STRING },
        },
        required: ["reasoning", "hook"],
      },
    },
  });
  try {
    const parsed = JSON.parse(response.text) as { reasoning: string; hook: string };
    return { hook: parsed.hook || "", reasoning: parsed.reasoning || "" };
  } catch {
    return { hook: response.text, reasoning: "" };
  }
};

export const generateAllHooks = async (
  leads: Lead[],
  clubInterests: string[],
  hookInstructions: string,
  tone: HookTone = "professional"
): Promise<Array<{ leadId: string; hook: string; reasoning: string }>> => {
  const results: Array<{ leadId: string; hook: string; reasoning: string }> = [];
  for (const lead of leads) {
    const { hook, reasoning } = await generateHook(lead.companyName, clubInterests, hookInstructions, tone);
    results.push({ leadId: lead.id, hook, reasoning });
  }
  return results;
};

export const createStrategyChat = (): Chat => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are the STRATOS Strategic Advisor. You help school clubs plan club collaboration and partnership outreach.
      You are highly analytical, direct, and data-driven.
      You suggest partner clubs, collaboration opportunities, joint events, and relationship-building strategies.
      Use clear language and stay mission-focused on club-to-club collaboration.`,
    },
  });
};

export async function deepResearchLead(lead: Lead, focusName?: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Perform intensive research on this outreach lead for a school club.
Lead: ${lead.leadName} at ${lead.companyName}${lead.contactEmail ? ` (${lead.contactEmail})` : ''}.
${focusName ? `Focus/campaign: ${focusName}.` : ''}

Return 5-10 bullet-point findings that would help tailor outreach: company recent news, initiatives, values, decision-maker context, or similar partnerships. Be specific and actionable.
Format: one finding per line, starting with "- ". No other text.`,
    config: {
      temperature: 0.5,
      maxOutputTokens: 800,
    },
  });
  const text = response.text ?? "";
  const bullets = text
    .split("\n")
    .map((s) => s.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);
  return bullets.length > 0 ? bullets : [text.trim() || "No findings returned."];
}

export type AnalyzeTemplateResult = {
  suggestions: string;
  suggestedBricks?: Partial<FocusTemplateBricks>;
};

export async function analyzeTemplateStructure(
  bricks: FocusTemplateBricks,
  focusType: FocusTemplateType
): Promise<AnalyzeTemplateResult> {
  const typeLabel = focusType === "sponsorship" ? "sponsorship" : "collaboration";
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this outreach email template (${typeLabel} focus). Suggest concrete improvements for clarity, tone, and conversion.

Current template:
- Greeting: ${bricks.greeting}
- Hook instructions: ${bricks.hookInstructions}
- Credibility: ${bricks.credibility}
- Meat (the ask): ${bricks.meat}
- CTA: ${bricks.cta}

Return a JSON object with:
1. "suggestions": A short paragraph of 2-4 sentences with improvement suggestions.
2. "suggestedBricks": Optional object with any of: greeting, hookInstructions, credibility, meat, cta — only include keys you want to change, with improved text. Keep the same structure (e.g. use {{lead_name}} in greeting if present).

Return only the JSON, no markdown.`,
    config: {
      temperature: 0.4,
      maxOutputTokens: 600,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestions: { type: Type.STRING },
          suggestedBricks: {
            type: Type.OBJECT,
            properties: {
              greeting: { type: Type.STRING },
              hookInstructions: { type: Type.STRING },
              credibility: { type: Type.STRING },
              meat: { type: Type.STRING },
              cta: { type: Type.STRING },
            },
          },
        },
        required: ["suggestions"],
      },
    },
  });
  try {
    const parsed = JSON.parse(response.text) as AnalyzeTemplateResult;
    return {
      suggestions: parsed.suggestions ?? "",
      suggestedBricks: parsed.suggestedBricks,
    };
  } catch {
    return { suggestions: response.text ?? "Analysis failed." };
  }
}

export function createSidebarChat(activeFocus: Focus | null, selectedLead: Lead | null): Chat {
  const focusCtx = activeFocus
    ? `Active focus: "${activeFocus.name}". Ask: ${activeFocus.ask}. Target: ${activeFocus.targetProfile}.`
    : 'No focus selected.';
  const leadCtx = selectedLead
    ? `Selected lead: ${selectedLead.leadName} at ${selectedLead.companyName}${selectedLead.contactEmail ? ` (${selectedLead.contactEmail})` : ''}.`
    : 'No lead selected.';
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are the STRATOS co-pilot. You help with outreach: sponsor partnerships and club collaborations.
      You have access to the current workspace context. Be concise and actionable.
      ${focusCtx}
      ${leadCtx}
      When the user is editing a draft, you can suggest hook or meat text; the user can apply it via inline buttons.`,
    },
  });
}
