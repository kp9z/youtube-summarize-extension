// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'transcript') {
    getVideoTranscript()
      .then(transcript => {
        sendResponse({ summary: transcript });
      })
      .catch(error => {
        sendResponse({ error: error.message });
      });
    return true;
  } else if (request.action === 'summarize') {
    getVideoTranscript()
      .then(transcript => summarizeTranscript(transcript, request.apiKey))
      .then(summary => {
        sendResponse({ summary: summary });
      })
      .catch(error => {
        sendResponse({ error: error.message });
      });
    return true;
  }
});

// Debug logging helper
const debug = (message) => {
  console.log(`[YouTube Summarizer] ${message}`);
};

// Check if we're on a YouTube video page
function isYouTubeVideoPage() {
  return window.location.hostname === 'www.youtube.com' && 
         window.location.pathname === '/watch' &&
         new URLSearchParams(window.location.search).has('v');
}

// Wait for element with timeout and retry
async function waitForElement(selector, timeout = 2000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

// Create button using YouTube's native style
function createYouTubeButton(text, color) {
  const button = document.createElement('button');
  button.innerHTML = text;
  button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--size-m';
  button.style.cssText = `
    background-color: ${color};
    color: white;
    margin: 0 4px;
    border: none;
    padding: 0 16px;
    height: 36px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  `;
  return button;
}

// Modified injection function
async function injectButtons() {
  if (!isYouTubeVideoPage()) {
    debug('Not a YouTube video page, skipping injection');
    return;
  }

  debug('Starting button injection');

  // Wait for the like button container
  const buttonContainer = await waitForElement('#top-level-buttons-computed');
  if (!buttonContainer) {
    debug('Button container not found');
    return;
  }

  // Check if buttons already exist
  if (document.querySelector('.youtube-summarizer-buttons')) {
    debug('Buttons already exist, skipping injection');
    return;
  }

  debug('Creating buttons container');
  const container = document.createElement('div');
  container.className = 'youtube-summarizer-buttons';
  container.style.cssText = `
    display: inline-flex;
    align-items: center;
    vertical-align: top;
    margin-left: 8px;
  `;

  // Create Transcript button
  const transcriptBtn = createYouTubeButton('📋 Copy Transcript', '#34a853');
  transcriptBtn.onclick = async () => {
    debug('Transcript button clicked');
    try {
      transcriptBtn.disabled = true;
      transcriptBtn.innerHTML = '📋 Getting transcript...';
      const transcript = await getVideoTranscript();
      
      // Copy to clipboard
      await navigator.clipboard.writeText(transcript);
      
      // Show success feedback
      transcriptBtn.innerHTML = '✓ Copied!';
      setTimeout(() => {
        transcriptBtn.disabled = false;
        transcriptBtn.innerHTML = '📋 Copy Transcript';
      }, 2000);
    } catch (error) {
      alert('Error: ' + error.message);
      transcriptBtn.disabled = false;
      transcriptBtn.innerHTML = '📋 Copy Transcript';
    }
  };

  // Add button to container
  container.appendChild(transcriptBtn);

  // Insert after the like/dislike buttons
  buttonContainer.appendChild(container);
  debug('Button injected successfully');
}

// Handle page navigation
let currentVideoId = '';

function checkForNewVideo() {
  if (!isYouTubeVideoPage()) return;
  
  const videoId = new URLSearchParams(window.location.search).get('v');
  if (videoId && videoId !== currentVideoId) {
    currentVideoId = videoId;
    debug('New video detected: ' + videoId);
    setTimeout(injectButtons, 1000);
  }
}

// Watch for URL changes
setInterval(checkForNewVideo, 1000);

// Initial injection
if (isYouTubeVideoPage()) {
  debug('Starting initial injection');
  setTimeout(injectButtons, 1500);
}

// Function to display summary in a nice format
function displaySummary(summary) {
  const container = getOrCreateResultContainer();
  container.innerHTML = `
    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <h3 style="margin: 0 0 8px 0; color: #030303;">Summary</h3>
      <p style="margin: 0; white-space: pre-wrap;">${summary}</p>
      <button onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)" 
              style="margin-top: 8px; padding: 4px 8px; background: #fff; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
        📋 Copy
      </button>
    </div>
  `;
}

// Function to display transcript in a nice format
function displayTranscript(transcript) {
  const container = getOrCreateResultContainer();
  container.innerHTML = `
    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <h3 style="margin: 0 0 8px 0; color: #030303;">Transcript</h3>
      <p style="margin: 0; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${transcript}</p>
      <button onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)"
              style="margin-top: 8px; padding: 4px 8px; background: #fff; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
        📋 Copy
      </button>
    </div>
  `;
}

// Helper function to get or create the result container
function getOrCreateResultContainer() {
  let container = document.querySelector('.youtube-summarizer-results');
  if (!container) {
    container = document.createElement('div');
    container.className = 'youtube-summarizer-results';
    const descriptionElement = document.querySelector('#description-inline-expander');
    if (descriptionElement) {
      descriptionElement.parentElement.insertBefore(container, descriptionElement);
    }
  }
  return container;
}

async function getVideoTranscript() {
  try {
    // Find and click the transcript button
    let transcriptButton = Array.from(document.querySelectorAll('button'))
      .find(button => button.textContent.toLowerCase().includes('show transcript') || 
                      button.textContent.toLowerCase().includes('open transcript'));

    if (!transcriptButton) {
      // Try to find and click "More actions" button first
      const moreButton = Array.from(document.querySelectorAll('button'))
        .find(button => button.textContent.toLowerCase().includes('more actions'));
      
      if (moreButton) {
        moreButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now try to find the transcript button in the menu
        transcriptButton = Array.from(document.querySelectorAll('button'))
          .find(button => button.textContent.toLowerCase().includes('show transcript') || 
                         button.textContent.toLowerCase().includes('open transcript'));
      }
    }

    if (!transcriptButton) {
      throw new Error('Could not find transcript button. The video might not have a transcript available.');
    }

    transcriptButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find the transcript container
    const transcriptContainer = document.querySelector('ytd-transcript-renderer') || 
                              document.querySelector('ytd-transcript-body-renderer');

    if (!transcriptContainer) {
      throw new Error('Could not find transcript container');
    }

    // Get all transcript segments
    const segments = transcriptContainer.querySelectorAll('ytd-transcript-segment-renderer');
    if (!segments || segments.length === 0) {
      throw new Error('No transcript segments found');
    }

    // Extract and format transcript text
    let transcriptText = '';
    segments.forEach(segment => {
      const timestamp = segment.querySelector('[class*="timestamp"]')?.textContent?.trim();
      const text = segment.querySelector('[class*="segment-text"]')?.textContent?.trim();
      if (timestamp && text) {
        transcriptText += `[${timestamp}] ${text}\n`;
      }
    });

    return transcriptText.trim();
  } catch (error) {
    throw new Error(`Failed to get transcript: ${error.message}`);
  }
}

async function summarizeTranscript(transcript, apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes YouTube video transcripts. Provide a concise but informative summary that captures the main points and key takeaways.'
          },
          {
            role: 'user',
            content: `Please summarize this YouTube video transcript:\n\n${transcript}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate summary');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
} 