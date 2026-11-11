"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const CartMath = require("../cart-math.js");

// Mirrors the catalogue prices and shipping rule from products.js.
const PRODUCTS = [
  { id: "mug", price: 18.0 },
  { id: "notebook", price: 12.5 },
  { id: "lamp", price: 64.0 },
  { id: "plant", price: 24.0 },
  { id: "headphones", price: 89.0 },
  { id: "bottle", price: 22.0 },
];
const SHIPPING = 4.99;
const FREE_SHIPPING_FROM = 50;

const priceOf = (id) => PRODUCTS.find((p) => p.id === id).price;
const cartTotals = (lines, coupon) =>
  CartMath.totals(lines, priceOf, SHIPPING, FREE_SHIPPING_FROM, coupon);
const cents = (n) => n.toFixed(2);

test("SAVE10 takes 10% of a $54.50 subtotal, taken before the free-shipping decision", () => {
  const t = cartTotals(
    [{ id: "plant", qty: 1 }, { id: "mug", qty: 1 }, { id: "notebook", qty: 1 }],
    "SAVE10"
  );
  assert.equal(cents(t.subtotal), "54.50");
  assert.equal(cents(t.discount), "5.45");
  assert.equal(t.shipping, 0);
  assert.equal(cents(t.total), "49.05");
});

test("a $49.00 basket under the line pays shipping and the discount leaves it alone", () => {
  const t = cartTotals([{ id: "notebook", qty: 2 }, { id: "plant", qty: 1 }], "SAVE10");
  assert.equal(cents(t.subtotal), "49.00");
  assert.equal(cents(t.discount), "4.90");
  assert.equal(cents(t.shipping), "4.99");
  assert.equal(cents(t.total), "49.09");
});

test("exactly $50.00 is free shipping, decided before the discount", () => {
  const t = cartTotals([{ id: "notebook", qty: 4 }], "SAVE10");
  assert.equal(cents(t.subtotal), "50.00");
  assert.equal(cents(t.discount), "5.00");
  assert.equal(t.shipping, 0);
  assert.equal(cents(t.total), "45.00");
});

test("the discount follows a quantity change", () => {
  const t = cartTotals(
    [{ id: "plant", qty: 1 }, { id: "mug", qty: 3 }, { id: "notebook", qty: 1 }],
    "SAVE10"
  );
  assert.equal(cents(t.subtotal), "90.50");
  assert.equal(cents(t.discount), "9.05");
  assert.equal(t.shipping, 0);
  assert.equal(cents(t.total), "81.45");
});

test("removing a line recalculates the discount and the shipping decision", () => {
  const t = cartTotals([{ id: "plant", qty: 1 }, { id: "mug", qty: 1 }], "SAVE10");
  assert.equal(cents(t.subtotal), "42.00");
  assert.equal(cents(t.discount), "4.20");
  assert.equal(cents(t.shipping), "4.99");
  assert.equal(cents(t.total), "42.79");
});

test("a small cart still pays shipping and keeps the discount off the shipping charge", () => {
  const t = cartTotals([{ id: "mug", qty: 1 }], "SAVE10");
  assert.equal(cents(t.discount), "1.80");
  assert.equal(cents(t.shipping), "4.99");
  assert.equal(cents(t.total), "21.19");
});

test("without a coupon nothing is discounted and the total is unchanged", () => {
  const t = cartTotals([{ id: "mug", qty: 1 }]);
  assert.equal(t.discount, 0);
  assert.equal(cents(t.total), "22.99");
});

test("a code that is not SAVE10 discounts nothing", () => {
  const t = cartTotals([{ id: "mug", qty: 1 }], "SAVE20");
  assert.equal(t.discount, 0);
  assert.equal(cents(t.total), "22.99");
});

test("normalizeCoupon ignores letter case and outer spaces", () => {
  assert.equal(CartMath.normalizeCoupon("SAVE10").code, "SAVE10");
  assert.equal(CartMath.normalizeCoupon("save10").code, "SAVE10");
  assert.equal(CartMath.normalizeCoupon(" SAVE10 ").code, "SAVE10");
  assert.equal(CartMath.normalizeCoupon(" save10\t").code, "SAVE10");
});

test("normalizeCoupon asks for a code when it is empty or spaces only", () => {
  for (const code of ["", "   ", null, undefined]) {
    const result = CartMath.normalizeCoupon(code);
    assert.equal(result.code, null);
    assert.equal(result.error, "Enter a coupon code.");
  }
});

test("normalizeCoupon refuses any other code, including one with an inner space", () => {
  for (const code of ["SAVE 10", "SAVE20", "SAVE10X", "SAVE1"]) {
    const result = CartMath.normalizeCoupon(code);
    assert.equal(result.code, null);
    assert.equal(result.error, "That code isn't valid.");
  }
});

test("a 10% discount is a whole number of cents on every multiple-of-$0.50 price", () => {
  for (const price of [12.5, 18, 22, 24, 64, 89]) {
    const discount = CartMath.discountFor(price, "SAVE10");
    assert.equal(
      Number(discount.toFixed(2)),
      discount,
      `10% of $${cents(price)} must be a whole number of cents, got ${discount}`
    );
  }
  assert.equal(CartMath.discountFor(54.5, "SAVE10"), 5.45);
  assert.equal(CartMath.discountFor(90.5, "SAVE10"), 9.05);
  assert.equal(CartMath.discountFor(67, "SAVE10"), 6.7);
});
