
---
name: web-dev
description: >-
  Master-grade web development guide covering modern frontend & full-stack web architectures,
  semantic HTML5, modern CSS3 (Grid, Flexbox, Container Queries, OKLCH, animations), JavaScript/TypeScript (ES2024+),
  framework ecosystems (React, Next.js, Vue, Nuxt, Svelte, Astro, Vanilla JS), state & data fetching (TanStack Query, SWR),
  Core Web Vitals performance tuning, Web APIs, SEO metadata, and web accessibility (WCAG 2.2 AA).
---

# Web Development Engineering Skill

This skill provides an authoritative, end-to-end engineering standard for developing high-performance, accessible, beautiful, and resilient web applications using modern web platform capabilities and contemporary frameworks.

---

## 1. Modern Web Architecture & Rendering Strategies

Choose rendering patterns based on content volatility and latency requirements:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        WEB RENDERING SPECTRUM                          │
├─────────────────────┬───────────────────┬──────────────────────────────┤
│ Strategy            │ Best For          │ Key Characteristics          │
├─────────────────────┼───────────────────┼──────────────────────────────┤
│ Static (SSG)        │ Docs, Marketing   │ Pre-rendered at build time   │
│ Incremental (ISR)   │ E-Commerce, News  │ On-demand cache regeneration │
│ Server-Side (SSR)   │ Dashboards, Auth  │ Rendered per-request at edge │
│ Island Architecture │ Astro, Fresh      │ Isolated interactive widgets │
│ Single-Page (SPA)   │ Complex App Logic │ Client-side DOM navigation   │
└─────────────────────┴───────────────────┴──────────────────────────────┘
```

### Core Architecture Principles:
- **Progressive Enhancement**: Deliver core markup and styles first; layer interactive JavaScript on top. Ensure critical paths remain readable even if client bundles encounter network delay.
- **Islands of Interactivity**: Keep static components purely HTML/CSS. Only hydrate components that require active user interaction.
- **Edge Data Fetching**: Colocate rendering with the nearest geographical edge node to minimize Time to First Byte (TTFB $< 200\text{ms}$).

---

## 2. Semantic HTML5 & Modern CSS Standards

### A. Semantic Structure & Landmarks
Always use native semantic elements rather than generic `<div>` soup:
- `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`.
- Dialogs: Use the native `<dialog>` element with `showModal()` and backdrop pseudo-elements.
- Forms: Use native `<form>`, `<fieldset>`, `<legend>`, `<label for="...">`, and appropriate `input type` (`email`, `tel`, `url`, `number`, `date`).

### B. Modern CSS Layout & Styling
1. **Container Queries**: Style components based on their container width rather than viewport width:
   ```css
   .card-container {
     container-type: inline-size;
     container-name: card;
   }
   @container card (min-width: 480px) {
     .card-layout {
       display: grid;
       grid-template-columns: 140px 1fr;
     }
   }
   ```
2. **Subgrid**: Align nested elements seamlessly with outer grid tracks:
   ```css
   .bento-grid {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     gap: 1.5rem;
   }
   .bento-card {
     display: grid;
     grid-template-rows: subgrid;
     grid-row: span 3;
   }
   ```
3. **Fluid Typography without Breakpoints**:
   ```css
   :root {
     --font-size-base: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
     --font-size-hero: clamp(2.25rem, 1.8rem + 2.5vw, 4rem);
   }
   ```
4. **OKLCH Color Space**: Use OKLCH for perceptually uniform gradients and accessible contrast:
   ```css
   --primary: oklch(58% 0.22 260);
   --primary-hover: oklch(52% 0.24 260);
   --surface-glass: oklch(20% 0.02 260 / 0.75);
   ```

See [`references/modern_css_and_layout_techniques.md`](./references/modern_css_and_layout_techniques.md) for complete utility layouts.

---

## 3. JavaScript & TypeScript Engineering Standards

- **ES2024+ Features**: Use native modern primitives: `structuredClone()`, `Promise.allSettled()`, `Array.prototype.toSorted()`, `Object.groupBy()`, `Array.prototype.with()`.
- **AbortController for Cancellations**: Always bind async requests, timeouts, and listeners to an `AbortSignal`:
  ```typescript
  export async function searchSchools(query: string, signal?: AbortSignal) {
    const res = await fetch(`/api/schools?q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  }
  ```
- **Web Observers over Polling**:
  - `IntersectionObserver`: For lazy loading images and trigger-on-scroll animations.
  - `ResizeObserver`: For responding to component box resizing.
  - `MutationObserver`: For reactive DOM tree monitoring.

---

## 4. Core Web Vitals (CWV) & Performance Engineering

Target Google Core Web Vitals strict thresholds:

| Metric | Target | Optimization Strategy |
| :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | $\le 2.5\text{s}$ | Preload critical hero images (`<link rel="preload">`), use WebP/AVIF formats, inline critical above-the-fold CSS. |
| **INP** (Interaction to Next Paint) | $\le 200\text{ms}$ | Yield long tasks with `scheduler.yield()` or `requestIdleCallback()`, minimize main thread blocking JavaScript. |
| **CLS** (Cumulative Layout Shift) | $\le 0.1$ | Explicit `width` and `height` (or `aspect-ratio`) on all images and embeds; reserve space for dynamic ads/widgets. |
| **TTFB** (Time to First Byte) | $\le 800\text{ms}$ | Edge caching, stale-while-revalidate headers, fast DNS resolution. |

See [`references/core_web_vitals_optimization.md`](./references/core_web_vitals_optimization.md) for asset pipelines and font optimization guides.

---

## 5. Web Security & Defense-in-Depth

Enforce HTTP security headers and browser security rules:
- **Content Security Policy (CSP)**: Disallow inline script execution unless signed with nonces or SHA hashes.
- **Cross-Site Scripting (XSS) Prevention**: Never interpolate untrusted user data into HTML via `innerHTML` or `dangerouslySetInnerHTML`. Use text nodes, `DOMPurify`, or templating engines.
- **Cross-Origin Resource Sharing (CORS)**: Lock down origins strictly.
- **Cookie Flags**: All authentication tokens must have `HttpOnly; Secure; SameSite=Lax` (or `Strict`).

See [`references/web_security_and_headers.md`](./references/web_security_and_headers.md) for server configuration snippets (Nginx, Caddy, Vercel).

---

## 6. Accessibility (a11y) & SEO Excellence

### Accessibility (WCAG 2.2 AA)
- Minimum color contrast ratio: $4.5:1$ for normal text, $3:1$ for large text and UI components.
- Keyboard navigation: Full support for `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape` in modals.
- Form inputs must have matching `<label>` elements; never rely solely on placeholders.

### SEO & Rich Social Graph
Every public page must contain complete metadata:
```html
<title>SMAN 1 Teladan - Portal Resmi Sekolah</title>
<meta name="description" content="Portal resmi SMAN 1 Teladan: Informasi PPDB, prestasi akademik, kurikulum merdeka, dan kegiatan siswa.">
<link rel="canonical" href="https://sman1teladan.sch.id/">

<!-- OpenGraph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:title" content="SMAN 1 Teladan - Unggul dalam Prestasi dan Karakter">
<meta property="og:description" content="Portal resmi sekolah dengan informasi terpadu dan layanan digital siswa.">
<meta property="og:image" content="https://sman1teladan.sch.id/og-image.jpg">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="SMAN 1 Teladan">

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "School",
  "name": "SMAN 1 Teladan",
  "url": "https://sman1teladan.sch.id",
  "telephone": "+62-21-5550192",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Jl. Pendidikan No. 45",
    "addressLocality": "Jakarta",
    "addressCountry": "ID"
  }
}
</script>
```

---

## 7. Web Developer Execution Checklist

1. **Semantic Foundation**: Structure page layout with valid semantic HTML tags.
2. **Design System & CSS Tokens**: Define custom properties in `:root` for typography, colors, shadows, and spacing.
3. **Responsive & Fluid Layout**: Implement flexible CSS Grid / Flexbox layouts using `clamp()` and container queries.
4. **State & Network Handling**: Implement loading spinners/skeletons, error states, and retry logic.
5. **Core Web Vitals Audit**: Verify images have explicit dimensions, fonts use `font-display: swap`, and bundles are code-split.
6. **Accessibility & SEO**: Validate color contrast, form labels, keyboard navigation, and meta tags.
