importScripts('common.js');

function schedule() {
  chrome.alarms.create('badge', { periodInMinutes: 15 });
  refreshBadge();
}
chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'badge') refreshBadge(); });
chrome.runtime.onMessage.addListener(m => { if (m && m.type === 'connected') refreshBadge(); });  // signed in on the site
