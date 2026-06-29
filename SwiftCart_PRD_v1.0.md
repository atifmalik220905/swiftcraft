# SwiftCart — Slide Cart & AOV Booster
## Product Requirements Document (PRD) · v1.0

**Product:** SwiftCart – Shopify App  
**Prepared By:** Scalezix Technologies, Ahmedabad  
**Target Market:** D2C Brands, ₹1Cr–₹50Cr GMV  
**Version Date:** June 2026  
**Status:** DRAFT – Pre-Development

---

# 01. EXECUTIVE SUMMARY

SwiftCart is a Shopify public app targeting Indian D2C brands (₹1Cr–₹50Cr GMV) that need a high-converting slide cart drawer with built-in AOV boosters — at a price point 30–40% cheaper than GoKwik Cart. The product competes on feature parity + aggressive INR pricing + simpler merchant onboarding, with a goal of acquiring 500 paying merchants within 12 months of launch.

> **Core Value Proposition:** Every feature GoKwik Cart charges ₹3,500+/month for — AI upsell, progress bar, free gifts, fraud prevention, countdown timers — delivered by SwiftCart at ₹999–₹9,999/month. Fully customizable to any Shopify theme in under 10 minutes. No developer needed.

## 1.1 Problem Statement

Indian D2C brands on Shopify lose 15–25% of potential revenue to poor cart UX. The native Shopify cart lacks upsell logic, AOV nudges, and conversion mechanics. Existing solutions like GoKwik Cart ($19.99–$149.99/month USD) are priced for international GMV levels and feel over-engineered for the ₹1Cr–₹50Cr Indian D2C segment. There is a clear gap for a cost-effective, India-first slide cart solution with the same feature depth.

## 1.2 Opportunity Sizing

| Metric | Value | Notes |
|---|---|---|
| Shopify merchants in India | ~1,00,000+ | Shopify India 2025 estimates |
| D2C brands ₹1Cr–₹50Cr GMV | ~15,000–20,000 | Target addressable pool |
| Cart app penetration (est.) | ~12% | Industry adoption benchmarks |
| TAM at ₹2,500 ARPU/mo | ₹4.5 Cr/month | 15,000 × 12% × ₹2,500 |
| Realistic Y1 target (500 merchants) | ₹1.25 Cr ARR | Conservative 3.3% share |

---

# 02. PRODUCT OVERVIEW

## 2.1 App Name & Branding

| Field | Value |
|---|---|
| App Name | SwiftCart – Slide Cart & AOV Booster |
| Tagline | Sell More. Every Cart. Every Time. |
| App Handle (Shopify) | swiftcart-slide-cart-aov |
| Category | Cart Customization / Upsell & Cross-sell |
| Primary Language | English (Hindi dashboard labels — Phase 2) |
| Shopify API Version | 2025-01 (latest stable) |

## 2.2 What SwiftCart Does

SwiftCart replaces the default Shopify cart with a fully animated slide-in drawer that fires automatically when a customer adds any product. Inside this drawer, merchants configure upsells, discounts, free gift thresholds, countdown timers, and a gamified progress bar — all from a no-code admin dashboard. The cart syncs with Shopify's Cart API in real-time and injects itself via a theme extension (App Blocks), requiring zero code from the merchant.

## 2.3 Competitive Positioning vs GoKwik Cart

| Feature / Dimension | GoKwik Cart | SwiftCart |
|---|---|---|
| Starting Price | $19.99/mo (≈₹1,670) | ₹999/mo (~40% cheaper) |
| Slide Cart Drawer | ✅ | ✅ |
| AI Upsell | ✅ (GoKwik AI) | ✅ (Rule-based v1, AI v2) |
| Progress Bar | ✅ | ✅ |
| Free Gifts | ✅ | ✅ |
| Countdown Timer | ✅ | ✅ |
| Fraud / RTO Checks | ✅ (GoKwik data) | ✅ (Shiprocket / basic) |
| Sticky ATC Button | ✅ | ✅ |
| Hindi Dashboard | ❌ | Phase 2 ✅ |
| India-specific pricing | USD only | INR native |
| Setup Time | ~30 min | < 10 min |
| Built for Shopify Badge | No | Apply at 500 reviews |

---

# 03. FEATURE SPECIFICATIONS

## 3.1 Cart Drawer (Core UI)

The slide cart is the primary UI surface. It replaces or overlays the default cart experience and slides in from the right on desktop, bottom on mobile.

### 3.1.1 Trigger Mechanisms

- Auto-open on Add to Cart click (product page, collection page, quick-view modal)
- Cart icon click in header
- Programmatic trigger via SwiftCart JS API (for custom themes)
- Mini cart bubble with real-time item count badge

### 3.1.2 Drawer Layout Structure

| Zone | Content |
|---|---|
| Header | Cart title, item count, close (X) button, optional announcement banner |
| Progress Bar | Milestone tracker: free shipping / free gift / discount unlock |
| Cart Items | Product thumbnail, name, variant, qty stepper, price, remove button |
| Upsell Section | Horizontal scroll carousel of recommended add-ons |
| Coupon Field | Expandable discount code input with live validation |
| Order Summary | Subtotal, discount applied, savings badge, free shipping indicator |
| Sticky Footer | Checkout button, optional express pay intent |

### 3.1.3 Customization Controls (Merchant Dashboard)

- Drawer position: Right side (default) / Left side
- Drawer width: 360px–520px (slider control)
- Background color, overlay opacity, border radius
- Font family selection (5 presets + custom Google Font URL)
- Button color, hover color, text color (all configurable)
- Upload custom header logo / banner image
- Custom CSS override box for advanced merchants
- Custom HTML injection zone (above/below cart items)
- Enable/disable each section independently

---

## 3.2 Progress Bar & Gamification

The progress bar is the highest-impact AOV lever. It shows customers how close they are to unlocking a reward, creating a psychological nudge to add more items.

### 3.2.1 Progress Bar Modes

- **Free Shipping Bar** — "Add ₹X more to get FREE shipping!"
- **Free Gift Bar** — "Add ₹X more to unlock a free [Product Name]!"
- **Discount Unlock Bar** — "Spend ₹X more to get 15% off your order!"
- **Multi-Milestone Bar** — Chain up to 3 milestones in sequence

### 3.2.2 Configuration Options

- Set threshold amounts per milestone (absolute ₹ or % above cart value)
- Custom message text per milestone with emoji support
- Bar fill color, background color, animated shimmer toggle
- Progress label: above bar / inside bar / below bar
- Show "Unlocked! 🎉" celebration animation on milestone hit

---

## 3.3 Upsell & Cross-Sell Engine

### 3.3.1 Rule-Based Upsell (Launch — v1.0)

Merchants configure upsell rules in the dashboard. Rules are evaluated in priority order when the cart is opened.

- Trigger: If cart contains [Product / Collection / Tag], show [Product(s)]
- Trigger: If cart value is between ₹X and ₹Y, show [Product(s)]
- Trigger: If customer is from [City / State], show [Product]
- Display: Carousel (default) / Grid / Single featured product
- One-click add: Customer adds upsell product without leaving cart
- Variant selection: Inline size/color selector within cart for upsell products
- Max 3 upsell rules on Starter plan; 10 on Growth; Unlimited on Scale+

### 3.3.2 AI-Powered Upsell (Phase 2 — v1.1)

Collaborative filtering model trained on aggregated SwiftCart merchant data.

- Input signals: Current cart contents, customer purchase history (Shopify API), product tags, price range
- Model: Item-based collaborative filtering (Python/FastAPI microservice)
- Output: Ranked list of up to 6 product recommendations per cart state
- A/B test mode: Rule-based vs AI recommendations with click-through tracking

### 3.3.3 Buy More Save More (Volume Discounts)

- Configure tiered discounts: Buy 2 = 5% off, Buy 3 = 10% off, Buy 4+ = 15% off
- Applies to same product variants or across a defined collection
- Shows savings callout inline in cart item row

---

## 3.4 Free Gift System

- Define gift products and unlock threshold (e.g., cart > ₹1,499 → add Moisturiser 15ml for ₹0)
- Gift auto-added to cart when threshold is crossed
- Gift auto-removed if customer reduces cart below threshold
- Gift displayed with "FREE" badge in cart items section
- Option: Let customer choose gift from a defined gift collection
- Limit: 1 active gift rule on Starter; 3 on Growth; Unlimited on Scale+

---

## 3.5 Discount & Coupon System

- Inline coupon field inside cart (expandable, not always visible)
- Live AJAX validation — shows success/error without page reload
- Pre-applied discount display: "SAVE20 applied — saving ₹450"
- Stack visibility: Show all active discounts and their savings
- Auto-apply discount codes via URL parameter or stored session
- Block checkout if conflicting discounts detected (configurable)

---

## 3.6 Countdown Timer & Urgency Signals

- Sticky footer countdown: "Checkout within 14:32 to get free shipping today!"
- Cart-level timer: Session-based or fixed daily reset
- Low stock signal: "Only 3 left in stock" pulled from Shopify inventory
- Social proof label: "X people have this in their cart right now" (configurable)
- All urgency signals individually togglable from dashboard

---

## 3.7 Sticky Add-to-Cart (Mobile)

- Floating bar pinned to bottom of screen on mobile product pages
- Shows: Product image thumbnail, name, price, ATC button
- Variant-aware: Reflects currently selected size/color
- Disappears when native ATC button is visible in viewport
- Configurable background color, button color, font size

---

## 3.8 Fraud Prevention & RTO Safeguards

Targeting D2C brands dealing with high COD return rates:

- Flag orders from high-RTO pincodes (merchant-configurable blocklist)
- Require OTP verification before COD checkout above ₹X threshold
- Hide COD option for cart values above merchant-set limit
- Address intelligence: Warn if shipping address appears incomplete
- Phase 2: Integrate with Shiprocket RTO Intelligence API for pincode-level risk scoring

---

## 3.9 Analytics Dashboard

- Cart open rate, checkout conversion rate, upsell click-through rate
- Revenue attributed to upsells per day/week/month
- Top-performing upsell products by click and add rate
- Progress bar unlock rate per milestone
- Coupon redemption rate and discount code revenue impact
- Average Order Value (AOV) before vs after SwiftCart (30-day comparison)
- Device breakdown: Mobile vs Desktop cart behavior
- Export to CSV available on Growth and Scale plans

---

# 04. MERCHANT ADMIN DASHBOARD

## 4.1 Dashboard Navigation Structure

| Nav Item | Sub-sections |
|---|---|
| Home / Overview | Live KPIs, quick alerts, recent upsell wins |
| Cart Customizer | Design, layout, colors, fonts, custom CSS/HTML |
| Progress Bar | Milestone setup, rewards, messages |
| Upsell Rules | Create / edit / prioritize rules, product picker |
| Free Gifts | Gift products, thresholds, customer choice |
| Discounts | Coupon settings, auto-apply rules, stacking |
| Urgency & Timers | Countdown config, low stock, social proof |
| Fraud Settings | Pincode blocklist, COD OTP rules, limits |
| Analytics | Charts, tables, export |
| Plan & Billing | Current plan, usage meter, upgrade flow |
| Help & Support | Docs, video guides, live chat widget |

## 4.2 Onboarding Flow (< 10 Minutes)

1. Merchant installs app from Shopify App Store
2. OAuth authentication → SwiftCart granted required scopes
3. 5-step setup wizard: Theme detection → Cart style → Progress bar → First upsell rule → Go live
4. Theme extension auto-activated (no manual liquid editing required)
5. Preview mode: Merchant sees live cart before publishing
6. Success screen with "Your first upsell is live!"

## 4.3 Live Preview

The Cart Customizer section embeds a live iframe preview of the merchant's actual storefront with SwiftCart active. Any design change reflects in real-time before saving. Merchants can toggle between Desktop and Mobile preview modes.

---

# 05. TECHNICAL ARCHITECTURE

## 5.1 Recommended Tech Stack

> **Stack Decision: Remix + FastAPI + PostgreSQL + AWS**  
> Shopify officially recommends Remix for new apps (built-in App Bridge v4, OAuth, Polaris support). FastAPI handles the AI upsell microservice (Scalezix's existing Python strength). PostgreSQL stores multi-tenant app data. Redis for cart session caching. AWS ap-south-1 (Mumbai) for hosting.

| Layer | Technology |
|---|---|
| Admin Frontend | Remix (React) + Shopify Polaris component library |
| Storefront Cart Widget | Vanilla JS + CSS (no framework — zero load penalty) |
| Backend API | Remix server routes + FastAPI (Python) for AI microservice |
| Database | PostgreSQL (multi-tenant, shop_id partitioning) |
| Cache / Sessions | Redis (cart state, session tokens) |
| Shopify Integration | Admin API (GraphQL), Storefront API, App Bridge v4 |
| Hosting | AWS EC2 (auto-scaling), RDS PostgreSQL, ElastiCache Redis |
| CDN | AWS CloudFront (cart widget JS/CSS delivery <50ms India) |
| Auth | Shopify OAuth 2.0 + HMAC verification on all webhooks |
| Theme Integration | Shopify Theme App Extension (App Blocks — no liquid edits) |
| Payments (App Billing) | Shopify Billing API (recurring charges in INR) |
| Monitoring | Sentry (errors), Datadog (APM), CloudWatch (infra) |

## 5.2 Data Flow: Cart Open Event

1. Shopper adds product → Shopify fires `cart/change` event
2. SwiftCart JS intercepts event, fetches Shopify Cart API (`cart.js`)
3. JS sends cart state to SwiftCart API: `POST /api/cart/evaluate`
4. Backend evaluates: upsell rules, progress bar state, fraud signals, active discounts
5. Returns JSON payload with upsell products, milestone status, timers
6. Cart drawer renders in <200ms with all personalized elements
7. Merchant analytics event written async to PostgreSQL

## 5.3 Shopify API Scopes Required

- `read_products`, `write_products` — upsell product data
- `read_orders` — fraud signal evaluation
- `write_script_tags` — storefront widget injection
- `read_customers`, `write_customers` — fraud tagging
- `read_discounts` — coupon validation
- `write_checkouts` — applying discounts at checkout
- `read_analytics` — attribution data
- `read_themes`, `write_themes` — App Block installation

## 5.4 Performance Targets

| Metric | Target |
|---|---|
| Cart drawer open to render | < 200ms (P95) |
| Widget JS bundle size | < 35KB gzipped |
| API response time (upsell eval) | < 120ms (P90) |
| App uptime SLA | 99.9% monthly |
| Lighthouse score impact on merchant store | < 2 point drop |

---

# 06. PRICING ARCHITECTURE

## 6.1 Plan Structure (Order-Volume Tiers)

Pricing mirrors GoKwik's volume-based model but denominated in INR at ~40% lower price points.

| | Starter | Growth | Scale | Enterprise |
|---|---|---|---|---|
| Order Volume / mo | 0–500 | 501–2,000 | 2,001–5,000 | 5,001+ |
| Monthly Price (INR) | ₹999 | ₹2,499 | ₹4,999 | ₹9,999 |
| GoKwik Equivalent | $19.99 (≈₹1,670) | $39.99 (≈₹3,340) | $69.99 (≈₹5,840) | $149.99 (≈₹12,500) |
| Savings vs GoKwik | ~40% | ~25% | ~14% | ~20% |
| Free Trial | 14 days | 14 days | 14 days | 14 days |

## 6.2 Feature Gating by Plan

| Feature | Starter | Growth | Scale | Enterprise |
|---|---|---|---|---|
| Slide Cart Drawer | ✅ | ✅ | ✅ | ✅ |
| Progress Bar (1 milestone) | ✅ | ✅ | ✅ | ✅ |
| Multi-Milestone Progress (3) | ❌ | ✅ | ✅ | ✅ |
| Upsell Rules | 3 rules | 10 rules | Unlimited | Unlimited |
| AI Upsell Recommendations | ❌ | ❌ | ✅ | ✅ |
| Free Gift Rules | 1 gift | 3 gifts | Unlimited | Unlimited |
| Countdown Timer | ✅ | ✅ | ✅ | ✅ |
| Sticky ATC Button | ✅ | ✅ | ✅ | ✅ |
| Coupon Field in Cart | ✅ | ✅ | ✅ | ✅ |
| Volume Discounts | ❌ | ✅ | ✅ | ✅ |
| Fraud / RTO Rules | Basic | Standard | Advanced | Advanced + API |
| Analytics Dashboard | Basic | Standard | Full | Full + Export |
| Custom CSS/HTML | ❌ | ✅ | ✅ | ✅ |
| Priority Support | ❌ | Email | Chat | Dedicated CSM |

## 6.3 Billing Implementation

- Shopify Billing API: `RecurringApplicationCharge` for monthly plans
- Plan auto-upgrades when merchant's 30-day order count crosses tier threshold (7-day grace period to prevent billing shock)
- Pro-rated refund on downgrade within 7 days of plan change
- Annual billing option (2 months free) — Phase 2

---

# 07. DEVELOPMENT ROADMAP

## 7.1 Phase 1 — MVP (Weeks 1–10)

**Goal:** Launch on Shopify App Store with all core features. Acquire first 25 merchants. Collect 25+ reviews.

| Sprint | Duration | Deliverables |
|---|---|---|
| S1 | Week 1–2 | Project setup: Shopify Partner account, Remix scaffold, OAuth, DB schema, theme extension skeleton |
| S2 | Week 3–4 | Cart drawer widget: open/close, product list, qty stepper, remove, subtotal, checkout button |
| S3 | Week 5–6 | Progress bar, countdown timer, sticky ATC button, low stock signals |
| S4 | Week 7–8 | Upsell rules engine (rule-based, 3 trigger types), one-click add-to-cart, coupon field |
| S5 | Week 9–10 | Admin dashboard: all config panels, live preview, onboarding wizard, Shopify Billing API |

## 7.2 Phase 2 — Growth (Weeks 11–20)

**Goal:** AI upsell live. Analytics v2. Target 150 merchants, 4.5+ star rating.

- AI recommendations microservice (FastAPI, collaborative filtering model)
- Analytics dashboard v2: charts, AOV comparison, upsell revenue attribution
- Volume discounts (buy more save more) module
- Free gift system: auto-add/remove, customer choice mode
- Fraud prevention v2: Shiprocket RTO API integration
- Hindi dashboard labels (India UX improvement)
- Annual billing option in Shopify Billing API
- A/B test framework: rule-based upsell vs AI recommendation

## 7.3 Phase 3 — Scale (Weeks 21–30)

**Goal:** 500 merchants, Built for Shopify badge application.

- Multi-language storefront cart (Hindi, Tamil, Marathi cart text)
- WhatsApp cart abandonment integration (via Interakt / Zoko)
- Shopify Plus: Checkout extensibility (cart-to-checkout data pass)
- White-label option for Scalezix agency clients
- Apply for Built for Shopify badge (requires 500 reviews, Lighthouse compliance)
- API access for Enterprise merchants (webhooks, custom integrations)

---

# 08. GO-TO-MARKET STRATEGY

## 8.1 Pre-Launch (Weeks 1–10, While Building)

- Create Shopify Partner account; submit app for review by Week 8
- Build landing page: swiftcart.in — SEO targeting "Shopify slide cart India", "cart upsell app India"
- LinkedIn content series: "Building a Shopify app from scratch" (Utkarsh personal brand + Scalezix)
- Identify 10 beta merchants from Scalezix network / LinkedIn D2C communities — offer 3 months free
- Set up App Store listing with A/B tested screenshots (Figma → 1280×800 assets)

## 8.2 Launch (Weeks 11–16)

- App Store listing live — focus keywords: "slide cart drawer", "cart upsell", "AOV booster India"
- ProductHunt launch (coordinate with Indian maker community)
- Reach out to D2C India communities: D2C Insider, iSPIRT, Shopify India Facebook Group
- Cold email 500 Shopify merchants in beauty, fashion, wellness verticals
- YouTube Shorts / Instagram Reels: 60-sec "how to set up SwiftCart" tutorials
- Aggressive review strategy: Email sequence to beta users → request Shopify review after 14 days

## 8.3 Growth (Month 4–12)

- Affiliate / referral program: ₹500/merchant referred (pay after 60-day retention)
- SEO blog: "How to reduce cart abandonment on Shopify India", "Best upsell strategies for D2C 2026"
- Partner with Shopify Experts / agencies — offer 20% revenue share for referred installs
- Integration listings on Shiprocket, Razorpay, Unicommerce partner directories
- Attend D2C India events: D2C Summit, Shark Tank alumni networks

---

# 09. DATABASE SCHEMA (PostgreSQL)

All tables include `created_at`, `updated_at` timestamps. `shop_id` is the foreign key linking all merchant data.

## 9.1 merchants

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Primary key |
| shop_domain | VARCHAR(255) UNIQUE | e.g. storename.myshopify.com |
| access_token | TEXT encrypted | Shopify OAuth token |
| plan_id | INTEGER FK | References plans table |
| monthly_order_count | INTEGER | Updated daily via webhook |
| is_active | BOOLEAN | App installed/uninstalled |
| installed_at | TIMESTAMPTZ | |
| trial_ends_at | TIMESTAMPTZ | 14-day trial window |

## 9.2 cart_settings

| Column | Type | Notes |
|---|---|---|
| shop_id | UUID FK | References merchants |
| drawer_position | VARCHAR(10) | 'right' or 'left' |
| drawer_width_px | INTEGER | 360–520 |
| primary_color | VARCHAR(7) | Hex color |
| button_color | VARCHAR(7) | CTA button hex |
| font_family | VARCHAR(100) | Font name or URL |
| show_progress_bar | BOOLEAN | |
| show_countdown | BOOLEAN | |
| show_sticky_atc | BOOLEAN | |
| custom_css | TEXT | Merchant-injected CSS |
| custom_html_top | TEXT | |
| custom_html_bottom | TEXT | |

## 9.3 upsell_rules

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| shop_id | UUID FK | |
| rule_name | VARCHAR(100) | Merchant-facing label |
| trigger_type | ENUM | 'product', 'collection', 'cart_value', 'tag' |
| trigger_value | JSONB | { product_ids: [], min_value: 0 } |
| upsell_product_ids | UUID[] | Shopify product IDs to show |
| display_type | ENUM | 'carousel', 'grid', 'single' |
| priority | INTEGER | Lower = evaluated first |
| is_active | BOOLEAN | |

## 9.4 progress_bar_rules

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| shop_id | UUID FK | |
| milestone_order | INTEGER | 1, 2, or 3 |
| reward_type | ENUM | 'free_shipping', 'free_gift', 'discount' |
| threshold_amount | DECIMAL(10,2) | Cart value to unlock |
| message_before | TEXT | "Add ₹X more to unlock..." |
| message_after | TEXT | "You unlocked free shipping! 🎉" |
| reward_value | VARCHAR(100) | Discount code or product ID |

## 9.5 cart_events (Analytics)

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| shop_id | UUID FK | |
| session_id | VARCHAR(64) | Anonymous browser session |
| event_type | ENUM | 'cart_open', 'upsell_click', 'upsell_add', 'checkout', 'gift_unlocked' |
| cart_value_before | DECIMAL(10,2) | |
| cart_value_after | DECIMAL(10,2) | |
| upsell_rule_id | UUID FK nullable | If triggered by a rule |
| device_type | VARCHAR(20) | 'mobile', 'desktop', 'tablet' |
| occurred_at | TIMESTAMPTZ | |

---

# 10. SUCCESS METRICS & KPIs

## 10.1 Business KPIs (12-Month Targets)

| KPI | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Paying merchants | 25 | 150 | 500 |
| MRR (INR) | ₹37,500 | ₹2.5L | ₹10L+ |
| App Store rating | 4.0+ | 4.3+ | 4.5+ |
| Reviews | 25 | 80 | 200+ |
| Trial → Paid conversion | 25% | 30% | 35% |
| Churn rate (monthly) | <8% | <6% | <5% |
| Avg AOV lift for merchants | +8% | +12% | +18% |

## 10.2 Product Health KPIs

- Cart render time P95 < 200ms (measured via CloudWatch)
- API error rate < 0.1% of cart evaluation requests
- Zero merchant-impacting downtime during BFCM / sale events
- Onboarding completion rate > 80% (wizard step 1 to go-live)
- Support ticket resolution < 4 hours average

## 10.3 Shopify App Store Compliance

- Lighthouse performance score impact: < 2 points deduction on merchant stores
- GDPR / privacy: No PII stored beyond Shopify data policy limits
- App Review requirements: Complete data request handling, uninstall cleanup webhook
- Built for Shopify checklist adherence from Day 1 (to qualify at 500 reviews)

---

# 11. RISKS & MITIGATIONS

| Risk | Severity | Mitigation |
|---|---|---|
| Shopify API changes breaking cart widget | HIGH | Pin to stable API version; monitor Shopify changelog; E2E test suite |
| Theme compatibility issues (conflicting cart JS) | HIGH | Test on top 10 Shopify themes before launch (Dawn, Craft, Sense, Debut, etc.) |
| GoKwik aggressive pricing response | MEDIUM | Focus on INR pricing + India-first features they won't build for a global product |
| Slow merchant acquisition / low conversion | HIGH | Beta cohort of 10 pre-launch; direct outreach to Scalezix's existing client network |
| Negative app store reviews (bugs) | HIGH | 14-day beta QA; dedicated Slack for beta merchants; resolve issues within 24hr |
| AI upsell model underfitting (cold start) | MEDIUM | Phase 2 only after 10,000+ cart events; rule-based always as fallback |
| Data breach / merchant data exposure | HIGH | Encrypt access_tokens at rest; SOC 2 aligned logging; no PII in logs |
| Shopify App Review rejection | MEDIUM | Follow Shopify App Store guidelines strictly; test with Shopify App Validator CLI |

---

# 12. OPEN QUESTIONS & DECISIONS PENDING

## 12.1 Pre-Development Decisions Needed

1. App name final confirmation — "SwiftCart" trademark check on IP India portal
2. Hosting region: AWS ap-south-1 (Mumbai) only, or ap-southeast-1 (Singapore) as fallback?
3. INR billing: Shopify Billing API now supports INR — confirm partner account eligibility
4. Payment UX in cart footer: Razorpay Pay Button vs native Shopify checkout only?
5. Team allocation from Scalezix: Which 2 devs + how many freelancer hours for 10-week MVP?
6. Beta merchant sourcing: Leverage existing Scalezix clients or fresh D2C outreach?
7. App Store listing screenshots: Will Scalezix design in Figma or outsource?

## 12.2 Phase 2 Decisions (Deferred)

1. AI model hosting: Same EC2 or separate SageMaker endpoint?
2. Hindi dashboard: Full translation or just key labels?
3. WhatsApp integration: Build natively or use Interakt / Wati API?
4. White-label: Offer via Scalezix agency arm at what pricing?

---

# APPENDIX A — SHOPIFY APP STORE LISTING GUIDE

## A.1 App Store Listing Requirements

| Asset | Specification |
|---|---|
| App Icon | 1024×1024px, PNG, no rounded corners, brand mark only |
| Promotional Banner | 1600×900px, key features visible at a glance |
| Desktop Screenshots | 1280×800px, min 3 max 7 — show cart drawer, dashboard, analytics |
| Mobile Screenshots | 750×1334px, min 1 — show slide cart on iPhone |
| App Listing Title | SwiftCart – Slide Cart & AOV Booster (max 30 chars) |
| Tagline | Sell More. Every Cart. Every Time. (60 chars max) |
| Short Description | 150 chars — focus on D2C, slide cart, upsell, India pricing |
| Long Description | 800–1200 words — features, how it works, why SwiftCart, reviews CTA |
| Demo Store URL | Create swiftcart-demo.myshopify.com with all features live |

## A.2 Target Keywords (App Store SEO)

- Primary: "slide cart", "cart drawer", "upsell cart", "AOV booster"
- Secondary: "free shipping bar", "cart progress bar", "sticky cart", "cart upsell India"
- Long-tail: "Shopify slide cart drawer India", "cart upsell for D2C brands"

---

# APPENDIX B — INTEGRATION COMPATIBILITY

## B.1 Tested Theme Compatibility (Pre-Launch Checklist)

- Dawn (Shopify default) — Priority 1
- Craft, Sense, Refresh, Taste — Shopify free themes
- Debutify, Booster Theme, Turbo — Popular paid themes
- Custom themes: Test widget injection via ScriptTag fallback

## B.2 Compatible Apps (Test Before Launch)

- Klaviyo, Mailchimp — email marketing (no cart conflict)
- Razorpay, PayU — payment gateways (checkout pass-through)
- Shiprocket, Delhivery — fulfillment (no cart interference)
- Loox, Judge.me — reviews (no conflict)
- ReConvert — post-purchase (different funnel stage, no conflict)

---

*SwiftCart PRD v1.0 · Prepared by Scalezix Technologies, Ahmedabad · June 2026*  
*Confidential — Internal Use Only*
