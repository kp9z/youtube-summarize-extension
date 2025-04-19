# YouTube Video Summarizer Chrome Extension

A modern Chrome extension that helps you quickly summarize YouTube videos and extract transcripts using AI.

## Features

- 🎥 One-click summarization of YouTube videos using OpenAI's GPT-4
- 📝 Automatic transcript extraction with timestamps
- ⚙️ Clean, modern user interface with settings management
- 📋 Copy functionality for both summaries and transcripts
- 🔒 Secure API key storage
- 🎨 Beautiful, responsive design

## Installation

1. Clone this repository or download the files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the directory containing these files
5. The extension should now appear in your Chrome toolbar

## Usage

1. Navigate to any YouTube video
2. Click the extension icon in your toolbar
3. Configure your OpenAI API key:
   - Click the gear icon (⚙️) in the top-right corner
   - Enter your OpenAI API key
   - The key will be saved automatically
4. Use the extension:
   - Click "Summarize Video" to get an AI-generated summary
   - Click "Get Transcript" to extract the video's transcript
   - Use the "Copy" button to copy the content to your clipboard

## Requirements

- Chrome browser (latest version recommended)
- OpenAI API key (get one from [OpenAI Platform](https://platform.openai.com/))
- Active internet connection

## How It Works

### Video Summarization
1. Extracts video title and description
2. Retrieves the video transcript
3. Sends the content to OpenAI's GPT-4
4. Displays a concise, AI-generated summary

### Transcript Extraction
1. Automatically opens the transcript panel
2. Extracts text with timestamps
3. Formats the transcript for easy reading
4. Provides copy functionality

## Development

This extension is built with:
- HTML5, CSS3, and JavaScript
- Chrome Extension Manifest V3
- OpenAI API integration
- Modern UI/UX design principles

### Project Structure
```
youtube-summarize-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main extension interface
├── popup.js              # Popup functionality
├── content.js            # Content script for YouTube interaction
└── images/               # Extension icons
```

### Customization
You can modify:
- The OpenAI model used for summarization
- The prompt template for generating summaries
- The UI design and colors
- The transcript extraction logic

## Troubleshooting

### Common Issues
1. "Transcript not available"
   - The video might not have a transcript
   - Try refreshing the page
   - Check if the video has captions enabled

2. "Error: Could not establish connection"
   - Refresh the YouTube page
   - Make sure you're on a video page
   - Check the Chrome console for errors

3. API Key Issues
   - Verify your OpenAI API key is correct
   - Check your OpenAI account for usage limits
   - Ensure you have sufficient credits

## Contributing

Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## License

MIT License - Feel free to use this project for your own purposes.

## Support

If you find this extension useful, consider:
- Starring the repository
- Sharing it with others
- Contributing to its development 