document.addEventListener('DOMContentLoaded', function() {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const transcriptBtn = document.getElementById('transcriptBtn');
  const copyBtn = document.getElementById('copyBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettings');
  const settingsModal = document.getElementById('settingsModal');
  const summaryDiv = document.getElementById('summary');
  const apiKeyInput = document.getElementById('apiKey');
  const loadingDiv = document.getElementById('loading');

  // Load saved API key
  chrome.storage.sync.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  });

  // Save API key when changed
  apiKeyInput.addEventListener('change', function() {
    chrome.storage.sync.set({ openaiApiKey: apiKeyInput.value });
  });

  // Settings modal handlers
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  // Handle copy button click
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summaryDiv.textContent);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  });

  async function injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      return true;
    } catch (error) {
      console.error('Error injecting content script:', error);
      return false;
    }
  }

  async function tryAction(tab, action, retryCount = 0) {
    try {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        summaryDiv.textContent = 'Please enter your OpenAI API key in settings first.';
        copyBtn.style.display = 'none';
        return;
      }

      // Check if we're on YouTube
      if (!tab.url.includes('youtube.com/watch')) {
        summaryDiv.textContent = 'Please navigate to a YouTube video first.';
        copyBtn.style.display = 'none';
        return;
      }

      // Show loading state
      loadingDiv.style.display = 'block';
      loadingDiv.textContent = action === 'summarize' ? 'Generating summary...' : 'Getting transcript...';
      summaryDiv.textContent = '';
      copyBtn.style.display = 'none';
      summarizeBtn.disabled = true;
      transcriptBtn.disabled = true;

      // Try to inject content script if needed
      if (retryCount === 0) {
        await injectContentScript(tab.id);
      }

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { 
        action: action,
        apiKey: apiKey
      }, (response) => {
        loadingDiv.style.display = 'none';
        summarizeBtn.disabled = false;
        transcriptBtn.disabled = false;

        if (chrome.runtime.lastError) {
          if (retryCount < 2) {
            // Retry after a short delay
            setTimeout(() => tryAction(tab, action, retryCount + 1), 1000);
          } else {
            summaryDiv.textContent = 'Error: Could not connect to the YouTube page. Please refresh the page and try again.';
            copyBtn.style.display = 'none';
          }
          return;
        }
        
        if (response && response.summary) {
          summaryDiv.textContent = response.summary;
          copyBtn.style.display = 'block';
        } else if (response && response.error) {
          summaryDiv.textContent = 'Error: ' + response.error;
          copyBtn.style.display = 'none';
        } else {
          summaryDiv.textContent = 'No data available. Please try again.';
          copyBtn.style.display = 'none';
        }
      });
    } catch (error) {
      loadingDiv.style.display = 'none';
      summarizeBtn.disabled = false;
      transcriptBtn.disabled = false;
      summaryDiv.textContent = 'Error: ' + error.message;
      copyBtn.style.display = 'none';
    }
  }

  summarizeBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await tryAction(tab, 'summarize');
  });

  transcriptBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await tryAction(tab, 'transcript');
  });
}); 