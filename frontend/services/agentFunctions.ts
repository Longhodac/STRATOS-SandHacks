/**
 * Agent Functions Executor
 * Maps LLM function calls to actual agent actions
 */

import { discoverCompanies, researchCompany, scrapeWebsite } from './agentsService';
import { generateHook, deepResearchLead } from './geminiService';
import { fillTemplate, getMeatFromFocus, getCredibilityFromProfile, getDefaultTemplateBricks } from '@/lib/templateUtils';
import type { AgentFunctionContext, AgentFunctionResult, HookTone, Lead, Focus } from '@/types';

// Tab name to route mapping
const TAB_ROUTES: Record<string, string> = {
  dashboard: '/',
  objectives: '/objectives',
  sponsors: '/sponsors',
  clubs: '/clubs',
  agents: '/agents',
  settings: '/settings',
};

/**
 * Execute an agent function called by the LLM
 */
export async function executeAgentFunction(
  functionName: string,
  args: Record<string, any>,
  context: AgentFunctionContext
): Promise<AgentFunctionResult> {
  console.log(`[AgentFunction] Executing: ${functionName}`, args);

  try {
    switch (functionName) {
      case 'discover_companies': {
        const { keyword, region, maxCompanies } = args;
        
        if (!keyword) {
          return {
            success: false,
            result: null,
            message: 'Error: Missing required parameter "keyword"',
          };
        }

        const result = await discoverCompanies(
          keyword,
          region || '',
          maxCompanies || 25
        );

        return {
          success: true,
          result,
          message: `✓ Found ${result.companies.length} ${keyword} companies${region ? ` in ${region}` : ''}. Click below to view results.`,
          navigateTo: '/agents',
        };
      }

      case 'research_company': {
        const { companyName, domain } = args;

        if (!companyName || !domain) {
          return {
            success: false,
            result: null,
            message: 'Error: Missing required parameters "companyName" and "domain"',
          };
        }

        const result = await researchCompany(companyName, domain, false);

        const emailCount = result.emails?.length || 0;
        const pageCount = result.contact_pages?.length || 0;

        return {
          success: true,
          result,
          message: `✓ Researched ${companyName}. Found ${emailCount} email${emailCount !== 1 ? 's' : ''} and ${pageCount} contact page${pageCount !== 1 ? 's' : ''}. View in Agents tab.`,
          navigateTo: '/agents',
        };
      }

      case 'scrape_website': {
        const { domain, companyName, maxPages } = args;

        if (!domain || !companyName) {
          return {
            success: false,
            result: null,
            message: 'Error: Missing required parameters "domain" and "companyName"',
          };
        }

        const result = await scrapeWebsite(
          domain,
          companyName,
          true, // headless
          maxPages || 10
        );

        return {
          success: true,
          result,
          message: `✓ Scraped ${domain}. Found ${result.emails_found} email${result.emails_found !== 1 ? 's' : ''} across ${result.pages_visited} page${result.pages_visited !== 1 ? 's' : ''}. View in Agents tab.`,
          navigateTo: '/agents',
        };
      }

      case 'generate_hook': {
        const { companyName, tone } = args;

        if (!companyName) {
          // Try to use selected lead if no company name provided
          if (context.selectedLead) {
            const hookTone: HookTone = (tone as HookTone) || 'professional';
            const hookInstructions = context.activeFocus?.templateBricks?.hookInstructions || '';

            const result = await generateHook(
              context.selectedLead.companyName,
              context.clubProfile.interests,
              hookInstructions,
              hookTone
            );

            return {
              success: true,
              result,
              message: `✓ Generated hook for ${context.selectedLead.companyName}:\n\n"${result.hook}"\n\nReasoning: ${result.reasoning}`,
            };
          }

          return {
            success: false,
            result: null,
            message: 'Error: No company specified and no lead selected',
          };
        }

        const hookTone: HookTone = (tone as HookTone) || 'professional';
        const hookInstructions = context.activeFocus?.templateBricks?.hookInstructions || '';

        const result = await generateHook(
          companyName,
          context.clubProfile.interests,
          hookInstructions,
          hookTone
        );

        return {
          success: true,
          result,
          message: `✓ Generated hook for ${companyName}:\n\n"${result.hook}"\n\nReasoning: ${result.reasoning}`,
        };
      }

      case 'deep_research_lead': {
        if (!context.selectedLead) {
          return {
            success: false,
            result: null,
            message: 'Error: No lead selected. Please select a lead first.',
          };
        }

        const result = await deepResearchLead(
          context.selectedLead,
          context.activeFocus?.name
        );

        const bullets = result.map((bullet) => `• ${bullet}`).join('\n');

        return {
          success: true,
          result,
          message: `✓ Deep research on ${context.selectedLead.companyName}:\n\n${bullets}`,
        };
      }

      case 'add_to_focus': {
        const { focusName, companyName, contactName, contactEmail, domain } = args;

        if (!companyName) {
          return {
            success: false,
            result: null,
            message: 'Error: Missing required parameter "companyName"',
          };
        }

        // Check if focus management methods are available
        if (!context.updateFocus || !context.focuses) {
          return {
            success: false,
            result: null,
            message: 'Error: Focus management not available. Cannot add company.',
          };
        }

        // Find target focus
        let targetFocus: Focus | undefined;
        
        if (!focusName || focusName.toLowerCase() === 'active' || focusName.toLowerCase() === 'current') {
          targetFocus = context.activeFocus || undefined;
        } else {
          targetFocus = context.focuses.find(
            f => f.name.toLowerCase().includes(focusName.toLowerCase())
          );
        }

        if (!targetFocus) {
          return {
            success: false,
            result: null,
            message: `Error: Could not find focus "${focusName || 'active'}". Please specify a valid focus name.`,
          };
        }

        // Create new lead
        const newLead: Lead = {
          id: crypto.randomUUID(),
          confidenceScore: 0,
          companyName: companyName,
          leadName: contactName || 'Contact',
          contactEmail: contactEmail || '',
          draftReady: false,
          tier: 2,
          domain: domain,
        };

        // Check if company already exists
        const existingLead = targetFocus.leads.find(
          l => l.companyName.toLowerCase() === companyName.toLowerCase()
        );

        if (existingLead) {
          return {
            success: false,
            result: null,
            message: `"${companyName}" is already in "${targetFocus.name}".`,
          };
        }

        // Add the lead
        const updatedLeads = [...targetFocus.leads, newLead];
        context.updateFocus(targetFocus.id, { leads: updatedLeads });

        return {
          success: true,
          result: newLead,
          message: `✓ Added "${companyName}" to "${targetFocus.name}". View in Sponsors tab.`,
          navigateTo: '/sponsors',
        };
      }

      case 'apply_template': {
        const { companyName, customHook } = args;

        if (!companyName) {
          return {
            success: false,
            result: null,
            message: 'Error: Missing required parameter "companyName"',
          };
        }

        if (!context.activeFocus) {
          return {
            success: false,
            result: null,
            message: 'Error: No active focus selected. Please select a focus first.',
          };
        }

        if (!context.updateFocus) {
          return {
            success: false,
            result: null,
            message: 'Error: Focus management not available. Cannot apply template.',
          };
        }

        // Find the lead
        const lead = context.activeFocus.leads.find(
          l => l.companyName.toLowerCase().includes(companyName.toLowerCase())
        );

        if (!lead) {
          return {
            success: false,
            result: null,
            message: `Error: Could not find "${companyName}" in the current focus. Add the company first.`,
          };
        }

        // Build draft email using template bricks
        const bricks = context.activeFocus.templateBricks || getDefaultTemplateBricks(context.activeFocus.templateType);
        
        // Fill in the greeting
        const greetingText = fillTemplate(bricks.greeting, { lead_name: lead.leadName });
        
        // Get credibility
        const credibility = context.clubProfile 
          ? getCredibilityFromProfile(context.clubProfile)
          : bricks.credibility;
        
        // Get meat (main content)
        const meat = lead.meatOverride || getMeatFromFocus(context.activeFocus);
        
        // Get CTA
        const cta = lead.cta || bricks.cta;
        
        // Use custom hook or existing hook
        const hook = customHook || lead.hook || '';

        // Build full draft
        const fullDraft = [
          `To: ${lead.contactEmail || ''}`,
          '',
          greetingText,
          '',
          hook ? hook.trim() : '',
          '',
          credibility.trim(),
          '',
          meat.trim(),
          '',
          cta.trim(),
          '',
          'Best,',
          '[Your name]',
        ].filter(line => line !== undefined).join('\n');

        // Update the lead with the draft
        const updatedLeads = context.activeFocus.leads.map(l =>
          l.id === lead.id ? { ...l, draftText: fullDraft, draftReady: true, hook: hook || l.hook } : l
        );
        context.updateFocus(context.activeFocus.id, { leads: updatedLeads });

        return {
          success: true,
          result: { draft: fullDraft, lead: lead },
          message: `✓ Generated email draft for "${lead.companyName}". View in Sponsors tab.`,
          navigateTo: '/sponsors',
        };
      }

      case 'navigate_to': {
        const { tab } = args;

        if (!tab) {
          return {
            success: false,
            result: null,
            message: 'Error: Missing required parameter "tab"',
          };
        }

        const route = TAB_ROUTES[tab.toLowerCase()];
        
        if (!route) {
          return {
            success: false,
            result: null,
            message: `Error: Unknown tab "${tab}". Valid tabs: ${Object.keys(TAB_ROUTES).join(', ')}`,
          };
        }

        return {
          success: true,
          result: { tab, route },
          message: `Navigating to ${tab}...`,
          navigateTo: route,
        };
      }

      default:
        return {
          success: false,
          result: null,
          message: `Error: Unknown function "${functionName}"`,
        };
    }
  } catch (error) {
    console.error(`[AgentFunction] Error executing ${functionName}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a backend connection error
    if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
      return {
        success: false,
        result: null,
        message: `⚠ Cannot connect to agents backend. Make sure the Python agent service is running at http://localhost:8000`,
      };
    }

    return {
      success: false,
      result: null,
      message: `Error: ${errorMessage}`,
    };
  }
}

/**
 * Validate function arguments before execution
 */
export function validateFunctionArgs(
  functionName: string,
  args: Record<string, any>
): { valid: boolean; error?: string } {
  switch (functionName) {
    case 'discover_companies':
      if (!args.keyword || typeof args.keyword !== 'string') {
        return { valid: false, error: 'Missing or invalid "keyword" parameter' };
      }
      break;

    case 'research_company':
      if (!args.companyName || typeof args.companyName !== 'string') {
        return { valid: false, error: 'Missing or invalid "companyName" parameter' };
      }
      if (!args.domain || typeof args.domain !== 'string') {
        return { valid: false, error: 'Missing or invalid "domain" parameter' };
      }
      break;

    case 'scrape_website':
      if (!args.domain || typeof args.domain !== 'string') {
        return { valid: false, error: 'Missing or invalid "domain" parameter' };
      }
      if (!args.companyName || typeof args.companyName !== 'string') {
        return { valid: false, error: 'Missing or invalid "companyName" parameter' };
      }
      break;

    case 'generate_hook':
      // companyName is optional if lead is selected
      break;

    case 'deep_research_lead':
      // No required args (uses selected lead from context)
      break;

    case 'add_to_focus':
      if (!args.companyName || typeof args.companyName !== 'string') {
        return { valid: false, error: 'Missing or invalid "companyName" parameter' };
      }
      break;

    case 'apply_template':
      if (!args.companyName || typeof args.companyName !== 'string') {
        return { valid: false, error: 'Missing or invalid "companyName" parameter' };
      }
      break;

    case 'navigate_to':
      if (!args.tab || typeof args.tab !== 'string') {
        return { valid: false, error: 'Missing or invalid "tab" parameter' };
      }
      break;

    default:
      return { valid: false, error: `Unknown function: ${functionName}` };
  }

  return { valid: true };
}
