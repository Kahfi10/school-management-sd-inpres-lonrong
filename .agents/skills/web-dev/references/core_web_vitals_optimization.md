# Core Web Vitals Optimization Guide

This reference outlines actionable technical patterns to achieve perfect scores on Google Core Web Vitals (CWV).

---

## 1. Largest Contentful Paint (LCP $\le 2.5\text{s}$)

The LCP metric reports the render time of the largest image or text block visible within the viewport.

### Top Optimization Actions:
1. **Preload the Hero Asset**:
   ```html
   <link rel="preload" fetchpriority="high" as="image" href="/images/hero-banner.webp" type="image/webp">
   ```
2. **Modern Image Formats**: Convert PNG/JPEG to WebP or AVIF (saving $30\% - 50\%$ bandwidth).
3. **Responsive Image Sizing**: Use `srcset` and `sizes` to avoid sending 4K images to mobile screens:
   ```html
   <img
     src="/images/hero-800.webp"
     srcset="/images/hero-400.webp 400w, /images/hero-800.webp 800w, /images/hero-1200.webp 1200w"
     sizes="(max-width: 600px) 100vw, 800px"
     alt="Gedung Utama SMAN 1 Teladan"
     width="800"
     height="450"
     fetchpriority="high"
   />
   ```
4. **Self-Host Critical Fonts**: Avoid external roundtrips to third-party CDNs; serve WOFF2 files directly with `font-display: swap`.

---

## 2. Interaction to Next Paint (INP $\le 200\text{ms}$)

INP measures responsiveness to user clicks, taps, and keyboard inputs.

### Top Optimization Actions:
1. **Break Long Tasks ($> 50\text{ms}$)** using `scheduler.yield()` or microtask chunking:
   ```typescript
   async function processLargeBatch(items: Item[]) {
     for (let i = 0; i < items.length; i++) {
       processItem(items[i]);
       if (i % 100 === 0 && 'scheduler' in window && 'yield' in window.scheduler) {
         await (window.scheduler as any).yield();
       }
     }
   }
   ```
2. **Debounce / Throttle Heavy Input Listeners**:
   ```typescript
   import { useDeferredValue } from 'react';
   // In React 18+: useDeferredValue or useTransition to keep input responsive
   ```
3. **Avoid Forced Synchronous Layouts**: Never query DOM geometric properties (`element.offsetHeight`, `getBoundingClientRect()`) immediately after modifying styles.

---

## 3. Cumulative Layout Shift (CLS $\le 0.1$)

CLS measures visual stability by tracking unexpected layout shifts during load.

### Top Optimization Actions:
1. **Explicit Dimensions on Media**:
   ```css
   img, video, iframe {
     width: 100%;
     height: auto;
     aspect-ratio: 16 / 9;
   }
   ```
2. **Reserve Space for Dynamic Injections**: Never inject banners, ads, or dynamic notices above existing content without allocating placeholder min-height.
3. **CSS `font-display: optional` or `swap` with Fallback Metric Overrides**:
   ```css
   @font-face {
     font-family: 'Inter Fallback';
     src: local('Arial');
     ascent-override: 90%;
     descent-override: 22%;
     line-gap-override: 0%;
     size-adjust: 107%;
   }
   ```
