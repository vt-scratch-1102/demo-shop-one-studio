"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `app.js must define ${startMarker.replace("function ", "")}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${startMarker} must be followed by ${endMarker}`);
  return source.slice(start, end);
}

const cartPage = sliceBetween(app, "function cartPage(", "function summaryLines(");
const summary = sliceBetween(app, "function summaryLines(", "function couponArea(");
const couponControls = sliceBetween(app, "function couponControls(", "function couponStatusText(");
const checkoutPage = sliceBetween(app, "function checkoutPage(", "function placeOrder(");
const placeOrder = sliceBetween(app, "function placeOrder(", "function orderFor(");
const paidLines = sliceBetween(app, "function paidLines(", "function donePage(");
const ordersPage = sliceBetween(app, "function ordersPage(", "function loginPage(");

test("checkout offers a Coupon code field and an Apply button", () => {
  assert.match(checkoutPage, /\$\{couponArea\(\)\}/, "the checkout must render the coupon area");
  assert.match(
    couponControls,
    /<label class="coupon-field">Coupon code<input id="coupon-code"/,
    'the coupon field\'s visible label must be "Coupon code"'
  );
  assert.match(
    couponControls,
    /<button type="button"[^>]*id="apply-coupon"[^>]*>Apply<\/button>/,
    "the Apply button must be a plain button so it never submits the order form"
  );
});

test("an applied coupon replaces the field with SAVE10 applied and Remove coupon", () => {
  assert.match(couponControls, /\$\{window\.CartMath\.COUPON_CODE\} applied/, 'the applied state must say "SAVE10 applied"');
  assert.match(
    couponControls,
    /<button type="button"[^>]*id="remove-coupon"[^>]*>Remove coupon<\/button>/,
    "the applied state must offer a Remove coupon button"
  );
  assert.match(
    couponControls,
    /if \(coupon\) \{/,
    "the applied state must be chosen from the coupon, so no second code can be entered"
  );
});

test("the cart page reflects an applied coupon in its summary but never offers the field", () => {
  assert.doesNotMatch(
    cartPage,
    /coupon-area|coupon-code|apply-coupon|remove-coupon|couponArea/,
    "the cart page must not render the coupon area or offer a way to enter a code"
  );
  assert.match(cartPage, /\$\{summary\(t\)\}/, "the cart page must keep rendering the shared summary");
});

test("the shared summary shows the Discount line between Subtotal and Shipping", () => {
  assert.match(
    summary,
    /<dt>Subtotal<\/dt>[\s\S]*\$\{discount\}[\s\S]*<dt>Shipping<\/dt>[\s\S]*<dt>Total<\/dt>/,
    "the rendered template must run Subtotal, Discount, Shipping, Total"
  );
  assert.match(
    summary,
    /\$\{window\.CartMath\.COUPON_CODE\} -\$\{money\(t\.discount\)\}/,
    'the Discount line must read "SAVE10 -$x.xx"'
  );
});

test("announcements: alerts for refusals, aria-live on the summary, a status line by the coupon", () => {
  assert.match(checkoutPage, /<p id="form-error" class="error" role="alert">/, "the shop's own refusals stay a role=alert region");
  assert.match(app, /<p id="coupon-error" class="error" role="alert"><\/p>/, "coupon refusals must be a role=alert region");
  assert.match(
    summary,
    /<aside class="summary" aria-label="Order summary" aria-live="polite">/,
    "the order summary must be aria-live=polite so every new Total is announced"
  );
  assert.match(
    app,
    /<p id="coupon-status" class="sr-only" role="status">\$\{esc\(couponStatusText\(\)\)\}<\/p>/,
    "the visually hidden status line must be a role=status beside the coupon field"
  );
});

test("the status line speaks the applied saving and the removal phrase", () => {
  const status = sliceBetween(app, "function couponStatusText(", "function refreshCoupon(");
  assert.match(
    status,
    /window\.CartMath\.COUPON_CODE \+ " applied, -" \+ money\(totals\(\)\.discount\)/,
    'the applied phrase must read "SAVE10 applied, -$x.xx" from the current totals'
  );
  const removeCoupon = sliceBetween(app, "function removeCoupon(", "function checkoutPage(");
  assert.match(removeCoupon, /couponNotice = "Coupon removed"/, 'removing must set the phrase "Coupon removed"');
  assert.match(removeCoupon, /document\.getElementById\("coupon-code"\)/, "focus must return to the Coupon code field");
});

test("applying moves focus to the Remove coupon button", () => {
  const applyCoupon = sliceBetween(app, "function applyCoupon(", "function removeCoupon(");
  assert.match(applyCoupon, /document\.getElementById\("remove-coupon"\)/, "the Remove coupon button must receive focus");
  assert.match(applyCoupon, /\.focus\(\)/, "focus must actually move");
});

test("the home page states the free-shipping rule on the pre-discount subtotal", () => {
  assert.match(
    app,
    /Free shipping on orders of \$\{money\(window\.FREE_SHIPPING_FROM\)\} or more\./,
    'the home page must say "Free shipping on orders of $50.00 or more."'
  );
});

test("Place order uses the cart and the coupon stored at the moment it is pressed", () => {
  assert.match(placeOrder, /store\.get\("cart"/, "the stored cart must be read at press time");
  assert.match(placeOrder, /store\.get\("coupon"/, "the stored coupon must be read at press time");
  assert.match(placeOrder, /btn\.disabled = true/, "Place order must be disabled while the order is placed");
  assert.match(placeOrder, /subtotal: t\.subtotal/, "the saved order must record the subtotal");
  assert.match(placeOrder, /coupon: t\.discount > 0 \? window\.CartMath\.COUPON_CODE : null/, "the saved order must record the coupon code");
  assert.match(placeOrder, /discount: t\.discount/, "the saved order must record the amount saved");
  assert.match(placeOrder, /shipping: t\.shipping/, "the saved order must record the shipping charge");
});

test("the thank-you page states what was paid, with the coupon line above it", () => {
  const discount = paidLines.indexOf("paid-discount");
  const total = paidLines.indexOf("paid-total");
  assert.ok(discount !== -1 && total !== -1, "the thank-you page must render both lines");
  assert.ok(discount < total, "the coupon line must come before the paid total");
  assert.match(paidLines, /Total paid \$\{money\(order\.total\)\}/, 'it must read "Total paid $x.xx"');
});

test("My orders shows Total paid for new orders and keeps older orders as they are", () => {
  assert.match(
    ordersPage,
    /saved \? "Total paid " \+ money\(o\.total\) : money\(o\.total\)/,
    "orders saved before this change must keep their plain total and never gain a paid line"
  );
  assert.match(ordersPage, /typeof o\.subtotal === "number"/, "new orders are recognised by their saved subtotal");
  assert.match(ordersPage, /" × " \+ l\.qty/, "an older order must still list its items");
});
