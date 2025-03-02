import { TokenCounter } from '../types';

/**
 * Simple token counter that estimates tokens based on a 4 characters-per-token average
 * For a production system, you'd use a real tokenizer like tiktoken
 */
export class SimpleTokenCounter implements TokenCounter {
  // Average number of characters per token (rough estimate for English text)
  private readonly CHARS_PER_TOKEN = 4;
  
  countTokens(text: string): number {
    // Simple estimation based on character count
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }
}

/**
 * More accurate token counter using TikToken if available
 * Requires the tiktoken package: npm install tiktoken
 */
export class TikTokenCounter implements TokenCounter {
  private encoder: any;
  private fallbackCounter: SimpleTokenCounter;
  
  constructor() {
    this.fallbackCounter = new SimpleTokenCounter();
    
    try {
      // Try to load tiktoken
      const tiktoken = require('tiktoken');
      this.encoder = tiktoken.get_encoding('cl100k_base'); // GPT-4 encoding
    } catch (err) {
      console.warn('TikToken not available, falling back to simple token counting');
      this.encoder = null;
    }
  }
  
  countTokens(text: string): number {
    if (this.encoder) {
      try {
        const tokens = this.encoder.encode(text);
        return tokens.length;
      } catch (err) {
        console.warn('Error counting tokens with TikToken, falling back to simple token counting', err);
        return this.fallbackCounter.countTokens(text);
      }
    }
    
    return this.fallbackCounter.countTokens(text);
  }
}