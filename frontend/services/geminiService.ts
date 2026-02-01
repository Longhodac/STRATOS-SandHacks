
import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { Lead } from "@/types";
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
