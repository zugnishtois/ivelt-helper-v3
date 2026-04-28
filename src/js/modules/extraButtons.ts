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
    const postWrap = post.querySelector('.postbody') as HTMLElement | null;
    const postButtons = postWrap?.querySelector('.post-buttons') as HTMLElement | null;
    const postProfile = post.querySelector('.postprofile');
    const usernameEl = postProfile?.querySelector('.username-coloured, .username') as HTMLAnchorElement;

    const postIdMatch = post.id.match(/^p(\d+)$/);
    if (!postIdMatch || !postButtons || !postWrap) return;

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
          const content = postWrap.querySelector('.content') as HTMLElement | null;
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
        const content = postWrap.querySelector('.content');
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
      // Anchor relative to the WHOLE .post so bottom-anchors sit at the
      // visual bottom of the post (which on phpBB is taller than the postbody
      // alone when there's a tall profile column on the side, and is the
      // expected drop-zone when posts contain embedded media).
      enableFreeDrag(postButtons, post as HTMLElement, cfg.savedPosition);
    }
  });
}

/* ---------- Anchor-snap movable button bar ---------- */
/*
   Snaps to one of FIVE anchors inside its own postbody (tl is disabled):
     tc (top-center), tr (top-right)
     bl (bottom-left), bc (bottom-center), br (bottom-right)
   Drag handle (⠿) is hover-only — appears when the user hovers the bar.
   While dragging we render small "snap zone" bubbles to show valid drop targets.
*/

import type { ButtonsBarAnchor } from '../stateManager';

// User config: top-right disabled. Allowed = top-left, top-center,
// bottom-left, bottom-center, bottom-right.
const ALLOWED_ANCHORS: ButtonsBarAnchor[] = ['tl', 'tc', 'bl', 'bc', 'br'];

function anchorPx(postWrap: HTMLElement, bar: HTMLElement, anchor: ButtonsBarAnchor) {
  // clientWidth/Height give the padding-box dims — that's exactly the area
  // an absolutely-positioned child is positioned against. getBoundingClientRect
  // returns the border-box, which is wider/taller than the positioning area
  // when the parent has any border, and that mismatch is what was offsetting
  // the ghost rectangles vs. where the bar actually lands.
  const W = postWrap.clientWidth;
  const H = postWrap.clientHeight;
  const barRect = bar.getBoundingClientRect();
  const bw = barRect.width  || 200;
  const bh = barRect.height || 32;

  let left = 0, top = 0;
  switch (anchor) {
    case 'tl': left = 0;            top = 0;            break;
    case 'tc': left = (W - bw) / 2; top = 0;            break;
    case 'tr': left = W - bw;       top = 0;            break;
    case 'bl': left = 0;            top = H - bh;       break;
    case 'bc': left = (W - bw) / 2; top = H - bh;       break;
    case 'br': left = W - bw;       top = H - bh;       break;
  }
  return { left: Math.max(0, left), top: Math.max(0, top) };
}

function applyAnchor(bar: HTMLElement, postWrap: HTMLElement, anchor: ButtonsBarAnchor) {
  // Use explicit px math instead of CSS edge properties — this works
  // reliably even when the postbody has weird flex/min-height rules.
  const { left, top } = anchorPx(postWrap, bar, anchor);
  bar.style.left = `${left}px`;
  bar.style.top = `${top}px`;
  bar.style.right = 'auto';
  bar.style.bottom = 'auto';
  bar.style.transform = '';
  bar.dataset.iveltAnchor = anchor;
}

// Pick nearest allowed anchor based on the bar's CENTER position (px relative to postbody).
function nearestAnchor(postWrap: HTMLElement, bar: HTMLElement, centerX: number, centerY: number): ButtonsBarAnchor {
  let best: ButtonsBarAnchor = ALLOWED_ANCHORS[0];
  let bestDist = Infinity;
  for (const a of ALLOWED_ANCHORS) {
    const { left, top } = anchorPx(postWrap, bar, a);
    const barRect = bar.getBoundingClientRect();
    const ax = left + barRect.width  / 2;
    const ay = top  + barRect.height / 2;
    const d = (ax - centerX) ** 2 + (ay - centerY) ** 2;
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best;
}

/* ---------- Snap-zone overlay (visible during drag) ---------- */

interface SnapOverlay {
  root: HTMLDivElement;
  markers: Map<ButtonsBarAnchor, HTMLDivElement>;
  destroy: () => void;
}

function buildSnapOverlay(postWrap: HTMLElement, bar: HTMLElement): SnapOverlay {
  const root = document.createElement('div');
  root.className = 'ivelt-pro-snap-overlay';
  postWrap.appendChild(root);

  // Capture the bar's size ONCE (it won't change while dragging) so each
  // marker renders as a ghost rectangle of the exact dimensions and position
  // the bar will occupy at that anchor.
  const barRect = bar.getBoundingClientRect();
  const W = barRect.width;
  const H = barRect.height;

  const markers = new Map<ButtonsBarAnchor, HTMLDivElement>();
  for (const a of ALLOWED_ANCHORS) {
    const m = document.createElement('div');
    m.className = `ivelt-pro-snap-zone snap-${a}`;
    const { left, top } = anchorPx(postWrap, bar, a);
    m.style.left = `${left}px`;
    m.style.top  = `${top}px`;
    m.style.width  = `${W}px`;
    m.style.height = `${H}px`;
    root.appendChild(m);
    markers.set(a, m);
  }

  return {
    root,
    markers,
    destroy() { root.remove(); }
  };
}

function enableFreeDrag(
  bar: HTMLElement,
  postWrap: HTMLElement,    // the .post.has-profile wrapper
  savedPos: ButtonsBarPosition | null,
) {
  if (bar.dataset.iveltMovable === '1') return;
  bar.dataset.iveltMovable = '1';
  bar.classList.add('ivelt-pro-movable');

  if (window.getComputedStyle(postWrap).position === 'static') {
    postWrap.style.position = 'relative';
  }

  // phpBB sets `.postbody { position: relative }` natively, which would
  // capture our absolutely-positioned bar (the bar would be relative to
  // postbody instead of the .post wrapper, and the ghost rectangles
  // wouldn't match). Force postbody to `static` so the .post becomes the
  // actual containing block.
  postWrap.classList.add('ivelt-pro-has-movable-bar');

  // top-right not allowed; fall back to top-center if it was saved.
  let initialAnchor: ButtonsBarAnchor = (savedPos as ButtonsBarAnchor) || 'tl';
  if (initialAnchor === 'tr') initialAnchor = 'tc';
  applyAnchor(bar, postWrap, initialAnchor);

  if (!bar.querySelector('.ivelt-pro-drag-handle')) {
    const handle = document.createElement('span');
    handle.className = 'ivelt-pro-drag-handle';
    handle.title = 'באוועג די קנעפלעך';
    handle.textContent = '⠿';
    bar.appendChild(handle);

    let dragging = false;
    let ghostLeft = 0, ghostTop = 0;
    let startX = 0, startY = 0;
    let overlay: SnapOverlay | null = null;
    let activeAnchor: ButtonsBarAnchor = initialAnchor;

    const updateActiveMarker = (centerX: number, centerY: number) => {
      if (!overlay) return;
      const a = nearestAnchor(postWrap, bar, centerX, centerY);
      if (a !== activeAnchor) {
        overlay.markers.get(activeAnchor)?.classList.remove('is-active');
        overlay.markers.get(a)?.classList.add('is-active');
        activeAnchor = a;
      }
    };

    handle.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      bar.classList.add('ivelt-pro-dragging');

      const rect = bar.getBoundingClientRect();
      const parentRect = postWrap.getBoundingClientRect();
      ghostLeft = rect.left - parentRect.left;
      ghostTop  = rect.top  - parentRect.top;
      startX = e.clientX;
      startY = e.clientY;

      bar.style.left = `${ghostLeft}px`;
      bar.style.top  = `${ghostTop}px`;
      bar.style.right = 'auto';
      bar.style.bottom = 'auto';
      bar.style.transform = '';

      // Show snap zones
      overlay = buildSnapOverlay(postWrap, bar);
      updateActiveMarker(ghostLeft + rect.width / 2, ghostTop + rect.height / 2);

      const onMove = (mv: MouseEvent) => {
        if (!dragging) return;
        const parentR = postWrap.getBoundingClientRect();
        const barR = bar.getBoundingClientRect();
        const maxLeft = parentR.width  - barR.width;
        const maxTop  = parentR.height - barR.height;
        const newLeft = clamp(ghostLeft + (mv.clientX - startX), 0, Math.max(0, maxLeft));
        const newTop  = clamp(ghostTop  + (mv.clientY - startY), 0, Math.max(0, maxTop));
        bar.style.left = `${newLeft}px`;
        bar.style.top  = `${newTop}px`;
        updateActiveMarker(newLeft + barR.width / 2, newTop + barR.height / 2);
      };

      const onUp = async () => {
        if (!dragging) return;
        dragging = false;
        bar.classList.remove('ivelt-pro-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);

        // Remove overlay
        overlay?.destroy();
        overlay = null;

        const anchor = activeAnchor;
        applyAnchor(bar, postWrap, anchor);
        await saveSettings({ buttonsBarPosition: anchor });

        // Propagate to every other movable bar on the page.
        document.querySelectorAll<HTMLElement>('.post-buttons.ivelt-pro-movable').forEach(other => {
          if (other === bar) return;
          const otherWrap = other.closest('.post.has-profile') as HTMLElement | null;
          if (!otherWrap) return;
          if (window.getComputedStyle(otherWrap).position === 'static') {
            otherWrap.style.position = 'relative';
          }
          applyAnchor(other, otherWrap, anchor);
        });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // Re-apply anchor on window resize so bottom anchors track the new post size.
  if (!bar.dataset.iveltResizeBound) {
    bar.dataset.iveltResizeBound = '1';
    window.addEventListener('resize', () => {
      const cur = (bar.dataset.iveltAnchor as ButtonsBarAnchor) || initialAnchor;
      applyAnchor(bar, postWrap, cur);
    });
    // Also re-apply when the post resizes (media expanding, etc).
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        const cur = (bar.dataset.iveltAnchor as ButtonsBarAnchor) || initialAnchor;
        applyAnchor(bar, postWrap, cur);
      });
      ro.observe(postWrap);
    }
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
