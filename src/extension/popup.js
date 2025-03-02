/**
 * DocBits Minimal Popup Script
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DocBits popup loaded');
  
  // Get elements
  const compressPageBtn = document.getElementById('compress-page');
  const compressSelectionBtn = document.getElementById('compress-selection');
  const copyBtn = document.getElementById('copy-compressed');
  const statsEl = document.getElementById('stats');
  const messageEl = document.getElementById('message');
  
  // Make sure all elements exist
  if (!compressPageBtn || !compressSelectionBtn || !copyBtn || !statsEl) {
    console.error('Missing UI elements');
    showMessage('UI initialization error', 'error');
    return;
  }
  
  // Initially disable copy button
  copyBtn.disabled = true;
  
  // Store last compressed text
  let compressedText = '';
  
  // Show a message to the user
  function showMessage(text, type) {
    console.log('Showing message:', text, type);
    
    if (!messageEl) return;
    
    messageEl.textContent = text;
    messageEl.className = `message ${type || 'error'}`;
    messageEl.style.display = 'block';
    
    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 3000);
    }
  }
  
  // Update stats display
  function updateStats(metrics) {
    if (!metrics) return;
    
    console.log('Updating stats:', metrics);
    
    document.getElementById('original-tokens').textContent = metrics.originalTokens;
    document.getElementById('compressed-tokens').textContent = metrics.compressedTokens;
    document.getElementById('tokens-saved').textContent = metrics.tokensSaved;
    document.getElementById('percent-saved').textContent = metrics.percentSaved.toFixed(1) + '%';
    
    // Show stats section
    statsEl.style.display = 'block';
  }
  
  // Send message to the active tab's content script
  function sendMessageToContentScript(message, callback) {
    console.log('Sending message to content script:', message);
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        console.error('No active tab found');
        showMessage('No active tab found');
        return;
      }
      
      const activeTab = tabs[0];
      console.log('Active tab:', activeTab.id, activeTab.url);
      
      try {
        chrome.tabs.sendMessage(activeTab.id, message, function(response) {
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError.message);
            showMessage('Error: ' + chrome.runtime.lastError.message);
            return;
          }
          
          console.log('Received response:', response);
          
          if (!response) {
            showMessage('No response from content script');
            return;
          }
          
          // Handle successful response
          if (response.success) {
            if (response.text) {
              compressedText = response.text;
              copyBtn.disabled = false;
            }
            
            if (response.metrics) {
              updateStats(response.metrics);
            }
            
            if (callback) callback(response);
          } else {
            // Handle error response
            showMessage(response.error || 'Unknown error');
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        showMessage('Error: ' + (error.message || 'Failed to send message'));
      }
    });
  }
  
  // Handle compress page button click
  compressPageBtn.addEventListener('click', function() {
    console.log('Compress page button clicked');
    showMessage('Compressing page...', 'info');
    
    sendMessageToContentScript({action: 'compressPage'}, function(response) {
      if (response.success) {
        showMessage('Page compressed successfully', 'success');
      }
    });
  });
  
  // Handle compress selection button click
  compressSelectionBtn.addEventListener('click', function() {
    console.log('Compress selection button clicked');
    showMessage('Compressing selection...', 'info');
    
    sendMessageToContentScript({action: 'compressSelection'}, function(response) {
      if (response.success) {
        showMessage('Selection compressed successfully', 'success');
      }
    });
  });
  
  // Handle copy button click
  copyBtn.addEventListener('click', function() {
    console.log('Copy button clicked');
    
    if (compressedText) {
      // Copy directly from popup if we already have the text
      copyToClipboard(compressedText);
    } else {
      // Otherwise get it from content script
      sendMessageToContentScript({action: 'copyCompressed'}, function(response) {
        if (response.success && response.text) {
          copyToClipboard(response.text);
        }
      });
    }
  });
  
  // Copy text to clipboard
  function copyToClipboard(text) {
    console.log('Copying to clipboard, text length:', text.length);
    
    try {
      // Create temp element and copy
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      
      document.body.appendChild(textarea);
      textarea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        showMessage('Copied to clipboard!', 'success');
      } else {
        showMessage('Failed to copy to clipboard');
      }
    } catch (error) {
      console.error('Copy error:', error);
      showMessage('Error copying: ' + (error.message || 'Unknown error'));
    }
  }
  
  // Check if content script is loaded
  console.log('Sending ping to test connection');
  sendMessageToContentScript({action: 'ping'}, function(response) {
    if (response && response.success) {
      console.log('Connection to content script verified');
      showMessage('Ready to compress!', 'success');
    }
  });
});