/// <reference types="chrome" />

/**
 * The offscreen document runs globally in the background exactly for this purpose.
 * It holds the `<audio>` tag so navigating between forum pages doesn't kill playback.
 */

const audioEl = document.getElementById('yiddish24-audio') as HTMLAudioElement;

// Send progress regularly to whatever UI is open (e.g. popup)
audioEl.addEventListener('timeupdate', () => {
  chrome.runtime.sendMessage({
    action: 'yiddish24_progress',
    currentTime: audioEl.currentTime,
    duration: audioEl.duration
  });
});

audioEl.addEventListener('ended', () => {
  chrome.runtime.sendMessage({ action: 'yiddish24_ended' });
});

// Watch for messages from background or the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target !== 'offscreen') return false;

  switch (request.action) {
    case 'play':
      if (request.url) {
        audioEl.src = request.url;
      }
      audioEl.play().then(() => sendResponse({ success: true })).catch(e => sendResponse({ success: false, error: e.message }));
      return true; // async
    
    case 'pause':
      audioEl.pause();
      sendResponse({ success: true });
      break;
      
    case 'seek':
      if (request.time !== undefined) {
        audioEl.currentTime = request.time;
      }
      sendResponse({ success: true });
      break;

    case 'status':
      sendResponse({
        playing: !audioEl.paused,
        currentTime: audioEl.currentTime,
        duration: audioEl.duration,
        src: audioEl.src
      });
      break;
  }
  return false;
});

// Notify background that we are registered and ready to receive commands
chrome.runtime.sendMessage({ action: 'yiddish24_ready' });
