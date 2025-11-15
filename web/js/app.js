/**
 * Main Application Entry Point
 *
 * Initializes the SPA router and registers all routes.
 * Follows Dependency Inversion Principle (DIP).
 */
import { Router } from './utils/Router.js';
import { HomePage } from './pages/HomePage.js';
import { SearchPage } from './pages/SearchPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { DemoPage } from './pages/DemoPage.js';

// Initialize router
const router = new Router();

// Register routes
router.addRoute('/', HomePage);
router.addRoute('/search', SearchPage);
router.addRoute('/demo', DemoPage);
router.addRoute('/admin', AdminPage);

// Handle initial route
router.handleRoute();
