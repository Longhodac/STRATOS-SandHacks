/**
 * Agent Functions Executor
 * Maps LLM function calls to actual agent actions
 */

import { discoverCompanies, researchCompany, scrapeWebsite } from './agentsService';
import { generateHook, deepResearchLead } from './geminiService';
import type { AgentFunctionContext, AgentFunctionResult, HookTone, Lead } from '@/types';

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

    default:
      return { valid: false, error: `Unknown function: ${functionName}` };
  }

  return { valid: true };
}
