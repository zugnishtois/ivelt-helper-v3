export function setupStickyPosts() {
  console.log('iVelt Pro: Sticky Posts Enabled');

  const postButtons = document.querySelectorAll('.has-profile .post-buttons');

  const checkStickyPosition = () => {
    let firstStickyFound = false;

    postButtons.forEach((btn) => {
      const parent = btn.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();

      // Add or remove the sticky-post class based on the parent's top position
      if (parentRect.top < 0 && parentRect.bottom > 30 && !firstStickyFound) {
        firstStickyFound = true;

        if (!btn.classList.contains('ivelt-pro-sticky')) {
          (btn as HTMLElement).style.left = `${btnRect.left}px`; // Keep the original X position
          btn.classList.add('ivelt-pro-sticky');
        }
      } else {
        if (btn.classList.contains('ivelt-pro-sticky')) {
          btn.classList.remove('ivelt-pro-sticky');
          (btn as HTMLElement).style.left = '';
        }
      }
    });
  };

  window.addEventListener('scroll', checkStickyPosition);
  checkStickyPosition();
}
