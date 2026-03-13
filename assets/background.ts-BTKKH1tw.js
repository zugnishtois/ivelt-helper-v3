import{l as f}from"./stateManager-BkoxYJPI.js";const a="ivelt-notification-check",m=2,c="ivelt_last_notification_count";chrome.runtime.onInstalled.addListener(t=>{console.log("iVelt Pro extension installed:",t.reason),chrome.alarms.create(a,{delayInMinutes:1,periodInMinutes:m})});chrome.runtime.onStartup.addListener(()=>{chrome.alarms.create(a,{delayInMinutes:.5,periodInMinutes:m})});chrome.alarms.onAlarm.addListener(async t=>{t.name!==a||!(await f()).pushNotifications||await w()});chrome.notifications.onClicked.addListener(t => {
  if (t.startsWith("ivelt-notif")) {
    const targetUrl = "https://www.ivelt.com/forum/ucp.php?i=ucp_notifications";
    chrome.tabs.query({ url: "*://*.ivelt.com/*" }, tabs => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { url: targetUrl, active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
    chrome.notifications.clear(t);
  }
});async function w(){try{const t=await chrome.cookies.get({url:"https://www.ivelt.com",name:"phpbb3_sw7kk_u"}),e=(t==null?void 0:t.value)||"";if(!e||e==="1"||e.length<=1)return;const i=await fetch("https://www.ivelt.com/forum/index.php",{credentials:"include"});if(!i.ok)return;const n=await i.text(),r=n.match(/id=["']notification_list_button["'][^>]*>[\s\S]*?<strong[^>]*class=["'][^"']*badge[^"']*["'][^>]*>(\d+)<\/strong>/);if(!r)return;const o=parseInt(r[1],10);if(isNaN(o)||o===0){await chrome.storage.local.set({[c]:0});return}const l=(await chrome.storage.local.get([c]))[c]||0;if(o>l){const h=o-l;let u=`דו האסט ${o} נייע נאטיפיקאציעס`;const d=n.match(/class=["'][^"']*notification-title[^"']*["'][^>]*>([^<]+)</);d&&(u=d[1].trim()),chrome.notifications.create(`ivelt-notif-${Date.now()}`,{type:"basic",iconUrl:chrome.runtime.getURL("assets/icon128.png"),title:`iVelt — ${h} נייע נאטיפיקאציע${h>1?"ס":""}`,message:u,priority:1})}await chrome.storage.local.set({[c]:o})}catch(t){console.error("iVelt Pro: Notification check failed:",t)}}chrome.runtime.onMessage.addListener((t,e,i)=>{if(t.action==="fetchYiddish24Audio"&&t.url)return p(t.url).then(n=>i(n)).catch(()=>i({audioUrl:null})),!0});async function p(t){try{const e=await fetch(t,{headers:{Referer:"https://www.yiddish24.com/",Accept:"text/html"}});if(!e.ok)return{audioUrl:null,title:null};const i=await e.text(),n=i.match(/data-song-url=["']([^"']+)["']/),r=n?n[1]:null,o=i.match(/class=["'][^"']*bulletin-news-des-title[^"']*["'][^>]*>([^<]+)/)||i.match(/<h1[^>]*>([^<]+)<\/h1>/),s=o?o[1].trim():null;return{audioUrl:r,title:s}}catch(e){return console.error("iVelt Pro: Failed to fetch Yiddish24 audio:",e),{audioUrl:null,title:null}}}
