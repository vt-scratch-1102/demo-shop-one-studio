// Demo Shop: a tiny single-page store. Hash routes, state in localStorage.
(function () {
  "use strict";

  const app = document.getElementById("app");
  const money = (n) => "$" + n.toFixed(2);
  const byId = (id) => window.PRODUCTS.find((p) => p.id === id);

  // ---- state ---------------------------------------------------------------
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem("demoshop:" + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem("demoshop:" + key, JSON.stringify(value));
      } catch (e) {
        /* private mode: the shop still works for this visit */
      }
    },
  };

  let cart = store.get("cart", []); // [{ id, qty }]
  let user = store.get("user", null); // { email, name }
  // The coupon is stored on its own, beside the cart rather than inside it, so
  // signing out can clear it and leave the cart alone.
  const savedCoupon = store.get("coupon", null);
  let coupon = savedCoupon === window.CartMath.COUPON_CODE ? savedCoupon : null;
  let couponNotice = ""; // the status line's last phrase, e.g. "Coupon removed"

  function saveCart() {
    store.set("cart", cart);
    renderHeader();
  }

  function saveCoupon() {
    store.set("coupon", coupon);
  }

  function addToCart(id) {
    const line = cart.find((l) => l.id === id);
    if (line) line.qty += 1;
    else cart.push({ id, qty: 1 });
    saveCart();
    toast(byId(id).name + " added to your cart");
  }

  function setQty(id, qty) {
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    line.qty = Math.max(1, Math.min(99, qty));
    saveCart();
  }

  function removeFromCart(id) {
    cart = cart.filter((l) => l.id !== id);
    // Removing the last line ends the coupon as well as the cart.
    if (cart.length === 0) clearCoupon();
    saveCart();
  }

  function clearCoupon() {
    coupon = null;
    couponNotice = "";
    saveCoupon();
  }

  function totals() {
    return window.CartMath.totals(cart, (id) => byId(id).price, window.SHIPPING, window.FREE_SHIPPING_FROM, coupon);
  }

  // ---- ui helpers ----------------------------------------------------------
  let toastTimer = null;
  function toast(text) {
    const el = document.getElementById("toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderHeader() {
    const count = cart.reduce((n, l) => n + l.qty, 0);
    document.getElementById("cart-count").textContent = count;
    const who = document.getElementById("who");
    const auth = document.getElementById("auth-link");
    if (user) {
      who.textContent = "Hi, " + user.name.split(" ")[0];
      auth.textContent = "Sign out";
      auth.setAttribute("href", "#/logout");
    } else {
      who.textContent = "";
      auth.textContent = "Sign in";
      auth.setAttribute("href", "#/login");
    }
    const route = location.hash.replace(/^#\/?/, "").split("/")[0] || "shop";
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === route);
    });
  }

  function tile(p, size) {
    return `<div class="tile tile-${size}" style="background:${p.color}" aria-hidden="true"><span>${p.icon}</span></div>`;
  }

  // ---- pages ---------------------------------------------------------------
  function shopPage() {
    const cards = window.PRODUCTS.map(
      (p) => `
      <article class="card" data-name="${esc(p.name.toLowerCase())}">
        <a href="#/product/${p.id}" class="card-link">
          ${tile(p, "md")}
          <h3 class="card-title">${esc(p.name)}</h3>
          <span class="card-price">${money(p.price)}</span>
        </a>
        <button class="btn btn-primary btn-block" data-add="${p.id}">Add to cart</button>
      </article>`
    ).join("");
    return `
      <section class="hero">
        <h1>Small things for a calmer desk</h1>
        <p>Free shipping on orders of ${money(window.FREE_SHIPPING_FROM)} or more.</p>
      </section>
      <div class="search">
        <label class="sr-only" for="search">Search products</label>
        <input id="search" type="search" placeholder="Search products" autocomplete="off">
      </div>
      <section class="grid" aria-label="Products">${cards}</section>
      <p id="no-match" class="empty" hidden>No products match your search.</p>`;
  }

  function productPage(id) {
    const p = byId(id);
    if (!p) return notFound();
    return `
      <a class="back" href="#/">← Back to the shop</a>
      <section class="product">
        ${tile(p, "lg")}
        <div class="product-info">
          <h1>${esc(p.name)}</h1>
          <p class="product-price">${money(p.price)}</p>
          <p class="muted">${esc(p.blurb)}</p>
          <button class="btn btn-primary" data-add="${p.id}">Add to cart</button>
        </div>
      </section>`;
  }

  function cartPage() {
    if (cart.length === 0) {
      return `
        <h1>Your cart</h1>
        <div class="empty">
          <p>Your cart is empty.</p>
          <a class="btn btn-primary" href="#/">Browse the shop</a>
        </div>`;
    }
    const rows = cart
      .map((l) => {
        const p = byId(l.id);
        return `
        <li class="line">
          ${tile(p, "sm")}
          <div class="line-main">
            <a href="#/product/${p.id}" class="line-name">${esc(p.name)}</a>
            <span class="muted">${money(p.price)} each</span>
          </div>
          <div class="qty" aria-label="Quantity for ${esc(p.name)}">
            <button class="btn btn-icon" data-dec="${p.id}" aria-label="One less">−</button>
            <span class="qty-n">${l.qty}</span>
            <button class="btn btn-icon" data-inc="${p.id}" aria-label="One more">+</button>
          </div>
          <span class="line-total">${money(window.CartMath.lineTotal(p.price, l.qty))}</span>
          <button class="btn btn-link" data-remove="${p.id}">Remove</button>
        </li>`;
      })
      .join("");
    const t = totals();
    return `
      <h1>Your cart</h1>
      <div class="cart-layout">
        <ul class="lines">${rows}</ul>
        ${summary(t)}
      </div>
      <div class="cart-actions">
        <a class="btn btn-ghost" href="#/">Keep shopping</a>
        <a class="btn btn-primary" href="#/checkout">Go to checkout</a>
      </div>`;
  }

  // The one order summary. The cart page and the checkout render the same four
  // lines in the same order while a coupon is applied, so the two pages can
  // never quote different totals.
  function summaryLines(t) {
    const discount = t.discount > 0
      ? `
          <div class="discount"><dt>Discount</dt><dd id="discount">${window.CartMath.COUPON_CODE} -${money(t.discount)}</dd></div>`
      : "";
    return `
          <div><dt>Subtotal</dt><dd id="subtotal">${money(t.subtotal)}</dd></div>${discount}
          <div><dt>Shipping</dt><dd id="shipping">${t.shipping === 0 ? "Free" : money(t.shipping)}</dd></div>
          <div class="total"><dt>Total</dt><dd id="total">${money(t.total)}</dd></div>`;
  }

  function summary(t) {
    return `
      <aside class="summary" aria-label="Order summary" aria-live="polite">
        <h2>Summary</h2>
        <dl id="summary-lines">${summaryLines(t)}</dl>
      </aside>`;
  }

  // The coupon area, entered and removed on the checkout page only. The cart
  // page reflects an applied coupon in its Summary but never offers the field.
  function couponArea() {
    return `
          <div id="coupon-area" class="coupon">
            <div id="coupon-controls" class="coupon-row">${couponControls()}</div>
            <p id="coupon-error" class="error" role="alert"></p>
            <p id="coupon-status" class="sr-only" role="status">${esc(couponStatusText())}</p>
          </div>`;
  }

  function couponControls() {
    if (coupon) {
      // Applying takes the field and the Apply button away, so no second code
      // can be entered until the coupon is removed.
      return `
              <p class="coupon-applied">${window.CartMath.COUPON_CODE} applied</p>
              <button type="button" class="btn btn-ghost" id="remove-coupon">Remove coupon</button>`;
    }
    return `
              <label class="coupon-field">Coupon code<input id="coupon-code" name="coupon" type="text" autocomplete="off" autocapitalize="characters"></label>
              <button type="button" class="btn btn-ghost" id="apply-coupon">Apply</button>`;
  }

  // The applied phrase is derived from the current totals, so a basket change
  // rewrites it with the new saving and it never states a saving the summary
  // has moved on from.
  function couponStatusText() {
    if (coupon) return window.CartMath.COUPON_CODE + " applied, -" + money(totals().discount);
    return couponNotice;
  }

  function refreshCoupon() {
    const controls = document.getElementById("coupon-controls");
    if (controls) controls.innerHTML = couponControls();
    const status = document.getElementById("coupon-status");
    if (status) status.textContent = couponStatusText();
  }

  function refreshSummary() {
    const lines = document.getElementById("summary-lines");
    if (lines) lines.innerHTML = summaryLines(totals());
    const place = document.getElementById("place-order");
    if (place) place.textContent = "Place order · " + money(totals().total);
  }

  function applyCoupon() {
    if (coupon) return; // one press applies one discount
    const input = document.getElementById("coupon-code");
    const err = document.getElementById("coupon-error");
    const result = window.CartMath.normalizeCoupon(input ? input.value : "");
    if (result.error) {
      if (err) err.textContent = result.error;
      return;
    }
    coupon = result.code;
    couponNotice = "";
    saveCoupon();
    if (err) err.textContent = "";
    refreshCoupon();
    refreshSummary();
    const remove = document.getElementById("remove-coupon");
    if (remove) remove.focus();
  }

  function removeCoupon() {
    coupon = null;
    couponNotice = "Coupon removed";
    saveCoupon();
    refreshCoupon();
    refreshSummary();
    const field = document.getElementById("coupon-code");
    if (field) field.focus();
  }

  function checkoutPage() {
    if (!user) {
      sessionStorage.setItem("demoshop:after-login", "#/checkout");
      return `
        <h1>Checkout</h1>
        <div class="empty">
          <p>Please sign in to check out.</p>
          <a class="btn btn-primary" href="#/login">Sign in</a>
        </div>`;
    }
    if (cart.length === 0) {
      return `<h1>Checkout</h1><div class="empty"><p>Your cart is empty.</p><a class="btn btn-primary" href="#/">Browse the shop</a></div>`;
    }
    const t = totals();
    return `
      <h1>Checkout</h1>
      <div class="cart-layout">
        <form id="checkout-form" class="form" novalidate>
          <label>Full name<input name="name" autocomplete="name" value="${esc(user.name)}" required></label>
          <label>Street address<input name="address" autocomplete="street-address" required></label>
          <div class="row">
            <label>City<input name="city" autocomplete="address-level2" required></label>
            <label>Postcode<input name="postcode" autocomplete="postal-code" required></label>
          </div>
          <label>Card number<input name="card" inputmode="numeric" placeholder="4242 4242 4242 4242" required></label>
          <p class="muted small">This is a demo. Use any number of 16 digits; nothing is charged.</p>
          ${couponArea()}
          <p id="form-error" class="error" role="alert"></p>
          <button id="place-order" class="btn btn-primary btn-block" type="submit">Place order · ${money(t.total)}</button>
        </form>
        ${summary(t)}
      </div>`;
  }

  function placeOrder(form) {
    const btn = form.querySelector("button[type=submit]");
    if (btn.disabled) return; // a second press places nothing extra

    const data = Object.fromEntries(new FormData(form).entries());
    const err = form.querySelector("#form-error");
    const missing = ["name", "address", "city", "postcode", "card"].filter((k) => !String(data[k] || "").trim());
    if (missing.length) {
      err.textContent = "Please fill in every field.";
      return;
    }
    if (String(data.card).replace(/\s+/g, "").length !== 16) {
      err.textContent = "The card number needs 16 digits.";
      return;
    }

    // Place order uses the cart and the coupon as they are stored at the moment
    // it is pressed, so a coupon applied in another tab is included.
    const storedCart = store.get("cart", cart);
    const storedCoupon = store.get("coupon", null);
    if (storedCart.length === 0) {
      cart = [];
      saveCart();
      route();
      return;
    }
    const t = window.CartMath.totals(storedCart, (id) => byId(id).price, window.SHIPPING, window.FREE_SHIPPING_FROM, storedCoupon);
    const orders = store.get("orders:" + user.email, []);
    const number = "DS-" + String(Date.now()).slice(-6);

    btn.disabled = true; // one press, one order

    orders.unshift({
      number,
      date: new Date().toISOString(),
      lines: storedCart.map((l) => ({ id: l.id, qty: l.qty, price: byId(l.id).price })),
      subtotal: t.subtotal,
      coupon: t.discount > 0 ? window.CartMath.COUPON_CODE : null,
      discount: t.discount,
      shipping: t.shipping,
      total: t.total,
    });
    store.set("orders:" + user.email, orders);
    // The cart and the coupon are cleared only after the order has been saved.
    cart = [];
    clearCoupon();
    saveCart();
    location.hash = "#/done/" + number;
  }

  function orderFor(number) {
    if (!user) return null;
    return store.get("orders:" + user.email, []).find((o) => o.number === number) || null;
  }

  // Under the order number: the coupon line when one was used, then what the
  // shopper actually paid. Orders saved before the coupon existed have no
  // subtotal of their own and keep listing exactly as they do today.
  function paidLines(order) {
    if (!order) return "";
    const discount = order.coupon && order.discount > 0
      ? `<p class="paid-discount">${esc(order.coupon)} -${money(order.discount)}</p>`
      : "";
    return `${discount}<p class="paid-total">Total paid ${money(order.total)}</p>`;
  }

  function donePage(number) {
    return `
      <div class="empty">
        <h1>Thank you!</h1>
        <p>Your order <strong>${esc(number)}</strong> is placed.</p>
        ${paidLines(orderFor(number))}
        <a class="btn btn-primary" href="#/orders">See my orders</a>
      </div>`;
  }

  function ordersPage() {
    if (!user) {
      sessionStorage.setItem("demoshop:after-login", "#/orders");
      return `<h1>My orders</h1><div class="empty"><p>Sign in to see your orders.</p><a class="btn btn-primary" href="#/login">Sign in</a></div>`;
    }
    const orders = store.get("orders:" + user.email, []);
    if (orders.length === 0) {
      return `<h1>My orders</h1><div class="empty"><p>No orders yet.</p><a class="btn btn-primary" href="#/">Start shopping</a></div>`;
    }
    const items = orders
      .map((o) => {
        // Orders placed before this change carry no subtotal: they keep the
        // listing they have today, with no coupon line and no "Total paid".
        const saved = typeof o.subtotal === "number";
        const discount = saved && o.discount > 0 && o.coupon
          ? `<div class="order-discount muted">${esc(o.coupon)} -${money(o.discount)}</div>`
          : "";
        return `
        <li class="order">
          <div><strong>${esc(o.number)}</strong><span class="muted"> · ${new Date(o.date).toLocaleDateString()}</span></div>
          <div class="muted">${o.lines.map((l) => esc(byId(l.id).name) + " × " + l.qty).join(", ")}</div>
          <div class="order-money">
            <div class="order-total">${saved ? "Total paid " + money(o.total) : money(o.total)}</div>
            ${discount}
          </div>
        </li>`;
      })
      .join("");
    return `<h1>My orders</h1><ul class="orders">${items}</ul>`;
  }

  function loginPage() {
    if (user) {
      return `
      <div class="empty">
        <h1>You're signed in</h1>
        <p>Signed in as ${esc(user.name)}.</p>
        <a class="btn btn-primary" href="#/">Back to the shop</a>
      </div>`;
    }
    return `
      <div class="auth">
        <h1>Sign in</h1>
        <form id="login-form" class="form" novalidate>
          <label>Email<input name="email" type="email" autocomplete="username" required></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
          <p id="login-error" class="error" role="alert"></p>
          <button class="btn btn-primary btn-block" type="submit">Sign in</button>
        </form>
      </div>`;
  }

  function login(form) {
    if (user) return; // a second press while the first is landing changes nothing
    const email = String(form.email.value).trim().toLowerCase();
    const password = String(form.password.value);
    if (!email || !password) {
      form.querySelector("#login-error").textContent = !email && !password
        ? "Enter your email and password."
        : !email ? "Enter your email." : "Enter your password.";
      return;
    }
    const account = window.ACCOUNTS.find((a) => a.email === email && a.password === password);
    if (!account) {
      form.querySelector("#login-error").textContent = "That email and password don't match an account.";
      return;
    }
    form.querySelector("button[type=submit]").disabled = true;
    user = { email: account.email, name: account.name };
    store.set("user", user);
    const next = sessionStorage.getItem("demoshop:after-login") || "#/";
    sessionStorage.removeItem("demoshop:after-login");
    toast("Signed in as " + account.name);
    location.hash = next;
  }

  function notFound() {
    return `<div class="empty"><h1>Page not found</h1><a class="btn btn-primary" href="#/">Back to the shop</a></div>`;
  }

  // ---- router --------------------------------------------------------------
  function route() {
    const [page, arg] = location.hash.replace(/^#\/?/, "").split("/");
    if (page === "logout") {
      user = null;
      store.set("user", null);
      // Signing out clears the coupon only; the cart is left as it is.
      clearCoupon();
      toast("Signed out");
      location.hash = "#/";
      return;
    }
    const pages = {
      "": shopPage,
      product: () => productPage(arg),
      cart: cartPage,
      checkout: checkoutPage,
      done: () => donePage(arg),
      orders: ordersPage,
      login: loginPage,
    };
    app.innerHTML = (pages[page] || notFound)();
    renderHeader();
    window.scrollTo(0, 0);
  }

  // ---- events --------------------------------------------------------------
  app.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.add) addToCart(t.dataset.add);
    else if (t.dataset.inc) { const l = cart.find((x) => x.id === t.dataset.inc); setQty(l.id, l.qty + 1); route(); }
    else if (t.dataset.dec) { const l = cart.find((x) => x.id === t.dataset.dec); setQty(l.id, l.qty - 1); route(); }
    else if (t.dataset.remove) { removeFromCart(t.dataset.remove); route(); }
    else if (t.id === "apply-coupon") applyCoupon();
    else if (t.id === "remove-coupon") removeCoupon();
  });

  // Enter in the coupon field applies the code instead of submitting the form,
  // which would place the order.
  app.addEventListener("keydown", (e) => {
    if (e.target.id !== "coupon-code" || e.key !== "Enter") return;
    e.preventDefault();
    applyCoupon();
  });

  // Product search: filters the shop's cards by name as the shopper types.
  app.addEventListener("input", (e) => {
    if (e.target.id !== "search") return;
    const q = e.target.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll(".grid .card").forEach((card) => {
      const match = card.dataset.name.includes(q);
      card.hidden = !match;
      if (match) shown += 1;
    });
    document.getElementById("no-match").hidden = shown > 0;
  });

  app.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target.id === "login-form") login(e.target);
    if (e.target.id === "checkout-form") placeOrder(e.target);
  });

  window.addEventListener("hashchange", route);
  route();
})();
