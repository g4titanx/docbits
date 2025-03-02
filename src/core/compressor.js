"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocCompressor = void 0;
const rules_1 = require("./rules");
const markdown_1 = require("./parsers/markdown");
const jsdoc_1 = require("./parsers/jsdoc");
const token_counter_1 = require("./utils/token-counter");
/**
 * Main compressor class for DocBits
 */
class DocCompressor {
    constructor(rules, tokenCounter) {
        this.rules = rules || [...rules_1.defaultRules].sort((a, b) => b.weight - a.weight);
        this.tokenCounter = tokenCounter || new token_counter_1.SimpleTokenCounter();
    }
    /**
     * Compress documentation
     */
    compress(input, options = {}) {
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
    detectFormat(input) {
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
    getParser(format) {
        switch (format) {
            case 'markdown':
                return new markdown_1.MarkdownParser();
            case 'jsdoc':
                return new jsdoc_1.JSDocParser();
            // Other parsers would be implemented and returned here
            default:
                // Fallback to Markdown parser for now
                return new markdown_1.MarkdownParser();
        }
    }
    /**
     * Apply compression rules to the document
     */
    applyRules(doc, options) {
        // Start with the original document
        let processedDoc = Object.assign({}, doc);
        // Determine which rules to apply
        let rulesToApply = this.rules.filter(rule => rule.enabled);
        // If specific rules are requested, filter to just those
        if (options.rules && options.rules.length > 0) {
            rulesToApply = options.rules
                .map(id => rules_1.rulesById[id])
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
    generateMetrics(original, compressed) {
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
exports.DocCompressor = DocCompressor;
