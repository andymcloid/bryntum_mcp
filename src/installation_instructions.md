# How to Get Started with Bryntum Components

Simple guide for loading Bryntum components via CDN.

## Using Thin Bundles (Recommended)

Bryntum's **thin bundles** are modular and can be loaded together without conflicts. All products share a common core module for optimal performance.

### Basic Setup

**Minimum required:**
1. Core CSS + JS (always needed)
2. Product CSS + JS (one or more products)
3. Theme CSS (for styling)

### Example: Grid + Scheduler + Theme

```html
<!DOCTYPE html>
<html>
<head>
    <!-- 1. Core CSS -->
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/core.thin.css">

    <!-- 2. Product CSS -->
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/grid.thin.css">
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/scheduler.thin.css">

    <!-- 3. Theme -->
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/svalbard-light.css">
</head>
<body>
    <div id="container"></div>

    <!-- 4. Core JS (load first) -->
    <script type="module">
        import 'https://bryntum.com/products/grid-next/build/thin/core.module.thin.js';
        import { Grid } from 'https://bryntum.com/products/grid-next/build/thin/grid.module.thin.js';
        import { Scheduler } from 'https://bryntum.com/products/grid-next/build/thin/scheduler.module.thin.js';

        new Grid({
            appendTo: 'container',
            columns: [
                { text: 'Name', field: 'name', flex: 1 }
            ],
            data: [
                { id: 1, name: 'John Doe' },
                { id: 2, name: 'Jane Smith' }
            ]
        });
    </script>
</body>
</html>
```

## Available Products

### Grid
```html
<link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/grid.thin.css">
<script type="module">
    import { Grid } from 'https://bryntum.com/products/grid-next/build/thin/grid.module.thin.js';
</script>
```

### Scheduler
```html
<link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/scheduler.thin.css">
<script type="module">
    import { Scheduler } from 'https://bryntum.com/products/grid-next/build/thin/scheduler.module.thin.js';
</script>
```

### Scheduler Pro
```html
<link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/schedulerpro.thin.css">
<script type="module">
    import { SchedulerPro } from 'https://bryntum.com/products/grid-next/build/thin/schedulerpro.module.thin.js';
</script>
```

### Gantt
```html
<link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/gantt.thin.css">
<script type="module">
    import { Gantt } from 'https://bryntum.com/products/grid-next/build/thin/gantt.module.thin.js';
</script>
```

### TaskBoard
```html
<link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/taskboard.thin.css">
<script type="module">
    import { TaskBoard } from 'https://bryntum.com/products/grid-next/build/thin/taskboard.module.thin.js';
</script>
```

## Complete Example (All Products)

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Core CSS (required) -->
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/core.thin.css">

    <!-- All Product CSS -->
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/grid.thin.css">
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/scheduler.thin.css">
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/schedulerpro.thin.css">
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/gantt.thin.css">
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/thin/taskboard.thin.css">

    <!-- Theme (required) -->
    <link rel="stylesheet" href="https://bryntum.com/products/grid-next/build/svalbard-light.css">
</head>
<body>
    <div id="container"></div>

    <script type="module">
        // Core (required - load first)
        import 'https://bryntum.com/products/grid-next/build/thin/core.module.thin.js';

        // Products (load what you need)
        import { Grid } from 'https://bryntum.com/products/grid-next/build/thin/grid.module.thin.js';
        import { Scheduler } from 'https://bryntum.com/products/grid-next/build/thin/scheduler.module.thin.js';
        import { SchedulerPro } from 'https://bryntum.com/products/grid-next/build/thin/schedulerpro.module.thin.js';
        import { Gantt } from 'https://bryntum.com/products/grid-next/build/thin/gantt.module.thin.js';
        import { TaskBoard } from 'https://bryntum.com/products/grid-next/build/thin/taskboard.module.thin.js';

        // Now use any component
        new Grid({
            appendTo: 'container',
            columns: [
                { text: 'Name', field: 'name', flex: 1 }
            ],
            data: [
                { id: 1, name: 'Example' }
            ]
        });
    </script>
</body>
</html>
```

## Key Points

✅ **Load multiple products together** - Thin bundles don't conflict
✅ **Always load core.thin.css and core.module.thin.js first**
✅ **Always include a theme** (e.g., svalbard-light.css)
✅ **Use ES6 modules** - Import what you need
✅ **No build step required** - Works directly in the browser
