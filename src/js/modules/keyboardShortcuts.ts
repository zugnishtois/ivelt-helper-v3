export function setupKeyboardShortcuts() {
  console.log('iVelt Pro: Keyboard Shortcuts Enabled');

  function previousPage() {
    (document.querySelector(".previous a") as HTMLElement)?.click();
  }

  function nextPage() {
    (document.querySelector(".next a") as HTMLElement)?.click();
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function scrollBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
  }

  function sendPost(postBtn: HTMLElement) {
    postBtn?.click();
  }

  function previewPost() {
    (document.getElementsByName("preview")[0] as HTMLElement)?.click();
  }

  function toggleNotification() {
    const notificationNode = document.getElementById("notification_list_button");
    if (notificationNode) {
      notificationNode.scrollIntoView({ behavior: "instant", block: "start" });
      notificationNode.click();
    }
  }

  // Alt+M: open the next unread notification.
  // Uses data-real-url first (which fixes redirect for נייע אשכול notifications)
  // then falls back to href.
  function nextNotification() {
    const nodes = document.querySelectorAll<HTMLAnchorElement>("li.bg2 .notification-block");
    for (const node of nodes) {
      const url = node.dataset.realUrl || node.href;
      if (url) {
        window.location.href = url;
        break;
      }
    }
  }

  document.addEventListener('keydown', (e) => {
    const postBtn = (document.getElementsByName("post")[0] || document.getElementsByName("submit")[0]) as HTMLElement;
    const isAltKey = e.altKey || e.getModifierState('AltGraph');

    if (e.code === "KeyA" && isAltKey) {
      window.location.href = 'https://www.ivelt.com/forum/search.php?search_id=active_topics';
    }

    if (e.key === "Enter" && e.ctrlKey && postBtn) {
      sendPost(postBtn);
    }

    if (e.code === "KeyV" && isAltKey && postBtn) {
      previewPost();
    }

    if (e.code === "KeyN" && isAltKey) {
      toggleNotification();
    }

    if (e.code === "KeyM" && isAltKey) {
      nextNotification();
    }

    // Ignore arrow keys if typing in an input
    const target = e.target as HTMLElement;
    if (target.nodeName === "INPUT" || target.nodeName === "TEXTAREA" || target.isContentEditable) {
      return;
    }

    if (e.key === "ArrowLeft") {
      nextPage();
    } else if (e.key === "ArrowRight") {
      previousPage();
    } else if (e.key === "ArrowUp") {
      scrollTop();
    } else if (e.key === "ArrowDown") {
      scrollBottom();
    }
  });

  const postBtnEl = document.getElementsByName("post")[0] || document.getElementsByName("submit")[0];
  if (postBtnEl) {
    postBtnEl.setAttribute("title", "שיק (שארטקאט קאנטראל+ענטער)");
  }
}
