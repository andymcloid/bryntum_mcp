/**
 * API Client
 *
 * Handles all HTTP requests to the backend API.
 * Follows Single Responsibility Principle (SRP).
 */
export class ApiClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
    }

    /**
     * Search for documents
     */
    async search(query, limit = 5, version = null, includeContext = false) {
        const response = await fetch(`${this.baseUrl}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, limit, version, includeContext }),
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get all versions
     */
    async getVersions() {
        const response = await fetch(`${this.baseUrl}/versions`);

        if (!response.ok) {
            throw new Error(`Get versions failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get document by ID
     */
    async getDocument(id) {
        const response = await fetch(`${this.baseUrl}/doc/${id}`);

        if (!response.ok) {
            throw new Error(`Get document failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Upload and index a zip file
     */
    async uploadAndIndex(file, version, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('version', version);

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    const errorData = JSON.parse(xhr.responseText || '{}');
                    reject(new Error(errorData.message || `Upload failed: ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });

            xhr.open('POST', `${this.baseUrl}/index`);
            xhr.send(formData);
        });
    }

    /**
     * Clear all documents from the database
     */
    async clearAll() {
        const response = await fetch(`${this.baseUrl}/index/all`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Clear all failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Delete a specific version
     */
    async deleteVersion(version) {
        const response = await fetch(`${this.baseUrl}/versions/${encodeURIComponent(version)}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Delete version failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get version metadata
     */
    async getVersionMetadata(version) {
        const response = await fetch(`${this.baseUrl}/versions/${encodeURIComponent(version)}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Get version metadata failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get all tags
     */
    async getTags() {
        const response = await fetch(`${this.baseUrl}/tags`);

        if (!response.ok) {
            throw new Error(`Get tags failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Health check
     */
    async health() {
        const response = await fetch(`${this.baseUrl}/health`);

        if (!response.ok) {
            throw new Error(`Health check failed: ${response.statusText}`);
        }

        return response.json();
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
