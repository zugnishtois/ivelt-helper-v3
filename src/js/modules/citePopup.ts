/**
 * iVelt Pro — Quote-Selection Popup
 *
 * When the user selects text inside a post body, a small floating
 * "ציטיר" button appears above the selection. Clicking it inserts a
 * proper [quote=...] block with that selection into #message.
 */

let popup: HTMLDivElement | null = null;

export function setupCitePopup() {
  document.addEventListener('mouseup', handleSelection, true);
  document.addEventListener('selectionchange', () => {
    // Hide if selection is collapsed
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) hidePopup();
  });
  // Click anywhere else closes the popup
  document.addEventListener('mousedown', (e) => {
    if (popup && e.target !== popup) hidePopup();
  }, true);
}

function handleSelection(e: MouseEvent) {
  // Ignore if click was on our own popup
  if (popup && (e.target === popup || (e.target as Element)?.closest?.('#ivelt-pro-cite-popup'))) {
    return;
  }
  // Defer slightly so window.getSelection reflects the latest state
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      hidePopup();
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 1) {
      hidePopup();
      return;
    }

    // Selection must be inside a .postbody / .content
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer.parentElement;
    const post = container?.closest?.('.post.has-profile') as HTMLElement | null;
    if (!post) {
      hidePopup();
      return;
    }
    const inContent = container?.closest?.('.postbody .content');
    if (!inContent) {
      hidePopup();
      return;
    }

    showPopupForRange(range, text, post);
  }, 0);
}

function showPopupForRange(range: Range, text: string, post: HTMLElement) {
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'ivelt-pro-cite-popup';
    popup.textContent = 'ציטיר';
    document.body.appendChild(popup);
  }

  // Position above midpoint of the selection
  const rect = range.getBoundingClientRect();
  const top = rect.top + window.scrollY - 8;
  const left = rect.left + window.scrollX + rect.width / 2;
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  popup.style.display = 'block';

  // Refresh click handler with current selection context
  popup.onclick = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    insertQuote(text, post);
    hidePopup();
    window.getSelection()?.removeAllRanges();
  };
}

function hidePopup() {
  if (popup) popup.style.display = 'none';
}

function insertQuote(text: string, post: HTMLElement) {
  // Pull metadata from the post so the quote tag mirrors the regular [Quote] button
  const postIdMatch = post.id.match(/^p(\d+)$/);
  const postId = postIdMatch ? postIdMatch[1] : '';

  const usernameEl = post.querySelector('.postprofile .username-coloured, .postprofile .username') as HTMLAnchorElement | null;
  const username = usernameEl?.textContent?.trim() || '';

  const userHref = usernameEl?.getAttribute('href') || '';
  const userIdMatch = userHref.match(/[?&]u=(\d+)/);
  const userId = userIdMatch ? userIdMatch[1] : '';

  const timeEl = post.querySelector('time') as HTMLTimeElement | null;
  const postTime = timeEl ? Math.floor(Date.parse(timeEl.dateTime) / 1000).toString() : '';

  const bbcode = `[quote="${username}" user_id=${userId} time=${postTime} post_id=${postId}]\n${text}\n[/quote]\n`;

  const messageBox = (document.getElementById('message') ||
                      document.querySelector('#message-box textarea')) as HTMLTextAreaElement | null;

  if (messageBox) {
    const start = messageBox.selectionStart ?? messageBox.value.length;
    const end = messageBox.selectionEnd ?? messageBox.value.length;
    messageBox.value = messageBox.value.substring(0, start) + bbcode + messageBox.value.substring(end);
    messageBox.focus();
    const cursor = start + bbcode.length;
    messageBox.selectionStart = messageBox.selectionEnd = cursor;
    messageBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    navigator.clipboard.writeText(bbcode).catch(() => {});
  }
}
