import type { Focus, FocusTemplateType, FocusTemplateBricks, ClubProfile } from '@/types';
import type { Lead } from '@/types';

export function getDefaultTemplateBricks(type: FocusTemplateType): FocusTemplateBricks {
  const greeting = 'Dear {{lead_name}},';
  const attachments: string[] = [];
  if (type === 'sponsorship') {
    return {
      greeting,
      hookInstructions: '',
      credibility: 'We represent 300+ students and run events that reach the broader campus community.',
      meat: 'We are seeking $1,000 and in-kind support for our hackathon. In return we offer logo placement, social shoutouts, and a tabling spot at the event.',
      cta: 'Would you be open to a short call to discuss? We\'d love to partner with you.',
      attachments,
    };
  }
  return {
    greeting,
    hookInstructions: '',
    credibility: 'We represent 300+ students and run events that reach the broader campus community.',
    meat: 'We\'d love to co-host a workshop or joint event. We can offer venue and promotion; we\'re open to your ideas for format and date.',
    cta: 'Would you be open to a 10-minute call to explore this?',
    attachments,
  };
}

export function getMeatFromFocus(focus: Focus): string {
  const bricks = focus.templateBricks;
  if (bricks?.meat) return bricks.meat;
  if (focus.templateType === 'sponsorship') {
    const g = focus.goal;
    return `We are seeking ${g?.target ?? focus.ask} for ${g?.title ?? focus.name}. In return we offer logo placement, social shoutouts, and visibility at the event.`;
  }
  return `We'd love to co-host an event or workshop. We're thinking: joint workshop and cross-promotion to both communities.`;
}

export function getCredibilityFromProfile(profile: ClubProfile): string {
  return `We are ${profile.clubName}. ${profile.missionStatement || 'We represent students and run events that reach the broader campus community.'}`;
}

export function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
  }
  out = out.replace(/\{\{[^}]+\}\}/g, '');
  return out;
}

export function getDefaultMasterTemplate(type: FocusTemplateType): string {
  if (type === 'sponsorship') {
    return `Hi {{lead_name}},

We are seeking {{ask_amount}} to support our {{focus_name}}.

Our club would offer the following sponsor benefits: {{sponsor_benefits}}.

Would you be open to a short call to discuss? We'd love to partner with {{company_name}}.

Best,
[Your name]`;
  }
  return `Hi {{lead_name}},

I noticed our clubs both value {{shared_interest}}. Would you want to co-host an event on {{available_date}}?

We're thinking: {{mutual_exchange}}.

Let me know if {{company_name}} would be interested in connecting.

Best,
[Your name]`;
}

export function buildSampleVars(
  type: FocusTemplateType,
  focusName: string,
  ask: string,
  lead: Lead | null
): Record<string, string> {
  const company = lead?.companyName ?? 'Acme Labs';
  const leadName = lead?.leadName ?? 'Sarah Chen';
  const base: Record<string, string> = {
    focus_name: focusName,
    company_name: company,
    lead_name: leadName,
  };
  if (type === 'sponsorship') {
    base.ask_amount = ask || '$1,000 and in-kind support';
    base.sponsor_benefits = 'Logo on materials, social shoutouts, tabling at event';
  } else {
    base.shared_interest = 'technical workshops and community building';
    base.available_date = 'March 15 or 22';
    base.mutual_exchange = 'joint workshop + cross-promotion to both communities';
  }
  return base;
}
