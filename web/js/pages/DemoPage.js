/**
 * Demo Page Component
 *
 * Live Bryntum Grid code editor with AI assistance using MCP search
 */
import { Component } from '../components/Component.js';

export class DemoPage extends Component {
    constructor() {
        super();
        this.editor = null;
        this.currentGrid = null;
        this.refreshTimeout = null;
        this.debugExpanded = true;
    }

    async render() {
        const content = `
            <div class="fade-in">
                <div class="demo-header-section">
                    <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Live Bryntum Grid Demo</h1>
                    <p style="color: var(--text-secondary);">
                        Interactive code editor with AI assistance powered by MCP
                    </p>
                </div>

                <!-- Status overlay loader -->
                <div class="demo-status-overlay" id="demo-status-overlay">
                    <div class="demo-status-content">
                        <div class="loader"></div>
                        <span id="status-text">Loading...</span>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 1.5rem;">
                    <div class="demo-tabs">
                        <button class="demo-tab active" data-tab="preview">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            Preview
                        </button>
                        <button class="demo-tab" data-tab="code">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                            </svg>
                            Code
                        </button>
                    </div>

                    <div class="demo-tab-content active" id="preview-tab">
                        <div id="preview-container" class="preview-container"></div>
                    </div>

                    <div class="demo-tab-content" id="code-tab">
                        <div id="code-editor" class="code-editor"></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">AI Code Generator</h3>
                        <p class="card-description">Describe what you want to build and let AI generate the code</p>
                    </div>
                    <div class="card-content">
                        <div class="demo-prompt-container">
                            <textarea
                                id="prompt-input"
                                class="input demo-prompt-input"
                                placeholder="e.g., 'Create a grid with employee data including name, department, salary, and hire date'"
                                rows="3"
                            ></textarea>
                            <button id="generate-btn" class="btn btn-primary" style="align-self: flex-start;">
                                Generate Code
                            </button>
                        </div>

                        <!-- Debug Log Section -->
                        <div id="debug-section" class="debug-section" style="display: none; margin-top: 1.5rem;">
                            <div class="debug-header" onclick="window.demoPage?.toggleDebugContent()">
                                <span style="font-weight: 600; color: var(--text-primary);">🔍 Debug Log (Chain of Thought)</span>
                                <span id="debug-toggle" style="color: var(--text-secondary);">▼</span>
                            </div>
                            <div id="debug-content" class="debug-content">
                                <!-- Content will be populated dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Set the content
        this.setContent(content);

        // Initialize everything after content is in DOM
        await this.mount();
    }

    async mount() {
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Load CodeMirror dynamically
        await this.loadCodeMirror();

        // Initialize CodeMirror
        this.initializeEditor();

        // Set up event listeners
        this.setupEventListeners();

        // Initial render
        await this.renderGrid();
    }

    unmount() {
        // Clean up
        if (this.currentGrid) {
            this.currentGrid.destroy();
        }
        if (this.editor) {
            this.editor.toTextArea();
        }
        this.clearRefreshTimeout();
    }

    async loadCodeMirror() {
        // Load CodeMirror CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css';
        document.head.appendChild(cssLink);

        // Load CodeMirror JS
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js');
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/javascript/javascript.min.js');
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    initializeEditor() {
        const initialCode = this.getInitialCode();

        this.editor = CodeMirror(document.getElementById('code-editor'), {
            value: initialCode,
            mode: 'javascript',
            theme: 'default',
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: false
        });

        // Handle code changes
        this.editor.on('change', () => {
            this.clearRefreshTimeout();

            this.refreshTimeout = setTimeout(() => {
                if (document.getElementById('demo-status-overlay')) {
                    this.updateStatus('Rendering...', true);
                }

                this.renderGrid();
            }, 1000);
        });
    }

    getInitialCode() {
        const gridData = [
            { id: 1, name: 'Don A Taylor', age: 30, city: 'Moscow', food: 'Salad', color: 'Black' },
            { id: 2, name: 'John B Adams', age: 65, city: 'Paris', food: 'Bolognese', color: 'Orange' },
            { id: 3, name: 'John Doe', age: 40, city: 'London', food: 'Fish and Chips', color: 'Blue' },
            { id: 4, name: 'Maria Garcia', age: 28, city: 'Madrid', food: 'Paella', color: 'Green' },
            { id: 5, name: 'Li Wei', age: 35, city: 'Beijing', food: 'Dumplings', color: 'Yellow' },
            { id: 6, name: 'Sara Johnson', age: 32, city: 'Sydney', food: 'Sushi', color: 'Purple' },
            { id: 7, name: 'Lucas Brown', age: 22, city: 'Toronto', food: 'Poutine', color: 'Orange' },
            { id: 8, name: 'Emma Wilson', age: 27, city: 'Paris', food: 'Croissant', color: 'Pink' },
            { id: 9, name: 'Ivan Petrov', age: 45, city: 'St. Petersburg', food: 'Borscht', color: 'Grey' },
            { id: 10, name: 'Zhang Ming', age: 50, city: 'Shanghai', food: 'Hot Pot', color: 'Purple' }
        ];

        return `// Grid data
const data = ${JSON.stringify(gridData, null, 4)};

// Grid configuration
new Grid({
    height   : 500,
    appendTo : 'preview-container',
    columns  : [
        {
            text   : 'Name',
            field  : 'name',
            flex   : 2,
            editor : {
                type     : 'textfield',
                required : true
            }
        }, {
            text  : 'Age',
            field : 'age',
            width : 100,
            type  : 'number'
        }, {
            text  : 'City',
            field : 'city',
            flex  : 1
        }, {
            text  : 'Food',
            field : 'food',
            flex  : 1
        }, {
            type  : 'color',
            text  : 'Color',
            field : 'color',
            width : 80
        }
    ],
    data : data
});`;
    }

    async renderGrid() {
        try {
            // Load Bryntum if not already loaded
            if (!window.Grid) {
                await this.loadBryntum();
            }

            // Clear previous grid
            if (this.currentGrid) {
                this.currentGrid.destroy();
            }

            // Clear container
            const container = document.getElementById('preview-container');
            if (!container) {
                console.error('Preview container not found');
                return;
            }

            container.innerHTML = '';

            // Execute the code
            const code = this.editor.getValue();
            const func = new Function('Grid', code);
            func(window.Grid);

            // Store reference to the grid
            const gridEl = container.querySelector('.b-grid');
            if (gridEl && gridEl._domData && gridEl._domData.ownerCmp) {
                this.currentGrid = gridEl._domData.ownerCmp;
            }

            this.updateStatus('Rendered successfully');
        } catch (error) {
            console.error('Error rendering grid:', error);
            const container = document.getElementById('preview-container');
            if (container) {
                container.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
            }
            this.updateStatus('Error', false);
        }
    }

    async loadBryntum() {
        // Load Bryntum CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://bryntum.com/products/grid/build/grid.stockholm.css';
        document.head.appendChild(cssLink);

        // Load Bryntum Grid module
        const Grid = await import('https://bryntum.com/products/grid/build/grid.module.js');
        window.Grid = Grid.Grid;
    }

    setupEventListeners() {
        // Expose instance globally for debug toggle
        window.demoPage = this;

        // Tab switching
        const tabs = document.querySelectorAll('.demo-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;

                // Update active tab button
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Update active tab content
                document.querySelectorAll('.demo-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${targetTab}-tab`).classList.add('active');

                // Refresh CodeMirror when switching to code tab
                if (targetTab === 'code' && this.editor) {
                    setTimeout(() => this.editor.refresh(), 100);
                }
            });
        });

        // Generate button
        const generateBtn = document.getElementById('generate-btn');
        const promptInput = document.getElementById('prompt-input');

        generateBtn.addEventListener('click', () => this.generateWithAI());

        // Allow Ctrl/Cmd+Enter to submit
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.generateWithAI();
            }
        });
    }


    async generateWithAI() {
        const promptInput = document.getElementById('prompt-input');
        const generateBtn = document.getElementById('generate-btn');
        const prompt = promptInput.value.trim();

        if (!prompt) return;

        const currentCode = this.editor.getValue();

        generateBtn.disabled = true;
        generateBtn.innerHTML = 'Generating<span class="loading-spinner"></span>';

        if (document.getElementById('demo-status-overlay')) {
            this.updateStatus('Generating with AI...', true);
        }

        try {
            const response = await fetch('/api/generate-grid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    currentCode
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate code');
            }

            const data = await response.json();

            // Update the code editor with the new code
            this.editor.setValue(data.code);

            // Show debug information
            if (data.debug) {
                this.showDebugInfo(data.debug);
            }

            if (document.getElementById('demo-status-overlay')) {
                this.updateStatus('Code generated successfully');
            }
            promptInput.value = '';
        } catch (error) {
            console.error('Error generating code:', error);
            if (document.getElementById('demo-status-overlay')) {
                this.updateStatus('Error generating code', false);
            }
            alert('Error: ' + error.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate';
        }
    }

    updateStatus(text, isPending = false) {
        const statusOverlay = document.getElementById('demo-status-overlay');
        const statusText = document.getElementById('status-text');

        if (!statusOverlay || !statusText) {
            console.warn('Status elements not found');
            return;
        }

        statusText.textContent = text;

        if (isPending) {
            statusOverlay.classList.add('visible');
        } else {
            // Hide overlay after a short delay
            setTimeout(() => {
                if (statusOverlay) {
                    statusOverlay.classList.remove('visible');
                }
            }, 500);
        }
    }

    clearRefreshTimeout() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
    }

    toggleDebugContent() {
        this.debugExpanded = !this.debugExpanded;
        const content = document.getElementById('debug-content');
        const toggle = document.getElementById('debug-toggle');

        if (this.debugExpanded) {
            content.style.display = 'block';
            toggle.textContent = '▼';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▶';
        }
    }

    showDebugInfo(debug) {
        const debugSection = document.getElementById('debug-section');
        const debugContent = document.getElementById('debug-content');

        if (!debugSection || !debugContent) return;

        debugSection.style.display = 'block';

        const html = `
            <div class="debug-step">
                <div class="debug-step-header">1. User Prompt</div>
                <pre class="debug-code">${this.escapeHtml(debug.userPrompt)}</pre>
            </div>

            <div class="debug-step">
                <div class="debug-step-header">2. RAG Search Query</div>
                <pre class="debug-code">${this.escapeHtml(debug.searchQuery)}</pre>
                <div style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.8125rem;">
                    Found ${debug.ragResults.length} relevant documentation chunks
                </div>
            </div>

            <div class="debug-step">
                <div class="debug-step-header">3. RAG Results (Top ${debug.ragResults.length})</div>
                ${debug.ragResults.map(r => `
                    <div class="debug-rag-result">
                        <strong>Doc #${r.index}</strong> (Score: ${r.score})
                        <div style="margin-top: 0.25rem; font-size: 0.8125rem; color: var(--text-secondary);">
                            ${r.metadata.product || 'N/A'} - ${r.metadata.framework || 'N/A'}
                        </div>
                        <pre class="debug-code" style="margin-top: 0.5rem;">${this.escapeHtml(r.text)}</pre>
                    </div>
                `).join('')}
            </div>

            <div class="debug-step">
                <div class="debug-step-header">4. Context Sent to Claude (preview)</div>
                <pre class="debug-code">${this.escapeHtml(debug.docsContext)}</pre>
            </div>

            <div class="debug-step">
                <div class="debug-step-header">5. Full Prompt to Claude (preview)</div>
                <pre class="debug-code">${this.escapeHtml(debug.fullPrompt)}</pre>
            </div>

            <div class="debug-step">
                <div class="debug-step-header">6. Claude API Call</div>
                <div class="debug-info">
                    <strong>Model:</strong> ${debug.claudeModel}<br>
                    <strong>Tokens Used:</strong> ${debug.tokensUsed.input} input + ${debug.tokensUsed.output} output = ${debug.tokensUsed.input + debug.tokensUsed.output} total
                </div>
            </div>

            <div class="debug-step">
                <div class="debug-step-header">7. Claude Raw Response (preview)</div>
                <pre class="debug-code">${this.escapeHtml(debug.rawResponse)}</pre>
            </div>

            <div class="debug-step">
                <div class="debug-step-header">8. Extracted & Cleaned Code</div>
                <div class="debug-info" style="color: var(--success);">
                    ✓ Code extracted and inserted into editor
                </div>
            </div>
        `;

        debugContent.innerHTML = html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
