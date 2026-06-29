/* ═══════════════════════════════════════════════════════════════
   SwiftCart — Slide Cart Drawer JS Widget
   Zero-dependency vanilla JS — intercepts Shopify Cart API,
   renders cart drawer with upsells, progress bar, countdown.
   Target: <35KB gzipped
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Configuration (injected by liquid template) ─── 
  const CONFIG = window.__SWIFTCART_CONFIG__ || {
    shopDomain: '',
    apiBase: '',
    settings: {},
    milestones: [],
    currency: '₹',
  };

  // ─── State ─── 
  let cartState = { items: [], item_count: 0, total_price: 0, currency: 'INR' };
  let upsellProducts = [];
  let milestoneStatus = [];
  let isOpen = false;
  let countdownInterval = null;
  let countdownSeconds = 0;
  let sessionId = getSessionId();

  // ─── Utilities ─── 
  function getSessionId() {
    let sid = sessionStorage.getItem('sc_session');
    if (!sid) {
      sid = 'sc_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
      sessionStorage.setItem('sc_session', sid);
    }
    return sid;
  }

  function formatMoney(cents) {
    const amount = (cents / 100).toLocaleString('en-IN');
    return CONFIG.currency + amount;
  }

  function $(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  function $$(selector, parent) {
    return Array.from((parent || document).querySelectorAll(selector));
  }

  function createElement(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }

  // ─── Shopify Cart API Helpers ─── 
  async function fetchCart() {
    try {
      const res = await fetch('/cart.js', { credentials: 'same-origin' });
      cartState = await res.json();
      return cartState;
    } catch (e) {
      console.error('[SwiftCart] Failed to fetch cart:', e);
      return cartState;
    }
  }

  async function addToCart(variantId, quantity = 1) {
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items: [{ id: variantId, quantity }] }),
      });
      if (!res.ok) throw new Error('Add failed');
      await fetchCart();
      renderDrawerContent();
      evaluateCart();
      trackEvent('upsell_add', { variantId });
      updateBubbleCount();
    } catch (e) {
      console.error('[SwiftCart] Add to cart error:', e);
    }
  }

  async function changeQuantity(key, quantity) {
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: key, quantity }),
      });
      if (!res.ok) throw new Error('Change failed');
      await fetchCart();
      renderDrawerContent();
      evaluateCart();
      updateBubbleCount();
    } catch (e) {
      console.error('[SwiftCart] Quantity change error:', e);
    }
  }

  async function removeItem(key) {
    await changeQuantity(key, 0);
  }

  // ─── Cart Evaluation (call SwiftCart backend) ─── 
  async function evaluateCart() {
    if (!CONFIG.apiBase) return;
    try {
      const res = await fetch(CONFIG.apiBase + '/api/cart/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: CONFIG.shopDomain,
          sessionId,
          cart: cartState,
          deviceType: getDeviceType(),
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      upsellProducts = data.upsells || [];
      milestoneStatus = data.milestones || [];
      renderUpsells();
      renderProgressBar();
    } catch (e) {
      // Silently fail — cart still functions without backend
      console.warn('[SwiftCart] Evaluation skipped:', e.message);
    }
  }

  function getDeviceType() {
    const w = window.innerWidth;
    if (w <= 768) return 'mobile';
    if (w <= 1024) return 'tablet';
    return 'desktop';
  }

  // ─── Analytics Tracking ─── 
  function trackEvent(eventType, extra = {}) {
    if (!CONFIG.apiBase) return;
    const payload = {
      shopDomain: CONFIG.shopDomain,
      sessionId,
      eventType,
      cartValueBefore: cartState.total_price,
      cartValueAfter: cartState.total_price,
      deviceType: getDeviceType(),
      ...extra,
    };
    // Fire and forget
    fetch(CONFIG.apiBase + '/api/cart/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  // ─── DOM Construction ─── 
  function buildDrawerShell() {
    // Overlay
    const overlay = createElement('div', 'sc-overlay');
    overlay.addEventListener('click', closeDrawer);
    document.body.appendChild(overlay);

    // Drawer
    const s = CONFIG.settings || {};
    const drawer = createElement('div', 'sc-drawer');
    if (s.drawerPosition === 'left') drawer.classList.add('sc-left');
    drawer.id = 'swiftcart-drawer';
    drawer.innerHTML = `
      <div class="sc-header">
        <div class="sc-header__title">
          <span>${s.cartTitle || 'Your Cart'}</span>
          <span class="sc-header__count" id="sc-item-count">0</span>
        </div>
        <button class="sc-header__close" id="sc-close" aria-label="Close cart">&times;</button>
      </div>
      ${s.announcementText ? `<div class="sc-announcement">${s.announcementText}</div>` : ''}
      <div class="sc-progress" id="sc-progress" style="display:none;"></div>
      <div class="sc-countdown" id="sc-countdown" style="display:none;"></div>
      <div class="sc-items" id="sc-items"></div>
      <div class="sc-upsells" id="sc-upsells" style="display:none;"></div>
      <div class="sc-coupon" id="sc-coupon">
        <button class="sc-coupon__toggle" id="sc-coupon-toggle">🏷️ Have a discount code?</button>
        <div class="sc-coupon__form" id="sc-coupon-form">
          <input class="sc-coupon__input" id="sc-coupon-input" type="text" placeholder="Enter code" autocomplete="off" />
          <button class="sc-coupon__apply" id="sc-coupon-apply">Apply</button>
        </div>
        <div class="sc-coupon__result" id="sc-coupon-result" style="display:none;"></div>
      </div>
      <div class="sc-summary" id="sc-summary"></div>
      <div class="sc-footer">
        <button class="sc-footer__checkout" id="sc-checkout">Checkout</button>
        <div class="sc-footer__secure">🔒 Secure Checkout</div>
      </div>
    `;
    document.body.appendChild(drawer);

    // Event listeners
    $('#sc-close').addEventListener('click', closeDrawer);
    $('#sc-checkout').addEventListener('click', () => {
      trackEvent('checkout');
      window.location.href = '/checkout';
    });
    $('#sc-coupon-toggle').addEventListener('click', () => {
      const form = $('#sc-coupon-form');
      form.classList.toggle('sc-active');
    });
    $('#sc-coupon-apply').addEventListener('click', applyCoupon);
    $('#sc-coupon-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyCoupon();
    });

    // Mini cart bubble
    buildBubble();

    // Apply custom CSS variables
    applyThemeVars(s);
  }

  function applyThemeVars(s) {
    const root = document.documentElement;
    if (s.primaryColor) root.style.setProperty('--sc-primary', s.primaryColor);
    if (s.buttonColor) root.style.setProperty('--sc-button', s.buttonColor);
    if (s.buttonTextColor) root.style.setProperty('--sc-button-text', s.buttonTextColor);
    if (s.backgroundColor) root.style.setProperty('--sc-bg', s.backgroundColor);
    if (s.borderRadius != null) root.style.setProperty('--sc-border-radius', s.borderRadius + 'px');
    if (s.fontFamily) root.style.setProperty('--sc-font', `'${s.fontFamily}', sans-serif`);
    if (s.drawerWidthPx) root.style.setProperty('--sc-drawer-width', s.drawerWidthPx + 'px');
    if (s.overlayOpacity != null) root.style.setProperty('--sc-overlay', `rgba(0,0,0,${s.overlayOpacity})`);
  }

  function buildBubble() {
    const bubble = createElement('div', 'sc-bubble');
    bubble.id = 'sc-bubble';
    bubble.innerHTML = `🛒<span class="sc-bubble__count" id="sc-bubble-count">0</span>`;
    bubble.addEventListener('click', openDrawer);
    document.body.appendChild(bubble);
  }

  function updateBubbleCount() {
    const el = $('#sc-bubble-count');
    if (el) el.textContent = cartState.item_count;
    const headerCount = $('#sc-item-count');
    if (headerCount) headerCount.textContent = cartState.item_count;
  }

  // ─── Render Cart Items ─── 
  function renderDrawerContent() {
    const container = $('#sc-items');
    if (!container) return;

    if (cartState.items.length === 0) {
      container.innerHTML = `
        <div class="sc-empty">
          <div class="sc-empty__icon">🛒</div>
          <div class="sc-empty__title">Your cart is empty</div>
          <div class="sc-empty__subtitle">Looks like you haven't added anything yet.</div>
          <button class="sc-empty__cta" onclick="document.querySelector('.sc-overlay').click()">Continue Shopping</button>
        </div>
      `;
      renderSummary();
      return;
    }

    container.innerHTML = cartState.items.map((item) => {
      const variant = item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : '';
      const isFree = item.price === 0;
      const inventoryHtml = item.quantity >= (item.inventory_quantity || 999)
        ? '<div class="sc-low-stock">Only a few left!</div>'
        : '';

      return `
        <div class="sc-item" data-key="${item.key}">
          <img class="sc-item__image" src="${item.image || item.featured_image?.url || ''}" alt="${item.title}" loading="lazy" />
          <div class="sc-item__info">
            <div class="sc-item__title">${item.title}</div>
            ${variant ? `<div class="sc-item__variant">${variant}</div>` : ''}
            ${isFree ? '<span class="sc-item__gift-badge">FREE</span>' : ''}
            <div class="sc-item__bottom">
              <div class="sc-qty">
                <button class="sc-qty__btn sc-qty-minus" data-key="${item.key}" data-qty="${item.quantity - 1}">−</button>
                <span class="sc-qty__value">${item.quantity}</span>
                <button class="sc-qty__btn sc-qty-plus" data-key="${item.key}" data-qty="${item.quantity + 1}">+</button>
              </div>
              <div class="sc-item__price">${isFree ? 'FREE' : formatMoney(item.final_line_price)}</div>
            </div>
            ${inventoryHtml}
          </div>
          <button class="sc-item__remove" data-key="${item.key}" aria-label="Remove item">&times;</button>
        </div>
      `;
    }).join('');

    // Attach item-level event listeners
    $$('.sc-qty-minus, .sc-qty-plus', container).forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const qty = parseInt(btn.dataset.qty, 10);
        changeQuantity(key, Math.max(0, qty));
      });
    });

    $$('.sc-item__remove', container).forEach((btn) => {
      btn.addEventListener('click', () => removeItem(btn.dataset.key));
    });

    renderSummary();
  }

  // ─── Render Summary ─── 
  function renderSummary() {
    const summary = $('#sc-summary');
    if (!summary) return;

    const subtotal = cartState.total_price;
    const discountTotal = cartState.total_discount || 0;

    summary.innerHTML = `
      <div class="sc-summary__row">
        <span>Subtotal</span>
        <span>${formatMoney(subtotal + discountTotal)}</span>
      </div>
      ${discountTotal > 0 ? `
        <div class="sc-summary__row" style="color: #00b894;">
          <span>Discount</span>
          <span>-${formatMoney(discountTotal)}</span>
        </div>
      ` : ''}
      <div class="sc-summary__row sc-summary__row--total">
        <span>Total</span>
        <span>${formatMoney(subtotal)}</span>
      </div>
      ${discountTotal > 0 ? `
        <div class="sc-summary__savings">You're saving ${formatMoney(discountTotal)}! 🎉</div>
      ` : ''}
    `;

    // Show/hide footer based on items
    const footer = $('.sc-footer');
    if (footer) footer.style.display = cartState.items.length > 0 ? 'block' : 'none';
  }

  // ─── Render Progress Bar ─── 
  function renderProgressBar() {
    const container = $('#sc-progress');
    if (!container) return;

    const s = CONFIG.settings || {};
    if (!s.showProgressBar || milestoneStatus.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    const milestone = milestoneStatus[0]; // show first active milestone
    if (!milestone) return;

    const pct = Math.min(100, (milestone.progress || 0) * 100);
    const isComplete = pct >= 100;
    const message = isComplete ? milestone.messageAfter : milestone.messageBefore;

    container.innerHTML = `
      <div class="sc-progress__message">${message}</div>
      <div class="sc-progress__track">
        <div class="sc-progress__fill ${milestone.showShimmer && !isComplete ? 'sc-shimmer' : ''}" style="width: ${pct}%;"></div>
      </div>
      ${isComplete ? '<div class="sc-progress__celebration">🎉 Unlocked!</div>' : ''}
    `;

    // Update bar colors
    if (milestone.barFillColor) container.style.setProperty('--sc-bar-fill', milestone.barFillColor);
    if (milestone.barBgColor) container.style.setProperty('--sc-bar-bg', milestone.barBgColor);
  }

  // ─── Render Upsells ─── 
  function renderUpsells() {
    const container = $('#sc-upsells');
    if (!container) return;

    const s = CONFIG.settings || {};
    if (!s.showUpsells || upsellProducts.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div class="sc-upsells__heading">You might also like</div>
      <div class="sc-upsells__carousel">
        ${upsellProducts.map((p) => `
          <div class="sc-upsell-card">
            <img class="sc-upsell-card__image" src="${p.image || ''}" alt="${p.title}" loading="lazy" />
            <div class="sc-upsell-card__info">
              <div class="sc-upsell-card__title">${p.title}</div>
              <div class="sc-upsell-card__price">${formatMoney(p.price)}</div>
            </div>
            <button class="sc-upsell-card__add" data-variant-id="${p.variantId}">+ Add</button>
          </div>
        `).join('')}
      </div>
    `;

    $$('.sc-upsell-card__add', container).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vid = btn.dataset.variantId;
        addToCart(parseInt(vid, 10));
        trackEvent('upsell_click', { variantId: vid });
      });
    });
  }

  // ─── Coupon System ─── 
  async function applyCoupon() {
    const input = $('#sc-coupon-input');
    const result = $('#sc-coupon-result');
    const code = (input?.value || '').trim();
    if (!code) return;

    result.style.display = 'block';
    result.className = 'sc-coupon__result';
    result.textContent = 'Validating...';

    try {
      // Use Shopify's discount endpoint
      const res = await fetch('/discount/' + encodeURIComponent(code), {
        method: 'GET',
        redirect: 'follow',
      });
      // If redirect to cart/checkout, discount was applied
      result.className = 'sc-coupon__result sc-success';
      result.textContent = `✓ Code "${code}" applied!`;
      input.value = '';
      trackEvent('coupon_applied', { code });
      await fetchCart();
      renderDrawerContent();
    } catch (e) {
      result.className = 'sc-coupon__result sc-error';
      result.textContent = '✗ Invalid discount code';
    }
  }

  // ─── Countdown Timer ─── 
  function startCountdown() {
    const s = CONFIG.settings || {};
    if (!s.showCountdown) return;

    const stored = sessionStorage.getItem('sc_countdown_end');
    let endTime;
    if (stored) {
      endTime = parseInt(stored, 10);
    } else {
      const mins = s.countdownMinutes || 15;
      endTime = Date.now() + mins * 60 * 1000;
      sessionStorage.setItem('sc_countdown_end', endTime.toString());
    }

    const el = $('#sc-countdown');
    if (!el) return;

    function tick() {
      const remaining = Math.max(0, endTime - Date.now());
      if (remaining <= 0) {
        el.style.display = 'none';
        clearInterval(countdownInterval);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const msg = (s.countdownMessage || 'Checkout within {time} to get free shipping today!')
        .replace('{time}', timeStr);
      el.innerHTML = `<span class="sc-countdown__icon">⏰</span> ${msg}`;
      el.style.display = 'flex';
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  // ─── Open / Close Drawer ─── 
  function openDrawer() {
    if (isOpen) return;
    isOpen = true;
    const overlay = $('.sc-overlay');
    const drawer = $('#swiftcart-drawer');
    if (overlay) overlay.classList.add('sc-active');
    if (drawer) drawer.classList.add('sc-active');
    document.body.style.overflow = 'hidden';
    fetchCart().then(() => {
      renderDrawerContent();
      evaluateCart();
      updateBubbleCount();
      startCountdown();
      trackEvent('cart_open');
    });
  }

  function closeDrawer() {
    if (!isOpen) return;
    isOpen = false;
    const overlay = $('.sc-overlay');
    const drawer = $('#swiftcart-drawer');
    if (overlay) overlay.classList.remove('sc-active');
    if (drawer) drawer.classList.remove('sc-active');
    document.body.style.overflow = '';
  }

  // ─── Sticky ATC Bar (Mobile) ─── 
  function initStickyAtc() {
    const s = CONFIG.settings || {};
    if (!s.showStickyAtc) return;

    // Only on product pages
    const productMeta = document.querySelector('[data-product-json], script[data-product-json]');
    if (!productMeta) return;

    const nativeAtcBtn = document.querySelector('form[action="/cart/add"] button[type="submit"], .product-form__submit');
    if (!nativeAtcBtn) return;

    let productData;
    try {
      const jsonEl = document.querySelector('script[data-product-json]');
      if (jsonEl) productData = JSON.parse(jsonEl.textContent);
    } catch (e) {
      return;
    }
    if (!productData) return;

    const bar = createElement('div', 'sc-sticky-atc');
    bar.innerHTML = `
      <img class="sc-sticky-atc__image" src="${productData.featured_image || ''}" alt="${productData.title}" />
      <div class="sc-sticky-atc__info">
        <div class="sc-sticky-atc__name">${productData.title}</div>
        <div class="sc-sticky-atc__price">${formatMoney(productData.price)}</div>
      </div>
      <button class="sc-sticky-atc__btn">Add to Cart</button>
    `;
    document.body.appendChild(bar);

    bar.querySelector('.sc-sticky-atc__btn').addEventListener('click', () => {
      nativeAtcBtn.click();
    });

    // Show/hide based on native ATC visibility
    const observer = new IntersectionObserver(
      ([entry]) => {
        bar.classList.toggle('sc-visible', !entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(nativeAtcBtn);
  }

  // ─── Intercept Native Add-to-Cart ─── 
  function interceptCartEvents() {
    // Override fetch to catch /cart/add.js calls
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes('/cart/add')) {
        return originalFetch.apply(this, args).then((response) => {
          // Clone response so the original caller still gets it
          const cloned = response.clone();
          cloned.json().then(() => {
            setTimeout(() => {
              fetchCart().then(() => {
                updateBubbleCount();
                openDrawer();
              });
            }, 100);
          }).catch(() => {});
          return response;
        });
      }
      return originalFetch.apply(this, args);
    };

    // Also intercept XMLHttpRequest for older themes
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._scUrl = url;
      return originalXHROpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function (...args) {
      if (this._scUrl && this._scUrl.includes('/cart/add')) {
        this.addEventListener('load', () => {
          setTimeout(() => {
            fetchCart().then(() => {
              updateBubbleCount();
              openDrawer();
            });
          }, 100);
        });
      }
      return originalXHRSend.apply(this, args);
    };

    // Listen for form submissions to /cart/add
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.action && form.action.includes('/cart/add')) {
        e.preventDefault();
        const formData = new FormData(form);
        fetch('/cart/add.js', {
          method: 'POST',
          body: formData,
        }).then(() => {
          fetchCart().then(() => {
            updateBubbleCount();
            openDrawer();
          });
        });
      }
    });
  }

  // ─── Keyboard Accessibility ─── 
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeDrawer();
  });

  // ─── Expose SwiftCart API for custom themes ─── 
  window.SwiftCart = {
    open: openDrawer,
    close: closeDrawer,
    toggle: () => (isOpen ? closeDrawer() : openDrawer()),
    refresh: () => fetchCart().then(() => { renderDrawerContent(); evaluateCart(); updateBubbleCount(); }),
  };

  // ─── Initialize ─── 
  function init() {
    buildDrawerShell();
    interceptCartEvents();
    initStickyAtc();
    fetchCart().then(() => {
      updateBubbleCount();
    });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
