import { loadSettings } from '../js/stateManager';

document.addEventListener('DOMContentLoaded', async () => {
  // Load settings for custom links
  const settings = await loadSettings();

  // Main CTA — Active Topics
  document.getElementById('openDefault')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.ivelt.com/forum/search.php?search_id=active_topics' });
    window.close();
  });

  // Home page
  document.getElementById('openHome')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.ivelt.com/forum/' });
    window.close();
  });

  // Sign In
  document.getElementById('quickSignIn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.ivelt.com/forum/ucp.php?mode=login', active: true });
    window.close();
  });

  // Emergency Sign Out
  document.getElementById('emergencySignOut')?.addEventListener('click', () => {
    chrome.cookies.get({ url: 'https://www.ivelt.com', name: 'phpbb3_sw7kk_sid' }, (cookie) => {
      const sid = cookie?.value || '';
      chrome.tabs.create({ url: `https://www.ivelt.com/forum/ucp.php?mode=logout&sid=${sid}`, active: false });
      window.close();
    });
  });

  // Settings
  document.getElementById('openSettings')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Help
  document.getElementById('openHelp')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/help/help.html') });
    window.close();
  });

  // === Render custom links from settings ===
  const customLinksArea = document.getElementById('customLinksArea');
  if (customLinksArea && settings.customLinks && settings.customLinks.length > 0) {
    settings.customLinks.forEach(link => {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.innerHTML = `
        <span class="icon custom">🔗</span>
        <span>${escapeHtml(link.name)}</span>
      `;
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: link.url });
        window.close();
      });
      customLinksArea.appendChild(btn);
    });
  }

  // Check login state
  chrome.cookies.get({ url: 'https://www.ivelt.com', name: 'phpbb3_sw7kk_u' }, (cookie) => {
    const userId = cookie?.value || '';
    const signInBtn = document.getElementById('quickSignIn');
    const signOutBtn = document.getElementById('emergencySignOut');
    
    if (userId && userId.length > 1 && userId !== '1') {
      if (signOutBtn) signOutBtn.style.display = 'flex';
    } else {
      if (signInBtn) signInBtn.style.display = 'flex';
    }
  });

  // === Yiddish24 Player Logic ===
  if (settings.yiddish24Player) {
    initYiddish24Player();
  }
});

let y24PollingInterval: number;

function initYiddish24Player() {
  const playerDiv = document.getElementById('y24-player');
  const titleEl = document.getElementById('y24-title');
  const playPauseBtn = document.getElementById('y24-playpause');
  const timeEl = document.getElementById('y24-time');
  const progressBg = document.getElementById('y24-progress-bg');
  const progressBar = document.getElementById('y24-progress');

  if (!playerDiv || !titleEl || !playPauseBtn || !timeEl || !progressBg || !progressBar) return;

  let isPlaying = false;
  let duration = 0;

  // Poll status from background
  const pollStatus = () => {
    chrome.runtime.sendMessage({ action: 'y24_status' }, (res) => {
      if (chrome.runtime.lastError || !res) return;

      if (res.active) {
        playerDiv.classList.add('active');
        titleEl.textContent = res.title || 'שפילט...';
        isPlaying = res.playing;
        playPauseBtn.textContent = isPlaying ? '⏸' : '▶';

        duration = res.duration || 0;
        const current = res.currentTime || 0;
        
        let pct = (current / duration) * 100;
        if (isNaN(pct)) pct = 0;
        progressBar.style.width = `${pct}%`;

        const formatTime = (secs: number) => {
          if (isNaN(secs)) return '0:00';
          const m = Math.floor(secs / 60);
          const s = Math.floor(secs % 60);
          return `${m}:${s < 10 ? '0' : ''}${s}`;
        };
        timeEl.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
      } else {
        playerDiv.classList.remove('active');
      }
    });
  };

  // Initial poll
  pollStatus();

  // Poll every 500ms
  y24PollingInterval = window.setInterval(pollStatus, 500);

  window.addEventListener('unload', () => {
    if (y24PollingInterval) clearInterval(y24PollingInterval);
  });

  // Toggle play/pause
  playPauseBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: isPlaying ? 'y24_pause' : 'y24_resume' }, () => {
      pollStatus(); // immediate UI update
    });
  });

  // Scrub progress
  progressBg.addEventListener('click', (e) => {
    if (duration <= 0) return;
    const rect = progressBg.getBoundingClientRect();
    // RTL calculation: if document is right-to-left, the click X mapped backwards
    const isRtl = document.documentElement.dir === 'rtl';
    const clickX = e.clientX - rect.left;
    let pct = clickX / rect.width;
    
    if (isRtl) {
      pct = 1 - pct;
    }
    
    const targetTime = pct * duration;
    chrome.runtime.sendMessage({ action: 'y24_seek', time: targetTime }, () => {
      pollStatus();
    });
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
