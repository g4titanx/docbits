import { 
  ParsedDoc, 
  CompressedDoc, 
  CompressionRule, 
  CompressionMetrics, 
  DocFormat,
  CompressionOptions,
  TokenCounter
} from './types';
import { defaultRules, rulesById } from './rules';
import { MarkdownParser } from './parsers/markdown';
import { JSDocParser } from './parsers/jsdoc';
import { SimpleTokenCounter } from './utils/token-counter';

/**
 * Main compressor class for DocBits
 */
export class DocCompressor {
  private rules: CompressionRule[];
  private tokenCounter: TokenCounter;
  
  constructor(rules?: CompressionRule[], tokenCounter?: TokenCounter) {
    this.rules = rules || [...defaultRules].sort((a, b) => b.weight - a.weight);
    this.tokenCounter = tokenCounter || new SimpleTokenCounter();
  }
  
  /**
   * Compress documentation
   */
  compress(input: string, options: CompressionOptions = {}): CompressedDoc {
    // Detect format if not specified
    const format = options.format || this.detectFormat(input);
    
    // Parse the document
    const parser = this.getParser(format);
    const parsedDoc = parser.parse(input);
    
    // Apply compression rules
    const compressedDoc = this.applyRules(parsedDoc, options);
    
    // Generate output
    const output = parser.serialize(compressedDoc);
    
    // Generate metrics
    const metrics = this.generateMetrics(input, output);
    
    return {
      original: parsedDoc,
      compressed: compressedDoc,
      output,
      metrics
    };
  }
  
  /**
   * Detect format from content
   */
  private detectFormat(input: string): DocFormat {
    // Check for Markdown
    if (input.match(/^#\s|^##\s|^###\s/m) || input.match(/\[.*?\]\(.*?\)/)) {
      return 'markdown';
    }
    
    // Check for JSDoc
    if (input.match(/\/\*\*[\s\S]*?\*\//m) || input.match(/@param|@returns?|@example/)) {
      return 'jsdoc';
    }
    
    // Check for HTML
    if (input.match(/<html|<!DOCTYPE|<body|<div|<p>/i)) {
      return 'html';
    }
    
    // Check for OpenAPI/Swagger
    if (input.match(/openapi:|swagger:|paths:|components:/)) {
      return 'openapi';
    }
    
    // Default to plaintext
    return 'plaintext';
  }
  
  /**
   * Get parser for specific format
   */
  private getParser(format: DocFormat) {
    switch (format) {
      case 'markdown':
        return new MarkdownParser();
      case 'jsdoc':
        return new JSDocParser();
      // Other parsers would be implemented and returned here
      default:
        // Fallback to Markdown parser for now
        return new MarkdownParser();
    }
  }
  
  /**
   * Apply compression rules to the document
   */
  private applyRules(doc: ParsedDoc, options: CompressionOptions): ParsedDoc {
    // Start with the original document
    let processedDoc = { ...doc };
    
    // Determine which rules to apply
    let rulesToApply = this.rules.filter(rule => rule.enabled);
    
    // If specific rules are requested, filter to just those
    if (options.rules && options.rules.length > 0) {
      rulesToApply = options.rules
        .map(id => rulesById[id])
        .filter(Boolean);
    }
    
    // Add any custom rules
    if (options.customRules) {
      rulesToApply = [...rulesToApply, ...options.customRules];
    }
    
    // Sort rules by weight (higher weight applied first)
    rulesToApply.sort((a, b) => b.weight - a.weight);
    
    // Apply each rule in sequence
    for (const rule of rulesToApply) {
      processedDoc = rule.apply(processedDoc);
    }
    
    return processedDoc;
  }
  
  /**
   * Generate compression metrics
   */
  private generateMetrics(original: string, compressed: string): CompressionMetrics {
    const originalTokens = this.tokenCounter.countTokens(original);
    const compressedTokens = this.tokenCounter.countTokens(compressed);
    
    return {
      originalLength: original.length,
      compressedLength: compressed.length,
      originalTokens,
      compressedTokens,
      compressionRatio: compressedTokens / originalTokens,
      tokensSaved: originalTokens - compressedTokens,
      percentSaved: (1 - (compressedTokens / originalTokens)) * 100
    };
  }
}