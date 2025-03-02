/**
 * DocBits Extension Popup
 */

document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements
  const compressPageButton = document.getElementById('compress-page') as HTMLButtonElement;
  const compressSelectionButton = document.getElementById('compress-selection') as HTMLButtonElement;
  const copyCompressedButton = document.getElementById('copy-compressed') as HTMLButtonElement;
  const statsElement = document.getElementById('stats') as HTMLDivElement;
  const originalTokensElement = document.getElementById('original-tokens') as HTMLSpanElement;
  const compressedTokensElement = document.getElementById('compressed-tokens') as HTMLSpanElement;
  const tokensSavedElement = document.getElementById('tokens-saved') as HTMLSpanElement;
  const percentSavedElement = document.getElementById('percent-saved') as HTMLSpanElement;
  const messageElement = document.getElementById('message') as HTMLDivElement;
  
  // Get options
  const abbreviateTermsCheckbox = document.getElementById('abbreviate-terms') as HTMLInputElement;
  const compressCodeCheckbox = document.getElementById('compress-code') as HTMLInputElement;
  const removeRedundantCheckbox = document.getElementById('remove-redundant') as HTMLInputElement;
  
  // Load saved options
  chrome.storage.local.get({
    'abbreviateTerms': true,
    'compressCode': true,
    'removeRedundant': true
  }, (items) => {
    abbreviateTermsCheckbox.checked = items.abbreviateTerms;
    compressCodeCheckbox.checked = items.compressCode;
    removeRedundantCheckbox.checked = items.removeRedundant;
  });
  
  // Save options when changed
  abbreviateTermsCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ 'abbreviateTerms': abbreviateTermsCheckbox.checked });
  });
  
  compressCodeCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ 'compressCode': compressCodeCheckbox.checked });
  });
  
  removeRedundantCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ 'removeRedundant': removeRedundantCheckbox.checked });
  });
  
  // Compress page button
  compressPageButton.addEventListener('click', () => {
    // Get active rules based on checkboxes
    const activeRules = getActiveRules();
    
    // Send message to content script to compress the page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'compressPage',
          rules: activeRules
        }, (response) => {
          handleCompressionResponse(response);
        });
      }
    });
  });
  
  // Compress selection button
  compressSelectionButton.addEventListener('click', () => {
    // Get active rules based on checkboxes
    const activeRules = getActiveRules();
    
    // Send message to content script to compress the selection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'compressSelection',
          rules: activeRules
        }, (response) => {
          handleCompressionResponse(response);
        });
      }
    });
  });
  
  // Copy compressed text button
  copyCompressedButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'copyCompressed'
        }, (response) => {
          if (response && response.success) {
            showMessage('Copied to clipboard!', 'success');
            setTimeout(() => {
              hideMessage();
            }, 2000);
          } else {
            showMessage('Failed to copy: ' + (response?.error || 'Unknown error'), 'error');
          }
        });
      }
    });
  });
  
  // Function to get active rules based on checkboxes
  function getActiveRules(): string[] {
    const rules: string[] = [];
    
    if (abbreviateTermsCheckbox.checked) {
      rules.push('abbreviate-common-terms');
    }
    
    if (compressCodeCheckbox.checked) {
      rules.push('compress-code-examples');
    }
    
    if (removeRedundantCheckbox.checked) {
      rules.push('remove-redundant-docs');
    }
    
    // Always include these rules
    rules.push('compress-function-signatures');
    rules.push('compress-headings');
    rules.push('compress-api-endpoints');
    
    return rules;
  }
  
  // Function to handle compression response
  function handleCompressionResponse(response: any): void {
    if (response && response.success) {
      // Update stats
      const metrics = response.metrics;
      
      if (metrics) {
        originalTokensElement.textContent = metrics.originalTokens.toLocaleString();
        compressedTokensElement.textContent = metrics.compressedTokens.toLocaleString();
        tokensSavedElement.textContent = metrics.tokensSaved.toLocaleString();
        percentSavedElement.textContent = metrics.percentSaved.toFixed(1) + '%';
        
        // Show stats and enable copy button
        statsElement.style.display = 'block';
        copyCompressedButton.disabled = false;
      }
    } else {
      // Show error
      showMessage('Compression failed: ' + (response?.error || 'Unknown error'), 'error');
      
      // Hide stats and disable copy button
      statsElement.style.display = 'none';
      copyCompressedButton.disabled = true;
    }
  }
  
  // Show message
  function showMessage(text: string, type: 'success' | 'error'): void {
    messageElement.textContent = text;
    messageElement.className = 'message ' + type;
    messageElement.style.display = 'block';
  }
  
  // Hide message
  function hideMessage(): void {
    messageElement.style.display = 'none';
  }
});