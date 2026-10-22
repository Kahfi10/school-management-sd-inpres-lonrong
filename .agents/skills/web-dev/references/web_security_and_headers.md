# Web Security & HTTP Headers Reference

Modern web security requires defense-in-depth implemented at both the application boundary and HTTP response headers.

---

## 1. Standard Production HTTP Security Headers

Configure your web server (Nginx, Caddy, Cloudflare, or Next.js middleware) with these essential headers:

```http
# Prevent clickjacking
X-Frame-Options: DENY

# Block MIME-type sniffing
X-Content-Type-Options: nosniff

# Enforce HTTPS and preload
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

# Restrict referrer info on outbound links
Referrer-Policy: strict-origin-when-cross-origin

# Restrict powerful browser device APIs
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()

# Content Security Policy (strict script protection)
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-rAnd0m123'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://images.unsplash.com; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';
```

---

## 2. Next.js `next.config.js` Security Headers Recipe

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 3. Client-Side XSS Sanitization

Always sanitize HTML before rendering raw strings:
```typescript
import DOMPurify from 'isomorphic-dompurify';

export function renderUserHtml(dirtyHtml: string): string {
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'code'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  });
}
```
