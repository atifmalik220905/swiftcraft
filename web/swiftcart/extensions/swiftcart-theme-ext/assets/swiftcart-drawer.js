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
  let customDiscount = 0;
  let sessionId = getSessionId();

  // ─── GoKwik 2026 Modern State ───
  let kwikpassUser = JSON.parse(localStorage.getItem('sc_kwikpass_user') || 'null');
  let pincodeResult = null;
  let activePincode = localStorage.getItem('sc_pincode') || '';

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
      const couponInput = $('#sc-coupon-input');
      const couponCode = couponInput ? couponInput.value.trim() : '';
      
      const res = await fetch(CONFIG.apiBase + '/api/cart/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: CONFIG.shopDomain,
          sessionId,
          cart: cartState,
          deviceType: getDeviceType(),
          couponCode: couponCode,
          pincode: activePincode
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      upsellProducts = data.upsells || [];
      milestoneStatus = data.milestones || [];
      pincodeResult = data.pincodeResult || null;
      
      // Merge settings from Remix dashboard over Theme block settings
      if (data.settings) {
        Object.assign(CONFIG.settings, data.settings);
        applyThemeVars(CONFIG.settings);
        
        // Update header texts if they changed
        const titleEl = document.querySelector('.sc-header__title span:first-child');
        if (titleEl && CONFIG.settings.cartTitle) titleEl.textContent = CONFIG.settings.cartTitle;
        
        let annEl = document.querySelector('.sc-announcement');
        if (CONFIG.settings.announcementText) {
          if (!annEl) {
            annEl = document.createElement('div');
            annEl.className = 'sc-announcement';
            const header = document.querySelector('.sc-header');
            if (header && header.nextSibling) {
              header.parentNode.insertBefore(annEl, header.nextSibling);
            }
          }
          annEl.textContent = CONFIG.settings.announcementText;
        } else if (annEl) {
          annEl.remove();
        }

        // Toggle Coupon Field display dynamically
        const couponEl = $('#sc-coupon');
        if (couponEl) {
          couponEl.style.display = CONFIG.settings.showCouponField ? 'block' : 'none';
        }

        // Toggle Countdown Timer display dynamically
        startCountdown();
      }
      
      // ─── Handle Coupon Validation UI ───
      const resultEl = $('#sc-coupon-result');
      if (resultEl && couponCode) {
        resultEl.style.display = 'block';
        if (data.discount && data.discount.valid) {
          resultEl.className = 'sc-coupon__result sc-success';
          resultEl.textContent = `✓ Code applied! Discount calculated at checkout.`;
          
          // Apply to Shopify session silently in the background
          fetch('/discount/' + encodeURIComponent(data.discount.code));
          trackEvent('coupon_applied', { code: data.discount.code });
        } else {
          resultEl.className = 'sc-coupon__result sc-error';
          resultEl.textContent = `✗ ${data.discount?.message || 'Invalid discount code'}`;
        }
      } else if (resultEl) {
        resultEl.style.display = 'none';
      }

      customDiscount = 0;
      if (data.discount && data.discount.valid) customDiscount += data.discount.savings * 100;
      if (data.volumeDiscounts && data.volumeDiscounts.savings) customDiscount += data.volumeDiscounts.savings * 100;

      renderUpsells();
      renderProgressBar();
      renderKwikPass();
      renderPincodeChecker();
      renderSummary(); // Re-render summary in case settings toggled
    } catch (e) {
      console.error('[SwiftCart] Failed to connect to your app backend at: ' + CONFIG.apiBase + '. Please verify that this URL matches your active tunnel in the Shopify Theme Editor (Customize -> App Embeds / Block settings).', e);
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
      <div class="sc-kwikpass" id="sc-kwikpass"></div>
      <div class="sc-pincode-checker" id="sc-pincode-checker"></div>
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
      openOneClickCheckoutModal();
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
    const nativeDiscount = cartState.total_discount || 0;
    const discountTotal = nativeDiscount + customDiscount;
    const finalTotal = Math.max(0, subtotal - customDiscount);

    summary.innerHTML = `
      <div class="sc-summary__row">
        <span>Subtotal</span>
        <span>${formatMoney(subtotal + nativeDiscount)}</span>
      </div>
      ${discountTotal > 0 ? `
        <div class="sc-summary__row" style="color: #00b894;">
          <span>Discount</span>
          <span>-${formatMoney(discountTotal)}</span>
        </div>
      ` : ''}
      <div class="sc-summary__row sc-summary__row--total">
        <span>Total</span>
        <span>${formatMoney(finalTotal)}</span>
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

  // ─── GoKwik 2026 Modern Features ───
  function renderKwikPass() {
    const container = $('#sc-kwikpass');
    if (!container) return;

    if (kwikpassUser) {
      container.innerHTML = `
        <div class="sc-kp-card logged-in">
          <div class="sc-kp-card__header">
            <span class="sc-kp-badge">⚡ KwikPass</span>
            <span class="sc-kp-msg">Welcome, <strong>${kwikpassUser.name}</strong>!</span>
          </div>
          <div class="sc-kp-card__body">
            1-Click Checkout & saved address pre-filled! 
            <button class="sc-kp-logout-btn" id="sc-kp-logout">Logout</button>
          </div>
        </div>
      `;
      const logoutBtn = $('#sc-kp-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          kwikpassUser = null;
          localStorage.removeItem('sc_kwikpass_user');
          pincodeResult = null;
          activePincode = '';
          localStorage.removeItem('sc_pincode');
          renderKwikPass();
          renderPincodeChecker();
          renderDrawerContent();
          evaluateCart();
        });
      }
      return;
    }

    container.innerHTML = `
      <div class="sc-kp-card">
        <div class="sc-kp-card__header">
          <span class="sc-kp-badge">⚡ KwikPass</span>
          <span class="sc-kp-title">Login in 1-Click</span>
        </div>
        <div class="sc-kp-card__body" id="sc-kp-body-form">
          <p class="sc-kp-subtitle">Unlock pre-filled addresses & express UPI checkout across 200M+ stores!</p>
          <div class="sc-kp-input-group">
            <input class="sc-kp-input" id="sc-kp-phone" type="tel" placeholder="Enter Phone Number (10 digits)" maxlength="10" />
            <button class="sc-kp-btn" id="sc-kp-send-otp">Proceed</button>
          </div>
        </div>
      </div>
    `;

    const sendOtpBtn = $('#sc-kp-send-otp');
    if (sendOtpBtn) {
      sendOtpBtn.addEventListener('click', () => {
        const phoneInput = $('#sc-kp-phone');
        const phone = phoneInput ? phoneInput.value.trim() : '';
        if (phone.length !== 10 || isNaN(phone)) {
          alert('Please enter a valid 10-digit mobile number.');
          return;
        }
        
        const body = $('#sc-kp-body-form');
        if (body) {
          body.innerHTML = `
            <p class="sc-kp-subtitle">Enter the 4-digit verification code sent to +91 ${phone}</p>
            <div class="sc-kp-input-group">
              <input class="sc-kp-input" id="sc-kp-otp" type="text" placeholder="Enter OTP (e.g. 1234)" maxlength="4" />
              <button class="sc-kp-btn" id="sc-kp-verify-otp">Verify</button>
            </div>
          `;

          const verifyBtn = $('#sc-kp-verify-otp');
          if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
              const otpInput = $('#sc-kp-otp');
              const otp = otpInput ? otpInput.value.trim() : '';
              if (otp.length !== 4) {
                alert('Please enter a 4-digit OTP.');
                return;
              }

              // Mock login
              kwikpassUser = {
                phone: phone,
                name: 'Jane Doe',
                address: {
                  street: '102, Shanti Sadan, Link Road',
                  city: 'Mumbai',
                  state: 'Maharashtra',
                  pincode: '400053',
                }
              };
              localStorage.setItem('sc_kwikpass_user', JSON.stringify(kwikpassUser));
              
              if (kwikpassUser.address.pincode) {
                activePincode = kwikpassUser.address.pincode;
                localStorage.setItem('sc_pincode', activePincode);
              }

              renderKwikPass();
              evaluateCart();
            });
          }
        }
      });
    }
  }

  function renderPincodeChecker() {
    const container = $('#sc-pincode-checker');
    if (!container) return;

    container.innerHTML = `
      <div class="sc-pc-card">
        <div class="sc-pc-label">🚚 Check Delivery Speed & COD Availability</div>
        <div class="sc-pc-group">
          <input class="sc-pc-input" id="sc-pc-input-val" type="text" placeholder="Enter 6-digit Pincode" maxlength="6" value="${activePincode}" />
          <button class="sc-pc-btn" id="sc-pc-check-btn">Check</button>
        </div>
        <div class="sc-pc-result" id="sc-pc-result" style="display: none;"></div>
      </div>
    `;

    const resultEl = $('#sc-pc-result');
    if (pincodeResult && resultEl) {
      resultEl.style.display = 'block';
      resultEl.className = `sc-pc-result ${pincodeResult.codAvailable ? 'sc-success' : 'sc-warning'}`;
      resultEl.textContent = pincodeResult.message;
    }

    const checkBtn = $('#sc-pc-check-btn');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        const input = $('#sc-pc-input-val');
        const pin = input ? input.value.trim() : '';
        if (pin.length !== 6 || isNaN(pin)) {
          alert('Please enter a valid 6-digit numeric pincode.');
          return;
        }
        activePincode = pin;
        localStorage.setItem('sc_pincode', pin);
        evaluateCart();
      });
    }
  }

  function openOneClickCheckoutModal() {
    const overlay = createElement('div', 'sc-co-overlay');
    overlay.id = 'sc-checkout-overlay';
    document.body.appendChild(overlay);

    const subtotal = cartState.total_price;
    const finalTotal = Math.max(0, subtotal - customDiscount);

    const address = kwikpassUser?.address || {
      street: '',
      city: '',
      state: '',
      pincode: activePincode || '',
    };

    const modal = createElement('div', 'sc-co-modal');
    modal.id = 'sc-checkout-modal';
    modal.innerHTML = `
      <div class="sc-co-header">
        <span class="sc-co-title">⚡ GoKwik 1-Click Checkout</span>
        <button class="sc-co-close" id="sc-co-close-btn">&times;</button>
      </div>
      <div class="sc-co-body">
        <div class="sc-co-section">
          <div class="sc-co-sec-title">1. Mobile & Identity</div>
          <input class="sc-co-input" id="sc-co-phone" type="tel" placeholder="Mobile Number" value="${kwikpassUser?.phone || ''}" />
        </div>
        <div class="sc-co-section">
          <div class="sc-co-sec-title">2. Shipping Address</div>
          <input class="sc-co-input" id="sc-co-street" type="text" placeholder="Flat, House no., Building, Company, Street" value="${address.street}" />
          <div class="sc-co-row">
            <input class="sc-co-input" id="sc-co-city" type="text" placeholder="City" value="${address.city}" />
            <input class="sc-co-input" id="sc-co-state" type="text" placeholder="State" value="${address.state}" />
          </div>
          <input class="sc-co-input" id="sc-co-pincode" type="text" placeholder="Pincode" value="${address.pincode}" maxlength="6" />
        </div>
        <div class="sc-co-section">
          <div class="sc-co-sec-title">3. Select Payment Method</div>
          <div class="sc-co-payment-options">
            <label class="sc-co-pay-option active">
              <input type="radio" name="payment_method" value="upi" checked />
              <span>📱 UPI (GPay / PhonePe / Paytm) <span class="sc-co-badge">Fastest</span></span>
            </label>
            <label class="sc-co-pay-option">
              <input type="radio" name="payment_method" value="card" />
              <span>💳 Credit / Debit Card</span>
            </label>
            <label class="sc-co-pay-option" id="sc-co-cod-wrapper">
              <input type="radio" name="payment_method" value="cod" />
              <span>💵 Cash on Delivery (COD)</span>
            </label>
          </div>
        </div>
      </div>
      <div class="sc-co-footer">
        <div class="sc-co-price-row">
          <span>To Pay:</span>
          <span class="sc-co-final-price">${formatMoney(finalTotal)}</span>
        </div>
        <button class="sc-co-place-btn" id="sc-co-place-order-btn">⚡ Place Order</button>
      </div>
    `;
    document.body.appendChild(modal);

    const codWrapper = $('#sc-co-cod-wrapper');
    if (pincodeResult && !pincodeResult.codAvailable && codWrapper) {
      codWrapper.classList.add('disabled');
      codWrapper.style.opacity = '0.5';
      codWrapper.style.pointerEvents = 'none';
      const radio = $('input[value="cod"]', codWrapper);
      if (radio) radio.disabled = true;
    }

    const closeBtn = $('#sc-co-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeOneClickCheckoutModal);
    
    const clickOverlay = $('#sc-checkout-overlay');
    if (clickOverlay) clickOverlay.addEventListener('click', closeOneClickCheckoutModal);
    
    const options = $$('.sc-co-pay-option', modal);
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const input = $('input', opt);
        if (input) input.checked = true;
      });
    });

    const placeOrderBtn = $('#sc-co-place-order-btn');
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener('click', async () => {
        const phone = $('#sc-co-phone').value.trim();
        const street = $('#sc-co-street').value.trim();
        const city = $('#sc-co-city').value.trim();
        const state = $('#sc-co-state').value.trim();
        const pincode = $('#sc-co-pincode').value.trim();

        if (!phone || !street || !city || !state || !pincode) {
          alert('Please fill out all address and contact fields.');
          return;
        }

        const isCodSelected = $('input[name="payment_method"]:checked').value === 'cod';
        if (isCodSelected && pincodeResult && !pincodeResult.codAvailable) {
          alert('COD is unavailable for this pincode. Please select prepaid UPI/Card payment.');
          return;
        }

        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Processing Order... ⌛';

        setTimeout(async () => {
          modal.innerHTML = `
            <div class="sc-co-success-screen">
              <div class="sc-co-success-icon">🎉</div>
              <div class="sc-co-success-title">Order Confirmed!</div>
              <p class="sc-kp-subtitle">Thank you for shopping with GoKwik!</p>
              <p class="sc-kp-subtitle">Your order ID is <strong>GK-${Math.floor(100000 + Math.random() * 900000)}</strong></p>
              <button class="sc-co-success-close-btn" id="sc-co-success-close">Continue Shopping</button>
            </div>
          `;
          const successCloseBtn = $('#sc-co-success-close');
          if (successCloseBtn) {
            successCloseBtn.addEventListener('click', () => {
              closeOneClickCheckoutModal();
              closeDrawer();
            });
          }

          trackEvent('purchase', { cartValueBefore: finalTotal, cartValueAfter: finalTotal });

          try {
            await fetch('/cart/clear.js', { method: 'POST' });
            await fetchCart();
            updateBubbleCount();
            renderDrawerContent();
          } catch (e) {
            console.error(e);
          }
        }, 1500);
      });
    }
  }

  function closeOneClickCheckoutModal() {
    const overlay = $('#sc-checkout-overlay');
    const modal = $('#sc-checkout-modal');
    if (overlay) overlay.remove();
    if (modal) modal.remove();
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

    await evaluateCart();
  }

  // ─── Countdown Timer ─── 
  function startCountdown() {
    const s = CONFIG.settings || {};
    const el = $('#sc-countdown');
    if (!el) return;

    if (!s.showCountdown) {
      el.style.display = 'none';
      if (countdownInterval) clearInterval(countdownInterval);
      return;
    }

    if (countdownInterval) clearInterval(countdownInterval);

    const stored = sessionStorage.getItem('sc_countdown_end');
    let endTime;
    if (stored) {
      endTime = parseInt(stored, 10);
    } else {
      const mins = s.countdownMinutes || 15;
      endTime = Date.now() + mins * 60 * 1000;
      sessionStorage.setItem('sc_countdown_end', endTime.toString());
    }

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
        const payload = {};
        
        for (const [key, value] of formData.entries()) {
          if (key === 'id' || key === 'quantity') {
            payload[key] = parseInt(value, 10) || value;
          } else if (key.startsWith('properties[')) {
            if (!payload.properties) payload.properties = {};
            const propKey = key.slice(11, -1);
            payload.properties[propKey] = value;
          } else {
            payload[key] = value;
          }
        }

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(() => {
          fetchCart().then(() => {
            updateBubbleCount();
            openDrawer();
          });
        });
      }
    });

    // Intercept clicks on native cart icons/links (use capture phase to beat theme scripts)
    document.addEventListener('click', (e) => {
      const cartLink = e.target.closest('a[href="/cart"], a[href^="/cart?"], #cart-icon-bubble');
      if (cartLink) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openDrawer();
      }
    }, true);
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
