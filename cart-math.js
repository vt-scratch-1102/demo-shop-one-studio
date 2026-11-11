// Pure cart money math. Shared by the shop (as window.CartMath) and the
// Node tests (through module.exports); no DOM or storage dependencies.
(function (root) {
  "use strict";

  const COUPON_CODE = "SAVE10";
  const COUPON_RATE = 0.1;

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function lineTotal(unitPrice, qty) {
    return unitPrice * qty;
  }

  // Normalises a typed coupon code the way the shop accepts it: outer spaces and
  // letter case are ignored, everything else has to match exactly ("SAVE 10" is
  // a different code). The refusal messages are the ones the shop shows.
  function normalizeCoupon(raw) {
    const code = String(raw == null ? "" : raw).trim();
    if (!code) return { code: null, error: "Enter a coupon code." };
    if (code.toUpperCase() !== COUPON_CODE) return { code: null, error: "That code isn't valid." };
    return { code: COUPON_CODE, error: null };
  }

  // 10% of the order subtotal, taken before shipping is added.
  function discountFor(subtotal, coupon) {
    return coupon === COUPON_CODE ? round2(subtotal * COUPON_RATE) : 0;
  }

  function totals(lines, priceOf, shipping, freeShippingFrom, coupon) {
    const subtotal = lines.reduce((sum, l) => sum + lineTotal(priceOf(l.id), l.qty), 0);
    // Free shipping is decided on the subtotal before the discount is taken.
    const shippingCost = lines.length === 0 || subtotal >= freeShippingFrom ? 0 : shipping;
    const discount = discountFor(subtotal, coupon);
    return {
      subtotal,
      discount,
      shipping: shippingCost,
      total: round2(subtotal - discount + shippingCost),
    };
  }

  const api = { COUPON_CODE, lineTotal, normalizeCoupon, discountFor, totals };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CartMath = api;
})(typeof window !== "undefined" ? window : null);
