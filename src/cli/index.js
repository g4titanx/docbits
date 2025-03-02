#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const compressor_1 = require("../core/compressor");
const token_counter_1 = require("../core/utils/token-counter");
const rules_1 = require("../core/rules");
const program = new commander_1.Command();
const package_json = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../package.json'), 'utf8'));
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
    .action((file, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // List rules if requested
        if (options.listRules) {
            console.log('Available compression rules:');
            rules_1.defaultRules.forEach(rule => {
                console.log(`  - ${rule.id}: ${rule.name} (${rule.enabled ? 'enabled' : 'disabled'})`);
                console.log(`    ${rule.description}`);
                console.log();
            });
            return;
        }
        // Check if the input file exists
        if (!fs_1.default.existsSync(file)) {
            console.error(`Error: File not found: ${file}`);
            process.exit(1);
        }
        // Read the input file
        const input = fs_1.default.readFileSync(file, 'utf8');
        // Set up compression options
        const compressionOptions = {};
        if (options.format) {
            compressionOptions.format = options.format;
        }
        if (options.rules) {
            compressionOptions.rules = options.rules.split(',').map(r => r.trim());
        }
        // Create compressor with TikToken counter if available
        const compressor = new compressor_1.DocCompressor(undefined, new token_counter_1.TikTokenCounter());
        // Compress the file
        const result = compressor.compress(input, compressionOptions);
        // Determine output file name
        const outputFile = options.output || generateOutputFileName(file);
        // Write output file
        fs_1.default.writeFileSync(outputFile, result.output);
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
    }
    catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}));
program
    .command('info')
    .description('Show information about a documentation file')
    .argument('<file>', 'File to analyze')
    .action((file) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if the input file exists
        if (!fs_1.default.existsSync(file)) {
            console.error(`Error: File not found: ${file}`);
            process.exit(1);
        }
        // Read the input file
        const input = fs_1.default.readFileSync(file, 'utf8');
        // Create compressor with TikToken counter if available
        const compressor = new compressor_1.DocCompressor(undefined, new token_counter_1.TikTokenCounter());
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
        const sectionCounts = {};
        for (const section of result.original.sections) {
            sectionCounts[section.type] = (sectionCounts[section.type] || 0) + 1;
        }
        console.log('\nSection types:');
        Object.entries(sectionCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });
    }
    catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}));
/**
 * Generate an output file name based on the input file
 */
function generateOutputFileName(inputFile) {
    const parsedPath = path_1.default.parse(inputFile);
    return path_1.default.join(parsedPath.dir, `${parsedPath.name}.min${parsedPath.ext}`);
}
program.parse();
