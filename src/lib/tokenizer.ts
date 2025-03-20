/**
 * Accurately counts tokens while ignoring SSE control messages
 * @param text The text to analyze
 * @returns The number of tokens in the text
 */
export function countTokens(text: string): number {
  if (!text) return 0;

  // Remove SSE control messages
  const cleanText = text.replace(
    /(?:chunk|data):\s*|\[DONE\]/gi,
    ""
  ).trim();

  // Tokenize the clean text
  const tokenRegex = /(\w+(?:['’]\w+)*)|([!,.?":;'()`-]+)/gu;
  const matches = cleanText.matchAll(tokenRegex);
  const tokens = Array.from(matches, (match) => 
    match[1] || match[2] || ""
  ).filter(token => token.length > 0);

  return tokens.length;
}