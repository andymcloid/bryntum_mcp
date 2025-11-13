/**
 * Base Component Class
 *
 * Abstract base class for all page components.
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification.
 */
export class Component {
    constructor() {
        this.container = document.getElementById('app');
    }

    /**
     * Render method to be implemented by subclasses
     */
    async render() {
        throw new Error('render() must be implemented by subclass');
    }

    /**
     * Create an HTML element from string
     */
    createElementFromHTML(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
    }

    /**
     * Clear the container
     */
    clear() {
        this.container.innerHTML = '';
    }

    /**
     * Set container content
     */
    setContent(html) {
        this.container.innerHTML = html;
    }

    /**
     * Append element to container
     */
    append(element) {
        this.container.appendChild(element);
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.setContent(`
            <div class="flex flex-col items-center justify-center" style="min-height: 400px;">
                <div class="loader"></div>
                <p class="mt-4" style="color: var(--text-secondary);">Loading...</p>
            </div>
        `);
    }

    /**
     * Show error message
     */
    showError(message) {
        this.setContent(`
            <div class="alert alert-error">
                <strong>Error:</strong> ${message}
            </div>
        `);
    }
}
