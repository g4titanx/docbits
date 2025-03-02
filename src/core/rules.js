"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rulesById = exports.defaultRules = exports.compressApiEndpoints = exports.compressHeadings = exports.compressCodeExamples = exports.compressFunctionSignatures = exports.removeRedundantDocs = exports.abbreviateCommonTerms = void 0;
/**
 * Default compression rules for DocBits
 */
// Abbreviations for common terms
const commonTerms = {
    'function': 'fn',
    'parameter': 'param',
    'parameters': 'params',
    'returns': 'ret',
    'string': 'str',
    'number': 'num',
    'boolean': 'bool',
    'object': 'obj',
    'array': 'arr',
    'argument': 'arg',
    'arguments': 'args',
    'implementation': 'impl',
    'configuration': 'config',
    'authenticate': 'auth',
    'authentication': 'auth',
    'authorize': 'auth',
    'authorization': 'auth',
    'response': 'resp',
    'request': 'req',
    'properties': 'props',
    'property': 'prop',
    'description': 'desc',
    'example': 'ex',
    'optional': 'opt',
    'required': 'req',
    'interface': 'iface',
    'class': 'cls',
    'method': 'mth',
    'attribute': 'attr',
    'undefined': 'undef',
    'document': 'doc',
    'documentation': 'docs',
    'asynchronous': 'async',
    'synchronous': 'sync',
    'initialize': 'init',
    'environment': 'env',
    'application': 'app',
    'reference': 'ref'
};
// Rule: Abbreviate common terms
exports.abbreviateCommonTerms = {
    id: 'abbreviate-common-terms',
    name: 'Abbreviate Common Terms',
    description: 'Replace common technical terms with shorter abbreviations',
    enabled: true,
    weight: 50,
    apply(doc) {
        const processContent = (content) => {
            let result = content;
            // Replace common terms with abbreviations
            Object.entries(commonTerms).forEach(([term, abbr]) => {
                // Use word boundary to only replace whole words
                const regex = new RegExp(`\\b${term}\\b`, 'gi');
                result = result.replace(regex, abbr);
            });
            return result;
        };
        // Process each section's content
        const processedSections = doc.sections.map(section => (Object.assign(Object.assign({}, section), { content: processContent(section.content), children: section.children
                ? section.children.map(child => (Object.assign(Object.assign({}, child), { content: processContent(child.content) })))
                : undefined })));
        return Object.assign(Object.assign({}, doc), { sections: processedSections });
    }
};
// Rule: Remove redundant documentation
exports.removeRedundantDocs = {
    id: 'remove-redundant-docs',
    name: 'Remove Redundant Documentation',
    description: 'Remove documentation that repeats obvious information',
    enabled: true,
    weight: 40,
    apply(doc) {
        // Sections we want to potentially remove if redundant
        const redundantSectionTypes = [
            'parameter-description',
            'return-description'
        ];
        // Filter out redundant sections
        const filteredSections = doc.sections.filter(section => {
            // Keep sections that aren't in our redundant types list
            if (!redundantSectionTypes.includes(section.type)) {
                return true;
            }
            // Check if the content is redundant (just repeating the parameter name, etc.)
            const metadata = section.metadata || {};
            const name = metadata.name || '';
            // If the content just repeats the name or has no real information, filter it out
            const isRedundant = section.content.toLowerCase().includes(`the ${name}`) ||
                section.content.toLowerCase() === `${name}` ||
                section.content.toLowerCase() === `the ${name}` ||
                section.content.toLowerCase() === `${name.toLowerCase()}` ||
                section.content.toLowerCase() === `the ${name.toLowerCase()}`;
            return !isRedundant;
        });
        return Object.assign(Object.assign({}, doc), { sections: filteredSections });
    }
};
// Rule: Compress function signatures
exports.compressFunctionSignatures = {
    id: 'compress-function-signatures',
    name: 'Compress Function Signatures',
    description: 'Compress function signatures to a more compact form',
    enabled: true,
    weight: 60,
    apply(doc) {
        const processFunctionSignature = (content) => {
            // Replace "function name(param1, param2)" with "fn:name(param1,param2)"
            return content
                .replace(/function\s+(\w+)\s*\(\s*(.*?)\s*\)/g, 'fn:$1($2)')
                // Remove spaces after commas in parameter lists
                .replace(/,\s+/g, ',')
                // Replace "const name = function(param1, param2)" with "const name=fn(param1,param2)"
                .replace(/const\s+(\w+)\s*=\s*function\s*\(\s*(.*?)\s*\)/g, 'const $1=fn($2)')
                // Replace "const name = (param1, param2) => {" with "const name=($1,$2)=>{" 
                .replace(/const\s+(\w+)\s*=\s*\(\s*(.*?)\s*\)\s*=>\s*{/g, 'const $1=($2)=>{')
                // Replace "public methodName(param1: Type, param2: Type)" with "pub methodName(p1:Type,p2:Type)"
                .replace(/public\s+(\w+)\s*\(\s*(.*?)\s*\)/g, 'pub $1($2)');
        };
        // Process each section
        const processedSections = doc.sections.map(section => {
            if (section.type === 'function-signature' || section.type === 'code') {
                return Object.assign(Object.assign({}, section), { content: processFunctionSignature(section.content) });
            }
            return section;
        });
        return Object.assign(Object.assign({}, doc), { sections: processedSections });
    }
};
// Rule: Compress code examples
exports.compressCodeExamples = {
    id: 'compress-code-examples',
    name: 'Compress Code Examples',
    description: 'Compress code examples by removing comments and whitespace',
    enabled: true,
    weight: 30,
    apply(doc) {
        const processCodeExample = (content) => {
            return content
                // Remove single-line comments
                .replace(/\/\/.*$/gm, '')
                // Remove multi-line comments
                .replace(/\/\*[\s\S]*?\*\//g, '')
                // Compress multiple empty lines into one
                .replace(/\n\s*\n\s*\n/g, '\n\n')
                // Remove whitespace at the beginning of lines
                .replace(/^\s+/gm, '')
                // Remove trailing whitespace
                .replace(/\s+$/gm, '');
        };
        // Process each section
        const processedSections = doc.sections.map(section => {
            if (section.type === 'code' || section.type === 'example') {
                return Object.assign(Object.assign({}, section), { content: processCodeExample(section.content) });
            }
            return section;
        });
        return Object.assign(Object.assign({}, doc), { sections: processedSections });
    }
};
// Rule: Compress headings
exports.compressHeadings = {
    id: 'compress-headings',
    name: 'Compress Headings',
    description: 'Compress headings to a more compact form',
    enabled: true,
    weight: 70,
    apply(doc) {
        const processHeading = (content) => {
            // Replace "Getting Started" with "Getting Started:"
            // Then abbreviate common terms in headings
            let processed = content;
            Object.entries(commonTerms).forEach(([term, abbr]) => {
                const regex = new RegExp(`\\b${term}\\b`, 'gi');
                processed = processed.replace(regex, abbr);
            });
            return processed;
        };
        // Process each section
        const processedSections = doc.sections.map(section => {
            if (section.type === 'heading') {
                return Object.assign(Object.assign({}, section), { content: processHeading(section.content) });
            }
            return section;
        });
        return Object.assign(Object.assign({}, doc), { sections: processedSections });
    }
};
// Rule: Compress API endpoints
exports.compressApiEndpoints = {
    id: 'compress-api-endpoints',
    name: 'Compress API Endpoints',
    description: 'Compress API endpoint documentation',
    enabled: true,
    weight: 65,
    apply(doc) {
        const processApiEndpoint = (content) => {
            // Replace "GET /api/v1/users/{id}" with "GET:/api/v1/users/{id}"
            return content
                .replace(/(\b(?:GET|POST|PUT|DELETE|PATCH)\b)\s+(\S+)/g, '$1:$2')
                // Replace "Content-Type: application/json" with "CT:app/json"
                .replace(/Content-Type:\s*application\/json/g, 'CT:app/json')
                // Replace "Authorization: Bearer" with "Auth:Bearer"
                .replace(/Authorization:\s*Bearer/g, 'Auth:Bearer');
        };
        // Process each section
        const processedSections = doc.sections.map(section => {
            if (section.type === 'api-endpoint') {
                return Object.assign(Object.assign({}, section), { content: processApiEndpoint(section.content) });
            }
            return section;
        });
        return Object.assign(Object.assign({}, doc), { sections: processedSections });
    }
};
// Export all default rules
exports.defaultRules = [
    exports.abbreviateCommonTerms,
    exports.removeRedundantDocs,
    exports.compressFunctionSignatures,
    exports.compressCodeExamples,
    exports.compressHeadings,
    exports.compressApiEndpoints
];
// Export a map of rules by ID for easy lookup
exports.rulesById = exports.defaultRules.reduce((acc, rule) => {
    acc[rule.id] = rule;
    return acc;
}, {});
