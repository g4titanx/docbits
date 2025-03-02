/**
 * DocBits Extension Content Script
 */

import { DocCompressor } from '../core/compressor';
import { TikTokenCounter } from '../core/utils/token-counter';
import { defaultRules, rulesById } from '../core/rules';
import { CompressionRule } from '../core/types';

// Initialize compressor
const compressor = new DocCompressor(undefined, new TikTokenCounter());

// Store the last compressed result
let lastCompressedOutput: string | null = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'compressPage') {
    try {
      // Get the entire page content
      const content = document.body.innerText;
      
      // Get active rules
      const activeRules = getActiveRules(request.rules);
      
      // Compress the content
      const result = compressor.compress(content, {
        rules: activeRules.map(rule => rule.id)
      });
      
      // Store the compressed output
      lastCompressedOutput = result.output;
      
      // Send response with metrics
      sendResponse({
        success: true,
        metrics: result.metrics
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
    
    return true;
  }
  else if (request.action === 'compressSelection') {
    try {
      // Get the selected text
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed) {
        sendResponse({
          success: false,
          error: 'No text selected'
        });
        return true;
      }
      
      const content = selection.toString();
      
      if (!content.trim()) {
        sendResponse({
          success: false,
          error: 'Selected text is empty'
        });
        return true;
      }
      
      // Get active rules
      const activeRules = getActiveRules(request.rules);
      
      // Compress the content
      const result = compressor.compress(content, {
        rules: activeRules.map(rule => rule.id)
      });
      
      // Store the compressed output
      lastCompressedOutput = result.output;
      
      // Send response with metrics
      sendResponse({
        success: true,
        metrics: result.metrics
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
    
    return true;
  }
  else if (request.action === 'copyCompressed') {
    try {
      if (!lastCompressedOutput) {
        sendResponse({
          success: false,
          error: 'No compressed content available'
        });
        return true;
      }
      
      // Copy to clipboard
      // We use the navigator.clipboard API since we requested clipboardWrite permission
      navigator.clipboard.writeText(lastCompressedOutput)
        .then(() => {
          sendResponse({
            success: true
          });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error.message
          });
        });
      
      return true;
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
      
      return true;
    }
  }
  
  return false;
});

/**
 * Get active rules based on IDs
 */
function getActiveRules(ruleIds: string[]): CompressionRule[] {
  if (!ruleIds || !ruleIds.length) {
    return defaultRules.filter(rule => rule.enabled);
  }
  
  return ruleIds
    .map(id => rulesById[id])
    .filter(Boolean);
}