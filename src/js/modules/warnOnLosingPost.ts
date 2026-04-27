/**
 * iVelt Pro — Warn before losing an unsent post.
 * Shows a beforeunload confirmation when #message has content.
 */

export function setupWarnOnLosingPost() {
  let initialValue = '';

  const tryAttach = () => {
    const box = document.getElementById('message') as HTMLTextAreaElement | null;
    if (!box) return false;
    initialValue = box.value;
    return true;
  };

  if (!tryAttach()) {
    // Quick reply boxes can render late; observe once
    const obs = new MutationObserver(() => {
      if (tryAttach()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('beforeunload', (e) => {
    const box = document.getElementById('message') as HTMLTextAreaElement | null;
    if (!box) return;
    const v = box.value;
    if (v && v.trim().length > 0 && v !== initialValue) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Reset baseline after submit so warning doesn't trigger
  document.addEventListener('submit', (e) => {
    const f = e.target as HTMLFormElement;
    if (f && f.querySelector('#message')) {
      const box = f.querySelector('#message') as HTMLTextAreaElement;
      initialValue = box.value;
    }
  }, true);
}
