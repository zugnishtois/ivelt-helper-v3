/**
 * Topic Hider Module
 * Integrates the standalone ivelt-topic-hider extension functionality.
 * Allows users to hide topics they don't want to see in forum views.
 */

const STORAGE_KEY = 'ivelt_hidden_topics';

const ICON_HIDE = `<svg fill="currentColor" height="16" width="16" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
const ICON_UNHIDE = `<svg fill="currentColor" height="16" width="16" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.39 2.72-3.12 3.44-5.08-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;

export function setupTopicHider() {
  console.log('iVelt Pro: Topic Hider enabled');

  // Only run on forum list pages and search result pages
  const isForumPage = window.location.pathname.includes('viewforum.php');
  const isSearchPage = window.location.pathname.includes('search.php');
  if (!isForumPage && !isSearchPage) return;

  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const hiddenIds: string[] = (result[STORAGE_KEY] as string[]) || [];
    initTopicHider(hiddenIds);
  });
}

function initTopicHider(hiddenIds: string[]) {
  const topicLists = document.querySelectorAll('.topiclist.topics');
  if (topicLists.length === 0) return;

  const { hiddenListElement, statsBar, toggleBtn } = createHiddenVaultUI();

  topicLists.forEach((list, listIdx) => {
    const topics = list.querySelectorAll('li.row');

    topics.forEach((topicRow) => {
      const link = topicRow.querySelector('a.topictitle') as HTMLAnchorElement;
      if (!link) return;

      const urlObj = new URL(link.href, window.location.origin);
      const topicId = urlObj.searchParams.get('t');
      if (!topicId) return;

      // Store list index and specific child index for exact restoration
      (topicRow as HTMLElement).dataset.originalParentIdx = String(listIdx);
      (topicRow as HTMLElement).dataset.originalChildIdx = String(Array.from(list.children).indexOf(topicRow));

      const innerDiv = topicRow.querySelector('.list-inner');
      if (!innerDiv) return;

      const actionBtn = document.createElement('span');
      actionBtn.className = 'ivelt-hide-topic-btn';
      innerDiv.prepend(actionBtn);

      if (hiddenIds.includes(topicId)) {
        setButtonState(actionBtn, true);
        hiddenListElement.appendChild(topicRow);
      } else {
        setButtonState(actionBtn, false);
      }

      actionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTopic(topicId, topicRow as HTMLElement, actionBtn, hiddenListElement, statsBar, topicLists, toggleBtn);
      });
    });
  });

  updateVaultStats(hiddenListElement, statsBar, toggleBtn);
}

function toggleTopic(
  topicId: string,
  row: HTMLElement,
  btn: HTMLElement,
  hiddenList: HTMLElement,
  stats: HTMLElement,
  allLists: NodeListOf<Element>,
  toggleBtn: HTMLElement
) {
  chrome.storage.local.get([STORAGE_KEY], (res) => {
    let ids: string[] = (res[STORAGE_KEY] as string[]) || [];
    const isCurrentlyHidden = ids.includes(topicId);

    if (isCurrentlyHidden) {
      ids = ids.filter((id) => id !== topicId);
      const originalIdx = parseInt(row.dataset.originalParentIdx || '0', 10);
      const originalChildIdx = parseInt(row.dataset.originalChildIdx || '0', 10);
      const originalList = allLists[originalIdx] || allLists[0];
      
      // Attempt to restore to original position
      const referenceNode = originalList.children[originalChildIdx];
      if (referenceNode) {
        originalList.insertBefore(row, referenceNode);
      } else {
        originalList.appendChild(row);
      }
      
      setButtonState(btn, false);
    } else {
      ids.push(topicId);
      hiddenList.appendChild(row);
      setButtonState(btn, true);
    }

    chrome.storage.local.set({ [STORAGE_KEY]: ids }, () => {
      updateVaultStats(hiddenList, stats, toggleBtn);
    });
  });
}

function setButtonState(btn: HTMLElement, isHidden: boolean) {
  btn.innerHTML = isHidden ? ICON_UNHIDE : ICON_HIDE;
  btn.title = isHidden ? 'צוריקשטעלן אשכול' : 'באהאלט אשכול';
  btn.classList.toggle('ivelt-unhide-style', isHidden);
}

function createHiddenVaultUI() {
  const forumBlocks = document.querySelectorAll('.forumbg, .action-bar.bottom');
  const lastBlock = forumBlocks[forumBlocks.length - 1] || document.body.lastElementChild;

  const container = document.createElement('div');
  container.id = 'ivelt-hidden-vault';

  container.innerHTML = `
    <div class="ivelt-vault-header" dir="rtl">
      <span>👁 באהאלטענע אשכולות</span>
      <button type="button" class="ivelt-vault-toggle" id="ivelt-vault-toggle">ווייז באהאלטענע</button>
    </div>
    <div id="ivelt-vault-stats" dir="rtl"></div>
    <ul id="ivelt-vault-list" class="topiclist topics" style="display: none !important;"></ul>
  `;

  lastBlock?.parentNode?.insertBefore(container, lastBlock.nextSibling);

  const hiddenListElement = container.querySelector('#ivelt-vault-list') as HTMLUListElement;
  const statsBar = container.querySelector('#ivelt-vault-stats') as HTMLDivElement;
  const toggleBtn = container.querySelector('#ivelt-vault-toggle') as HTMLButtonElement;

  toggleBtn.addEventListener('click', () => {
    const isHidden = hiddenListElement.style.display === 'none' ||
      hiddenListElement.style.getPropertyValue('display') === 'none';
    hiddenListElement.style.setProperty('display', isHidden ? 'block' : 'none', 'important');
    toggleBtn.textContent = isHidden ? 'פארמאך רשימה' : 'ווייז באהאלטענע';
  });

  return { hiddenListElement, statsBar, toggleBtn };
}

function updateVaultStats(hiddenList: HTMLElement, statsBar: HTMLElement, toggleBtn: HTMLElement) {
  const hiddenRows = hiddenList.querySelectorAll('li.row');
  const total = hiddenRows.length;
  let unread = 0;

  hiddenRows.forEach((row) => {
    const dl = row.querySelector('dl');
    if (dl && dl.className.includes('unread')) {
      unread++;
    }
  });

  statsBar.innerHTML = `דער בלאט האט <b>${total}</b> באהאלטענע אשכולות (<b>${unread}</b> אומגעליינט, <b>${total - unread}</b> געליינט).`;

  // Hide the vault container entirely if nothing is hidden
  const container = document.getElementById('ivelt-hidden-vault');
  if (container) {
    container.style.display = total === 0 ? 'none' : 'block';
  }
}
