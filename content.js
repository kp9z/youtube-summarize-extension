// Debug logging helper - moved to top and made into a const to avoid redeclaration
const debug = (message) => {
  console.log(`[YouTube Summarizer] ${message}`);
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'transcript') {
    getVideoTranscript()
      .then(transcript => {
        sendResponse({ summary: transcript });
      })
      .catch(error => {
        debug('Error getting transcript: ' + error.message);
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
        debug('Error summarizing transcript: ' + error.message);
        sendResponse({ error: error.message });
      });
    return true;
  }
});

// Check if we're on a YouTube video page
function isYouTubeVideoPage() {
  if (window.location.hostname !== 'www.youtube.com') return false;
  
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  return (
    (path === '/watch' && params.has('v')) || 
    path.startsWith('/live/')
  );
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

// Wait for YouTube page to be ready
const waitForYouTubeLoad = async () => {
  const MAX_ATTEMPTS = 30;
  const DELAY = 1000;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (document.querySelector('ytd-watch-metadata')) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, DELAY));
  }
  throw new Error('YouTube page failed to load required elements');
};

// Initialize the extension
const initializeExtension = async () => {
  try {
    await waitForYouTubeLoad();
    debug('YouTube page loaded, initializing extension');
    
    // Initial injection
    if (isYouTubeVideoPage()) {
      debug('Starting initial injection');
      setTimeout(injectButtons, 1500);
    }

    // Watch for URL changes
    let currentVideoId = '';
    setInterval(() => {
      if (!isYouTubeVideoPage()) return;
      
      const videoId = new URLSearchParams(window.location.search).get('v');
      if (videoId && videoId !== currentVideoId) {
        currentVideoId = videoId;
        debug('New video detected: ' + videoId);
        setTimeout(injectButtons, 1000);
      }
    }, 1000);

  } catch (error) {
    debug('Failed to initialize extension: ' + error.message);
  }
};

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
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
    // Get video metadata with updated selector for title
    const videoTitle = document.querySelector('#title yt-formatted-string.style-scope.ytd-watch-metadata')?.textContent?.trim() ||
                      document.querySelector('h1.title')?.textContent?.trim() ||
                      'Unknown Title';
    
    // Updated channel name selector to handle different YouTube DOM structures
    const channelName = document.querySelector('ytd-channel-name yt-formatted-string#text a')?.textContent?.trim() ||
                       document.querySelector('ytd-channel-name yt-formatted-string#text')?.textContent?.trim() ||
                       document.querySelector('#owner-name a')?.textContent?.trim() ||
                       'Unknown Channel';


    let videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) {
      // For live URLs, extract from pathname
      const pathMatch = window.location.pathname.match(/^\/live\/(.+)$/);
      if (pathMatch) {
        videoId = pathMatch[1];
      }
    }
    const baseVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Helper function to convert timestamp to seconds
    const timestampToSeconds = (timestamp) => {
      const parts = timestamp.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return 0;
    };

    // Instructions for LLMs on how to use timestamps
    const instructions = `Provide a structured breakdown of this video's content.

For all timestamps, use this clickable format:
[HH:MM:SS](${baseVideoUrl}&t=Xs) where X is the timestamp in seconds.

Structure:

TL;DR:
Two sentences summarizing the core content and main takeaway of this video.

Chapter Breakdown:
For each major section:

[Timestamp] Chapter Title
- Context: Brief introduction to what this section addresses
- Key Points:
  • [Timestamp] Main point or argument made
  • [Timestamp] Supporting evidence or examples
  • [Timestamp] Counter-arguments or alternative views (if any)
- Technical Details:
  • New terms or concepts explained
  • Methodologies or processes discussed
  • Data or research mentioned
- Discussion:
  • Different perspectives presented (who said what)
  • Agreements/disagreements between speakers
  • Resolutions or conclusions reached

Example:
[00:00](${baseVideoUrl}&t=0s) The Future of AI Development
- Context: Discussion about current AI limitations and future potential
- Key Points:
  • [00:45](${baseVideoUrl}&t=45s) Current AI systems struggle with common sense reasoning
  • [02:30](${baseVideoUrl}&t=150s) Three major challenges in AI development
  • [05:15](${baseVideoUrl}&t=315s) Proposed solutions from different research teams
- Technical Details:
  • Neural Networks explained: Pattern recognition systems inspired by human brain
  • Transfer Learning: How AI applies knowledge from one task to another
- Discussion:
  • Google's team argues for larger models
  • OpenAI researchers counter with efficiency-focused approach
  • Agreement reached on need for better training data

Note: Use timestamps from the transcript to create clickable links. Video URL: ${baseVideoUrl}\n\n`;

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
        const seconds = timestampToSeconds(timestamp);
        transcriptText += `[${timestamp}] ${text} &t=${seconds}s\n`;
      }
    });

    // Get chapters if available
    let chaptersSection = '';
    const chapters = Array.from(document.querySelectorAll('ytd-chapter-renderer'))
      .map(chapter => {
        const timestamp = chapter.querySelector('.timestamp')?.textContent?.trim();
        const title = chapter.querySelector('.chapter-title')?.textContent?.trim();
        if (timestamp && title) {
          const seconds = timestampToSeconds(timestamp);
          return `${timestamp} - ${title} &t=${seconds}s`;
        }
        return null;
      })
      .filter(chapter => chapter !== null);

    if (chapters.length > 0) {
      chaptersSection = '\nChapters:\n' + chapters.join('\n') + '\n';
    }

    // Format the complete output with metadata
    const completeOutput = `<INSTRUCTION>\n\n${instructions}</INSTRUCTION>\n\n<VIDEO METADATA>\nVideo URL: ${baseVideoUrl}\n\nVideo Title: ${videoTitle}\n\nChannel: ${channelName}\n\n${chaptersSection}\n\n</VIDEO METADATA>\n\n<TRANSCRIPT>\n${transcriptText.trim()}\n</TRANSCRIPT>`;

    return completeOutput;
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