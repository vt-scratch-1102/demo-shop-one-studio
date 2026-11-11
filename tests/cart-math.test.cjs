"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const CartMath = require("../cart-math.js");

// Mirrors the catalogue prices and shipping rule from products.js.
const PRODUCTS = [
  { id: "mug", price: 18.0 },
  { id: "lamp", price: 64.0 },
];
const SHIPPING = 4.99;
const FREE_SHIPPING_FROM = 50;

const priceOf = (id) => PRODUCTS.find((p) => p.id === id).price;
const cartTotals = (lines) => CartMath.totals(lines, priceOf, SHIPPING, FREE_SHIPPING_FROM);
const cents = (n) => n.toFixed(2);

test("two Desk Lamps at $64.00: quantity is included in subtotal and total", () => {
  const t = cartTotals([{ id: "lamp", qty: 2 }]);
  assert.equal(cents(t.subtotal), "128.00");
  assert.equal(t.shipping, 0);
  assert.equal(cents(t.total), "128.00");
});

test("three Stoneware Mugs at $18.00: quantity-aware subtotal clears free shipping", () => {
  const t = cartTotals([{ id: "mug", qty: 3 }]);
  assert.equal(cents(t.subtotal), "54.00");
  assert.equal(t.shipping, 0);
  assert.equal(cents(t.total), "54.00");
});

test("one Stoneware Mug under the free-shipping threshold pays shipping", () => {
  const t = cartTotals([{ id: "mug", qty: 1 }]);
  assert.equal(cents(t.subtotal), "18.00");
  assert.equal(cents(t.shipping), "4.99");
  assert.equal(cents(t.total), "22.99");
});

test("mixed cart multiplies every line by its quantity", () => {
  const t = cartTotals([
    { id: "lamp", qty: 1 },
    { id: "mug", qty: 2 },
  ]);
  assert.equal(cents(t.subtotal), "100.00");
  assert.equal(t.shipping, 0);
  assert.equal(cents(t.total), "100.00");
});

test("empty cart has no subtotal, shipping or total", () => {
  const t = cartTotals([]);
  assert.equal(t.subtotal, 0);
  assert.equal(t.shipping, 0);
  assert.equal(t.total, 0);
});

test("lineTotal multiplies unit price by quantity", () => {
  assert.equal(cents(CartMath.lineTotal(64, 2)), "128.00");
});
