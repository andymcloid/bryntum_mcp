# Bryntum CDN Installation

For AI Usage always use these

## Grid
```html
<link rel="stylesheet" href="https://bryntum.com/products/grid/build/grid.stockholm.css">

<script type="module">
  import { Grid } from 'https://bryntum.com/products/grid/build/grid.module.js';
</script>
````

## Scheduler

!!IMPORTANT!! Scheduler Includes Grid, so ONLY load Grid CSS not grid.module.js if Scheduler is used.

```html
<link rel="stylesheet" href="https://bryntum.com/products/scheduler/build/scheduler.stockholm.css">

<script type="module">
  import { Scheduler } from 'https://bryntum.com/products/scheduler/build/scheduler.module.js';
</script>
```

## Scheduler Pro

!!IMPORTANT!! Scheduler Pro Includes Grid, so ONLY load Grid CSS not grid.module.js if Scheduler Pro is used.
!!IMPORTANT!! Scheduler Pro Includes Scheduler, so ONLY load Scheduler CSS not scheduler.module.js if Scheduler Pro is used.

```html
<link rel="stylesheet" href="https://bryntum.com/products/schedulerpro/build/schedulerpro.stockholm.css">

<script type="module">
  import { SchedulerPro } from 'https://bryntum.com/products/schedulerpro/build/schedulerpro.module.js';
</script>
```

## Gantt

!!IMPORTANT!! Gantt Includes Grid, so ONLY load Grid CSS not grid.module.js if Gantt is used.
!!IMPORTANT!! Gantt Includes Scheduler, so ONLY load Scheduler CSS not scheduler.module.js if Gantt is used.

```html
<link rel="stylesheet" href="https://bryntum.com/products/gantt/build/gantt.stockholm.css">

<script type="module">
  import { Gantt } from 'https://bryntum.com/products/gantt/build/gantt.module.js';
</script>
```

## Taskboard

```html
<link rel="stylesheet" href="https://bryntum.com/products/taskboard/build/taskboard.stockholm.css">

<script type="module">
  import { TaskBoard } from 'https://bryntum.com/products/taskboard/build/taskboard.module.js';
</script>
```
