document.addEventListener('DOMContentLoaded', function() {
  const summarizeBtn = document.getElementById('summarizeBtn');
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

  summarizeBtn.addEventListener('click', async () => {
    try {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        summaryDiv.textContent = 'Please enter your OpenAI API key first.';
        return;
      }

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on YouTube
      if (!tab.url.includes('youtube.com/watch')) {
        summaryDiv.textContent = 'Please navigate to a YouTube video first.';
        return;
      }

      // Show loading state
      loadingDiv.style.display = 'block';
      summaryDiv.textContent = '';
      summarizeBtn.disabled = true;

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { 
        action: 'summarize',
        apiKey: apiKey
      }, (response) => {
        loadingDiv.style.display = 'none';
        summarizeBtn.disabled = false;

        if (chrome.runtime.lastError) {
          summaryDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
          return;
        }
        
        if (response && response.summary) {
          summaryDiv.textContent = response.summary;
        } else if (response && response.error) {
          summaryDiv.textContent = 'Error: ' + response.error;
        } else {
          summaryDiv.textContent = 'No summary available. Please try again.';
        }
      });
    } catch (error) {
      loadingDiv.style.display = 'none';
      summarizeBtn.disabled = false;
      summaryDiv.textContent = 'Error: ' + error.message;
    }
  });
}); 