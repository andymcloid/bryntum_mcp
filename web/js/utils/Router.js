/**
 * SPA Router
 *
 * Handles client-side routing for Single Page Application.
 * Follows Single Responsibility Principle (SRP).
 */
export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;

        // Listen to navigation events
        window.addEventListener('popstate', () => this.handleRoute());
        document.addEventListener('DOMContentLoaded', () => this.handleRoute());

        // Handle link clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-link]')) {
                e.preventDefault();
                this.navigate(e.target.href);
            }
        });
    }

    /**
     * Register a route
     */
    addRoute(path, pageClass) {
        this.routes.set(path, pageClass);
    }

    /**
     * Navigate to a URL
     */
    navigate(url) {
        window.history.pushState(null, null, url);
        this.handleRoute();
    }

    /**
     * Handle current route
     */
    async handleRoute() {
        const path = window.location.pathname;

        // Update active nav link
        document.querySelectorAll('[data-link]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === path);
        });

        // Clean up previous route
        if (this.currentRoute && typeof this.currentRoute.unmount === 'function') {
            this.currentRoute.unmount();
        }

        // Get page class for current route
        const PageClass = this.routes.get(path) || this.routes.get('/404');

        if (PageClass) {
            this.currentRoute = new PageClass();
            await this.currentRoute.render();
        }
    }
}
