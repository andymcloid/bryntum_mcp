/**
 * Search Page Component
 *
 * Handles document search with RAG integration.
 * Follows Single Responsibility Principle (SRP).
 */
import { Component } from '../components/Component.js';
import { apiClient } from '../api/ApiClient.js';

export class SearchPage extends Component {
    constructor() {
        super();
        this.results = [];
        this.loading = false;
        this.searched = false;
        this.versions = [];
    }

    async render() {
        // Expose instance globally for onclick handlers
        window.searchPage = this;

        // Load versions
        try {
            const versionsData = await apiClient.getVersions();
            this.versions = versionsData.versions || [];
        } catch (error) {
            console.error('Failed to load versions:', error);
        }

        const versionsOptions = this.versions.map(v => `<option value="${v}">${v}</option>`).join('');

        const html = `
            <div class="fade-in">
                <div class="mb-8">
                    <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Search Documentation</h1>
                    <p style="color: var(--text-secondary);">
                        Use natural language to find relevant documentation
                    </p>
                </div>

                <form id="searchForm" class="mb-8">
                    <div class="card" style="margin-bottom: 1rem;">
                        <div class="card-content">
                            <div style="margin-bottom: 1rem;">
                                <label class="input-label" for="searchInput">Search Query</label>
                                <input
                                    type="text"
                                    id="searchInput"
                                    class="input"
                                    placeholder="How do I create a grid with grouping?"
                                    required
                                />
                            </div>

                            <details style="margin-bottom: 1rem;">
                                <summary style="cursor: pointer; font-weight: 500; color: var(--primary); margin-bottom: 0.75rem;">
                                    Advanced Filters (optional)
                                </summary>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; padding: 0.5rem 0;">
                                    <div>
                                        <label class="input-label" for="versionSelect">Version</label>
                                        <select id="versionSelect" class="input">
                                            <option value="">Latest</option>
                                            ${versionsOptions}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="input-label" for="productSelect">Product</label>
                                        <select id="productSelect" class="input">
                                            <option value="">All Products</option>
                                            <option value="grid">Grid</option>
                                            <option value="scheduler">Scheduler</option>
                                            <option value="schedulerpro">Scheduler Pro</option>
                                            <option value="gantt">Gantt</option>
                                            <option value="calendar">Calendar</option>
                                            <option value="taskboard">Taskboard</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="input-label" for="frameworkSelect">Framework</label>
                                        <select id="frameworkSelect" class="input">
                                            <option value="">All Frameworks</option>
                                            <option value="vanilla">Vanilla JS</option>
                                            <option value="react">React</option>
                                            <option value="angular">Angular</option>
                                            <option value="vue">Vue</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="input-label" for="limitSelect">Results Limit</label>
                                        <select id="limitSelect" class="input">
                                            <option value="3">3 results</option>
                                            <option value="5" selected>5 results</option>
                                            <option value="10">10 results</option>
                                            <option value="20">20 results</option>
                                        </select>
                                    </div>
                                </div>
                            </details>

                            <button type="submit" class="btn btn-primary btn-full">
                                <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                                <span>Search</span>
                            </button>
                        </div>
                    </div>
                </form>

                <div id="searchStats"></div>
                <div id="searchResults"></div>
            </div>
        `;

        this.setContent(html);
        this.attachEventListeners();
    }

    attachEventListeners() {
        const form = document.getElementById('searchForm');
        form.addEventListener('submit', (e) => this.handleSearch(e));
    }

    async handleSearch(e) {
        e.preventDefault();

        const input = document.getElementById('searchInput');
        const query = input.value.trim();

        if (!query) return;

        // Get all filter values
        const versionSelect = document.getElementById('versionSelect');
        const productSelect = document.getElementById('productSelect');
        const frameworkSelect = document.getElementById('frameworkSelect');
        const limitSelect = document.getElementById('limitSelect');

        const version = versionSelect.value || null; // null means latest
        const limit = parseInt(limitSelect.value) || 5;

        // Build filter object (only include non-empty values)
        const filter = {};
        if (productSelect.value) filter.product = productSelect.value;
        if (frameworkSelect.value) filter.framework = frameworkSelect.value;

        this.loading = true;
        this.searched = true;
        this.showSearching();

        try {
            const response = await apiClient.search(query, {
                limit,
                version,
                filter
            });
            this.results = response.results;
            this.renderResults(response.durationMs, response.version, filter);
        } catch (error) {
            console.error('Search failed:', error);
            document.getElementById('searchResults').innerHTML = `
                <div class="alert alert-error">
                    Search failed: ${error.message}
                </div>
            `;
        } finally {
            this.loading = false;
        }
    }

    showSearching() {
        document.getElementById('searchStats').innerHTML = `
            <div class="flex items-center gap-2" style="color: var(--text-secondary); font-size: 0.875rem;">
                <div class="loader loader-small"></div>
                <span>Searching...</span>
            </div>
        `;
        document.getElementById('searchResults').innerHTML = '';
    }

    renderResults(duration, version, filter = {}) {
        // Build active filters display
        const activeFilters = [];
        if (version) activeFilters.push(`Version: ${version}`);
        if (filter.product) activeFilters.push(`Product: ${filter.product}`);
        if (filter.framework) activeFilters.push(`Framework: ${filter.framework}`);

        const filtersHtml = activeFilters.length > 0
            ? `<div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                ${activeFilters.map(f => `<span class="badge badge-secondary">${f}</span>`).join('')}
               </div>`
            : '';

        // Render stats
        document.getElementById('searchStats').innerHTML = `
            <div class="mb-4" style="font-size: 0.875rem; color: var(--text-secondary);">
                Found ${this.results.length} results in ${duration}ms
                ${filtersHtml}
            </div>
        `;

        // Render results
        const resultsContainer = document.getElementById('searchResults');

        if (this.results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="card">
                    <div class="card-content" style="text-align: center; padding: 3rem;">
                        <p style="color: var(--text-secondary);">
                            No results found. Try a different search query.
                        </p>
                    </div>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = this.results
            .map(result => this.renderResult(result))
            .join('');
    }

    renderResult(result) {
        const relevancePercent = (parseFloat(result.relevance) * 100).toFixed(1);
        const tags = result.metadata.tags || [];

        // URL-encode the document path for API calls
        const documentPath = encodeURIComponent(result.metadata.documentPath);
        const version = encodeURIComponent(result.metadata.version);

        return `
            <div class="search-result fade-in">
                <div class="search-result-header">
                    <div style="flex: 1;">
                        <div class="search-result-title">
                            ${result.metadata.heading || result.metadata.documentPath}
                        </div>
                        <div class="search-result-path">
                            ${result.metadata.documentPath}
                        </div>
                    </div>
                    <div class="badge badge-secondary">
                        ${relevancePercent}% match
                    </div>
                </div>
                <div class="search-result-text">
                    ${this.escapeHtml(result.text)}
                </div>
                <div class="search-result-meta">
                    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                        <span>Chunk ${result.metadata.chunkIndex + 1} of ${result.metadata.totalChunks}</span>
                        ${tags.length > 0 ? `
                            <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                                ${tags.map(tag => `<span class="badge" style="font-size: 0.7rem; padding: 0.125rem 0.5rem;">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div style="margin-left: auto; display: flex; gap: 0.5rem;">
                            <a href="/api/doc/${result.id}?download=true" class="btn btn-sm btn-secondary" download>
                                Download Chunk
                            </a>
                            <a href="/api/doc/full/${result.metadata.documentPath}?version=${version}" class="btn btn-sm btn-primary" download>
                                Download Full
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
