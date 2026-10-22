# Production Readiness & Completeness Audit

Use this checklist to audit any file or feature before declaring it finished.

---

## 1. Code Completeness Audit
- [ ] No `// TODO`, `// FIXME`, or stubbed methods remaining in codebase.
- [ ] No truncated ellipses (`// ... rest of code`) in any delivered file.
- [ ] All external imports resolve correctly; no missing npm packages or unresolved file paths.
- [ ] TypeScript compiles with `noImplicitAny: true` and zero unresolved type errors.
- [ ] Every promise chain or async call is handled with `try / catch` or `.catch()`.

---

## 2. UI & Interaction Completeness
- [ ] **Loading State**: Visual skeleton or progress indicator displayed during async operations.
- [ ] **Empty State**: Friendly graphic or illustration with helpful text and primary call-to-action when datasets are empty.
- [ ] **Error State**: Non-blocking banner or toast notification with actionable message and retry button.
- [ ] **Keyboard Navigation**: All interactive elements reachable via `Tab` key with visible focus rings.
- [ ] **Screen Reader Attributes**: Meaningful `aria-label`, `role`, and semantic tags (`<nav>`, `<main>`, `<article>`, `<header>`, `<footer>`).

---

## 3. Data Integrity & Reality Check
- [ ] All mock data represents real-world entities (names, emails, phone numbers, Indonesian currency IDR / Rupiah if applicable, valid dates).
- [ ] No broken placeholder image links (`via.placeholder.com`).
- [ ] Strings are properly escaped and safe from XSS or SQL injection.
