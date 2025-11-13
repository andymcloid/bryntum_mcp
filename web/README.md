# Bryntum RAG - Web Frontend

A vanilla JavaScript SPA (Single Page Application) for the Bryntum Documentation RAG system.

## Architecture

Built with **pure Vanilla JavaScript, HTML, and CSS** following SOLID principles:

```
web/
├── index.html           # Main HTML entry point
├── server.js            # Simple Node.js static file server
├── css/
│   ├── main.css        # Base styles and utilities
│   └── components.css  # Component-specific styles
└── js/
    ├── app.js          # Application entry point
    ├── api/
    │   └── ApiClient.js     # API client (SRP)
    ├── utils/
    │   └── Router.js        # SPA router (SRP)
    ├── components/
    │   └── Component.js     # Base component class (OCP)
    └── pages/
        ├── HomePage.js      # Home page
        ├── SearchPage.js    # Search interface
        └── AdminPage.js     # Admin panel
```

## Features

- **Pure Vanilla JavaScript** - No frameworks, just ES6 modules
- **SOLID Principles** - Clean, maintainable architecture
- **Component-Based** - Reusable component system
- **SPA Router** - Client-side routing with HTML5 History API
- **Responsive Design** - Works on all screen sizes
- **Real-time Progress** - Upload progress tracking
- **Semantic Search** - AI-powered document search

## SOLID Principles Implementation

### Single Responsibility Principle (SRP)
- **ApiClient**: Only handles HTTP requests
- **Router**: Only handles routing
- **Component**: Only handles DOM rendering
- Each page: Only handles its specific UI logic

### Open/Closed Principle (OCP)
- **Component base class**: Can be extended without modification
- New pages can be added by extending Component

### Liskov Substitution Principle (LSP)
- All pages extend Component and can be used interchangeably

### Interface Segregation Principle (ISP)
- Small, focused classes with specific purposes

### Dependency Inversion Principle (DIP)
- Pages depend on Component abstraction, not concrete implementations
- Router depends on page classes, not specific page implementations

## Quick Start

### 1. Start the API Backend

```bash
# From project root
npm start
```

### 2. Start the Web Server

```bash
# From web directory
cd web
node server.js
```

Or with custom port:

```bash
WEB_PORT=8081 node server.js
```

### 3. Open in Browser

Navigate to `http://localhost:8081`

## Pages

### Home (`/`)
- Welcome screen
- Overview of features
- Quick navigation to Search and Admin

### Search (`/search`)
- Search input with natural language queries
- Real-time search results
- Relevance scoring
- Chunk information

### Admin (`/admin`)
- File upload interface
- Upload progress tracking
- Indexing statistics
- Success/error feedback

## Development

### File Structure

**HTML**
- `index.html`: Main entry point with navigation and app container

**CSS**
- `main.css`: Global styles, layout, utilities
- `components.css`: Component-specific styles (cards, buttons, etc.)

**JavaScript**
- **ES6 Modules**: All JS files are ES6 modules
- **No Build Step**: Runs directly in the browser
- **No Dependencies**: Pure vanilla JS

### Adding a New Page

1. Create page class extending Component:

```javascript
// js/pages/MyPage.js
import { Component } from '../components/Component.js';

export class MyPage extends Component {
    async render() {
        this.setContent(`
            <div>My Page Content</div>
        `);
    }
}
```

2. Register route in `app.js`:

```javascript
import { MyPage } from './pages/MyPage.js';

router.addRoute('/mypage', MyPage);
```

3. Add navigation link in `index.html`:

```html
<li><a href="/mypage" data-link>My Page</a></li>
```

### API Integration

The `ApiClient` class provides methods for backend communication:

```javascript
import { apiClient } from './api/ApiClient.js';

// Search
const results = await apiClient.search('query', 10);

// Get document
const doc = await apiClient.getDocument('id');

// Upload with progress
await apiClient.uploadAndIndex(file, (progress) => {
    console.log(`Upload progress: ${progress}%`);
});
```

## Styling

CSS uses CSS variables for theming:

```css
:root {
    --primary: #2563eb;
    --secondary: #64748b;
    --background: #ffffff;
    --surface: #f8fafc;
    --text-primary: #0f172a;
    --text-secondary: #64748b;
}
```

Pre-built component classes:

- `.card`, `.card-header`, `.card-content`
- `.btn`, `.btn-primary`, `.btn-secondary`
- `.input`, `.input-group`
- `.badge`, `.badge-primary`, `.badge-success`
- `.progress`, `.progress-bar`
- `.alert`, `.alert-success`, `.alert-error`

## Browser Compatibility

Requires modern browser with support for:
- ES6 Modules
- Fetch API
- FormData
- XMLHttpRequest (for upload progress)
- History API (for routing)

## Production Deployment

For production, use a proper static file server like Nginx or Apache:

```nginx
# nginx.conf
server {
    listen 80;
    root /path/to/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## No Build Step Required

This project runs directly in the browser with no transpilation or bundling needed. Just serve the files with any static file server!

## Example Workflow

1. **Upload Docs**: Go to `/admin`, select a .zip file, upload
2. **Wait for Indexing**: Progress bar shows upload and processing
3. **Search**: Go to `/search`, enter natural language query
4. **View Results**: See relevant documentation chunks with relevance scores

## License

ISC
