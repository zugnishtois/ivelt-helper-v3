import { loadSettings, saveSettings, ExtensionSettings, CustomLink } from '../js/stateManager';

document.addEventListener('DOMContentLoaded', async () => {
  // ----- Tabs -----
  const navBtns = document.querySelectorAll<HTMLButtonElement>('.nav-btn');
  const sections = document.querySelectorAll<HTMLElement>('.section');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId || targetId === 'help-link') return;

      navBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetId)?.classList.add('active');
    });
  });

  document.getElementById('openHelp')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('src/help/help.html') });
  });

  // ----- Load settings -----
  const settings = await loadSettings();

  const bindCheckbox = (id: keyof ExtensionSettings) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.checked = settings[id] as boolean;
    el.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      await saveSettings({ [id]: target.checked });
      showToast();
    });
  };

  const bindNumberSelect = (id: keyof ExtensionSettings) => {
    const el = document.getElementById(id) as HTMLSelectElement | null;
    if (!el) return;
    el.value = String(settings[id] ?? '');
    el.addEventListener('change', async () => {
      const v = Number(el.value);
      await saveSettings({ [id]: v });
      showToast();
    });
  };

  bindCheckbox('smartPagination');
  bindCheckbox('autoResizeImages');
  bindCheckbox('stickyPosts');
  bindCheckbox('embeddedMedia');
  bindCheckbox('yiddish24Player');
  bindCheckbox('mentionButton');
  bindCheckbox('quoteOtherTopic');
  bindCheckbox('keyboardShortcuts');
  bindCheckbox('newResponseNotification');
  bindCheckbox('notificationSplitter');
  bindCheckbox('googleSearch');
  bindCheckbox('topicHider');
  bindCheckbox('pushNotifications');
  bindCheckbox('citePopup');
  bindCheckbox('movableButtonsBar');
  bindCheckbox('warnOnLosingPost');
  bindCheckbox('alwaysCopyTopic');
  bindCheckbox('debugMode');

  bindNumberSelect('backgroundSyncPosts');
  bindNumberSelect('backgroundSyncNotif');

  // Reset movable buttons-bar position
  document.getElementById('resetButtonsBar')?.addEventListener('click', async () => {
    await saveSettings({ buttonsBarPosition: null });
    showToast();
  });

  // ----- Custom Links -----
  const linksContainer = document.getElementById('customLinksContainer')!;
  const addBtn = document.getElementById('addLinkBtn')!;
  const nameInput = document.getElementById('newLinkName') as HTMLInputElement;
  const urlInput = document.getElementById('newLinkUrl') as HTMLInputElement;

  let customLinks: CustomLink[] = settings.customLinks || [];

  function renderLinks() {
    linksContainer.innerHTML = '';
    customLinks.forEach((link, index) => {
      const row = document.createElement('div');
      row.className = 'link-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'lname';
      nameSpan.textContent = link.name;

      const urlSpan = document.createElement('span');
      urlSpan.className = 'lurl';
      urlSpan.textContent = link.url.length > 50 ? link.url.substring(0, 50) + '…' : link.url;
      urlSpan.title = link.url;
      urlSpan.dir = 'ltr';

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-danger';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', async () => {
        customLinks.splice(index, 1);
        await saveSettings({ customLinks });
        renderLinks();
        showToast();
      });

      row.appendChild(nameSpan);
      row.appendChild(urlSpan);
      row.appendChild(removeBtn);
      linksContainer.appendChild(row);
    });
  }
  renderLinks();

  addBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name || !url) return;
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    customLinks.push({ name, url: finalUrl });
    await saveSettings({ customLinks });
    nameInput.value = '';
    urlInput.value = '';
    renderLinks();
    showToast();
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.click();
  });

  // ----- Toast -----
  let toastTimeout: ReturnType<typeof setTimeout>;
  function showToast() {
    const toast = document.getElementById('saveToast');
    if (!toast) return;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove('show'), 2000);
  }
});
