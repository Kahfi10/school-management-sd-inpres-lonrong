---
name: anti-slop-ai
description: >-
  Master-grade software craftsmanship and anti-slop discipline for AI-driven engineering.
  Use this skill to eliminate generic AI tropes, lazy placeholder code (// TODO, // ... rest of code),
  cookie-cutter purple gradient designs, mock dummy data, hallucinated APIs, shallow architectures,
  and conversational fluff. Enforces production-complete implementations, authentic visual design,
  resilient error handling, and high-density, battle-tested code.
---

# Anti-Slop AI: Engineering & Design Craftsmanship Guide

AI-generated software frequently suffers from **synthetic mediocrity ("AI Slop")**—code that looks plausibly correct at a glance, but is plagued by truncated snippets, lazy placeholders, generic cookie-cutter templates, unhandled failure modes, and meaningless boilerplate.

This skill establishes an unyielding standard of **rigorous craftsmanship, authentic visual aesthetics, and complete production-grade execution**.

---

## 1. The Anti-Slop Manifesto

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        THE ANTI-SLOP MANIFESTO                         │
├────────────────────────────────┬───────────────────────────────────────┤
│ ❌ THE AI SLOP PATTERN          │ ✅ THE CRAFTSMAN STANDARD              │
├────────────────────────────────┼───────────────────────────────────────┤
│ • "// TODO: implement logic"   │ • 100% complete, working code         │
│ • "// ... rest of code ..."    │ • No truncation; full integrated file │
│ • Generic purple/blue cards    │ • Bespoke, intentional design system  │
│ • "Lorem ipsum" & dummy "foo"  │ • Realistic, domain-authentic data    │
│ • Empty `catch (e) {}` blocks  │ • Resilient errors & user recovery    │
│ • 12-layer abstraction towers  │ • Clean, pragmatic, readable code     │
│ • "Sure! I'd love to help you" │ • Zero conversational fluff           │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Code Slop Eradication: The Zero-Placeholder Rule

### Absolute Bans
1. **No Truncation**: Never output ellipses (`// ... previous code continues ...` or `/* rest unchanged */`) in code files. Always supply the full, unbroken code or use precise patch edits.
2. **No Placeholders**: Never write `// TODO: add authentication later`, `// Implement validation here`, or stub functions that throw `"Not implemented"`. Implement the actual functionality or explicitly state boundaries.
3. **No Mock Slop**: Never use lazy dummy data (`"test"`, `"asdf"`, `[1, 2, 3]`, `"user@example.com"`, `"Item 1, Item 2"`). Use realistic, domain-specific records with realistic timestamps, real names, realistic statuses, and natural Indonesian/English text matching the project context.
4. **No Dead Placeholders for Assets**: Never insert broken image URLs (`https://via.placeholder.com/150` or non-existent external URLs). Generate real SVG icons, inline data URIs, CSS geometric graphics, or use tools to generate real image assets.

### Code Hygiene Comparison
```typescript
// ❌ AI SLOP: Lazy, unhandled, unvalidated
export async function fetchUserData(id: string) {
  try {
    const res = await fetch(`/api/user/${id}`);
    const data = await res.json();
    return data;
  } catch (e) {
    // TODO: handle error
    console.log(e);
  }
}

// ✅ CRAFTSMANSHIP: Strongly typed, validated, resilient, structured errors
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'teacher', 'student', 'guest']),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export class UserFetchError extends Error {
  constructor(message: string, public readonly statusCode?: number, public readonly cause?: unknown) {
    super(message);
    this.name = 'UserFetchError';
  }
}

export async function fetchUserData(id: string, signal?: AbortSignal): Promise<User> {
  if (!id || typeof id !== 'string') {
    throw new UserFetchError('Invalid user ID supplied', 400);
  }

  const response = await fetch(`/api/v1/users/${encodeURIComponent(id)}`, {
    headers: { 'Accept': 'application/json' },
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => null);
    throw new UserFetchError(`Failed to fetch user: ${response.statusText}`, response.status, errorBody);
  }

  const rawJson = await response.json();
  const parsed = UserSchema.safeParse(rawJson);

  if (!parsed.success) {
    throw new UserFetchError('User payload failed schema validation', 422, parsed.error.format());
  }

  return parsed.data;
}
```

---

## 3. Visual & Aesthetic Anti-Slop Discipline

### Eradicating "AI Template Syndrome"
AI-generated designs all tend to look identical: dark gray background (`#0f172a`), purple-to-indigo gradient (`from-indigo-500 to-purple-600`), 3 centered cards with identical rounded corners, generic Lucide icons, and zero soul.

### The Bespoke Design Heuristics
1. **Domain-Specific Visual Tone**:
   - Educational/School Portal: Trustworthy navy, warm slate, crisp emerald/forest accents, academic editorial typography, high legibility, clean badges.
   - Enterprise/Fintech: Monospaced numerical telemetry, high-contrast crisp tabular data, strict 4px grid, subdued slate-900 with brass or cobalt accents.
   - Creative/Media: Bold typography contrasts, asymmetric bento layouts, fluid springs, purposeful micro-interactions.
2. **Typography with Intent**:
   - Pair an expressive display typeface (e.g., *Outfit*, *Plus Jakarta Sans*, *Syne*, *Fraunces*, *Space Grotesk*) with a bulletproof reading font (*Inter*, *Geist*, *IBM Plex Sans*).
   - Set strict typographical scales (minor third or major third) with tight tracking (`letter-spacing: -0.02em`) on display headers.
3. **Complete State Spectrum (Every Component Must Have All 5 States)**:
   - **Idle/Default**: Balanced contrast, clear hierarchy.
   - **Hover/Pointer**: Responsive elevation, subtle border glow, tactile scale (`transform: translateY(-2px)`).
   - **Active/Pressed**: Tactile depression (`transform: scale(0.98)`).
   - **Focused**: High-visibility WCAG-compliant keyboard focus ring (`outline: 2px solid var(--accent); outline-offset: 2px`).
   - **Disabled**: Lower opacity (`opacity: 0.5; pointer-events: none; cursor: not-allowed`), not just grayed out.
4. **Mandatory UI Lifecycle States**:
   - **Loading State**: Customized skeleton screens that reflect the true layout geometry, not a generic centered spinning GIF.
   - **Empty State**: Purposeful SVG illustration, helpful explanatory copy, and a primary action button guiding the user what to do next.
   - **Error State**: Non-destructive notification with clear human-readable diagnosis and a retry button.

See [`references/bespoke_design_heuristics.md`](./references/bespoke_design_heuristics.md) for full aesthetic tokens and layouts.

---

## 4. Architectural Pragmatism: No Over-Engineering

Avoid the opposite extreme of AI slop: **hallucinated enterprise over-engineering**.

- **Do Not**: Write 8 layers of generic factory providers, abstract facade builders, and custom wrappers for a simple feature.
- **Do**: Choose the simplest architecture that completely fulfills the requirements with room for extension.
- **Colocation Principle**: Keep state, types, and styles as close as possible to where they are used. Only elevate to global stores when shared across disjoint subtrees.
- **Fail Fast & Explicitly**: Validate boundaries with schemas. Do not write silent try/catches that swallow errors.

---

## 5. Realistic Data & Copywriting Standards

When creating mock data or initial content:
- **Language Fidelity**: If the user or context is Indonesian (e.g. `web sekolah`), write authentic, grammatically natural Indonesian copy ("Penerimaan Peserta Didik Baru (PPDB)", "Kurikulum Merdeka", "Organisasi Siswa Intra Sekolah (OSIS)", "Ekstrakurikuler", "Daftar Tenaga Pendidik").
- **No Filler Copy**: Do not write "Kami adalah sekolah terdepan yang memberikan solusi sinergi terbaik untuk anak Anda". Write realistic, compelling institutional copy with genuine dates, curriculum details, and contact information.

---

## 6. Anti-Slop Verification Checklist

Before finalizing any task, run through the Anti-Slop Audit:

- [ ] **No Placeholders**: Are all `TODO`, `FIXME`, or omitted lines eliminated?
- [ ] **Full Integration**: Are all imports valid and all references connected to real files?
- [ ] **Error Handling**: Are asynchronous calls, network requests, and user inputs safely guarded?
- [ ] **All UI States Present**: Are loading, empty, error, hover, and focus states implemented?
- [ ] **Authentic Content**: Is the text, data, and imagery contextually authentic and free of "Lorem Ipsum"?
- [ ] **Zero Fluff**: Is communication concise, direct, and actionable?

Run the detection script [`scripts/detect_slop.py`](./scripts/detect_slop.py) to automatically scan code for AI slop patterns.
