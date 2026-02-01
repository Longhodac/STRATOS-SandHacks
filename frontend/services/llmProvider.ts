/**
 * LLM Provider Service
 * Groq LLM provider with function calling support
 */

import Groq from 'groq-sdk';
import type { 
  LLMConfig, 
  LLMMessage, 
  LLMResponse, 
  LLMFunctionCall,
  AgentFunctionContext 
} from '@/types';

// ==================== Configuration ====================

export const DEFAULT_CONFIG: LLMConfig = {
  provider: 'groq',
  model: 'llama-3.1-8b-instant',
  temperature: 0.7,
  maxTokens: 1024,
};

// Available Groq models
export const GROQ_MODELS = {
  'llama-3.1-8b-instant': 'Llama 3.1 8B (Ultra Fast)',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B (Best Quality)',
  'mixtral-8x7b-32768': 'Mixtral 8x7B (Large Context)',
} as const;

// ==================== Function Definitions ====================

const AGENT_FUNCTIONS = [
  {
    type: 'function',
    function: {
      name: 'discover_companies',
      description: 'Find and discover companies by industry keyword and optional region. Use this when the user wants to find, search for, or discover companies.',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Industry keyword or sector (e.g., "robotics", "fintech", "AI")',
          },
          region: {
            type: 'string',
            description: 'Optional geographic region filter (e.g., "California", "Boston")',
          },
          maxCompanies: {
            type: 'number',
            description: 'Maximum number of companies to discover (default: 25)',
            default: 25,
          },
        },
        required: ['keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'research_company',
      description: 'Research a specific company to find email contacts and contact pages. Use this when the user wants to research, investigate, or find emails for a specific company.',
      parameters: {
        type: 'object',
        properties: {
          companyName: {
            type: 'string',
            description: 'Name of the company to research',
          },
          domain: {
            type: 'string',
            description: 'Company domain (e.g., "stripe.com")',
          },
        },
        required: ['companyName', 'domain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scrape_website',
      description: 'Scrape a company website to find email addresses. Use this when the user wants to scrape, extract emails from, or crawl a website.',
      parameters: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description: 'Domain to scrape (e.g., "company.com")',
          },
          companyName: {
            type: 'string',
            description: 'Name of the company',
          },
          maxPages: {
            type: 'number',
            description: 'Maximum pages to scrape (default: 10)',
            default: 10,
          },
        },
        required: ['domain', 'companyName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_hook',
      description: 'Generate a personalized opening hook for outreach to the selected lead/company. Use this when the user wants to create, generate, or write a hook or opening line.',
      parameters: {
        type: 'object',
        properties: {
          companyName: {
            type: 'string',
            description: 'Name of the company',
          },
          tone: {
            type: 'string',
            enum: ['professional', 'short_punchy', 'student_to_recruiter'],
            description: 'Tone of the hook',
            default: 'professional',
          },
        },
        required: ['companyName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deep_research_lead',
      description: 'Perform deep research on the currently selected lead to find detailed insights and partnership opportunities. Use this when the user wants detailed analysis or deep dive on a lead.',
      parameters: {
        type: 'object',
        properties: {
          leadId: {
            type: 'string',
            description: 'ID of the lead to research (uses currently selected lead if not provided)',
          },
        },
        required: [],
      },
    },
  },
];

// ==================== Groq Provider (Raw Fetch) ====================

async function callGroqWithFetch(
  messages: LLMMessage[],
  config: LLMConfig,
  enableFunctions: boolean = true
): Promise<LLMResponse> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured. Add it to .env.local');
  }

  // Build request body - exclude unsupported fields
  const body: any = {
    model: config.model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      // DO NOT include 'name' field - not supported by Groq
    })),
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 1024,
    n: 1, // Always 1
  };

  // Add tools (function calling) if enabled
  if (enableFunctions) {
    body.tools = AGENT_FUNCTIONS;
    body.tool_choice = 'auto';
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice) {
    throw new Error('No response from Groq');
  }

  // Check for function call
  const toolCalls = choice.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    const toolCall = toolCalls[0];
    return {
      text: choice.message?.content || '',
      functionCall: {
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      },
    };
  }

  return {
    text: choice.message?.content || 'No response',
  };
}

// ==================== Groq Provider (SDK) ====================

async function callGroqWithSDK(
  messages: LLMMessage[],
  config: LLMConfig,
  enableFunctions: boolean = true
): Promise<LLMResponse> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured. Add it to .env.local');
  }

  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

  const params: any = {
    model: config.model,
    messages: messages as any,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 1024,
  };

  if (enableFunctions) {
    params.tools = AGENT_FUNCTIONS;
    params.tool_choice = 'auto';
  }

  const completion = await groq.chat.completions.create(params);
  const choice = completion.choices?.[0];

  if (!choice) {
    throw new Error('No response from Groq');
  }

  // Check for function call
  const toolCalls = choice.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    const toolCall = toolCalls[0];
    return {
      text: choice.message?.content || '',
      functionCall: {
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      },
    };
  }

  return {
    text: choice.message?.content || 'No response',
  };
}

// ==================== Main Provider Interface ====================

export interface ChatOptions {
  messages: LLMMessage[];
  context?: AgentFunctionContext;
  functions?: boolean;
  useSDK?: boolean; // If true, use groq-sdk; if false, use raw fetch
}

/**
 * Create an LLM chat with function calling support
 */
export async function createLLMChat(
  options: ChatOptions,
  customConfig?: Partial<LLMConfig>
): Promise<LLMResponse> {
  // Load config from localStorage or use default
  const savedConfig = loadConfig();
  const config: LLMConfig = {
    ...DEFAULT_CONFIG,
    ...savedConfig,
    ...customConfig,
  };

  // Build system message with context
  const systemMessages: LLMMessage[] = [];
  
  if (options.context) {
    const { activeFocus, selectedLead, clubProfile } = options.context;
    let contextText = `You are an AI assistant helping with club outreach and sponsor discovery.\n\n`;
    
    if (clubProfile) {
      contextText += `Club: ${clubProfile.clubName}\n`;
      contextText += `Mission: ${clubProfile.missionStatement}\n`;
      contextText += `Interests: ${clubProfile.interests.join(', ')}\n\n`;
    }
    
    if (activeFocus) {
      contextText += `Current Focus: "${activeFocus.name}"\n`;
      contextText += `Goal: ${activeFocus.ask}\n`;
      contextText += `Target: ${activeFocus.targetProfile}\n\n`;
    }
    
    if (selectedLead) {
      contextText += `Selected Lead: ${selectedLead.leadName} at ${selectedLead.companyName}\n`;
      if (selectedLead.contactEmail) {
        contextText += `Email: ${selectedLead.contactEmail}\n`;
      }
    }
    
    contextText += `\nWhen the user asks to find, discover, research, or generate content, use the available functions to help them accomplish their goals.`;
    
    systemMessages.push({
      role: 'system',
      content: contextText,
    });
  }

  const allMessages = [...systemMessages, ...options.messages];

  try {
    if (config.provider === 'groq') {
      if (options.useSDK) {
        return await callGroqWithSDK(allMessages, config, options.functions ?? true);
      } else {
        return await callGroqWithFetch(allMessages, config, options.functions ?? true);
      }
    }
    
    throw new Error(`Unknown provider: ${config.provider}`);
  } catch (error) {
    console.error('LLM Provider Error:', error);
    throw error;
  }
}

// ==================== Config Management ====================

const CONFIG_KEY = 'llm_config';

export function saveConfig(config: Partial<LLMConfig>): void {
  const current = loadConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
}

export function loadConfig(): Partial<LLMConfig> {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function getActiveConfig(): LLMConfig {
  return {
    ...DEFAULT_CONFIG,
    ...loadConfig(),
  };
}
