/**
 * Parse raw function call syntax from LLM text responses
 * Handles cases where LLM outputs function calls in text instead of using proper tool_calls
 */

// Match patterns like: (function=name>{json}</function>)
const FUNCTION_REGEX = /\(function=(\w+)>(\{.*?\})<\/function\)/gs;

export interface ParsedFunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ParseResult {
  cleanText: string;
  functionCalls: ParsedFunctionCall[];
}

/**
 * Parse function calls from text and return clean text without the function syntax
 */
export function parseFunctionCallsFromText(text: string): ParseResult {
  const functionCalls: ParsedFunctionCall[] = [];
  let cleanText = text;

  // Reset regex state
  FUNCTION_REGEX.lastIndex = 0;

  let match;
  while ((match = FUNCTION_REGEX.exec(text)) !== null) {
    try {
      const name = match[1];
      const argsString = match[2];
      const args = JSON.parse(argsString);
      functionCalls.push({ name, arguments: args });
      // Remove the function call syntax from the text
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {
      // Invalid JSON, skip this match but log it
      console.warn('[parseFunctionCalls] Failed to parse:', match[0], e);
    }
  }

  // Clean up extra whitespace and newlines left after removing function calls
  cleanText = cleanText
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .trim();

  return { cleanText, functionCalls };
}

/**
 * Check if text contains any function call syntax
 */
export function containsFunctionCalls(text: string): boolean {
  FUNCTION_REGEX.lastIndex = 0;
  return FUNCTION_REGEX.test(text);
}

/**
 * Format function name for display (snake_case to Title Case)
 */
export function formatFunctionName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
