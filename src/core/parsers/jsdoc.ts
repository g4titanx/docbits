import { DocParser, ParsedDoc, DocSection, SectionType } from '../types';

/**
 * Parser for JSDoc documentation
 */
export class JSDocParser implements DocParser {
  format = 'jsdoc' as const;
  
  /**
   * Parse JSDoc content into structured document
   */
  parse(content: string): ParsedDoc {
    const sections: DocSection[] = [];
    
    // Extract JSDoc blocks
    const jsdocRegex = /\/\*\*\s*([\s\S]*?)\s*\*\//g;
    let match;
    
    while ((match = jsdocRegex.exec(content)) !== null) {
      const docBlock = match[1];
      
      // Process the JSDoc block
      this.processJSDocBlock(docBlock, sections);
    }
    
    // Process any remaining code
    const codeBlocks = content.split(/\/\*\*[\s\S]*?\*\//g)
      .filter(block => block.trim().length > 0);
    
    for (const codeBlock of codeBlocks) {
      // Try to detect function signatures
      const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)/g;
      let funcMatch;
      
      while ((funcMatch = functionRegex.exec(codeBlock)) !== null) {
        sections.push({
          type: 'function-signature',
          content: funcMatch[0],
          metadata: {
            name: funcMatch[1],
            parameters: funcMatch[2].split(',').map(p => p.trim())
          }
        });
      }
      
      // Try to detect class definitions
      const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/g;
      let classMatch;
      
      while ((classMatch = classRegex.exec(codeBlock)) !== null) {
        sections.push({
          type: 'class-definition',
          content: classMatch[0],
          metadata: {
            name: classMatch[1],
            extends: classMatch[2] || null
          }
        });
      }
    }
    
    return {
      format: this.format,
      content,
      sections
    };
  }
  
  /**
   * Convert parsed doc back to JSDoc
   */
  serialize(doc: ParsedDoc): string {
    let output = '';
    
    // Group sections by their logical blocks
    const blocks: DocSection[][] = [];
    let currentBlock: DocSection[] = [];
    
    for (const section of doc.sections) {
      if (section.type === 'function-signature' || section.type === 'class-definition') {
        // Start a new block
        if (currentBlock.length > 0) {
          blocks.push([...currentBlock]);
          currentBlock = [];
        }
      }
      
      currentBlock.push(section);
    }
    
    // Add the last block if it exists
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }
    
    // Process each block
    for (const block of blocks) {
      // Start JSDoc comment
      output += '/**\n';
      
      // Add description and tags
      for (const section of block) {
        if (section.type === 'paragraph') {
          // Main description
          output += ` * ${section.content.replace(/\n/g, '\n * ')}\n *\n`;
        } else if (section.type === 'parameter-description') {
          // Parameter description
          const paramName = section.metadata?.name || '';
          const paramType = section.metadata?.type || '';
          output += ` * @param {${paramType}} ${paramName} ${section.content}\n`;
        } else if (section.type === 'return-description') {
          // Return description
          const returnType = section.metadata?.type || '';
          output += ` * @returns {${returnType}} ${section.content}\n`;
        } else if (section.type === 'example') {
          // Example
          output += ` * @example\n * ${section.content.replace(/\n/g, '\n * ')}\n`;
        }
      }
      
      // Close JSDoc comment
      output += ' */\n';
      
      // Add function signature or class definition if present
      for (const section of block) {
        if (section.type === 'function-signature' || section.type === 'class-definition') {
          output += section.content + '\n\n';
          break;
        }
      }
    }
    
    return output.trim();
  }
  
  /**
   * Process a JSDoc block into sections
   */
  private processJSDocBlock(block: string, sections: DocSection[]): void {
    // Split the block into lines, removing the leading asterisks
    const lines = block.split('\n')
      .map(line => line.replace(/^\s*\*\s?/, ''))
      .filter(line => line.length > 0);
    
    let currentSection: DocSection | null = null;
    let descriptionLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for JSDoc tags
      if (line.startsWith('@')) {
        // Save any accumulated description
        if (descriptionLines.length > 0) {
          sections.push({
            type: 'paragraph',
            content: descriptionLines.join('\n')
          });
          descriptionLines = [];
        }
        
        // Process the tag
        const tagMatch = line.match(/@(\w+)\s*(.*)/);
        
        if (tagMatch) {
          const tagName = tagMatch[1];
          let tagContent = tagMatch[2];
          
          // Continue collecting content for multi-line tags
          let j = i + 1;
          while (j < lines.length && !lines[j].startsWith('@')) {
            tagContent += '\n' + lines[j];
            j++;
          }
          
          // Skip the lines we've consumed
          i = j - 1;
          
          // Process specific tags
          switch (tagName) {
            case 'param':
            case 'parameter':
              // Try to parse parameter format: {type} name description
              const paramMatch = tagContent.match(/^(?:\{([^}]*)\})?\s*(\w+)(?:\s*-\s*|\s+)(.*)/s);
              
              if (paramMatch) {
                const paramType = paramMatch[1] || '';
                const paramName = paramMatch[2];
                const paramDesc = paramMatch[3];
                
                sections.push({
                  type: 'parameter-description',
                  content: paramDesc,
                  metadata: {
                    name: paramName,
                    type: paramType
                  }
                });
              } else {
                // Fallback if we can't parse properly
                sections.push({
                  type: 'parameter-description',
                  content: tagContent
                });
              }
              break;
              
            case 'returns':
            case 'return':
              // Try to parse return format: {type} description
              const returnMatch = tagContent.match(/^(?:\{([^}]*)\})?\s*(.*)/s);
              
              if (returnMatch) {
                const returnType = returnMatch[1] || '';
                const returnDesc = returnMatch[2];
                
                sections.push({
                  type: 'return-description',
                  content: returnDesc,
                  metadata: {
                    type: returnType
                  }
                });
              } else {
                // Fallback
                sections.push({
                  type: 'return-description',
                  content: tagContent
                });
              }
              break;
              
            case 'example':
              sections.push({
                type: 'example',
                content: tagContent
              });
              break;
              
            default:
              // Handle other tags
              sections.push({
                type: 'paragraph',
                content: `@${tagName} ${tagContent}`,
                metadata: {
                  isTag: true,
                  tagName
                }
              });
              break;
          }
        }
      } else {
        // Part of the main description
        descriptionLines.push(line);
      }
    }
    
    // Save any accumulated description
    if (descriptionLines.length > 0) {
      sections.push({
        type: 'paragraph',
        content: descriptionLines.join('\n')
      });
    }
  }
}