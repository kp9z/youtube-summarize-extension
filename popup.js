document.addEventListener('DOMContentLoaded', function() {
  const transcriptBtn = document.getElementById('transcriptBtn');
  const summarizeBtn = document.getElementById('summarizeBtn');
  const copyBtn = document.getElementById('copyBtn');
  const summaryDiv = document.getElementById('summary');
  const loadingDiv = document.getElementById('loading');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');
  const apiKeyInput = document.getElementById('apiKey');

  // Load saved API key
  chrome.storage.sync.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  });

  // Settings modal handlers
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
  });

  closeSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  // Save API key when changed
  apiKeyInput.addEventListener('change', () => {
    chrome.storage.sync.set({
      openaiApiKey: apiKeyInput.value
    });
  });

  // Handle copy button click
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summaryDiv.textContent);
      copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
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
      // Check if we're on YouTube
      if (!tab.url.includes('youtube.com/watch')) {
        summaryDiv.textContent = 'Please navigate to a YouTube video first.';
        copyBtn.style.display = 'none';
        return;
      }

      // Show loading state
      loadingDiv.style.display = 'block';
      loadingDiv.textContent = action === 'transcript' ? 'Getting transcript...' : 'Generating summary...';
      summaryDiv.textContent = '';
      copyBtn.style.display = 'none';
      transcriptBtn.disabled = true;
      summarizeBtn.disabled = true;

      // Check for API key if summarizing
      if (action === 'summarize') {
        const apiKey = apiKeyInput.value;
        if (!apiKey) {
          loadingDiv.style.display = 'none';
          transcriptBtn.disabled = false;
          summarizeBtn.disabled = false;
          summaryDiv.textContent = 'Please enter your OpenAI API key in settings first.';
          settingsModal.style.display = 'block';
          return;
        }
      }

      // Try to inject content script if needed
      if (retryCount === 0) {
        await injectContentScript(tab.id);
      }

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { 
        action: action,
        apiKey: action === 'summarize' ? apiKeyInput.value : null
      }, (response) => {
        loadingDiv.style.display = 'none';
        transcriptBtn.disabled = false;
        summarizeBtn.disabled = false;

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
          summaryDiv.textContent = action === 'transcript' ? 
            'No transcript available. Please try again.' : 
            'Failed to generate summary. Please try again.';
          copyBtn.style.display = 'none';
        }
      });
    } catch (error) {
      loadingDiv.style.display = 'none';
      transcriptBtn.disabled = false;
      summarizeBtn.disabled = false;
      summaryDiv.textContent = 'Error: ' + error.message;
      copyBtn.style.display = 'none';
    }
  }

  transcriptBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await tryAction(tab, 'transcript');
  });

  summarizeBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await tryAction(tab, 'summarize');
  });
}); 