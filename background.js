// Background service worker for Albert's X/Twitter Filter
chrome.runtime.onInstalled.addListener(() => {
    console.log("Albert's X/Twitter Filter v2.0 installed");
    
    // Initialize default stats
    chrome.storage.sync.set({
        filterStats: {
            totalTweetsScanned: 0,
            tweetsHidden: 0,
            accountsWithLocation: 0
        },
        settings: {
            enabled: true,
            filterMode: 'dimmed',
            blockedCountries: {},
            blockedUsers: [],
            blockedKeywords: []
        }
    });
});

// Handle badge updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateBadge") {
        chrome.action.setBadgeText({
            text: request.count > 0 ? request.count.toString() : "",
            tabId: sender.tab.id
        });
        chrome.action.setBadgeBackgroundColor({
            color: '#FF4444',
            tabId: sender.tab.id
        });
    }
});

// Reset badge when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
        chrome.action.setBadgeText({
            text: "",
            tabId: tabId
        });
    }
});

// Show welcome message on install
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html')
        });
    }
});