# Pre-Launch To-Do
# Complete in order. Check off each item before moving to the next.

---

## 1. SEO Metadata
- [ ] Add Next.js Metadata object to app/layout.tsx
- [ ] Set metadataBase using BASE_URL placeholder
- [ ] Write title (default + template)
- [ ] Write meta description (Italian, 150–160 chars)
- [ ] Add keywords array (candidate name, city, election year, topics)
- [ ] Set author, creator, publisher fields
- [ ] Set robots: index + follow
- [ ] Set canonical URL
- [ ] Confirm: view-source shows correct title and description
- [ ] check via https://www.opengraph.xyz/url/https%3A%2F%2Fpreview.swiss-grid-generator.com

---

## 2. Open Graph + Twitter Card
- [ ] Add openGraph block to metadata (type, locale, url, title, description, image)
- [ ] Add twitter block (card: summary_large_image, title, description, image)
- [ ] Reference /og-image.jpg for both (created in step 3)
- [ ] Confirm: view-source shows all og: and twitter: meta tags

---

## 3. OG Image
- [ ] Create Node script to generate /public/og-image.jpg
- [ ] Canvas size: exactly 1200 × 630px
- [ ] Include: label, name, tagline, domain credit, accent bar
- [ ] Colors match site palette (ivory background, lagoon blue text)
- [ ] Save as JPG, max 200KB
- [ ] Add generate:og script to package.json
- [ ] Run script and verify output file exists and looks correct

---

## 4. robots.txt
- [ ] Create /public/robots.txt
- [ ] Allow all crawlers
- [ ] Add Sitemap reference pointing to BASE_URL/sitemap.xml
- [ ] Confirm file present in /out after build

---

## 5. sitemap.xml
- [ ] Create app/sitemap.ts
- [ ] Include / with priority 1.0, changeFrequency weekly
- [ ] Include /privacy with priority 0.3, changeFrequency yearly
- [ ] Use BASE_URL as base
- [ ] Confirm /out/sitemap.xml generated after build
- [ ] Validate XML structure

---

## 6. JSON-LD Structured Data
- [ ] Add Person schema to layout head (name, jobTitle, email, url, sameAs, knowsAbout)
- [ ] Add WebSite schema to layout head (name, url, language, about event)
- [ ] Use BASE_URL for all url fields
- [ ] Confirm: validate both schemas at validator.schema.org — zero errors

---

## 7. Favicon + Web Manifest
- [ ] Create favicon.svg (MS initials, lagoon blue on ivory)
- [ ] Generate favicon.ico at 32×32
- [ ] Generate apple-touch-icon.png at 180×180
- [ ] Add icon references to metadata in layout.tsx
- [ ] Create /public/manifest.json (name, colors, lang, icons)
- [ ] Add manifest reference to metadata
- [ ] Confirm: favicon visible in browser tab
- [ ] Confirm: DevTools → Application → Manifest shows no errors

---

## 8. Content Bug Fixes
- [ ] Fix manifesto quote — word "non" is missing, meaning is inverted
- [ ] Fix hero subtitle — replace hyphen (-) with em dash (–)
- [ ] Verify accordion section count — check if section 8 "Decoro urbano" is missing or merged
- [ ] Rebuild content.json after any CONTENT.md changes

---

## 9. Code Cleanup
- [ ] Run tsc --noEmit → fix all TypeScript errors, zero tolerance
- [ ] Run eslint --fix → fix all linting errors
- [ ] Remove all console.log statements
- [ ] Remove all commented-out code
- [ ] Remove all TODO/FIXME comments referencing mock data
- [ ] Verify every image has descriptive alt text
- [ ] Verify hero portrait has priority={true}
- [ ] Verify no images loaded from external CDNs

---

## 10. Accessibility
- [ ] Add skip-to-content link at top of layout
- [ ] Add id="main-content" to main element in page.tsx
- [ ] Verify accordion aria-expanded and aria-controls are wired
- [ ] Verify focus rings visible on all interactive elements
- [ ] Run axe DevTools on / → zero critical or serious violations
- [ ] Verify tab navigation order is logical

---

## 11. Performance
- [ ] Run npm run build
- [ ] Check First Load JS for / is ≤ 100kB
- [ ] Confirm ProgramAccordion is the only "use client" component
- [ ] Fix any accidental client component promotions if over budget

---

## 12. Security Headers
- [ ] Add headers() block to next.config.ts
- [ ] Include: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [ ] Include: Permissions-Policy, Content-Security-Policy
- [ ] Create nginx-headers.conf as reference for hosting team

---

## 13. Legal Check
- [ ] Electoral disclaimer visible in footer on every page
- [ ] Privacy Policy page renders at /privacy and is linked from footer
- [ ] Zero external tracking scripts (no GA, FB Pixel, Hotjar etc.)
- [ ] Confirm no cookie consent banner is needed

---

## 14. Final Build Verification
- [ ] npm run dev → no terminal errors, content.json generated
- [ ] npx tsc --noEmit → zero errors
- [ ] npm run build → succeeds, /out folder complete
- [ ] Serve /out locally and verify page works from static files
- [ ] Test all links and mailto: addresses
- [ ] Test on mobile 375px — no horizontal scroll, all content readable
- [ ] Test OG preview at opengraph.xyz

---

## 15. Production Domain (deferred — do last)
- [ ] Confirm production domain with client
- [ ] Find and replace BASE_URL → production domain across all files
- [ ] Run final npm run build
- [ ] Deploy /out