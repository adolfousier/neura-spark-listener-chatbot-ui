/**
 * Simple tokenization endpoint that counts words in text
 */
export async function handler(req: Request) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Text is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Simple word-based tokenization
    // Split by whitespace and punctuation, filter out empty strings
    const words = text
      .trim()
      .split(/\s+|[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/) 
      .filter(word => word.length > 0);
    
    return new Response(JSON.stringify({ tokenCount: words.length }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error counting tokens:', error);
    return new Response(JSON.stringify({ error: 'Failed to count tokens' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}