// ============================================
// Today in Biology - Frontend JavaScript
// ============================================

// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://fcspabfvjdueqzznvctb.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3BhYmZ2amR1ZXF6em52Y3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Njg4ODEsImV4cCI6MjA4MzU0NDg4MX0.EyKErxJZkyTs1_YrbVU-zK_LwHodVTt-gMjLTLJZKGo'
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    date: document.getElementById('date'),
    loading: document.getElementById('loading'),
    content: document.getElementById('content'),
    error: document.getElementById('error'),
    sources: document.getElementById('sources'),
    paperList: document.getElementById('paper-list')
};

// ============================================
// Utility Functions
// ============================================

/**
 * Format a date as "January 9, 2026"
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format date for today's display
 */
function formatTodayDate() {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Convert plain text content to HTML paragraphs
 */
function textToHtml(text) {
    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
}

/**
 * Show loading state
 */
function showLoading() {
    elements.loading.style.display = 'block';
    elements.content.style.display = 'none';
    elements.error.style.display = 'none';
    elements.sources.style.display = 'none';
}

/**
 * Show error state
 */
function showError(message) {
    elements.loading.style.display = 'none';
    elements.content.style.display = 'none';
    elements.error.style.display = 'block';
    elements.error.querySelector('p').textContent = message || 'Unable to load today\'s story. Please try again later.';
}

/**
 * Show content
 */
function showContent(storyHtml, papers) {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'none';
    elements.content.style.display = 'block';
    elements.content.innerHTML = storyHtml;

    // Show source papers
    if (papers && papers.length > 0) {
        elements.sources.style.display = 'block';
        elements.paperList.innerHTML = papers.map(paper => `
            <li>
                <p class="paper-title">
                    <a href="https://doi.org/${paper.doi}" target="_blank" rel="noopener">
                        ${paper.title}
                    </a>
                </p>
                <p class="paper-meta">
                    ${paper.authors ? paper.authors.split(';').slice(0, 3).join(', ') : 'Authors unavailable'}
                    ${paper.authors && paper.authors.split(';').length > 3 ? ' et al.' : ''}
                    ${paper.category ? ` · <span class="paper-category">${paper.category.replace(/_/g, ' ')}</span>` : ''}
                </p>
            </li>
        `).join('');
    }
}

// ============================================
// Supabase API
// ============================================

/**
 * Fetch data from Supabase
 */
async function supabaseFetch(table, query = '') {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}${query}`;
    const response = await fetch(url, {
        headers: {
            'apikey': CONFIG.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Supabase error: ${response.status}`);
    }

    return response.json();
}

/**
 * Fetch the latest daily story
 */
async function fetchLatestStory() {
    const stories = await supabaseFetch(
        'daily_story',
        '?order=created_at.desc&limit=1'
    );

    if (!stories || stories.length === 0) {
        return null;
    }

    return stories[0];
}

/**
 * Fetch papers by their IDs
 */
async function fetchPapersByIds(ids) {
    if (!ids || ids.length === 0) {
        return [];
    }

    // Format IDs for Supabase filter
    const idsFilter = ids.map(id => `"${id}"`).join(',');
    const papers = await supabaseFetch(
        'papers',
        `?id=in.(${idsFilter})`
    );

    return papers || [];
}

// ============================================
// Main Application
// ============================================

async function init() {
    // Set today's date in header
    elements.date.textContent = formatTodayDate();

    // Check if Supabase is configured
    if (CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL' ||
        CONFIG.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        showError('Please configure your Supabase credentials in app.js');
        return;
    }

    showLoading();

    try {
        // Fetch the latest story
        const story = await fetchLatestStory();

        if (!story) {
            showError('No stories available yet. Please check back later or run the Edge Function.');
            return;
        }

        // Fetch associated papers
        const papers = await fetchPapersByIds(story.paper_ids);

        // Display content
        const storyHtml = textToHtml(story.content);
        showContent(storyHtml, papers);

        // Update the date to the story's creation date
        elements.date.textContent = formatDate(story.created_at);

    } catch (error) {
        console.error('Error loading story:', error);
        showError('Unable to load today\'s story. Please try again later.');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
