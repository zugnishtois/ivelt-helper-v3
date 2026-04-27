import { saveSettings, loadSettings, ButtonsBarPosition } from '../stateManager';

export function setupExtraButtons(
  enableMention: boolean,
  enableQuote: boolean,
  movableBar: boolean,
  savedPosition: ButtonsBarPosition | null,
) {
  if (!window.location.pathname.includes('viewtopic.php')) return;

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

    if (!postButtons.querySelector('.ivelt-pro-mention-btn')) {
      const mentionBtnLi = document.createElement('li');
      mentionBtnLi.innerHTML = `
        <a class="button button-icon-only custom-btn ivelt-pro-mention-btn" title="דערמאן א ניק (Mention)">
          <i class="icon fa-at fa-fw" aria-hidden="true" style="width: auto; min-width: 18px;"></i>
          <span>דערמאן א ניק</span>
        </a>
      `;
      mentionBtnLi.querySelector('a')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const bbcode = `[quote="${username}" user_id=${userId} time=${postTime} post_id=${postId}]\n[/quote]`;
        const settings = await loadSettings();
        if (settings.alwaysCopyTopic) {
          navigator.clipboard.writeText(bbcode).then(() => showNotification('קאפירט'));
        } else {
          insertTextIntoQuickReply(bbcode);
        }
      });

      const quoteBtnLi = document.createElement('li');
      quoteBtnLi.innerHTML = `
        <a class="button button-icon-only custom-btn ivelt-pro-quote-btn" title="קאפי לינק (Copy Link)">
          <i class="icon fa-copy fa-fw" aria-hidden="true" style="width: auto; min-width: 18px;"></i>
          <span>קאפי לינק</span>
        </a>
      `;
      quoteBtnLi.querySelector('a')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const postUrl = `${window.location.origin}/forum/viewtopic.php?p=${postId}#p${postId}`;
        try {
          await navigator.clipboard.writeText(postUrl);
          const icon = quoteBtnLi.querySelector('i');
          if (icon) {
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            setTimeout(() => {
              icon.classList.remove('fa-check');
              icon.classList.add('fa-copy');
            }, 2000);
          }
        } catch (err) {
          console.error('Failed to copy: ', err);
        }
      });

      const existingQuoteBtn = postButtons.querySelector('i.icon.fa-quote-left')?.closest('li');
      if (enableMention) {
        if (existingQuoteBtn) existingQuoteBtn.after(mentionBtnLi);
        else postButtons.appendChild(mentionBtnLi);
      }
      if (enableQuote) {
        if (existingQuoteBtn) {
          const target = enableMention ? mentionBtnLi : existingQuoteBtn;
          target.after(quoteBtnLi);
        } else postButtons.appendChild(quoteBtnLi);
      }
    }

    if (movableBar) {
      enableFreeDrag(postButtons, postBody, savedPosition);
    }
  });
}

/* ---------- Free-drag movable button bar ---------- */

function enableFreeDrag(
  bar: HTMLElement,
  postBody: HTMLElement,
  savedPos: ButtonsBarPosition | null,
) {
  if (bar.dataset.iveltMovable === '1') return;
  bar.dataset.iveltMovable = '1';
  bar.classList.add('ivelt-pro-movable');

  // Make sure parent is a positioning context
  const cs = window.getComputedStyle(postBody);
  if (cs.position === 'static') postBody.style.position = 'relative';

  // Apply saved position
  if (savedPos) {
    bar.style.left = `${savedPos.xPct}%`;
    bar.style.top  = `${savedPos.yPct}%`;
    bar.style.right = 'auto';
    bar.style.bottom = 'auto';
  }

  // Inject a drag handle (so users don't accidentally drag while clicking buttons)
  if (!bar.querySelector('.ivelt-pro-drag-handle')) {
    const handle = document.createElement('span');
    handle.className = 'ivelt-pro-drag-handle';
    handle.title = 'באוועג די קנעפלעך';
    handle.textContent = '⠿';
    bar.appendChild(handle);

    let dragging = false;
    let startX = 0, startY = 0;
    let origLeft = 0, origTop = 0;

    handle.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      dragging = true;
      bar.classList.add('ivelt-pro-dragging');

      const rect = bar.getBoundingClientRect();
      const parentRect = postBody.getBoundingClientRect();
      origLeft = rect.left - parentRect.left;
      origTop  = rect.top  - parentRect.top;
      startX = e.clientX;
      startY = e.clientY;

      const onMove = (mv: MouseEvent) => {
        if (!dragging) return;
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;
        const newLeft = origLeft + dx;
        const newTop  = origTop  + dy;
        bar.style.left = `${(newLeft / parentRect.width) * 100}%`;
        bar.style.top  = `${(newTop  / parentRect.height) * 100}%`;
        bar.style.right = 'auto';
        bar.style.bottom = 'auto';
      };

      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        bar.classList.remove('ivelt-pro-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);

        // Persist final position globally for ALL posts
        const parentRect2 = postBody.getBoundingClientRect();
        const rect2 = bar.getBoundingClientRect();
        const xPct = ((rect2.left - parentRect2.left) / parentRect2.width) * 100;
        const yPct = ((rect2.top  - parentRect2.top)  / parentRect2.height) * 100;
        saveSettings({ buttonsBarPosition: { xPct, yPct } });

        // Apply to all other movable bars
        document.querySelectorAll<HTMLElement>('.post-buttons.ivelt-pro-movable').forEach(other => {
          if (other === bar) return;
          other.style.left = `${xPct}%`;
          other.style.top  = `${yPct}%`;
          other.style.right = 'auto';
          other.style.bottom = 'auto';
        });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }
}

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
    }).catch(err => {
      console.warn('iVelt Pro: Could not copy mention text', err);
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
  setTimeout(() => {
    if (notify) notify.style.opacity = '0';
  }, 1800);
}
