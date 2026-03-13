import{l as g}from"./stateManager-Dedc2-BP.js";const a="ivelt-notification-check",d=2,i="ivelt_last_notification_count";chrome.runtime.onInstalled.addListener(t=>{console.log("iVelt Pro extension installed:",t.reason),chrome.alarms.create(a,{delayInMinutes:1,periodInMinutes:d})});chrome.runtime.onStartup.addListener(()=>{chrome.alarms.create(a,{delayInMinutes:.5,periodInMinutes:d})});chrome.alarms.onAlarm.addListener(async t=>{t.name!==a||!(await g()).pushNotifications||await _()});chrome.notifications.onClicked.addListener(t => {
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
});async function _(){var t,n;try{const o=await chrome.cookies.get({url:"https://www.ivelt.com",name:"phpbb3_sw7kk_u"}),r=(o==null?void 0:o.value)||"";if(!r||r==="1"||r.length<=1)return;const c=await fetch("https://www.ivelt.com/forum/index.php",{credentials:"include"});if(!c.ok)return;const p=await c.text(),l=new DOMParser().parseFromString(p,"text/html"),m=l.querySelector("#notification_list_button .badge");if(!m)return;const w=((t=m.textContent)==null?void 0:t.trim())||"0",e=parseInt(w,10);if(isNaN(e)||e===0){await chrome.storage.local.set({[i]:0});return}const f=(await chrome.storage.local.get([i]))[i]||0;if(e>f){const u=e-f;let s=`דו האסט ${e} נייע נאטיפיקאציעס`;const h=l.querySelector(".notification_list .notification-title");h&&(s=((n=h.textContent)==null?void 0:n.trim())||s),chrome.notifications.create(`ivelt-notif-${Date.now()}`,{type:"basic",iconUrl:chrome.runtime.getURL("assets/icon128.png"),title:`iVelt — ${u} נייע נאטיפיקאציע${u>1?"ס":""}`,message:s,priority:1})}await chrome.storage.local.set({[i]:e})}catch(o){console.error("iVelt Pro: Notification check failed:",o)}}
