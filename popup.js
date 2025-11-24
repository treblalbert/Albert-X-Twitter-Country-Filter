document.addEventListener('DOMContentLoaded', async function() {
    const masterToggle = document.getElementById('masterToggle');
    const countriesList = document.getElementById('countriesList');
    const countrySearch = document.getElementById('countrySearch');
    const selectAllBtn = document.getElementById('selectAll');
    const deselectAllBtn = document.getElementById('deselectAll');
    const refreshBtn = document.getElementById('refreshBtn');
    const resetStatsBtn = document.getElementById('resetStatsBtn');
    const statusMessage = document.getElementById('statusMessage');
    const filterModeRadios = document.querySelectorAll('input[name="filterMode"]');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // User and keyword filtering elements
    const usernameInput = document.getElementById('usernameInput');
    const addUsernameBtn = document.getElementById('addUsernameBtn');
    const usersList = document.getElementById('usersList');
    const keywordInput = document.getElementById('keywordInput');
    const addKeywordBtn = document.getElementById('addKeywordBtn');
    const keywordsList = document.getElementById('keywordsList');

    // Load country data
    const countries = [
        // North America (23 countries)
        'United States', 'Canada', 'Mexico', 'Guatemala', 'Honduras', 
        'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Belize',
        'Bahamas', 'Cuba', 'Jamaica', 'Haiti', 'Dominican Republic',
        'Puerto Rico', 'Trinidad and Tobago', 'Barbados', 'Saint Lucia',
        'Grenada', 'Saint Vincent and the Grenadines', 'Antigua and Barbuda',
        'Dominica',

        // South America (12 countries)
        'Brazil', 'Argentina', 'Colombia', 'Peru', 'Venezuela',
        'Chile', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay',
        'Guyana', 'Suriname',

        // Europe (44 countries)
        'United Kingdom', 'Germany', 'France', 'Italy', 'Spain',
        'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria',
        'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland',
        'Poland', 'Czech Republic', 'Slovakia', 'Hungary', 'Romania',
        'Bulgaria', 'Greece', 'Croatia', 'Serbia', 'Slovenia',
        'Bosnia and Herzegovina', 'Albania', 'Montenegro', 'North Macedonia', 'Kosovo',
        'Estonia', 'Latvia', 'Lithuania', 'Ukraine', 'Belarus',
        'Moldova', 'Russia', 'Iceland', 'Luxembourg', 'Malta',
        'Cyprus', 'Monaco', 'San Marino', 'Liechtenstein',

        // Asia (48 countries)
        'India', 'China', 'Japan', 'South Korea', 'North Korea',
        'Vietnam', 'Thailand', 'Philippines', 'Indonesia', 'Malaysia',
        'Singapore', 'Myanmar', 'Cambodia', 'Laos', 'Bangladesh',
        'Pakistan', 'Sri Lanka', 'Nepal', 'Bhutan', 'Maldives',
        'Afghanistan', 'Iran', 'Iraq', 'Saudi Arabia', 'United Arab Emirates',
        'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'Yemen',
        'Syria', 'Jordan', 'Lebanon', 'Israel', 'Palestine',
        'Turkey', 'Armenia', 'Azerbaijan', 'Georgia', 'Kazakhstan',
        'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan',
        'Mongolia', 'Taiwan', 'Hong Kong', 'Macau',

        // Africa (54 countries)
        'Nigeria', 'Egypt', 'South Africa', 'Ethiopia', 'Kenya',
        'Tanzania', 'Uganda', 'Ghana', 'Democratic Republic of Congo', 'Ivory Coast',
        'Algeria', 'Morocco', 'Sudan', 'Angola', 'Mozambique',
        'Madagascar', 'Cameroon', 'Niger', 'Mali', 'Burkina Faso',
        'Malawi', 'Zambia', 'Senegal', 'Chad', 'Somalia',
        'Zimbabwe', 'Rwanda', 'Tunisia', 'Benin', 'Burundi',
        'South Sudan', 'Togo', 'Eritrea', 'Sierra Leone', 'Libya',
        'Central African Republic', 'Liberia', 'Mauritania', 'Namibia', 'Botswana',
        'Lesotho', 'Gambia', 'Gabon', 'Guinea', 'Guinea-Bissau',
        'Mauritius', 'Eswatini', 'Djibouti', 'Comoros', 'Cape Verde',
        'Seychelles', 'São Tomé and Príncipe', 'Western Sahara', 'Republic of Congo',

        // Oceania (14 countries)
        'Australia', 'New Zealand', 'Papua New Guinea', 'Fiji', 'Solomon Islands',
        'Vanuatu', 'Samoa', 'Kiribati', 'Micronesia', 'Tonga',
        'Marshall Islands', 'Palau', 'Nauru', 'Tuvalu',

        // Caribbean (13 additional countries/territories)
        'Saint Kitts and Nevis', 'Curaçao', 'Aruba', 'Cayman Islands',
        'Bermuda', 'Greenland', 'French Guiana', 'Guadeloupe', 'Martinique',
        'U.S. Virgin Islands', 'British Virgin Islands', 'Anguilla', 'Montserrat'
    ];

    let settings = {
        enabled: true,
        filterMode: 'dimmed',
        blockedCountries: {},
        blockedUsers: [],
        blockedKeywords: [],
        detectedCountries: {}
    };
    let currentStats = {};

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update contents
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabId}Tab`).classList.add('active');
        });
    });

    // Load settings from storage
    async function loadSettings() {
        const result = await chrome.storage.sync.get(['settings', 'detectedCountries', 'filterStats']);
        
        if (result.settings) {
            settings = result.settings;
        }
        settings.detectedCountries = result.detectedCountries || {};
        currentStats = result.filterStats || {
            totalTweetsScanned: 0,
            tweetsHidden: 0,
            accountsWithLocation: 0
        };
        
        updateUI();
        updateStatsDisplay();
        renderCountries();
        renderUsers();
        renderKeywords();
    }

    // Update UI based on settings
    function updateUI() {
        masterToggle.checked = settings.enabled;
        
        // Set filter mode
        filterModeRadios.forEach(radio => {
            radio.checked = radio.value === settings.filterMode;
        });
        
        // Enable/disable sections
        const container = document.querySelector('.container');
        if (settings.enabled) {
            container.classList.remove('disabled');
        } else {
            container.classList.add('disabled');
        }
    }

    // Update stats display
    function updateStatsDisplay() {
        const statsElement = document.getElementById('statsDisplay');
        statsElement.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">${currentStats.totalTweetsScanned || 0}</div>
                    <div class="stat-label">Tweets Scanned</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number" style="color: #ff4444;">${currentStats.tweetsHidden || 0}</div>
                    <div class="stat-label">Tweets Hidden</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${currentStats.accountsWithLocation || 0}</div>
                    <div class="stat-label">With Location</div>
                </div>
            </div>
        `;
    }

    // Render countries list with search filter
    function renderCountries(filter = '') {
        countriesList.innerHTML = '';
        
        const filteredCountries = countries.filter(country => 
            country.toLowerCase().includes(filter.toLowerCase())
        );

        filteredCountries.forEach(country => {
            const countryItem = document.createElement('div');
            countryItem.className = 'country-item';
            
            const count = settings.detectedCountries[country] || 0;
            const isBlocked = settings.blockedCountries[country];
            
            countryItem.innerHTML = `
                <input type="checkbox" id="country-${country}" ${isBlocked ? 'checked' : ''}>
                <label for="country-${country}" class="${isBlocked ? 'blocked' : ''}">
                    ${country}
                    ${isBlocked ? ' 🚫' : ''}
                </label>
                <span class="country-count">${count}</span>
            `;
            
            const checkbox = countryItem.querySelector('input');
            checkbox.addEventListener('change', function() {
                settings.blockedCountries[country] = this.checked;
                saveSettings();
                renderCountries(countrySearch.value);
            });
            
            countriesList.appendChild(countryItem);
        });

        if (filteredCountries.length === 0) {
            countriesList.innerHTML = '<div class="country-item" style="justify-content: center; color: #657786;">No countries found</div>';
        }
    }

    // Render blocked users list
    function renderUsers() {
        usersList.innerHTML = '';
        
        if (settings.blockedUsers.length === 0) {
            usersList.innerHTML = '<div class="no-items">No users blocked</div>';
            return;
        }
        
        settings.blockedUsers.forEach(username => {
            const userRow = document.createElement('div');
            userRow.className = 'item-row';
            userRow.innerHTML = `
                <span class="item-text">${username}</span>
                <button class="remove-btn" data-username="${username}">Remove</button>
            `;
            
            usersList.appendChild(userRow);
        });
        
        // Add event listeners to remove buttons
        usersList.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', function() {
                const username = this.getAttribute('data-username');
                removeUser(username);
            });
        });
    }

    // Render blocked keywords list
    function renderKeywords() {
        keywordsList.innerHTML = '';
        
        if (settings.blockedKeywords.length === 0) {
            keywordsList.innerHTML = '<div class="no-items">No keywords blocked</div>';
            return;
        }
        
        settings.blockedKeywords.forEach(keyword => {
            const keywordRow = document.createElement('div');
            keywordRow.className = 'item-row';
            keywordRow.innerHTML = `
                <span class="item-text">${keyword}</span>
                <button class="remove-btn" data-keyword="${keyword}">Remove</button>
            `;
            
            keywordsList.appendChild(keywordRow);
        });
        
        // Add event listeners to remove buttons
        keywordsList.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', function() {
                const keyword = this.getAttribute('data-keyword');
                removeKeyword(keyword);
            });
        });
    }

    // Add user to blocked list
    function addUser(username) {
        if (!username) return;
        
        // Clean username (remove @ if present)
        const cleanUsername = username.replace('@', '').trim();
        
        if (cleanUsername && !settings.blockedUsers.includes(cleanUsername)) {
            settings.blockedUsers.push(cleanUsername);
            saveSettings();
            renderUsers();
            usernameInput.value = '';
        }
    }

    // Remove user from blocked list
    function removeUser(username) {
        settings.blockedUsers = settings.blockedUsers.filter(user => user !== username);
        saveSettings();
        renderUsers();
    }

    // Add keyword to blocked list
    function addKeyword(keyword) {
        if (!keyword) return;
        
        const cleanKeyword = keyword.trim();
        
        if (cleanKeyword && !settings.blockedKeywords.includes(cleanKeyword)) {
            settings.blockedKeywords.push(cleanKeyword);
            saveSettings();
            renderKeywords();
            keywordInput.value = '';
        }
    }

    // Remove keyword from blocked list
    function removeKeyword(keyword) {
        settings.blockedKeywords = settings.blockedKeywords.filter(kw => kw !== keyword);
        saveSettings();
        renderKeywords();
    }

    // Save settings to storage
    async function saveSettings() {
        await chrome.storage.sync.set({ settings });
        statusMessage.textContent = 'Settings saved - updating tweets...';
        
        // Tell content script to rescan with new settings
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { 
                action: "updateSettings",
                settings: settings 
            });
        });
        
        setTimeout(() => statusMessage.textContent = '', 3000);
    }

    // Event Listeners
    masterToggle.addEventListener('change', function() {
        settings.enabled = this.checked;
        saveSettings();
        updateUI();
    });

    filterModeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                settings.filterMode = this.value;
                saveSettings();
            }
        });
    });

    countrySearch.addEventListener('input', function() {
        renderCountries(this.value);
    });

    selectAllBtn.addEventListener('click', function() {
        countries.forEach(country => {
            settings.blockedCountries[country] = true;
        });
        renderCountries(countrySearch.value);
        saveSettings();
    });

    deselectAllBtn.addEventListener('click', function() {
        countries.forEach(country => {
            settings.blockedCountries[country] = false;
        });
        renderCountries(countrySearch.value);
        saveSettings();
    });

    // User filtering events
    addUsernameBtn.addEventListener('click', function() {
        addUser(usernameInput.value);
    });

    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addUser(this.value);
        }
    });

    // Keyword filtering events
    addKeywordBtn.addEventListener('click', function() {
        addKeyword(keywordInput.value);
    });

    keywordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addKeyword(this.value);
        }
    });

    refreshBtn.addEventListener('click', async function() {
        statusMessage.textContent = 'Scanning for content...';
        
        chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
            const response = await chrome.tabs.sendMessage(tabs[0].id, {action: "getStats"});
            if (response) {
                currentStats = response.stats;
                settings.detectedCountries = response.detectedCountries;
                updateStatsDisplay();
                renderCountries(countrySearch.value);
            }
            
            statusMessage.textContent = 'Scan complete!';
            setTimeout(() => statusMessage.textContent = '', 2000);
        });
    });

    resetStatsBtn.addEventListener('click', async function() {
        chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
            await chrome.tabs.sendMessage(tabs[0].id, {action: "resetStats"});
            currentStats = {
                totalTweetsScanned: 0,
                tweetsHidden: 0,
                accountsWithLocation: 0
            };
            updateStatsDisplay();
            statusMessage.textContent = 'Stats reset!';
            setTimeout(() => statusMessage.textContent = '', 2000);
        });
    });

    // Initialize
    loadSettings();
    
    // Refresh stats every 5 seconds when popup is open
    const statsInterval = setInterval(async () => {
        const result = await chrome.storage.sync.get(['filterStats']);
        if (result.filterStats) {
            currentStats = result.filterStats;
            updateStatsDisplay();
        }
    }, 5000);

    window.addEventListener('unload', () => {
        clearInterval(statsInterval);
    });
});