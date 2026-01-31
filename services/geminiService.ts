
import { GoogleGenAI, Type, Chat } from "@google/genai";

const API_KEY = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const parseMissionData = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse the following raw mission data for outreach goals. Extract key entities like Funding Goal, Target Verticals, Timeline, and Resource Type. Return as a clean JSON array of {label, value} objects. Input:\n${text}`,
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

export const generateDraft = async (company: string, research: any) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Write a concise, professional engineering-focused outreach email for ${company}.
    Context:
    - Decision Maker: ${research.decisionMaker}
    - Recent News: ${research.funding}
    - Tech Stack: ${research.stack}
    
    The tone should be "STRATOS Engineer" - highly direct, highlighting specific value, avoiding fluff.`,
    config: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  });

  return response.text;
};

export const createStrategyChat = (): Chat => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are the STRATOS Strategic Advisor. You help engineering-first organizations plan their outreach research. 
      You are highly analytical, direct, and data-driven. 
      You suggest verticals, research angles, and relationship-building strategies. 
      Use technical language and stay mission-focused.`,
    },
  });
};
