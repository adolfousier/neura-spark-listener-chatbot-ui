import { useState, useEffect } from 'react';
import { countTokens } from '@/lib/tokenizer';

export function useTokenCount(text: string | undefined) {
  const [tokenCount, setTokenCount] = useState
<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!text) {
      setTokenCount(null);
      setIsLoading(false);
      return;
    }

    const loadTokenCount = async () => {
      try {
        const count = await countTokens(text);
        setTokenCount(count);
      } catch (error) {
        console.error('Failed to load token count:', error);
        setTokenCount(0); // Default to 0 on error
      } finally {
        setIsLoading(false);
      }
    };

    loadTokenCount();
  }, [text]);

  return { tokenCount, isLoading };
}