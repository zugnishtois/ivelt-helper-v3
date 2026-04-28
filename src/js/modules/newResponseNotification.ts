/**
 * iVelt Pro — New Response Notification
 *
 * Fixes vs. previous version:
 *  - Keeps polling AFTER detecting new responses (was: stopped after first detection).
 *  - When the topic is no longer in the unread list (= read in another tab),
 *    it removes the banner, clears the title flash, and restores the original title
 *    — without requiring a reload.
 *  - Prevents duplicate banners (idempotent insert).
 *  - Uses a mutable currentCount that updates after each detection so subsequent
 *    new responses can be detected too.
 */

export function setupNewResponseNotification() {
  if (!window.location.pathname.includes('/forum/viewtopic.php')) return;

  const paginationMatch = document.querySelector("div.pagination")?.innerHTML.match(/(\d+) תגובות/);
  if (!paginationMatch) return;

  let currentCount = parseInt(paginationMatch[1], 10);

  const posts = document.querySelectorAll(".post.has-profile");
  if (posts.length === 0) return;
  const lastPost = posts[posts.length - 1];

  const topicTitleEl = document.querySelector("h2.topic-title > a") as HTMLAnchorElement;
  if (!topicTitleEl) return;
  const topicURLSearch = topicTitleEl.href.substring(topicTitleEl.href.indexOf("?"));
  const urlParams = new URLSearchParams(topicURLSearch);
  const topicId = urlParams.get("t");

  const forumBreadcrumb = document.querySelector(".left-box.arrow-right") as HTMLAnchorElement;
  const forumURL = forumBreadcrumb?.href;
  if (!forumURL) return;

  function isLastPage() {
    return document.querySelectorAll(".next").length === 0;
  }

  const originalTitle = document.title;
  const baseInterval = 20000;
  let interval = baseInterval;
  let titleFlash: number | null = null;

  function clearBanner() {
    const banner = document.getElementById('ivelt-pro-new-response-banner');
    if (banner) banner.remove();
    if (titleFlash !== null) {
      clearInterval(titleFlash);
      titleFlash = null;
      document.title = originalTitle;
    }
  }

  function showBanner() {
    if (document.getElementById('ivelt-pro-new-response-banner')) return; // dedupe
    const html = `
      <h3 id="ivelt-pro-new-response-banner" style="margin:6px auto;text-align:center;background:#cadceb;padding:10px 8px;border-radius:7px;user-select:none;">
        <div style="margin-bottom:8px;">נייע תגובות זענען צוגעקומען</div>
        <a class="button" style="display:inline-block;padding:4px 22px;" href="/forum/viewtopic.php?t=${topicId}&view=unread#unread">רילאוד</a>
      </h3>
    `;
    lastPost.insertAdjacentHTML("afterend", html);

    if (titleFlash === null) {
      titleFlash = window.setInterval(() => {
        document.title = document.title === originalTitle ? "💬 " + originalTitle : originalTitle;
      }, 800);
    }
  }

  const checkNewResponse = async () => {
    if (!isLastPage() || currentCount === 0) {
      window.setTimeout(checkNewResponse, interval);
      return;
    }

    try {
      const response = await fetch(forumURL);
      const data = await response.text();
      interval = baseInterval; // reset backoff on success

      const doc = new DOMParser().parseFromString(data, "text/html");
      const forumBgs = doc.querySelectorAll(".forumbg");
      if (forumBgs.length === 0) {
        window.setTimeout(checkNewResponse, interval);
        return;
      }

      // Limit to topics in the UNREAD section (matches old extension's behavior).
      const lastForumBg = forumBgs[forumBgs.length - 1];
      const topicsList = lastForumBg.querySelector(".topics");
      if (!topicsList) {
        window.setTimeout(checkNewResponse, interval);
        return;
      }
      const unreadRows = Array.from(topicsList.querySelectorAll('li.row:has(dl[class*="_unread"])'));

      const topic = unreadRows.find((t) => {
        const tHrefEl = t.querySelector('a.topictitle') as HTMLAnchorElement;
        if (!tHrefEl) return false;
        const tSearch = new URLSearchParams(tHrefEl.href.substring(tHrefEl.href.indexOf("?")));
        return tSearch.get("t") === topicId;
      });

      if (!topic) {
        // Topic no longer unread → user read it (possibly in another tab).
        clearBanner();
        window.setTimeout(checkNewResponse, interval);
        return;
      }

      const repliesCell = topic.querySelector('.posts');
      const text = repliesCell?.textContent?.trim() || "";
      const m = text.match(/(\d+)/);
      if (!m) {
        window.setTimeout(checkNewResponse, interval);
        return;
      }

      const newCount = parseInt(m[1], 10);
      // Page count = replies + 1
      if (currentCount < newCount + 1) {
        showBanner();
        currentCount = newCount + 1; // bump so we don't keep firing for same delta
      }
      window.setTimeout(checkNewResponse, interval);
    } catch {
      // Transient fetch failure (offline / aborted / network blip).
      // Back off and retry — no console noise; recovery is automatic.
      interval = Math.min(interval * 2, 5 * 60 * 1000);
      window.setTimeout(checkNewResponse, interval);
    }
  };

  window.setTimeout(checkNewResponse, interval);
}
