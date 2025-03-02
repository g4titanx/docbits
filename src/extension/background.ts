/**
 * DocBits Extension Background Script
 */

// Set up context menu
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for text selection
  chrome.contextMenus.create({
    id: 'compress-selection',
    title: 'Compress with DocBits',
    contexts: ['selection']
  });
  
  // Log installation
  console.log('DocBits extension installed');
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'compress-selection' && tab?.id) {
    // Send message to content script to compress the selection
    chrome.tabs.sendMessage(tab.id, {
      action: 'compressSelection'
    });
  }
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'compress-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'compressSelection'
        });
      }
    });
  } else if (command === 'compress-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'compressPage'
        });
      }
    });
  }
});