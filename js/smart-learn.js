// Smart Learn Tab - YouTube + Wikipedia Integration
console.log("Loading smart-learn.js...");

var learnSearchHistory = [];
var learnCurrentResults = [];

function initSmartLearn() {
    console.log("Smart Learn initialized");
    loadSearchHistory();
}

function loadSearchHistory() {
    try {
        var saved = localStorage.getItem('learnSearchHistory');
        if (saved) {
            learnSearchHistory = JSON.parse(saved);
        }
    } catch (e) {
        console.warn("Could not load search history:", e);
        learnSearchHistory = [];
    }
}

function saveSearchHistory() {
    try {
        localStorage.setItem('learnSearchHistory', JSON.stringify(learnSearchHistory.slice(0, 10)));
    } catch (e) {
        console.warn("Could not save search history:", e);
    }
}

function searchTopic() {
    var searchInput = document.getElementById('learnSearchInput');
    if (!searchInput) {
        alert('Search input not found');
        return;
    }

    var topic = searchInput.value.trim();
    if (!topic) {
        alert('Please enter a topic to search');
        return;
    }

    // Add to search history
    if (learnSearchHistory.indexOf(topic) === -1) {
        learnSearchHistory.unshift(topic);
        saveSearchHistory();
    }

    // Show loading state
    var resultsContainer = document.getElementById('learnResultsContainer');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="learn-loading"><i class="fa-solid fa-spinner"></i> Searching...</div>';
    }

    // Fetch Wikipedia article
    fetchWikipediaArticle(topic);
}

function fetchWikipediaArticle(topic) {
    var encodedTopic = encodeURIComponent(topic);
    var wikiUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodedTopic;

    fetch(wikiUrl)
        .then(function (response) {
            if (!response.ok) throw new Error('Wikipedia article not found');
            return response.json();
        })
        .then(function (data) {
            displayResults(topic, data);
        })
        .catch(function (error) {
            console.warn("Wikipedia fetch error:", error);
            displayResults(topic, null);
        });
}

function displayResults(topic, wikiData) {
    var resultsContainer = document.getElementById('learnResultsContainer');
    if (!resultsContainer) return;

    var html = '';

    // Wikipedia Article Section
    if (wikiData) {
        html += '<div class="learn-section">';
        html += '<h3 class="learn-section-title"><i class="fa-solid fa-book"></i> Wikipedia Article</h3>';
        html += '<div class="learn-article-card">';

        if (wikiData.thumbnail) {
            html += '<img src="' + escapeHtml(wikiData.thumbnail.source) + '" alt="' + escapeHtml(wikiData.title) + '" class="learn-article-image" />';
        }

        html += '<div class="learn-article-content">';
        html += '<h4 class="learn-article-title">' + escapeHtml(wikiData.title) + '</h4>';
        html += '<p class="learn-article-desc">' + escapeHtml(wikiData.extract || 'No description available') + '</p>';
        html += '<a href="' + escapeHtml(wikiData.content_urls.mobile.page) + '" target="_blank" class="learn-link-btn">';
        html += '<i class="fa-solid fa-arrow-up-right-from-square"></i> Read Full Article';
        html += '</a>';
        html += '</div>';

        html += '</div>';
        html += '</div>';
    }

    // YouTube Videos Section
    html += '<div class="learn-section">';
    html += '<h3 class="learn-section-title"><i class="fa-solid fa-play"></i> YouTube Videos</h3>';
    html += '<div class="learn-videos-grid">';

    var youtubeSearchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(topic);

    // Create video cards with embedded search
    var videoTitles = [
        'Introduction to ' + topic,
        'Learn ' + topic + ' - Full Tutorial',
        topic + ' Explained'
    ];

    for (var i = 0; i < videoTitles.length; i++) {
        var videoTitle = videoTitles[i];
        var videoSearchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(videoTitle);

        html += '<div class="learn-video-card">';
        html += '<div class="learn-video-thumbnail">';
        html += '<i class="fa-solid fa-play"></i>';
        html += '</div>';
        html += '<div class="learn-video-content">';
        html += '<h4 class="learn-video-title">' + escapeHtml(videoTitle) + '</h4>';
        html += '<p class="learn-video-channel">YouTube</p>';
        html += '<a href="' + videoSearchUrl + '" target="_blank" class="learn-link-btn">';
        html += '<i class="fa-solid fa-arrow-up-right-from-square"></i> Watch on YouTube';
        html += '</a>';
        html += '</div>';
        html += '</div>';
    }

    html += '</div>';
    html += '</div>';

    // Additional Resources Section
    html += '<div class="learn-section">';
    html += '<h3 class="learn-section-title"><i class="fa-solid fa-link"></i> Quick Links</h3>';
    html += '<div class="learn-quick-links">';
    html += '<a href="https://www.youtube.com/results?search_query=' + encodeURIComponent(topic) + '" target="_blank" class="learn-quick-link">';
    html += '<i class="fa-solid fa-youtube"></i> Search YouTube';
    html += '</a>';
    html += '<a href="https://en.wikipedia.org/wiki/' + encodeURIComponent(topic.replace(/ /g, '_')) + '" target="_blank" class="learn-quick-link">';
    html += '<i class="fa-solid fa-book"></i> Wikipedia';
    html += '</a>';
    html += '<a href="https://www.google.com/search?q=' + encodeURIComponent(topic) + '" target="_blank" class="learn-quick-link">';
    html += '<i class="fa-solid fa-magnifying-glass"></i> Google Search';
    html += '</a>';
    html += '</div>';
    html += '</div>';

    resultsContainer.innerHTML = html;
}

function showSearchHistory() {
    var historyContainer = document.getElementById('learnSearchHistory');
    if (!historyContainer) return;

    if (learnSearchHistory.length === 0) {
        historyContainer.innerHTML = '<div class="learn-empty-history">No search history yet</div>';
        return;
    }

    var html = '<div class="learn-history-list">';
    for (var i = 0; i < learnSearchHistory.length; i++) {
        var search = learnSearchHistory[i];
        html += '<button class="learn-history-item" onclick="searchTopicFromHistory(\'' + escapeHtml(search) + '\')">';
        html += '<i class="fa-solid fa-clock"></i> ' + escapeHtml(search);
        html += '</button>';
    }
    html += '</div>';

    historyContainer.innerHTML = html;
}

function searchTopicFromHistory(topic) {
    var searchInput = document.getElementById('learnSearchInput');
    if (searchInput) {
        searchInput.value = topic;
    }
    searchTopic();
}

function clearSearchHistory() {
    if (confirm('Clear all search history?')) {
        learnSearchHistory = [];
        saveSearchHistory();
        showSearchHistory();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export to window
window.initSmartLearn = initSmartLearn;
window.searchTopic = searchTopic;
window.searchTopicFromHistory = searchTopicFromHistory;
window.clearSearchHistory = clearSearchHistory;
window.showSearchHistory = showSearchHistory;

console.log("✅ smart-learn.js loaded successfully");
