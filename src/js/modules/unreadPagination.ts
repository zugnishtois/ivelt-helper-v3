export function applySmartPagination() {
  // Find all rows in topic lists
  const rows = document.querySelectorAll('li.row');

  rows.forEach((row) => {
    const dl = row.querySelector('dl.row-item');
    if (!dl) return;

    // The topic classes in phpBB indicate read status.
    // e.g. "topic_unread", "topic_unread_mine", "topic_read"
    const dlClass = dl.className;
    const isUnread = dlClass.includes('unread');

    const titleLink = row.querySelector('a.topictitle');
    if (titleLink) {
      const href = titleLink.getAttribute('href');
      
      if (href && href.includes('viewtopic.php') && !href.includes('view=')) {
        if (isUnread) {
          // Check if there are pagination links for this topic (means multiple pages)
          const paginationLinks = row.querySelectorAll('.pagination a');
          
          if (paginationLinks.length > 0) {
            // Multi-page topic with unread messages — go to first unread
            titleLink.setAttribute('href', `${href}&view=unread#unread`);
          }
          // If single-page topic (no pagination), just leave the default link
          // This avoids the ugly jump to #unread when it's the first post
        }
        // Fully read topics keep their default links (page 1)
      }
    }
  });
}
