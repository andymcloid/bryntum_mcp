/**
 * Admin Page Component
 *
 * Handles file upload and document indexing with real-time progress tracking via WebSocket.
 * Follows Single Responsibility Principle (SRP).
 */
import { Component } from '../components/Component.js';
import { apiClient } from '../api/ApiClient.js';
import { jobsWebSocket } from '../api/JobsWebSocket.js';

export class AdminPage extends Component {
    constructor() {
        super();
        this.selectedFile = null;
        this.version = null;
        this.currentJobId = null;
        this.jobStatus = null;
    }

    async render() {
        const html = `
            <div class="fade-in">
                <div class="mb-8">
                    <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Admin Panel</h1>
                    <p style="color: var(--text-secondary);">
                        Upload and index documentation archives - Live progress tracking via WebSocket
                    </p>
                </div>

                <div id="connectionStatus" class="mb-4"></div>

                <div class="card mb-4">
                    <div class="card-header">
                        <h2 class="card-title">Upload Documentation</h2>
                        <p class="card-description">
                            Select a .zip file containing markdown documentation to index (background job)
                        </p>
                    </div>
                    <div class="card-content">
                        <div style="margin-bottom: 1rem;">
                            <label class="input-label" for="versionInput">Version (required)</label>
                            <input type="text" id="versionInput" class="input" placeholder="e.g., 6.0.0" required>
                            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                                If version exists, it will be overwritten
                            </p>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label class="input-label" for="fileInput">Documentation Archive</label>
                            <input type="file" id="fileInput" accept=".zip" class="input">
                        </div>
                        <div id="fileInfo"></div>
                    </div>
                </div>

                <div id="progressContainer"></div>
                <div id="resultContainer"></div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Instructions</h2>
                    </div>
                    <div class="card-content">
                        <ol style="list-style: decimal; list-style-position: inside; color: var(--text-secondary); font-size: 0.875rem;">
                            <li style="margin-bottom: 0.5rem;">Prepare a .zip file containing markdown (.md) files</li>
                            <li style="margin-bottom: 0.5rem;">Select the file using the file picker above</li>
                            <li style="margin-bottom: 0.5rem;">Click "Upload & Index" to start the background job</li>
                            <li style="margin-bottom: 0.5rem;">Watch real-time progress via WebSocket</li>
                            <li style="margin-bottom: 0.5rem;">Job continues even if you refresh the page</li>
                        </ol>
                    </div>
                </div>

                <div class="card" style="border-color: var(--error); margin-top: 2rem;">
                    <div class="card-header">
                        <h2 class="card-title" style="color: var(--error);">Danger Zone</h2>
                        <p class="card-description" style="color: var(--error);">
                            Irreversible database operations - use with caution
                        </p>
                    </div>
                    <div class="card-content">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="font-weight: 500; margin-bottom: 0.25rem;">Clear All Documents</p>
                                <p style="font-size: 0.875rem; color: var(--text-secondary);">
                                    Permanently delete all indexed documents and versions from the database
                                </p>
                            </div>
                            <button id="clearAllBtn" class="btn" style="background: var(--error); color: white; border: none;">
                                <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                                <span>Clear All</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setContent(html);
        this.attachEventListeners();
        this.connectWebSocket();
    }

    connectWebSocket() {
        // Connect to WebSocket
        jobsWebSocket.connect();

        // Handle connection status
        jobsWebSocket.on('connected', () => {
            this.showConnectionStatus('connected');
        });

        jobsWebSocket.on('disconnected', () => {
            this.showConnectionStatus('disconnected');
        });

        // Handle initial state
        jobsWebSocket.on('init', ({ jobs, allJobs }) => {
            console.log('Received init:', { jobs, allJobs });

            // Check if there's an ongoing job
            const activeJobs = jobs || [];
            if (activeJobs.length > 0) {
                const job = activeJobs[0];
                this.currentJobId = job.id;
                this.showProgress(job);
            }
        });

        // Handle progress updates
        jobsWebSocket.on('progress', (job) => {
            console.log('Progress update:', job);
            this.showProgress(job);
        });
    }

    showConnectionStatus(status) {
        const container = document.getElementById('connectionStatus');
        if (!container) return;

        if (status === 'connected') {
            container.innerHTML = `
                <div class="alert alert-info" style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 8px; height: 8px; background: var(--success); border-radius: 50%;"></div>
                    <span>WebSocket connected - Live progress tracking enabled</span>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="alert alert-error" style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 8px; height: 8px; background: var(--error); border-radius: 50%;"></div>
                    <span>WebSocket disconnected - Reconnecting...</span>
                </div>
            `;
        }
    }

    attachEventListeners() {
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        const clearAllBtn = document.getElementById('clearAllBtn');
        clearAllBtn.addEventListener('click', () => this.handleClearAll());
    }

    handleFileSelect(e) {
        const file = e.target.files[0];

        if (!file) {
            this.selectedFile = null;
            document.getElementById('fileInfo').innerHTML = '';
            return;
        }

        if (!file.name.endsWith('.zip')) {
            document.getElementById('fileInfo').innerHTML = `
                <div class="alert alert-error">
                    Please select a .zip file
                </div>
            `;
            this.selectedFile = null;
            return;
        }

        this.selectedFile = file;

        document.getElementById('fileInfo').innerHTML = `
            <div class="file-selected">
                <div>
                    <p style="font-weight: 500;">${file.name}</p>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                </div>
                <button id="uploadBtn" class="btn btn-primary">
                    <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <span>Upload & Index</span>
                </button>
            </div>
        `;

        document.getElementById('uploadBtn').addEventListener('click', () => this.handleUpload());
    }

    async handleUpload() {
        if (!this.selectedFile) return;

        // Get version
        const versionInput = document.getElementById('versionInput');
        const version = versionInput.value.trim();

        if (!version) {
            this.showError('Version is required');
            return;
        }

        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `
            <div class="loader loader-small"></div>
            <span>Uploading...</span>
        `;

        try {
            // Upload file - returns immediately with jobId
            const response = await apiClient.uploadAndIndex(this.selectedFile, version);

            console.log('Upload response:', response);

            this.currentJobId = response.jobId;

            // Subscribe to this specific job
            jobsWebSocket.subscribeToJob(response.jobId);

            // Show initial progress
            this.showProgress({
                id: response.jobId,
                status: 'running',
                stage: 'uploading',
                progress: 5,
                message: `File uploaded, starting indexing for version ${version}...`,
                version,
                metadata: response,
            });

            // Clear inputs
            document.getElementById('fileInput').value = '';
            versionInput.value = '';
            document.getElementById('fileInfo').innerHTML = '';

        } catch (error) {
            console.error('Upload failed:', error);
            this.showError(error.message);

            // Reset upload button
            const uploadBtn = document.getElementById('uploadBtn');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = `
                    <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <span>Upload & Index</span>
                `;
            }
        }
    }

    showProgress(job) {
        this.jobStatus = job;

        const container = document.getElementById('progressContainer');
        const stageLabels = {
            uploading: 'Uploading',
            extracting: 'Extracting',
            initializing: 'Initializing',
            clearing: 'Clearing',
            processing: 'Processing Documents',
            embedding: 'Generating Embeddings',
            storing: 'Storing in Vector DB',
            finalizing: 'Finalizing',
            completed: 'Completed',
            error: 'Error',
        };

        const stageLabel = stageLabels[job.stage] || job.stage;

        // Check if progress card already exists
        let progressCard = document.getElementById('progress-card');
        let progressContent = document.getElementById('progress-content');

        // Create card only once (with fade-in animation)
        if (!progressCard) {
            container.innerHTML = `
                <div id="progress-card" class="card fade-in mb-4" style="border-color: var(--primary);">
                    <div class="card-header">
                        <div class="flex items-center justify-between">
                            <h2 class="card-title">Indexing Progress</h2>
                            <span id="progress-status-badge" class="badge badge-primary">${job.status}</span>
                        </div>
                    </div>
                    <div id="progress-content" class="card-content">
                        <!-- Content updated below -->
                    </div>
                </div>
            `;
            progressCard = document.getElementById('progress-card');
            progressContent = document.getElementById('progress-content');
        }

        // Update card border color based on status
        progressCard.style.borderColor = job.status === 'failed' ? 'var(--error)' : 'var(--primary)';

        // Update status badge
        const statusBadge = document.getElementById('progress-status-badge');
        statusBadge.className = `badge ${job.status === 'completed' ? 'badge-success' : job.status === 'failed' ? 'badge-error' : 'badge-primary'}`;
        statusBadge.textContent = job.status;

        // Update content (no fade-in animation here)
        progressContent.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <div class="flex items-center justify-between" style="font-size: 0.875rem; margin-bottom: 0.5rem;">
                    <span style="font-weight: 500;">${stageLabel}</span>
                    <span>${job.progress}%</span>
                </div>
                <div class="progress">
                    <div class="progress-bar" style="width: ${job.progress}%"></div>
                </div>
            </div>

            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                ${job.message}
            </p>

            ${job.documentsProcessed !== undefined ? `
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Documents</div>
                        <div class="stat-value" style="font-size: 1.5rem;">${job.documentsProcessed || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Chunks</div>
                        <div class="stat-value" style="font-size: 1.5rem;">${job.chunksIndexed || 0}</div>
                    </div>
                    ${job.totalDocuments ? `
                        <div class="stat-item">
                            <div class="stat-label">Total Docs</div>
                            <div class="stat-value" style="font-size: 1.5rem;">${job.totalDocuments}</div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            ${job.status === 'completed' && job.result ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <p style="color: var(--success); font-weight: 500;">
                        ✓ Indexing completed successfully!
                    </p>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        Indexed ${job.result.documentsProcessed} documents into ${job.result.chunksIndexed} chunks
                        in ${(job.result.durationMs / 1000).toFixed(1)}s
                    </p>
                </div>
            ` : ''}

            ${job.status === 'failed' && job.error ? `
                <div class="alert alert-error" style="margin-top: 1rem;">
                    <strong>Error:</strong> ${job.error.message}
                </div>
            ` : ''}
        `;

        // If completed, clear currentJobId after showing final result
        if (job.status === 'completed' || job.status === 'failed') {
            setTimeout(() => {
                this.currentJobId = null;
            }, 500);
        }
    }

    showError(message) {
        const container = document.getElementById('progressContainer');
        container.innerHTML = `
            <div class="alert alert-error fade-in">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }

    async handleClearAll() {
        // Show confirmation dialog
        const confirmed = confirm(
            'Are you sure you want to clear ALL documents from the database?\n\n' +
            'This will permanently delete:\n' +
            '- All indexed documents\n' +
            '- All versions\n' +
            '- All metadata\n\n' +
            'This action CANNOT be undone!'
        );

        if (!confirmed) {
            return;
        }

        const clearAllBtn = document.getElementById('clearAllBtn');
        clearAllBtn.disabled = true;
        clearAllBtn.innerHTML = `
            <div class="loader loader-small"></div>
            <span>Clearing...</span>
        `;

        try {
            await apiClient.clearAll();

            // Show success message
            const container = document.getElementById('progressContainer');
            container.innerHTML = `
                <div class="alert alert-info fade-in">
                    <strong>Success:</strong> All documents have been cleared from the database.
                </div>
            `;

            // Reset button
            clearAllBtn.disabled = false;
            clearAllBtn.innerHTML = `
                <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Clear All</span>
            `;

        } catch (error) {
            console.error('Clear all failed:', error);
            this.showError(error.message);

            // Reset button
            clearAllBtn.disabled = false;
            clearAllBtn.innerHTML = `
                <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Clear All</span>
            `;
        }
    }
}
