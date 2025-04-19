// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    summarizeVideo(request.apiKey)
      .then(summary => {
        sendResponse({ summary });
      })
      .catch(error => {
        sendResponse({ error: error.message });
      });
    return true; // Required for async response
  }
});

async function summarizeVideo(apiKey) {
  try {
    // Get video title
    const title = document.querySelector('h1.title')?.textContent.trim() || 'Untitled Video';
    
    // Get video description
    const description = document.querySelector('#description-inline-expander')?.textContent.trim() || '';
    
    // Get video transcript if available
    const transcript = await getVideoTranscript();
    
    // Combine all text for summarization
    const textToSummarize = `
      Title: ${title}
      Description: ${description}
      Transcript: ${transcript}
    `;

    // Call OpenAI API for summarization
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes YouTube videos. Create a concise summary that captures the main points and key takeaways.'
          },
          {
            role: 'user',
            content: `Please summarize the following YouTube video content:\n\n${textToSummarize}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate summary');
    }

    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('Error summarizing video:', error);
    throw error;
  }
}

async function getVideoTranscript() {
  try {
    // Click the "..." menu button
    const moreButton = document.querySelector('button[aria-label="More actions"]');
    if (!moreButton) return 'Transcript not available.';
    
    moreButton.click();
    
    // Wait for the menu to appear and click "Show transcript"
    await new Promise(resolve => setTimeout(resolve, 500));
    const transcriptButton = Array.from(document.querySelectorAll('ytd-menu-service-item-renderer'))
      .find(el => el.textContent.includes('Show transcript'));
    
    if (!transcriptButton) return 'Transcript not available.';
    
    transcriptButton.click();
    
    // Wait for transcript to load and extract text
    await new Promise(resolve => setTimeout(resolve, 1000));
    const transcriptElements = document.querySelectorAll('ytd-transcript-segment-renderer');
    const transcriptText = Array.from(transcriptElements)
      .map(el => el.textContent.trim())
      .join(' ');
    
    return transcriptText || 'Transcript not available.';
  } catch (error) {
    console.error('Error getting transcript:', error);
    return 'Transcript not available.';
  }
} 