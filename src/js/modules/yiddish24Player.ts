/**
 * Yiddish24 Inline Audio Player Module
 * Detects yiddish24.com links in forum posts and replaces them with
 * a small inline audio player widget.
 */

const Y24_LINK_REGEX = /https?:\/\/(?:www\.)?yiddish24\.com\/[^/]+\/\d+\/\d+/;

export function setupYiddish24Player() {
  console.log('iVelt Pro: Yiddish24 Player enabled');
  
  // Find all links in post content
  const contentDivs = document.querySelectorAll('.postbody .content, .post .content');
  
  contentDivs.forEach((content) => {
    const links = content.querySelectorAll('a[href*="yiddish24.com"]');
    links.forEach((link) => {
      const href = (link as HTMLAnchorElement).href;
      if (Y24_LINK_REGEX.test(href)) {
        createInlinePlayer(link as HTMLAnchorElement);
      }
    });
  });
}

function createInlinePlayer(linkEl: HTMLAnchorElement) {
  const url = linkEl.href;
  const titleText = escapeHtml(linkEl.textContent || 'Yiddish24 Audio');
  
  // Create the player container
  const player = document.createElement('div');
  player.className = 'ivelt-y24-player';
  player.innerHTML = `
    <div class="ivelt-y24-header">
      <span class="ivelt-y24-icon">🎧</span>
      <a href="${escapeAttr(url)}" target="_blank" class="ivelt-y24-title" style="flex:1;">${titleText}</a>
      <button class="ivelt-y24-play-bg" style="background:#5c9df5;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:0.8rem;white-space:nowrap;">
        שפיל אין בעקגראונד ▶
      </button>
    </div>
  `;
  
  // Insert after the link
  linkEl.parentNode?.insertBefore(player, linkEl.nextSibling);
  // Hide original link
  linkEl.style.display = 'none';
  
  // Add click listener to the play button
  const bgPlayBtn = player.querySelector('.ivelt-y24-play-bg') as HTMLButtonElement;
  bgPlayBtn.addEventListener('click', () => {
    bgPlayBtn.textContent = 'לאדירט...';
    bgPlayBtn.disabled = true;

    chrome.runtime.sendMessage(
      { action: 'playYiddish24', url: url, title: titleText },
      (success) => {
        if (success) {
          bgPlayBtn.textContent = 'שפילט 🎵 (עפן פאפאפ)';
          bgPlayBtn.style.background = '#10b981'; // green
        } else {
          bgPlayBtn.textContent = 'נישט געקענט לאדן';
          bgPlayBtn.style.background = '#ef4444'; // red
        }
        
        // Reset button after a few seconds so user can click again if needed
        setTimeout(() => {
          bgPlayBtn.disabled = false;
          bgPlayBtn.textContent = 'שפיל אין בעקגראונד ▶';
          bgPlayBtn.style.background = '#5c9df5';
        }, 3000);
      }
    );
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
