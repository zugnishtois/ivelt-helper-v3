export function setupNewResponseNotification() {
  console.log('iVelt Pro: New Response Notification Enabled');

  if (!window.location.pathname.includes('/forum/viewtopic.php')) return;

  const paginationMatch = document.querySelector("div.pagination")?.innerHTML.match(/(\d+) תגובות/);
  if (!paginationMatch) return;
  
  const currentCount = parseInt(paginationMatch[1], 10);
  
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
  let interval = 10000; // default 10 seconds, you can make this configurable later if needed
  let alertInterval: number | null = null;

  const checkNewResponse = async () => {
    if (isLastPage() && currentCount > 0) {
      try {
        const response = await fetch(forumURL);
        const data = await response.text();
        
        // Reset interval on successful fetch
        interval = 10000;

        const parser = new DOMParser();
        const doc = parser.parseFromString(data, "text/html");
        
        const forumBgElements = doc.querySelectorAll(".forumbg");
        if (forumBgElements.length === 0) {
            setTimeout(checkNewResponse, interval);
            return;
        }

        const lastForumBg = forumBgElements[forumBgElements.length - 1];
        const topicsList = lastForumBg.querySelector(".topics");
        if (!topicsList) {
            setTimeout(checkNewResponse, interval);
            return;
        }

        const rows = Array.from(topicsList.querySelectorAll("li.row"));
        
        const topic = rows.find((t) => {
          const tHrefEl = t.querySelector('a.topictitle') as HTMLAnchorElement;
          if (!tHrefEl) return false;
          
          const tSearch = new URLSearchParams(tHrefEl.href.substring(tHrefEl.href.indexOf("?")));
          return tSearch.get("t") === topicId;
        });

        if (!topic) {
           setTimeout(checkNewResponse, interval);
           return;
        }

        const repliesCell = topic.querySelector('.posts');
        if (repliesCell) {
             // The structure usually has the text directly in the div or a child. 
             // We extract the number.
             const textContent = repliesCell.textContent?.trim() || "0";
             // Extract digits
             const match = textContent.match(/(\d+)/);
             if (match) {
                 const newCount = parseInt(match[1], 10);
                 // Usually the index shows 'replies', which is posts - 1. So newCount is replies.
                 // currentCount is total posts. Total posts = replies + 1.
                 if (currentCount < newCount + 1) {
                    
                    // Prevent adding multiple banners
                    if (!document.getElementById('ivelt-pro-new-response-banner')) {
                        const bannerHtml = `
                          <div id="ivelt-pro-new-response-banner" style="margin: 15px auto; text-align: center; background: var(--media-bg, #dbeafe); padding: 10px; border-radius: 8px; border-left: 4px solid var(--primary, #3477db);">
                            <h3 style="margin:0 0 10px 0; font-size: 1.1em; color: var(--text-main, #333);">נייע תגובות זענען צוגעקומען (New Responses Arrived)</h3>
                            <a class="button" style="display:inline-block; padding: 5px 20px; text-decoration:none;" href="/forum/viewtopic.php?t=${topicId}&view=unread#unread">רילאוד (Reload)</a>
                          </div>
                        `;
                        lastPost.insertAdjacentHTML("afterend", bannerHtml);
                        
                        if (!alertInterval) {
                            alertInterval = window.setInterval(() => {
                                document.title = document.title === originalTitle ? "💬 " + originalTitle : originalTitle;
                            }, 1000);
                        }
                    }
                 } else {
                    setTimeout(checkNewResponse, interval);
                 }
             } else {
                 setTimeout(checkNewResponse, interval);
             }
        } else {
             setTimeout(checkNewResponse, interval);
        }

      } catch (error) {
        console.error("iVelt Pro: Error checking for new responses", error);
        interval *= 2; // back off on error
        setTimeout(checkNewResponse, interval);
      }
    }
  };

  setTimeout(checkNewResponse, interval);
}
