export function setupGoogleSearch() {
  console.log('iVelt Pro: Google Search Enabled');

  // Topic specific search
  if (window.location.href.includes("viewtopic.php")) {
    const topicTitleEl = document.querySelector('.topic-title > a');
    if (topicTitleEl && topicTitleEl.textContent) {
      const topicTitle = topicTitleEl.textContent;
      const searchUrl = `https://www.google.com/search?q=intitle%3A"${encodeURIComponent(topicTitle)}"+site%3Awww.ivelt.com+`;
      
      const searchBox = document.getElementById('search_keywords');
      if (searchBox) {
        searchBox.insertAdjacentHTML('beforebegin', 
          '<input class="inputbox search tiny" style="border-width:1px;border-radius:4px" type="search" id="ivelt_pro_g_search_keywords" size="20" placeholder="גוגל סוירטש אין דעם אשכול... (Google Search Topic)">'
        );

        const newSearchBox = document.getElementById('ivelt_pro_g_search_keywords');
        newSearchBox?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const val = (newSearchBox as HTMLInputElement).value;
            window.open(searchUrl + encodeURIComponent(val), '_blank')?.focus();
          }
        });
      }
    }
  }

  // Global Site Search
  const globalSearchForm = document.getElementById('search');
  if (globalSearchForm) {
    const siteSearchUrl = `https://www.google.com/search?q=site%3Awww.ivelt.com+`;
    globalSearchForm.insertAdjacentHTML('beforebegin', 
      '<input id="ivelt_pro_g_site_search" type="search" class="inputbox search" style="border-radius:4px;margin-bottom: 5px;" placeholder="גוגל סוירטש אין אייוועלט (Google Search Site)">'
    );

    const newGlobalSearchBox = document.getElementById('ivelt_pro_g_site_search');
    newGlobalSearchBox?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = (newGlobalSearchBox as HTMLInputElement).value;
        window.open(siteSearchUrl + encodeURIComponent(val), '_blank')?.focus();
      }
    });
  }
}
