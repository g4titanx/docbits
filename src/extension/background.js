/**
 * DocBits Extension Background Script
 */

// Set up context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for text selection
  chrome.contextMenus.create({
    id: 'compress-selection',
    title: 'Compress with DocBits',
    contexts: ['selection']
  });
  
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