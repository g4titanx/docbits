#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { DocCompressor } from '../core/compressor';
import { TikTokenCounter } from '../core/utils/token-counter';
import { defaultRules } from '../core/rules';

const program = new Command();
const package_json = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

/**
 * DocBits CLI
 */
program
  .name('docbits')
  .description('Compress documentation to be token-efficient for LLMs')
  .version(package_json.version);

program
  .command('compress')
  .description('Compress a documentation file')
  .argument('<file>', 'File to compress')
  .option('-o, --output <file>', 'Output file (default: adds .min before extension)')
  .option('-f, --format <format>', 'Force specific document format (markdown, jsdoc, html, openapi, plaintext)')
  .option('-r, --rules <rules>', 'Comma-separated list of rule IDs to apply')
  .option('--list-rules', 'List available compression rules')
  .option('--stats', 'Show compression statistics')
  .action(async (file, options) => {
    try {
      // List rules if requested
      if (options.listRules) {
        console.log('Available compression rules:');
        defaultRules.forEach(rule => {
          console.log(`  - ${rule.id}: ${rule.name} (${rule.enabled ? 'enabled' : 'disabled'})`);
          console.log(`    ${rule.description}`);
          console.log();
        });
        return;
      }
      
      // Check if the input file exists
      if (!fs.existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        process.exit(1);
      }
      
      // Read the input file
      const input = fs.readFileSync(file, 'utf8');
      
      // Set up compression options
      const compressionOptions: any = {};
      
      if (options.format) {
        compressionOptions.format = options.format;
      }
      
      if (options.rules) {
        compressionOptions.rules = options.rules.split(',').map(r => r.trim());
      }
      
      // Create compressor with TikToken counter if available
      const compressor = new DocCompressor(undefined, new TikTokenCounter());
      
      // Compress the file
      const result = compressor.compress(input, compressionOptions);
      
      // Determine output file name
      const outputFile = options.output || generateOutputFileName(file);
      
      // Write output file
      fs.writeFileSync(outputFile, result.output);
      
      console.log(`Compressed ${file} → ${outputFile}`);
      
      // Show stats if requested
      if (options.stats) {
        const { metrics } = result;
        console.log('\nCompression statistics:');
        console.log(`  Original size: ${metrics.originalLength} bytes`);
        console.log(`  Compressed size: ${metrics.compressedLength} bytes`);
        console.log(`  Original tokens: ${metrics.originalTokens}`);
        console.log(`  Compressed tokens: ${metrics.compressedTokens}`);
        console.log(`  Tokens saved: ${metrics.tokensSaved} (${metrics.percentSaved.toFixed(2)}%)`);
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show information about a documentation file')
  .argument('<file>', 'File to analyze')
  .action(async (file) => {
    try {
      // Check if the input file exists
      if (!fs.existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        process.exit(1);
      }
      
      // Read the input file
      const input = fs.readFileSync(file, 'utf8');
      
      // Create compressor with TikToken counter if available
      const compressor = new DocCompressor(undefined, new TikTokenCounter());
      
      // Just parse the file, don't compress
      const result = compressor.compress(input, {
        // Empty rules array means no compression
        rules: []
      });
      
      // Show information
      console.log(`File: ${file}`);
      console.log(`Format: ${result.original.format}`);
      console.log(`Size: ${input.length} bytes`);
      console.log(`Tokens: ${result.metrics.originalTokens}`);
      console.log(`Sections: ${result.original.sections.length}`);
      
      // Show section type breakdown
      const sectionCounts: Record<string, number> = {};
      
      for (const section of result.original.sections) {
        sectionCounts[section.type] = (sectionCounts[section.type] || 0) + 1;
      }
      
      console.log('\nSection types:');
      Object.entries(sectionCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Generate an output file name based on the input file
 */
function generateOutputFileName(inputFile: string): string {
  const parsedPath = path.parse(inputFile);
  return path.join(
    parsedPath.dir,
    `${parsedPath.name}.min${parsedPath.ext}`
  );
}

program.parse();