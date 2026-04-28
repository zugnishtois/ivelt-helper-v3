import { saveSettings, loadSettings, ButtonsBarPosition } from '../stateManager';

export interface ExtraButtonsConfig {
  enableMention: boolean;
  enableCopyLink: boolean;
  enableCiteOtherTopic: boolean;
  enableCiteLast: boolean;
  movableBar: boolean;
  savedPosition: ButtonsBarPosition | null;
}

export function setupExtraButtons(cfg: ExtraButtonsConfig) {
  if (!window.location.pathname.includes('viewtopic.php')) return;

  // ציטיר לעצטע: when URL has last=true, strip nested quotes from the message box.
  if (window.location.href.includes('last=true')) {
    const ta = document.querySelector('#message') as HTMLTextAreaElement | null;
    if (ta && hasNestedQuotes(ta.value)) {
      ta.value = removeNestedQuotes(ta.value);
    }
  }

  const posts = document.querySelectorAll('.post.has-profile');

  posts.forEach(post => {
    const postBody = post.querySelector('.postbody') as HTMLElement | null;
    const postButtons = postBody?.querySelector('.post-buttons') as HTMLElement | null;
    const postProfile = post.querySelector('.postprofile');
    const usernameEl = postProfile?.querySelector('.username-coloured, .username') as HTMLAnchorElement;

    const postIdMatch = post.id.match(/^p(\d+)$/);
    if (!postIdMatch || !postButtons || !postBody) return;

    const postId = postIdMatch[1];
    const username = usernameEl?.textContent?.trim() || '';
    const userHref = usernameEl?.getAttribute('href') || '';
    const userIdMatch = userHref.match(/[?&]u=(\d+)/);
    const userId = userIdMatch ? userIdMatch[1] : '';
    const timeEl = post.querySelector('time') as HTMLTimeElement;
    const postTime = timeEl ? Math.floor(Date.parse(timeEl.dateTime) / 1000).toString() : '';

    if (!postButtons.querySelector('.ivelt-pro-mention-btn') &&
        !postButtons.querySelector('.ivelt-pro-quote-btn') &&
        !postButtons.querySelector('.ivelt-pro-cite-other-btn') &&
        !postButtons.querySelector('.ivelt-pro-cite-last-btn')) {

      const existingQuoteBtn = postButtons.querySelector('i.icon.fa-quote-left')?.closest('li');
      const existingQuoteHref = existingQuoteBtn?.querySelector('a')?.getAttribute('href') || '';
      let lastInserted: Element | null = existingQuoteBtn || null;

      const insertAfter = (el: HTMLLIElement) => {
        if (lastInserted && lastInserted.parentNode) {
          lastInserted.after(el);
        } else {
          postButtons.appendChild(el);
        }
        lastInserted = el;
      };

      // === @ Mention ===
      if (cfg.enableMention) {
        const li = document.createElement('li');
        li.innerHTML = `
          <a class="button button-icon-only custom-btn ivelt-pro-mention-btn" title="דערמאן א ניק (Mention)">
            <i class="icon fa-at fa-fw" aria-hidden="true" style="width:auto;min-width:18px;"></i>
            <span>דערמאן א ניק</span>
          </a>`;
        li.querySelector('a')?.addEventListener('click', async (e) => {
          e.preventDefault();
          const bbcode = `[quote="${username}" user_id=${userId} time=${postTime} post_id=${postId}]\n[/quote]`;
          const settings = await loadSettings();
          if (settings.alwaysCopyTopic) {
            navigator.clipboard.writeText(bbcode).then(() => showNotification('קאפירט'));
          } else {
            insertTextIntoQuickReply(bbcode);
          }
        });
        insertAfter(li);
      }

      // === Copy Link ===
      if (cfg.enableCopyLink) {
        const li = document.createElement('li');
        li.innerHTML = `
          <a class="button button-icon-only custom-btn ivelt-pro-quote-btn" title="קאפי לינק (Copy Link)">
            <i class="icon fa-link fa-fw" aria-hidden="true" style="width:auto;min-width:18px;"></i>
            <span>קאפי לינק</span>
          </a>`;
        li.querySelector('a')?.addEventListener('click', async (e) => {
          e.preventDefault();
          const url = `${window.location.origin}/forum/viewtopic.php?p=${postId}#p${postId}`;
          try {
            await navigator.clipboard.writeText(url);
            const icon = li.querySelector('i');
            if (icon) {
              icon.classList.remove('fa-link');
              icon.classList.add('fa-check');
              setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-link');
              }, 2000);
            }
          } catch (err) {
            console.error('iVelt Pro: copy link failed', err);
          }
        });
        insertAfter(li);
      }

      // === ציטיר אין אנדערע אשכול === (full BBCode quote + url)
      if (cfg.enableCiteOtherTopic) {
        const li = document.createElement('li');
        li.innerHTML = `
          <a class="button button-icon-only custom-btn ivelt-pro-cite-other-btn" title="ציטיר אין אנדערע אשכול">
            <i class="icon fa-copy fa-fw" aria-hidden="true" style="width:auto;min-width:18px;"></i>
            <span>ציטיר אין אנדערע אשכול</span>
          </a>`;
        li.querySelector('a')?.addEventListener('click', async (e) => {
          e.preventDefault();
          const settings = await loadSettings();
          const content = postBody.querySelector('.content') as HTMLElement | null;
          if (!content) return;
          const bbcode = htmlToBBCode(content, settings.copyAttachments);
          const postUrl = `${window.location.origin}/forum/viewtopic.php?p=${postId}#p${postId}`;
          const out = `[quote="${username}"]${bbcode}[/quote] [url=${postUrl}]מקור[/url]`;
          try {
            await navigator.clipboard.writeText(out);
            showNotification('ציטאט קאפירט');
          } catch (err) { console.error(err); }
        });
        insertAfter(li);
      }

      // === ציטיר לעצטע === (last quote only)
      if (cfg.enableCiteLast && existingQuoteHref) {
        const content = postBody.querySelector('.content');
        const hasInnerQuote = content?.innerHTML.includes('blockquote');
        if (hasInnerQuote) {
          const li = document.createElement('li');
          const sep = existingQuoteHref.includes('?') ? '&' : '?';
          const href = `${existingQuoteHref}${sep}last=true`;
          li.innerHTML = `
            <a class="button button-icon-only custom-btn ivelt-pro-cite-last-btn" href="${href}" title="ציטיר בלויז די לעצטע תגובה (Last quote only)">
              <i class="icon fa-quote-left fa-fw" aria-hidden="true" style="width:auto;min-width:18px;">_</i>
              <span>ציטיר לעצטע</span>
            </a>`;
          insertAfter(li);
        }
      }
    }

    if (cfg.movableBar) {
      enableFreeDrag(postButtons, postBody, cfg.savedPosition);
    }
  });
}

/* ---------- Anchor-snap movable button bar ---------- */
/*
   Snaps to one of 6 anchors inside its own postbody:
     tl (top-left), tc (top-center), tr (top-right)
     bl (bottom-left), bc (bottom-center), br (bottom-right)
   Drag handle (⠿) is hover-only — appears when the user hovers the bar.
*/

import type { ButtonsBarAnchor } from '../stateManager';

const ALL_ANCHORS: ButtonsBarAnchor[] = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];

function applyAnchor(bar: HTMLElement, anchor: ButtonsBarAnchor) {
  // Reset all four edge properties first.
  bar.style.left = '';
  bar.style.right = '';
  bar.style.top = '';
  bar.style.bottom = '';
  bar.style.transform = '';

  switch (anchor) {
    case 'tl': bar.style.top = '0';  bar.style.left  = '0'; break;
    case 'tc': bar.style.top = '0';  bar.style.left  = '50%'; bar.style.transform = 'translateX(-50%)'; break;
    case 'tr': bar.style.top = '0';  bar.style.right = '0'; break;
    case 'bl': bar.style.bottom = '0'; bar.style.left  = '0'; break;
    case 'bc': bar.style.bottom = '0'; bar.style.left  = '50%'; bar.style.transform = 'translateX(-50%)'; break;
    case 'br': bar.style.bottom = '0'; bar.style.right = '0'; break;
  }
}

function nearestAnchor(xPct: number, yPct: number): ButtonsBarAnchor {
  // Anchors as (x%, y%) reference points
  const points: Record<ButtonsBarAnchor, [number, number]> = {
    tl: [0, 0],   tc: [50, 0],   tr: [100, 0],
    bl: [0, 100], bc: [50, 100], br: [100, 100],
  };
  let best: ButtonsBarAnchor = 'tl';
  let bestDist = Infinity;
  for (const a of ALL_ANCHORS) {
    const [px, py] = points[a];
    const d = (px - xPct) ** 2 + (py - yPct) ** 2;
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best;
}

function enableFreeDrag(
  bar: HTMLElement,
  postBody: HTMLElement,
  savedPos: ButtonsBarPosition | null,
) {
  if (bar.dataset.iveltMovable === '1') return;
  bar.dataset.iveltMovable = '1';
  bar.classList.add('ivelt-pro-movable');

  if (window.getComputedStyle(postBody).position === 'static') {
    postBody.style.position = 'relative';
  }

  const initialAnchor: ButtonsBarAnchor = (savedPos as ButtonsBarAnchor) || 'tl';
  applyAnchor(bar, initialAnchor);

  if (!bar.querySelector('.ivelt-pro-drag-handle')) {
    const handle = document.createElement('span');
    handle.className = 'ivelt-pro-drag-handle';
    handle.title = 'באוועג די קנעפלעך';
    handle.textContent = '⠿';
    bar.appendChild(handle);

    let dragging = false;
    let ghostLeft = 0, ghostTop = 0; // px relative to postBody
    let startX = 0, startY = 0;

    handle.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      bar.classList.add('ivelt-pro-dragging');

      const rect = bar.getBoundingClientRect();
      const parentRect = postBody.getBoundingClientRect();
      ghostLeft = rect.left - parentRect.left;
      ghostTop  = rect.top  - parentRect.top;
      startX = e.clientX;
      startY = e.clientY;

      // While dragging, switch to free-position so the ghost can move
      bar.style.left = `${ghostLeft}px`;
      bar.style.top  = `${ghostTop}px`;
      bar.style.right = 'auto';
      bar.style.bottom = 'auto';
      bar.style.transform = '';

      const onMove = (mv: MouseEvent) => {
        if (!dragging) return;
        const parentR = postBody.getBoundingClientRect();
        const barR = bar.getBoundingClientRect();
        const maxLeft = parentR.width  - barR.width;
        const maxTop  = parentR.height - barR.height;
        const newLeft = clamp(ghostLeft + (mv.clientX - startX), 0, Math.max(0, maxLeft));
        const newTop  = clamp(ghostTop  + (mv.clientY - startY), 0, Math.max(0, maxTop));
        bar.style.left = `${newLeft}px`;
        bar.style.top  = `${newTop}px`;
      };

      const onUp = async () => {
        if (!dragging) return;
        dragging = false;
        bar.classList.remove('ivelt-pro-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);

        const parentR = postBody.getBoundingClientRect();
        const barR = bar.getBoundingClientRect();
        // Center of bar as % of postbody
        const cx = ((barR.left - parentR.left) + barR.width  / 2) / parentR.width  * 100;
        const cy = ((barR.top  - parentR.top)  + barR.height / 2) / parentR.height * 100;
        const anchor = nearestAnchor(cx, cy);

        applyAnchor(bar, anchor);
        await saveSettings({ buttonsBarPosition: anchor });

        // Propagate to every other movable bar on the page.
        document.querySelectorAll<HTMLElement>('.post-buttons.ivelt-pro-movable').forEach(other => {
          if (other === bar) return;
          const otherParent = other.parentElement as HTMLElement | null;
          if (otherParent && window.getComputedStyle(otherParent).position === 'static') {
            otherParent.style.position = 'relative';
          }
          applyAnchor(other, anchor);
        });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ---------- Helpers ---------- */

function insertTextIntoQuickReply(text: string) {
  const messageBox = (document.getElementById('message') ||
                      document.querySelector('#message-box textarea')) as HTMLTextAreaElement;
  if (messageBox) {
    const startPos = messageBox.selectionStart;
    const endPos = messageBox.selectionEnd;
    messageBox.value = messageBox.value.substring(0, startPos) + text + messageBox.value.substring(endPos);
    messageBox.focus();
    messageBox.selectionStart = startPos + text.length;
    messageBox.selectionEnd = startPos + text.length;
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('קאפירט צום קליפבאורד');
    });
  }
}

function showNotification(message: string) {
  let notify = document.getElementById('ivelt-pro-notify');
  if (!notify) {
    notify = document.createElement('div');
    notify.id = 'ivelt-pro-notify';
    document.body.appendChild(notify);
  }
  notify.textContent = message;
  notify.style.opacity = '1';
  notify.style.display = 'block';
  setTimeout(() => { if (notify) notify.style.opacity = '0'; }, 1800);
}

/* ---------- Strip nested quotes (for ציטיר לעצטע) ---------- */

export function hasNestedQuotes(text: string): boolean {
  // Detect [quote ...] inside an outer [quote ...] block
  const m = text.match(/\[quote[^\]]*\]/i);
  if (!m) return false;
  const after = text.indexOf(m[0]) + m[0].length;
  return /\[quote[^\]]*\]/i.test(text.substring(after));
}

export function removeNestedQuotes(text: string): string {
  // Keep only the OUTER quote's last child quote-content. Simple approach:
  // strip everything between an outer [quote ...] and the LAST inner [quote ...]
  // Mirrors old extension's behavior loosely — keep last quote only.
  const lastInner = text.lastIndexOf('[quote');
  const firstClose = text.indexOf(']', lastInner);
  if (lastInner > 0 && firstClose > 0) {
    // Find the matching outer [/quote] for the outermost block
    return text.substring(lastInner);
  }
  return text;
}

/* ---------- Minimal HTML → BBCode (for ציטיר אין אנדערע אשכול) ---------- */

function htmlToBBCode(root: HTMLElement, copyAttachments: boolean): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join('');

    switch (tag) {
      case 'br': return '\n';
      case 'b': case 'strong': return `[b]${inner}[/b]`;
      case 'i': case 'em':     return `[i]${inner}[/i]`;
      case 'u':                return `[u]${inner}[/u]`;
      case 's': case 'strike': return `[s]${inner}[/s]`;
      case 'blockquote': {
        const cite = el.querySelector('cite')?.textContent?.replace(/:\s*$/, '').trim() || '';
        const inner2 = Array.from(el.childNodes)
          .filter(n => !(n instanceof HTMLElement && n.tagName.toLowerCase() === 'cite'))
          .map(walk).join('').trim();
        return cite ? `[quote="${cite}"]${inner2}[/quote]` : `[quote]${inner2}[/quote]`;
      }
      case 'a': {
        const href = el.getAttribute('href') || '';
        if (!href) return inner;
        if (href === inner) return `[url]${href}[/url]`;
        return `[url=${href}]${inner}[/url]`;
      }
      case 'img': {
        if (!copyAttachments) return el.getAttribute('alt') || '';
        const src = el.getAttribute('src') || '';
        return src ? `[img]${src.replace('./download', 'www.ivelt.com/forum/download')}[/img]` : '';
      }
      case 'span': {
        const style = el.getAttribute('style') || '';
        const colorMatch = style.match(/color:\s*([^;]+)/i);
        if (colorMatch) return `[color=${colorMatch[1].trim()}]${inner}[/color]`;
        return inner;
      }
      case 'p': case 'div': return `${inner}\n`;
      default: return inner;
    }
  };
  return walk(root).trim();
}
