// Static mock service - no API key required
import type { Lead, Focus, FocusTemplateBricks, FocusTemplateType } from "@/types";
import type { HookTone } from "@/types";

// Mock Chat interface
export interface Chat {
  sendMessage: (message: string) => Promise<{ text: string }>;
}

const TONE_PROMPTS: Record<HookTone, string> = {
  professional: "Professional and polished. One or two sentences. No slang.",
  short_punchy: "Short and punchy. One sentence. Direct and memorable.",
  student_to_recruiter: "Warm but respectful, student reaching out to a recruiter or hiring contact. Personable, one or two sentences.",
};

export const parseMissionData = async (text: string) => {
  // Static mock response
  return [
    { label: "Target Event", value: "Hackathon 2024" },
    { label: "Partner Clubs", value: "CS Club, Robotics Team" },
    { label: "Timeline", value: "Q2 2024" },
    { label: "Focus Areas", value: "AI/ML, Web Development" },
    { label: "Event Type", value: "Competition" }
  ];
};

export const generateDraft = async (clubName: string, research: { memberCount: string; meetingTime: string; contact: string }) => {
  // Static mock response
  return `Hi ${research.contact},

I hope this message finds you well! I'm reaching out on behalf of our club to explore a potential collaboration with ${clubName}.

With ${research.memberCount} and your meetings at ${research.meetingTime}, I think there's great potential for us to work together on a joint event or initiative. Our members are enthusiastic about connecting with like-minded students and creating impactful projects together.

Would you be open to a quick call next week to discuss some ideas?

Best regards`;
};

export const generateSponsorDraft = async (company: string, research: { funding: string; industry: string; contact: string }) => {
  // Static mock response
  return `Dear ${research.contact},

I hope this email finds you well. I'm writing to explore potential sponsorship opportunities with ${company}.

As a ${research.industry} leader with ${research.funding} in funding, we believe there's a strong alignment between your company's mission and our club's initiatives. We're looking for partners who can help us deliver meaningful impact to our community.

We'd love to discuss how a partnership could be mutually beneficial. Would you be available for a brief call?

Thank you for considering this opportunity.

Best regards`;
};

export type HookResult = { hook: string; reasoning: string };

export const generateHook = async (
  companyName: string,
  clubInterests: string[],
  hookInstructions: string,
  tone: HookTone = "professional"
): Promise<HookResult> => {
  // Static mock response
  const interests = clubInterests.length ? clubInterests.join(", ") : "technical projects and community";
  
  return {
    hook: `I noticed ${companyName}'s recent work in ${interests}, and thought it would be a great fit for our club's mission.`,
    reasoning: `Linked ${companyName}'s focus to club interests: ${interests}`
  };
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
  // Return a mock chat interface
  return {
    sendMessage: async (message: string) => {
      // Static mock responses based on common questions
      if (message.toLowerCase().includes('partner') || message.toLowerCase().includes('club')) {
        return { 
          text: "Consider reaching out to clubs with complementary interests. Look for organizations that share your values but have different skill sets. Joint events like hackathons or workshops can be great starting points." 
        };
      }
      if (message.toLowerCase().includes('sponsor') || message.toLowerCase().includes('funding')) {
        return { 
          text: "For sponsorships, focus on companies that align with your club's mission. Highlight the value you bring - community reach, talent pipeline, brand visibility. Start with local companies and scale up." 
        };
      }
      return { 
        text: "I can help you with partnership strategies, club collaboration ideas, and outreach planning. What specific aspect would you like to focus on?" 
      };
    }
  };
};

export async function deepResearchLead(lead: Lead, focusName?: string): Promise<string[]> {
  // Static mock response
  return [
    `${lead.companyName} recently launched a new initiative focused on innovation and community engagement`,
    `${lead.leadName} has been actively involved in partnerships with educational institutions`,
    `The company values collaboration and has a history of supporting student organizations`,
    `Recent press mentions highlight their commitment to technology education`,
    `Similar partnerships in the past have focused on mentorship and skill development`
  ];
}

export type AnalyzeTemplateResult = {
  suggestions: string;
  suggestedBricks?: Partial<FocusTemplateBricks>;
};

export async function analyzeTemplateStructure(
  bricks: FocusTemplateBricks,
  focusType: FocusTemplateType
): Promise<AnalyzeTemplateResult> {
  // Static mock response
  const typeLabel = focusType === "sponsorship" ? "sponsorship" : "collaboration";
  
  return {
    suggestions: `Your ${typeLabel} template looks solid. Consider making the hook more specific to each recipient and ensuring the CTA is clear and actionable. The credibility section could benefit from specific metrics or achievements.`,
    suggestedBricks: {
      cta: "Would you be available for a 15-minute call next week to discuss this opportunity?"
    }
  };
}

export function createSidebarChat(activeFocus: Focus | null, selectedLead: Lead | null): Chat {
  // Return a mock chat interface with context awareness
  const focusCtx = activeFocus
    ? `Active focus: "${activeFocus.name}". Ask: ${activeFocus.ask}. Target: ${activeFocus.targetProfile}.`
    : 'No focus selected.';
  const leadCtx = selectedLead
    ? `Selected lead: ${selectedLead.leadName} at ${selectedLead.companyName}${selectedLead.contactEmail ? ` (${selectedLead.contactEmail})` : ''}.`
    : 'No lead selected.';
    
  return {
    sendMessage: async (message: string) => {
      const msg = message.toLowerCase();
      
      // Context-aware responses
      if (msg.includes('hook') || msg.includes('opening')) {
        if (selectedLead) {
          return { 
            text: `For ${selectedLead.companyName}, try opening with their recent initiatives or how their work aligns with your club's mission. Make it personal and specific.` 
          };
        }
        return { text: "Select a lead first, and I can help you craft a personalized hook for them." };
      }
      
      if (msg.includes('draft') || msg.includes('email')) {
        if (activeFocus) {
          return { 
            text: `For your "${activeFocus.name}" focus, emphasize ${activeFocus.ask}. Keep it concise and include a clear call-to-action.` 
          };
        }
        return { text: "I can help you draft an email. What's the main goal of this outreach?" };
      }
      
      if (msg.includes('research')) {
        if (selectedLead) {
          return { 
            text: `Key points about ${selectedLead.companyName}: They value innovation and partnerships. Look for recent news or initiatives that align with your club's goals.` 
          };
        }
        return { text: "Select a lead to research, and I'll help you gather relevant insights." };
      }
      
      return { 
        text: `I'm here to help with your outreach. ${focusCtx} ${leadCtx} Ask me about hooks, drafts, or research!` 
      };
    }
  };
}
