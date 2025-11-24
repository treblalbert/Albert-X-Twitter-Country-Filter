class TwitterCountryFilter {
    constructor() {
        this.settings = {
            enabled: true,
            filterMode: 'dimmed',
            blockedCountries: {}
        };
        this.detectedCountries = {};
        this.stats = {
            totalTweetsScanned: 0,
            tweetsHidden: 0,
            accountsWithLocation: 0
        };
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.startObserver();
        this.scanExistingTweets();
        this.updateBadge();
        
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "scanLocations") {
                this.scanExistingTweets();
                sendResponse({status: "scanning"});
            } else if (request.action === "getStats") {
                sendResponse({
                    stats: this.stats, 
                    detectedCountries: this.detectedCountries
                });
            } else if (request.action === "resetStats") {
                this.resetStats();
                sendResponse({status: "stats reset"});
            } else if (request.action === "updateSettings") {
                this.settings = request.settings;
                this.rescanAllTweets();
                sendResponse({status: "settings updated"});
            }
            return true;
        });

        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                if (changes.settings) {
                    this.settings = changes.settings.newValue;
                    this.rescanAllTweets();
                }
                if (changes.filterStats) {
                    this.stats = changes.filterStats.newValue;
                }
            }
        });
    }

    async loadSettings() {
        const result = await chrome.storage.sync.get(['settings', 'detectedCountries', 'filterStats']);
        if (result.settings) {
            this.settings = result.settings;
        }
        this.detectedCountries = result.detectedCountries || {};
        this.stats = result.filterStats || this.stats;
    }

    async saveStats() {
        await chrome.storage.sync.set({ filterStats: this.stats });
        this.updateBadge();
    }

    updateBadge() {
        if (!this.settings.enabled) {
            chrome.runtime.sendMessage({
                action: "updateBadge",
                count: 0
            });
            return;
        }

        if (this.stats.tweetsHidden > 0) {
            chrome.runtime.sendMessage({
                action: "updateBadge",
                count: this.stats.tweetsHidden
            });
        }
    }

    resetStats() {
        this.stats = {
            totalTweetsScanned: 0,
            tweetsHidden: 0,
            accountsWithLocation: 0
        };
        this.saveStats();
    }

    startObserver() {
        const observer = new MutationObserver((mutations) => {
            if (!this.settings.enabled) return;
            
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        this.processTweet(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    scanExistingTweets() {
        if (!this.settings.enabled) return;
        
        const tweets = document.querySelectorAll('[data-testid="tweet"], article');
        console.log(`Found ${tweets.length} tweets to scan`);
        tweets.forEach(tweet => this.processTweet(tweet));
    }

    processTweet(element) {
        if (!this.settings.enabled) {
            // If disabled, show all previously hidden tweets
            this.showTweet(element);
            return;
        }

        const tweet = element.closest('[data-testid="tweet"]') || element.closest('article');
        if (!tweet || tweet.hasAttribute('data-country-filtered')) return;
        
        this.stats.totalTweetsScanned++;
        
        const location = this.extractLocation(tweet);
        if (location && this.isCountry(location)) {
            this.stats.accountsWithLocation++;
            this.recordLocation(location);
            
            if (this.settings.blockedCountries[location]) {
                this.filterTweet(tweet, location);
                this.stats.tweetsHidden++;
                this.saveStats();
                console.log(`Filtered tweet from ${location}. Mode: ${this.settings.filterMode}`);
            }
        }
        
        if (this.stats.totalTweetsScanned % 10 === 0) {
            this.saveStats();
        }
    }

    filterTweet(tweet, country) {
        tweet.setAttribute('data-country-filtered', 'true');
        tweet.setAttribute('data-filtered-country', country);
        
        if (this.settings.filterMode === 'removed') {
            this.completelyRemoveTweet(tweet);
        } else {
            this.dimTweet(tweet, country);
        }
    }

    completelyRemoveTweet(tweet) {
        tweet.style.display = 'none';
    }

    dimTweet(tweet, country) {
        tweet.style.opacity = '0.4';
        tweet.style.background = '#fff3f3';
        tweet.style.border = '2px solid #ff4444';
        tweet.style.padding = '8px';
        tweet.style.margin = '4px 0';
        tweet.style.borderRadius = '8px';
        tweet.style.position = 'relative';
        
        const hiddenIndicator = document.createElement('div');
        hiddenIndicator.style.padding = '6px 10px';
        hiddenIndicator.style.background = '#ff4444';
        hiddenIndicator.style.color = 'white';
        hiddenIndicator.style.fontSize = '12px';
        hiddenIndicator.style.borderRadius = '6px';
        hiddenIndicator.style.marginBottom = '8px';
        hiddenIndicator.style.fontWeight = 'bold';
        hiddenIndicator.innerHTML = `🚫 HIDDEN - From: ${country}`;
        
        // Only add indicator if not already present
        if (!tweet.querySelector('.country-filter-indicator')) {
            hiddenIndicator.className = 'country-filter-indicator';
            tweet.prepend(hiddenIndicator);
        }
    }

    showTweet(tweet) {
        const filteredTweet = tweet.closest('[data-country-filtered]');
        if (!filteredTweet) return;
        
        filteredTweet.style.display = '';
        filteredTweet.style.opacity = '';
        filteredTweet.style.background = '';
        filteredTweet.style.border = '';
        filteredTweet.style.padding = '';
        filteredTweet.style.margin = '';
        
        const indicator = filteredTweet.querySelector('.country-filter-indicator');
        if (indicator) indicator.remove();
        
        filteredTweet.removeAttribute('data-country-filtered');
        filteredTweet.removeAttribute('data-filtered-country');
    }

    extractLocation(tweet) {
        // Method 1: Look for location in user bio section
        const bioText = tweet.querySelector('[data-testid="UserBio"], [data-testid="UserDescription"]');
        if (bioText) {
            const locationMatch = this.extractCountryFromText(bioText.textContent);
            if (locationMatch) return locationMatch;
        }

        // Method 2: Look for location element
        const locationElement = tweet.querySelector('[data-testid="UserLocation"]');
        if (locationElement) {
            const locationMatch = this.extractCountryFromText(locationElement.textContent);
            if (locationMatch) return locationMatch;
        }

        // Method 3: Look in user name section for location hints
        const userNameSection = tweet.querySelector('[data-testid="User-Name"]');
        if (userNameSection) {
            const locationMatch = this.extractCountryFromText(userNameSection.textContent);
            if (locationMatch) return locationMatch;
        }

        // Method 4: Look for any location indicators in the tweet
        const tweetText = tweet.textContent;
        const locationMatch = this.extractCountryFromText(tweetText);
        if (locationMatch) return locationMatch;

        return null;
    }

    extractCountryFromText(text) {
        const countryPatterns = {
            'United States': /\b(USA?|United States|US|U\.S\.A?|America)\b/i,
            'India': /\b(India|IND?|Bharat)\b/i,
            'United Kingdom': /\b(UK|United Kingdom|U\.K\.|Great Britain|GB|England|Scotland|Wales)\b/i,
            'Canada': /\b(Canada|CAN?)\b/i,
            'Australia': /\b(Australia|AUS?)\b/i,
            'Germany': /\b(Germany|GER?|Deutschland)\b/i,
            'France': /\b(France|FRA?)\b/i,
            'Japan': /\b(Japan|JPN?|Nippon)\b/i,
            'Brazil': /\b(Brazil|BRA?)\b/i,
            'Mexico': /\b(Mexico|MEX?)\b/i,
            'Philippines': /\b(Philippines|PH|PHL?)\b/i,
            'Indonesia': /\b(Indonesia|IDN?)\b/i,
            'Pakistan': /\b(Pakistan|PAK?)\b/i,
            'Nigeria': /\b(Nigeria|NGA?)\b/i,
            'Russia': /\b(Russia|RUS?|Russian)\b/i,
            'China': /\b(China|CHN?|Chinese)\b/i
        };

        for (const [country, pattern] of Object.entries(countryPatterns)) {
            if (pattern.test(text)) {
                return country;
            }
        }

        return null;
    }

    isCountry(location) {
        const countries = [
            'United States', 'India', 'United Kingdom', 'Canada', 'Australia',
            'Germany', 'France', 'Japan', 'Brazil', 'Mexico',
            'Philippines', 'Indonesia', 'Pakistan', 'Nigeria', 'Russia', 'China'
        ];
        return countries.includes(location);
    }

    recordLocation(location) {
        if (!this.detectedCountries[location]) {
            this.detectedCountries[location] = 0;
        }
        this.detectedCountries[location]++;
        
        chrome.storage.sync.set({ detectedCountries: this.detectedCountries });
    }

    rescanAllTweets() {
        // Show all previously hidden tweets
        const filteredTweets = document.querySelectorAll('[data-country-filtered]');
        filteredTweets.forEach(tweet => {
            this.showTweet(tweet);
        });
        
        // Reset hidden counter if extension is disabled
        if (!this.settings.enabled) {
            this.stats.tweetsHidden = 0;
            this.saveStats();
        }
        
        // Rescan all tweets
        this.scanExistingTweets();
    }
}

// Initialize when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TwitterCountryFilter());
} else {
    new TwitterCountryFilter();
}