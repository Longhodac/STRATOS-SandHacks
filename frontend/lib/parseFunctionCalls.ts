/**
 * Parse raw function call syntax from LLM text responses
 * Handles cases where LLM outputs function calls in text instead of using proper tool_calls
 * Uses balanced-brace matching to support nested JSON in arguments.
 */

// Match opening pattern: (function=name>{
const FUNCTION_START_REGEX = /\(function=(\w+)>\s*\{/g;

export interface ParsedFunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ParseResult {
  cleanText: string;
  functionCalls: ParsedFunctionCall[];
}

/**
 * Extract a balanced JSON object starting at startIndex (position of opening {).
 * Returns { object, endIndex } or null if invalid.
 */
function extractBalancedJson(
  text: string,
  startIndex: number
): { object: Record<string, any>; endIndex: number } | null {
  let depth = 0;
  let i = startIndex;
  const start = startIndex;

  while (i < text.length) {
    const c = text[i];
    if (c === '{') {
      depth++;
      i++;
    } else if (c === '}') {
      depth--;
      i++;
      if (depth === 0) {
        const slice = text.slice(start, i);
        try {
          const object = JSON.parse(slice);
          return { object, endIndex: i };
        } catch {
          return null;
        }
      }
    } else if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < text.length) {
        if (text[i] === '\\') i += 2;
        else if (text[i] === quote) {
          i++;
          break;
        } else i++;
      }
    } else {
      i++;
    }
  }
  return null;
}

function findClosingTag(text: string, fromIndex: number): number {
  const tag = '</function)';
  const idx = text.indexOf(tag, fromIndex);
  return idx === -1 ? -1 : idx + tag.length;
}

/**
 * Parse function calls from text and return clean text without the function syntax
 */
export function parseFunctionCallsFromText(text: string): ParseResult {
  const functionCalls: ParsedFunctionCall[] = [];
  const toRemove: Array<[number, number]> = [];

  FUNCTION_START_REGEX.lastIndex = 0;
  let match;

  while ((match = FUNCTION_START_REGEX.exec(text)) !== null) {
    const name = match[1];
    const afterBrace = match.index + match[0].length;
    const extracted = extractBalancedJson(text, afterBrace - 1);
    if (!extracted) {
      console.warn('[parseFunctionCalls] Invalid JSON for function:', name);
      continue;
    }
    const endOfTag = findClosingTag(text, extracted.endIndex);
    if (endOfTag === -1) {
      console.warn('[parseFunctionCalls] No closing </function>) for:', name);
      continue;
    }
    functionCalls.push({ name, arguments: extracted.object });
    toRemove.push([match.index, endOfTag]);
  }

  let result = text;
  for (let i = toRemove.length - 1; i >= 0; i--) {
    const [a, b] = toRemove[i];
    result = result.slice(0, a) + result.slice(b);
  }

  result = result
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();

  return { cleanText: result, functionCalls };
}

/**
 * Check if text contains any function call syntax
 */
export function containsFunctionCalls(text: string): boolean {
  FUNCTION_START_REGEX.lastIndex = 0;
  return FUNCTION_START_REGEX.test(text);
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
