/**
 * Core types for DocBits
 */

// Supported document formats
export type DocFormat = 'markdown' | 'jsdoc' | 'html' | 'openapi' | 'plaintext' | 'auto';

// Document section types
export type SectionType = 
  | 'heading'
  | 'paragraph'
  | 'code'
  | 'list'
  | 'table'
  | 'api-endpoint'
  | 'function-signature'
  | 'class-definition'
  | 'parameter-description'
  | 'return-description'
  | 'example'
  | 'note'
  | 'warning'
  | 'unknown';

// Base interface for document sections
export interface DocSection {
  type: SectionType;
  content: string;
  level?: number;
  metadata?: Record<string, any>;
  children?: DocSection[];
}

// Parsed document representation
export interface ParsedDoc {
  format: DocFormat;
  content: string;
  sections: DocSection[];
  metadata?: Record<string, any>;
}

// Compression rule interface
export interface CompressionRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  weight: number; // Higher weight rules are applied first
  apply(doc: ParsedDoc): ParsedDoc;
}

// Result of compression
export interface CompressedDoc {
  original: ParsedDoc;
  compressed: ParsedDoc;
  output: string;
  metrics: CompressionMetrics;
}

// Metrics for compression
export interface CompressionMetrics {
  originalLength: number;
  compressedLength: number;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  tokensSaved: number;
  percentSaved: number;
}

// Parser interface
export interface DocParser {
  format: DocFormat;
  parse(content: string): ParsedDoc;
  serialize(doc: ParsedDoc): string;
}

// Token counter interface
export interface TokenCounter {
  countTokens(text: string): number;
}

// Compression options
export interface CompressionOptions {
  format?: DocFormat;
  rules?: string[]; // IDs of rules to apply, if empty, all enabled rules are applied
  customRules?: CompressionRule[];
  preserveSections?: SectionType[]; // Section types to preserve
}