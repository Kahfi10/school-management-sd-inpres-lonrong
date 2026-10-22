# Modern CSS & Layout Techniques Reference

Contemporary CSS eliminates the need for heavy JavaScript layout libraries and complex media query nests.

---

## 1. Responsive Bento Grid Layout
Bento grids create dynamic, visual harmony through asymmetric cell spans.

```css
.bento-container {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .bento-container {
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 240px;
  }

  .bento-span-2x2 {
    grid-column: span 2;
    grid-row: span 2;
  }

  .bento-span-2x1 {
    grid-column: span 2;
    grid-row: span 1;
  }

  .bento-span-1x2 {
    grid-column: span 1;
    grid-row: span 2;
  }
}
```

---

## 2. Dynamic Theme Variables & Color Modes
Implement seamless dark/light modes without flashes of unstyled content (FOUC):

```css
:root {
  color-scheme: light dark;

  /* Light Theme */
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --border-card: rgba(0, 0, 0, 0.08);
  --text-main: #0f172a;
  --text-muted: #64748b;
  --accent-color: #2563eb;
}

[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-page: #0b0f19;
    --bg-card: #111827;
    --border-card: rgba(255, 255, 255, 0.08);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --accent-color: #3b82f6;
  }
}
```

---

## 3. Smooth Micro-Transitions & Kinetic Feedback

```css
.card-interactive {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.25s ease;
}

.card-interactive:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.15);
  border-color: var(--accent-color);
}
```
