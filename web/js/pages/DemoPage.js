/**
 * Demo Page Component
 *
 * Live Bryntum component editor with AI assistance using MCP search
 * Supports: Grid, Scheduler, Scheduler Pro, Gantt, Taskboard
 */
import { Component } from '../components/Component.js';

export class DemoPage extends Component {
    constructor() {
        super();
        this.editors = {
            'data.json': null,
            'style.css': null,
            'demo.js': null
        };
        this.currentFile = 'demo.js';
        this.currentComponent = null;
        this.refreshTimeout = null;
        this.debugExpanded = true;
        this.loadedComponents = []; // Track which components were loaded
        this.bryntumLoaded = false; // Prevent multiple loads
        this.filesLoaded = false; // Track if all files are loaded
        this.programmaticChange = false; // Flag for programmatic changes
        this.importsConfig = null; // Store imports.js config (loaded from disk only)
    }

    async render() {
        const content = `
            <div class="fade-in">
                <div class="demo-header-section">
                    <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Live Bryntum Component Demo</h1>
                    <p style="color: var(--text-secondary);">
                        Interactive code editor with AI assistance - supports Grid, Scheduler, Gantt, Taskboard & more
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
                        <button class="demo-tab-reset" id="reset-btn" title="Reset to defaults">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            Reset
                        </button>
                    </div>

                    <div class="demo-tab-content active" id="preview-tab">
                        <div id="preview-container" class="preview-container"></div>
                    </div>

                    <div class="demo-tab-content" id="code-tab">
                        <div class="file-tabs" style="display: flex; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--surface); border-bottom: 1px solid var(--border);">
                            <button class="file-tab active" data-file="demo.js">📄 demo.js</button>
                            <button class="file-tab" data-file="data.json">📊 data.json</button>
                            <button class="file-tab" data-file="style.css">🎨 style.css</button>
                        </div>
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

        // Load Monaco Editor dynamically
        await this.loadMonaco();

        // Initialize Monaco Editor (async - loads files)
        await this.initializeEditor();

        // Set up event listeners
        this.setupEventListeners();

        // Initial render (now files are loaded)
        await this.renderComponent();
    }

    unmount() {
        // Clean up
        if (this.currentComponent) {
            this.currentComponent.destroy();
        }
        if (this.editor) {
            this.editor.dispose();
        }
        this.clearRefreshTimeout();
    }

    async loadMonaco() {
        // Check if Monaco is already loaded (global flag)
        if (window._monacoLoaded) {
            return;
        }

        // Check if Monaco is already available
        if (window.monaco) {
            window._monacoLoaded = true;
            return;
        }

        // Load Monaco Editor loader only if not already loaded
        if (!window.require) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs/loader.min.js');

            // Wait a bit for require to be available
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Configure Monaco (only once)
        return new Promise((resolve, reject) => {
            if (typeof require === 'undefined') {
                reject(new Error('AMD loader (require) not available'));
                return;
            }

            require.config({
                paths: {
                    'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs'
                }
            });

            require(['vs/editor/editor.main'], () => {
                window._monacoLoaded = true;
                resolve();
            }, reject);
        });
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async initializeEditor() {
        const container = document.getElementById('code-editor');

        if (!container) {
            console.error('Code editor container not found');
            return;
        }

        // Dispose any existing editor first
        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }

        // Clear the container completely and create a fresh wrapper div
        container.innerHTML = '';
        const editorWrapper = document.createElement('div');
        editorWrapper.style.width = '100%';
        editorWrapper.style.height = '100%';
        container.appendChild(editorWrapper);

        // Load file contents from localStorage or defaults
        await this.loadFileContents();

        const languages = {
            'demo.js': 'javascript',
            'data.json': 'json',
            'style.css': 'css'
        };

        // Create single editor that we'll swap content for
        // Set programmaticChange flag during initialization
        this.programmaticChange = true;

        this.editor = monaco.editor.create(editorWrapper, {
            value: this.fileContents['demo.js'],
            language: languages['demo.js'],
            theme: 'vs',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            tabSize: 4,
            insertSpaces: true,
            readOnly: false
        });

        // Reset flag after initialization
        setTimeout(() => {
            this.programmaticChange = false;
        }, 50);

        // Handle code changes
        this.editor.onDidChangeModelContent(() => {
            // Ignore programmatic changes (like switching tabs)
            if (this.programmaticChange) {
                return;
            }

            // Don't render until all files are loaded
            if (!this.filesLoaded) {
                return;
            }

            // Save current file content
            this.fileContents[this.currentFile] = this.editor.getValue();

            // Save to localStorage
            this.saveFileContents();

            this.clearRefreshTimeout();

            this.refreshTimeout = setTimeout(() => {
                if (document.getElementById('demo-status-overlay')) {
                    this.updateStatus('Rendering...', true);
                }

                this.renderComponent();
            }, 1000);
        });
    }

    async loadFileContents() {
        const files = ['demo.js', 'data.json', 'style.css'];
        this.fileContents = {};

        for (const filename of files) {
            // Try localStorage first
            const stored = localStorage.getItem(`bryntum-demo-${filename}`);

            if (stored !== null) {
                this.fileContents[filename] = stored;
            } else {
                // Load from defaults
                try {
                    const response = await fetch(`/defaults/${filename}`);
                    if (response.ok) {
                        this.fileContents[filename] = await response.text();
                    } else {
                        // Fallback to hardcoded defaults
                        this.fileContents[filename] = this.getHardcodedDefault(filename);
                    }
                } catch (error) {
                    console.error(`Failed to load default for ${filename}:`, error);
                    this.fileContents[filename] = this.getHardcodedDefault(filename);
                }
            }
        }

        // Load imports.js from disk only (not in editor)
        try {
            const response = await fetch('/defaults/imports.js');
            if (response.ok) {
                this.importsConfig = await response.text();
            }
        } catch (error) {
            console.error('Failed to load imports.js:', error);
        }

        // Mark files as loaded
        this.filesLoaded = true;
    }

    saveFileContents() {
        const files = ['demo.js', 'data.json', 'style.css'];
        for (const filename of files) {
            if (this.fileContents[filename] !== undefined) {
                localStorage.setItem(`bryntum-demo-${filename}`, this.fileContents[filename]);
            }
        }
        // Don't save imports.js as it's read-only
    }

    async resetToDefaults() {
        if (!confirm('Reset all files to defaults? This will reload the page to apply changes.')) {
            return;
        }

        // Clear localStorage
        localStorage.removeItem('bryntum-demo-demo.js');
        localStorage.removeItem('bryntum-demo-data.json');
        localStorage.removeItem('bryntum-demo-style.css');

        // Reload the page to reset everything including Bryntum components
        // (ES6 modules cannot be unloaded, so we need a full page refresh)
        window.location.reload();
    }

    getHardcodedDefault(filename) {
        // Fallback defaults if fetch fails
        switch (filename) {
            case 'demo.js':
                return this.getInitialDemoCode();
            case 'data.json':
                return this.getInitialDataCode();
            case 'style.css':
                return this.getInitialStyleCode();
            default:
                return '';
        }
    }

    getInitialDemoCode() {
        return `// Grid configuration
new Grid({
    height   : '100%',
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

    getInitialDataCode() {
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

        return JSON.stringify(gridData, null, 4);
    }

    getInitialStyleCode() {
        return `/* Custom styles for your component */

/* Example: Change header background */
.b-grid-header {
    /* background: linear-gradient(to right, #667eea 0%, #764ba2 100%); */
}

/* Example: Customize row styling */
.b-grid-row {
    /* Add your custom styles here */
}`;
    }

    async renderComponent() {
        try {
            // Don't render until all files are loaded
            if (!this.filesLoaded) {
                return;
            }

            // Load Bryntum components if not already loaded
            if (!this.bryntumLoaded) {
                await this.loadBryntum();
            }

            // Clear previous component
            if (this.currentComponent) {
                this.currentComponent.destroy();
            }

            // Clear container
            const container = document.getElementById('preview-container');
            if (!container) {
                console.error('Preview container not found');
                return;
            }

            container.innerHTML = '';

            // Remove old custom styles
            const oldStyle = document.getElementById('demo-custom-styles');
            if (oldStyle) oldStyle.remove();

            // Inject custom CSS
            const customCSS = this.fileContents['style.css'] || '';
            if (customCSS.trim()) {
                const styleEl = document.createElement('style');
                styleEl.id = 'demo-custom-styles';
                styleEl.textContent = customCSS;
                document.head.appendChild(styleEl);
            }

            // Parse data.json
            let data;
            try {
                const dataContent = this.fileContents['data.json'] || '[]';
                data = JSON.parse(dataContent);
            } catch (error) {
                console.error('Error parsing data.json:', error);
                data = [];
            }

            // Execute demo.js with all available Bryntum components and data
            const demoCode = this.fileContents['demo.js'] || '';

            // Use dynamically loaded components
            const componentNames = this.loadedComponents.length > 0
                ? this.loadedComponents
                : ['Grid', 'Scheduler', 'SchedulerPro', 'Gantt', 'TaskBoard'];

            const componentValues = componentNames.map(name => window[name]);

            // Create function with dynamic parameters
            const func = new Function(...componentNames, 'data', demoCode);
            func(...componentValues, data);

            // Store reference to the component (try all possible selectors)
            const componentSelectors = ['.b-grid', '.b-scheduler', '.b-schedulerpro', '.b-gantt', '.b-taskboard'];
            for (const selector of componentSelectors) {
                const el = container.querySelector(selector);
                if (el && el._domData && el._domData.ownerCmp) {
                    this.currentComponent = el._domData.ownerCmp;
                    break;
                }
            }

            this.updateStatus('Rendered successfully');
        } catch (error) {
            console.error('Error rendering component:', error);
            const container = document.getElementById('preview-container');
            if (container) {
                container.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
            }
            this.updateStatus('Error', false);
        }
    }

    async loadBryntum() {
        // Prevent multiple loads
        if (this.bryntumLoaded) {
            return;
        }

        // Parse imports.js to get imports configuration
        const importsJs = this.importsConfig;

        if (!importsJs) {
            throw new Error('imports.js not loaded from disk');
        }

        // Extract IMPORTS array from imports.js
        let imports;
        try {
            // Execute imports.js in a safe context to get IMPORTS
            const func = new Function(importsJs + '\nreturn IMPORTS;');
            imports = func();

            if (!Array.isArray(imports)) {
                throw new Error('IMPORTS is not defined or is not an array');
            }
        } catch (error) {
            console.error('Failed to parse imports.js:', error);
            throw new Error(`imports.js parse error: ${error.message}. Please check your imports.js file syntax.`);
        }

        // Separate CSS and JS imports
        const cssImports = imports.filter(item => item.css).map(item => item.css);
        const jsImports = imports.filter(item => item.js).map(item => item.js);

        // Load all CSS files (in order)
        cssImports.forEach(cssUrl => {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssUrl;
            cssLink.dataset.bryntumCss = 'true';
            document.head.appendChild(cssLink);
        });

        // Load all JS modules (in parallel)
        const modulePromises = jsImports.map(jsUrl => import(jsUrl));
        const modules = await Promise.all(modulePromises);

        // Auto-detect and expose ALL exports from each module
        const allExports = [];
        modules.forEach((module, index) => {
            const exportNames = Object.keys(module);

            exportNames.forEach(exportName => {
                // Expose each export globally
                window[exportName] = module[exportName];
                allExports.push(exportName);
            });
        });

        // Store loaded component names for later use
        this.loadedComponents = allExports;
        this.bryntumLoaded = true;
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

                // Layout Monaco Editor when switching to code tab
                if (targetTab === 'code' && this.editor) {
                    setTimeout(() => this.editor.layout(), 100);
                }
            });
        });

        // File tab switching
        const fileTabs = document.querySelectorAll('.file-tab');
        fileTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetFile = e.currentTarget.dataset.file;
                this.switchFile(targetFile);

                // Update active file tab
                fileTabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        resetBtn.addEventListener('click', () => this.resetToDefaults());

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

    switchFile(filename) {
        // Don't switch until files are loaded
        if (!this.filesLoaded) {
            return;
        }

        // Save current file content
        this.fileContents[this.currentFile] = this.editor.getValue();

        // Save to localStorage before switching
        this.saveFileContents();

        // Switch to new file
        this.currentFile = filename;

        // Update editor content and language
        const languages = {
            'demo.js': 'javascript',
            'data.json': 'json',
            'style.css': 'css'
        };

        // Mark as programmatic change to prevent re-render
        this.programmaticChange = true;

        // Dispose old model before creating new one to prevent memory leaks
        const oldModel = this.editor.getModel();
        if (oldModel) {
            oldModel.dispose();
        }

        // Create new model with the new language and content
        const model = monaco.editor.createModel(
            this.fileContents[filename] || '',
            languages[filename]
        );
        this.editor.setModel(model);

        // Reset flag after a brief delay (Monaco processes events async)
        setTimeout(() => {
            this.programmaticChange = false;
        }, 50);
    }


    async generateWithAI() {
        const promptInput = document.getElementById('prompt-input');
        const generateBtn = document.getElementById('generate-btn');
        const prompt = promptInput.value.trim();

        if (!prompt) return;

        // Save current editor content before generating
        this.fileContents[this.currentFile] = this.editor.getValue();

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
                    files: {
                        'demo.js': this.fileContents['demo.js'],
                        'data.json': this.fileContents['data.json'],
                        'style.css': this.fileContents['style.css']
                    },
                    availableComponents: this.loadedComponents // Send list of loaded exports
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate code');
            }

            const data = await response.json();

            // Check for errors
            if (data.error) {
                throw new Error(data.message || data.error);
            }

            // Validate response has at least one file
            if (!data.files || Object.keys(data.files).length === 0) {
                throw new Error('AI did not respond with any file changes. Please try again.');
            }

            // Update files from AI response (only the ones that were returned)
            if (data.files['demo.js']) this.fileContents['demo.js'] = data.files['demo.js'];
            if (data.files['data.json']) this.fileContents['data.json'] = data.files['data.json'];
            if (data.files['style.css']) this.fileContents['style.css'] = data.files['style.css'];
            // Note: imports.js is not updated (read-only)

            // Save updated files to localStorage
            this.saveFileContents();

            // Update current editor view (mark as programmatic to prevent immediate re-render)
            this.programmaticChange = true;

            // Update the current model's value
            const currentModel = this.editor.getModel();
            if (currentModel) {
                currentModel.setValue(this.fileContents[this.currentFile]);
            }

            setTimeout(() => {
                this.programmaticChange = false;
            }, 50);

            // Show debug information
            if (data.debug) {
                this.showDebugInfo(data.debug);
            }

            // Render the component with the new AI-generated code
            if (document.getElementById('demo-status-overlay')) {
                this.updateStatus('Rendering...', true);
            }
            await this.renderComponent();

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
                        <div style="margin-top: 0.5rem;">
                            ${this.createExpandableText(r.text, 400)}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="debug-step">
                <div class="debug-step-header">4. Context Sent to Claude</div>
                ${this.createExpandableText(debug.docsContext, 500)}
            </div>

            <div class="debug-step">
                <div class="debug-step-header">5. Full Prompt to Claude</div>
                ${this.createExpandableText(debug.fullPrompt, 500)}
            </div>

            <div class="debug-step">
                <div class="debug-step-header">6. Claude API Call</div>
                <div class="debug-info">
                    <strong>Model:</strong> ${debug.claudeModel}<br>
                    <strong>Tokens Used:</strong> ${debug.tokensUsed.input} input + ${debug.tokensUsed.output} output = ${debug.tokensUsed.input + debug.tokensUsed.output} total
                </div>
            </div>

            <div class="debug-step">
                <div class="debug-step-header">7. Claude Raw Response</div>
                ${this.createExpandableText(debug.rawResponse, 500)}
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

    /**
     * Create expandable text with preview
     * @param {string} text - Full text content
     * @param {number} previewLength - Length of preview (default 300)
     * @returns {string} HTML for expandable text
     */
    createExpandableText(text, previewLength = 300) {
        if (text.length <= previewLength) {
            return `<pre class="debug-code">${this.escapeHtml(text)}</pre>`;
        }

        const id = `expand-${Math.random().toString(36).substr(2, 9)}`;
        const preview = this.escapeHtml(text.substring(0, previewLength));
        const fullText = this.escapeHtml(text);

        return `
            <div class="expandable-text">
                <pre class="debug-code" id="${id}-preview">${preview}...</pre>
                <pre class="debug-code" id="${id}-full" style="display: none;">${fullText}</pre>
                <button class="btn btn-sm" style="margin-top: 0.5rem;" onclick="
                    const preview = document.getElementById('${id}-preview');
                    const full = document.getElementById('${id}-full');
                    const btn = this;
                    if (full.style.display === 'none') {
                        preview.style.display = 'none';
                        full.style.display = 'block';
                        btn.textContent = 'Show less';
                    } else {
                        preview.style.display = 'block';
                        full.style.display = 'none';
                        btn.textContent = 'Show more';
                    }
                ">Show more</button>
            </div>
        `;
    }
}
