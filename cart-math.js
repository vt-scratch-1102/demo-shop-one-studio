// Pure cart money math. Shared by the shop (as window.CartMath) and the
// Node tests (through module.exports); no DOM or storage dependencies.
(function (root) {
  "use strict";

  function lineTotal(unitPrice, qty) {
    return unitPrice * qty;
  }

  function totals(lines, priceOf, shipping, freeShippingFrom) {
    const subtotal = lines.reduce((sum, l) => sum + lineTotal(priceOf(l.id), l.qty), 0);
    const shippingCost = lines.length === 0 || subtotal >= freeShippingFrom ? 0 : shipping;
    return { subtotal, shipping: shippingCost, total: subtotal + shippingCost };
  }

  const api = { lineTotal, totals };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CartMath = api;
})(typeof window !== "undefined" ? window : null);
