/**
 * iVelt Pro — Quote-Selection Popup
 *
 * When the user selects text inside a post body, a small floating
 * "ציטיר" button appears above the selection. Clicking it inserts a
 * proper [quote=...] block with that selection into #message.
 */

let popup: HTMLDivElement | null = null;

export function setupCitePopup() {
  document.addEventListener('mouseup', handleSelection);
  // Click anywhere else closes the popup
  document.addEventListener('mousedown', (e) => {
    if (popup && !popup.contains(e.target as Node)) hidePopup();
  });
}

/** Walk up from a node to find an Element matching the selector. */
function ancestor(node: Node | null, selector: string): HTMLElement | null {
  let n: Node | null = node;
  while (n && n !== document.body) {
    if (n.nodeType === 1 && (n as Element).matches?.(selector)) return n as HTMLElement;
    n = n.parentNode;
  }
  return null;
}

function handleSelection(e: MouseEvent) {
  // Ignore mouseups on the popup itself.
  if (popup && popup.contains(e.target as Node)) return;
  // Defer so the browser has finalized the selection — important for
  // double/triple-click which finalize after multiple mouseups.
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

    // Walk up from the selection's anchor (not commonAncestor — for triple-click
    // that's the .content itself, which broke our previous .closest() check).
    const post = ancestor(sel.anchorNode, '.post.has-profile');
    if (!post) {
      hidePopup();
      return;
    }
    const inContent = ancestor(sel.anchorNode, '.postbody .content');
    if (!inContent) {
      hidePopup();
      return;
    }

    showPopupForRange(sel.getRangeAt(0), text, post);
  }, 10);
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
