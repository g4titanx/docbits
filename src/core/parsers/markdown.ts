import { DocParser, ParsedDoc, DocSection, SectionType } from '../types';
import { marked } from 'marked';

/**
 * Parser for Markdown documentation
 */
export class MarkdownParser implements DocParser {
  format = 'markdown' as const;
  
  /**
   * Parse markdown content into structured document
   */
  parse(content: string): ParsedDoc {
    const sections: DocSection[] = [];
    const lexer = new marked.Lexer();
    const tokens = lexer.lex(content);
    
    // Process tokens into sections
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      switch (token.type) {
        case 'heading':
          sections.push({
            type: 'heading',
            content: token.text,
            level: token.depth
          });
          break;
          
        case 'paragraph':
          sections.push({
            type: 'paragraph',
            content: token.text
          });
          break;
          
        case 'code':
          // Check if this is an API endpoint
          if (this.isApiEndpoint(token.text)) {
            sections.push({
              type: 'api-endpoint',
              content: token.text,
              metadata: { language: token.lang }
            });
          } 
          // Check if this is a function signature
          else if (this.isFunctionSignature(token.text)) {
            sections.push({
              type: 'function-signature',
              content: token.text,
              metadata: { language: token.lang }
            });
          }
          // Regular code
          else {
            sections.push({
              type: 'code',
              content: token.text,
              metadata: { language: token.lang }
            });
          }
          break;
          
        case 'list':
          const listItems = token.items.map(item => ({
            type: 'paragraph' as SectionType,
            content: item.text
          }));
          
          sections.push({
            type: 'list',
            content: '', // List itself doesn't have content
            children: listItems
          });
          break;
          
        case 'table':
          sections.push({
            type: 'table',
            content: this.serializeTable(token),
            metadata: {
              header: token.header,
              align: token.align
            }
          });
          break;
          
        case 'html':
          // Skip HTML for now
          break;
          
        default:
          // Handle other token types as needed
          break;
      }
    }
    
    // Process sections to identify parameter descriptions, return descriptions, etc.
    const processedSections = this.identifySpecialSections(sections);
    
    return {
      format: this.format,
      content,
      sections: processedSections
    };
  }
  
  /**
   * Convert parsed doc back to markdown
   */
  serialize(doc: ParsedDoc): string {
    let output = '';
    
    for (const section of doc.sections) {
      switch (section.type) {
        case 'heading':
          const level = section.level || 1;
          output += '#'.repeat(level) + ' ' + section.content + '\n\n';
          break;
          
        case 'paragraph':
        case 'parameter-description':
        case 'return-description':
          output += section.content + '\n\n';
          break;
          
        case 'code':
        case 'function-signature':
        case 'api-endpoint':
          const lang = section.metadata?.language || '';
          output += '```' + lang + '\n' + section.content + '\n```\n\n';
          break;
          
        case 'list':
          if (section.children) {
            for (const item of section.children) {
              output += '- ' + item.content + '\n';
            }
            output += '\n';
          }
          break;
          
        case 'table':
          output += section.content + '\n\n';
          break;
          
        default:
          // Fallback for any unhandled types
          if (section.content) {
            output += section.content + '\n\n';
          }
          break;
      }
    }
    
    return output.trim();
  }
  
  /**
   * Process sections to identify special content like parameter descriptions
   */
  private identifySpecialSections(sections: DocSection[]): DocSection[] {
    const result: DocSection[] = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Check for parameter descriptions (often in lists after a "Parameters:" heading)
      if (section.type === 'heading' && 
          (section.content.toLowerCase().includes('parameter') || 
           section.content.toLowerCase().includes('params'))) {
        
        // Add the heading
        result.push(section);
        
        // The following list items are parameter descriptions
        if (i + 1 < sections.length && sections[i + 1].type === 'list') {
          const paramList = sections[i + 1];
          
          if (paramList.children) {
            // Process each list item as a parameter description
            for (const item of paramList.children) {
              // Try to extract parameter name from the content
              const paramMatch = item.content.match(/^`?(\w+)`?\s*(\(\w+\))?\s*(-|:)?\s*(.*)/);
              
              if (paramMatch) {
                const paramName = paramMatch[1];
                const paramType = paramMatch[2] || '';
                const paramDesc = paramMatch[4] || item.content;
                
                result.push({
                  type: 'parameter-description',
                  content: paramDesc,
                  metadata: {
                    name: paramName,
                    type: paramType.replace(/[()]/g, '')
                  }
                });
              } else {
                // If we can't extract parameter info, just add as is
                result.push(item);
              }
            }
          }
          
          // Skip the list since we've processed it
          i++;
          continue;
        }
      }
      // Check for return descriptions
      else if (section.type === 'heading' && 
               (section.content.toLowerCase().includes('return') || 
                section.content.toLowerCase().includes('response'))) {
        
        // Add the heading
        result.push(section);
        
        // The following paragraph is likely the return description
        if (i + 1 < sections.length && sections[i + 1].type === 'paragraph') {
          const returnDesc = sections[i + 1];
          
          result.push({
            type: 'return-description',
            content: returnDesc.content
          });
          
          // Skip the paragraph since we've processed it
          i++;
          continue;
        }
      }
      // Check for examples
      else if (section.type === 'heading' && 
               section.content.toLowerCase().includes('example')) {
        
        // Add the heading
        result.push(section);
        
        // The following code block is likely an example
        if (i + 1 < sections.length && sections[i + 1].type === 'code') {
          const example = sections[i + 1];
          
          result.push({
            type: 'example',
            content: example.content,
            metadata: example.metadata
          });
          
          // Skip the code block since we've processed it
          i++;
          continue;
        }
      }
      else {
        // Add unmodified section
        result.push(section);
      }
    }
    
    return result;
  }
  
  /**
   * Check if the code block contains an API endpoint definition
   */
  private isApiEndpoint(text: string): boolean {
    // Simple heuristic: contains HTTP verb followed by a path
    return /\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b.*?\/\w+/i.test(text);
  }
  
  /**
   * Check if the code block contains a function signature
   */
  private isFunctionSignature(text: string): boolean {
    // Simple heuristic: looks like a function declaration
    return /\bfunction\s+\w+\s*\(.*?\)/i.test(text) || 
           /\bconst\s+\w+\s*=\s*function\s*\(.*?\)/i.test(text) ||
           /\bconst\s+\w+\s*=\s*\(.*?\)\s*=>/i.test(text);
  }
  
  /**
   * Serialize a table token back to markdown
   */
  private serializeTable(token: any): string {
    if (!token.header || !token.cells) {
      return '';
    }
    
    let result = '';
    
    // Add header row
    result += '| ' + token.header.join(' | ') + ' |\n';
    
    // Add separator row
    result += '| ' + token.header.map(() => '---').join(' | ') + ' |\n';
    
    // Add data rows
    for (const row of token.cells) {
      result += '| ' + row.join(' | ') + ' |\n';
    }
    
    return result;
  }
}