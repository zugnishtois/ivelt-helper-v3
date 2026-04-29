// Background Service Worker for iVelt Pro
import { loadSettings } from './stateManager';

const NOTIFICATION_ALARM = 'ivelt-notification-check';
const CHECK_INTERVAL_MINUTES = 2;
const LAST_COUNT_KEY = 'ivelt_last_notification_count';

// On install: set up the alarm
chrome.runtime.onInstalled.addListener(() => {
  // Start the notification check alarm
  chrome.alarms.create(NOTIFICATION_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
});

// On startup: ensure alarm is running
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(NOTIFICATION_ALARM, {
    delayInMinutes: 0.5,
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
});

// Handle alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== NOTIFICATION_ALARM) return;
  
  const settings = await loadSettings();
  if (!settings.pushNotifications) return;
  
  await checkForNotifications();
});

// Click on notification → open the forum notifications page
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('ivelt-notif')) {
    chrome.tabs.create({ url: 'https://www.ivelt.com/forum/ucp.php?i=ucp_notifications' });
    chrome.notifications.clear(notificationId);
  }
});

async function checkForNotifications() {
  try {
    // First check if user is logged in
    const cookie = await chrome.cookies.get({ url: 'https://www.ivelt.com', name: 'phpbb3_sw7kk_u' });
    const userId = cookie?.value || '';
    if (!userId || userId === '1' || userId.length <= 1) return; // Not logged in

    // Fetch the forum main page to check notification count
    const response = await fetch('https://www.ivelt.com/forum/index.php', {
      credentials: 'include'
    });
    
    if (!response.ok) return;
    
    const html = await response.text();
    
    // Parse the notification badge count using regex (no DOMParser in service workers)
    // phpBB format: <span id="notification_list_button">...<strong class="badge">N</strong>...</span>
    const badgeMatch = html.match(/id=["']notification_list_button["'][^>]*>[\s\S]*?<strong[^>]*class=["'][^"']*badge[^"']*["'][^>]*>(\d+)<\/strong>/);
    if (!badgeMatch) return;
    
    const newCount = parseInt(badgeMatch[1], 10);
    
    if (isNaN(newCount) || newCount === 0) {
      await chrome.storage.local.set({ [LAST_COUNT_KEY]: 0 });
      return;
    }

    // Check if count increased since last check
    const stored = await chrome.storage.local.get([LAST_COUNT_KEY]);
    const lastCount = (stored[LAST_COUNT_KEY] as number) || 0;
    
    if (newCount > lastCount) {
      const diff = newCount - lastCount;
      
      // Try to get the latest notification text via regex
      let message = `דו האסט ${newCount} נייע נאטיפיקאציעס`;
      const titleMatch = html.match(/class=["'][^"']*notification-title[^"']*["'][^>]*>([^<]+)</);
      if (titleMatch) {
        message = titleMatch[1].trim();
      }

      chrome.notifications.create(`ivelt-notif-${Date.now()}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon128.png'),
        title: `iVelt — ${diff} נייע נאטיפיקאציע${diff > 1 ? 'ס' : ''}`,
        message: message,
        priority: 1
      });
    }

    await chrome.storage.local.set({ [LAST_COUNT_KEY]: newCount });
    
  } catch {
    // Transient fetch failure (offline / cookie expired / network blip).
    // The poll runs again on the next alarm tick — no need to surface it.
  }
}

// ── Yiddish24 Audio Player (Offscreen) ──
let offscreenCreating: Promise<void> | null = null;
const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';

async function setupOffscreenDocument(path: string) {
  if (await chrome.offscreen.hasDocument()) return;
  if (offscreenCreating) {
    await offscreenCreating;
    return;
  }
  offscreenCreating = new Promise<void>((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    // 1. Set up a one-time listener for the ready signal
    const readyListener = (msg: any) => {
      if (msg.action === 'yiddish24_ready') {
        if (timeoutId) clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(readyListener);
        offscreenCreating = null;
        resolve();
      }
    };
    chrome.runtime.onMessage.addListener(readyListener);

    // 2. Create the document
    chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'yiddish24 audio playing while navigating iVelt forum pages',
    }).then(() => {
      // Set a fallback timeout in case the ready message is missed
      timeoutId = setTimeout(() => {
        console.warn("iVelt Pro: yiddish24_ready message timed out, proceeding anyway");
        chrome.runtime.onMessage.removeListener(readyListener);
        offscreenCreating = null;
        resolve();
      }, 1500);
    }).catch(err => {
      console.error("Failed to create offscreen document:", err);
      if (timeoutId) clearTimeout(timeoutId);
      chrome.runtime.onMessage.removeListener(readyListener);
      offscreenCreating = null;
      resolve(); // resolve anyway so we don't hang indefinitely
    });
  });
  await offscreenCreating;
}

// Global player state
let currentY24State = {
  active: false,
  playing: false,
  currentTime: 0,
  duration: 0,
  src: '',
  title: ''
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Offscreen Audio heartbeat
  if (message.action === 'yiddish24_progress') {
    currentY24State.currentTime = message.currentTime;
    currentY24State.duration = message.duration;
    // Do not hold sendResponse open here
    return false;
  }
  if (message.action === 'yiddish24_ended') {
    currentY24State.playing = false;
    currentY24State.active = false;
    // Close offscreen document if needed, or leave it ready
    chrome.offscreen.closeDocument();
    return false;
  }

  // Popup requests status
  if (message.action === 'y24_status') {
    sendResponse(currentY24State);
    return false;
  }

  // Commands
  if (message.action === 'playYiddish24') {
    if (!message.url) { sendResponse(false); return; }
    currentY24State.title = message.title || 'שפּילט...';
    
    (async () => {
      try {
        // Find the numeric ID from url
        const match = message.url.match(/([0-9]+)\/([0-9]+)$/);
        if (!match) throw new Error("Invalid Yiddish24 URL format");
        
        const catId = match[1];
        const articleId = match[2];

        let mp3Url: string | null = null;
        
        // Fetch the actual HTML page data via their standard AJAX endpoint
        const pageRes = await fetch('https://www.yiddish24.com/ajax/page.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://www.yiddish24.com',
            'Referer': 'https://www.yiddish24.com/'
          },
          body: `page=category&dataID=${catId}&catType=sub&postID=${articleId}`
        });
        
        if (!pageRes.ok) throw new Error("Failed page response");
        const html = await pageRes.text();
        
        // We must lock the regex to the specific articleID to avoid fetching the wrong track from the sidebar
        const songIdxRegex = new RegExp(`item-data-${articleId}[^>]*data-song-url=["']([^"']+)["']`);
        const songUrlMatch = html.match(songIdxRegex);
        
        if (songUrlMatch) {
          mp3Url = songUrlMatch[1];
        } else {
          // Fallback generically if exact class structure changed
          const fallbackMatch = html.match(new RegExp(`data-id=["']${articleId}["'][^>]*data-song-url=["']([^"']+)["']`));
          if (fallbackMatch) mp3Url = fallbackMatch[1];
        }

        if (!mp3Url) throw new Error("No MP3 URL found anywhere");

        currentY24State.src = mp3Url;
        currentY24State.active = true;
        currentY24State.playing = true;

        await setupOffscreenDocument(OFFSCREEN_PATH);
        await chrome.runtime.sendMessage({ target: 'offscreen', action: 'play', url: mp3Url });
        
        sendResponse(true);
      } catch (err) {
        console.error("Yiddish24 Playback Error", err);
        currentY24State.active = false;
        currentY24State.playing = false;
        sendResponse(false);
      }
    })();
    return true; // async
  }

  if (message.action === 'y24_pause') {
    currentY24State.playing = false;
    setupOffscreenDocument(OFFSCREEN_PATH).then(() => {
      chrome.runtime.sendMessage({ target: 'offscreen', action: 'pause' });
    });
    sendResponse(true);
    return false;
  }

  if (message.action === 'y24_resume') {
    currentY24State.playing = true;
    setupOffscreenDocument(OFFSCREEN_PATH).then(() => {
      chrome.runtime.sendMessage({ target: 'offscreen', action: 'play', url: currentY24State.src });
    });
    sendResponse(true);
    return false;
  }

  if (message.action === 'y24_seek') {
    if (message.time !== undefined) {
      currentY24State.currentTime = message.time;
      setupOffscreenDocument(OFFSCREEN_PATH).then(() => {
        chrome.runtime.sendMessage({ target: 'offscreen', action: 'seek', time: message.time });
      });
    }
    sendResponse(true);
    return false;
  }
});
