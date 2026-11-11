"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

// Returns the declaration body of every rule whose selector is exactly the
// given class, across the whole stylesheet (media queries included).
function ruleBodies(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped + "\\s*\\{([^}]*)\\}", "g");
  return [...source.matchAll(re)].map((match) => match[1]);
}

test("shop card price is not absolutely positioned over the product name", () => {
  const bodies = ruleBodies(css, ".card-price");
  assert.ok(bodies.length > 0, "styles.css must define a .card-price rule");

  bodies.forEach((body, index) => {
    assert.doesNotMatch(
      body,
      /position\s*:\s*absolute/i,
      `.card-price rule #${index + 1} must stay in normal flow, not position: absolute`
    );
    assert.doesNotMatch(
      body,
      /(?:^|;)\s*top\s*:/i,
      `.card-price rule #${index + 1} must not be pinned with a top offset`
    );
    assert.doesNotMatch(
      body,
      /(?:^|;)\s*left\s*:/i,
      `.card-price rule #${index + 1} must not be pinned with a left offset`
    );
  });
});

test("shop card price has no covering background/padding hack", () => {
  const bodies = ruleBodies(css, ".card-price");
  assert.ok(bodies.length > 0, "styles.css must define a .card-price rule");

  bodies.forEach((body, index) => {
    assert.doesNotMatch(
      body,
      /background\s*:/i,
      `.card-price rule #${index + 1} must not paint a surface over the title`
    );
    assert.doesNotMatch(
      body,
      /padding\s*:/i,
      `.card-price rule #${index + 1} must not pad itself across the title line`
    );
  });
});

test("shop card template renders the price in flow after the name", () => {
  const titleIndex = app.indexOf('class="card-title"');
  const priceIndex = app.indexOf('class="card-price"');

  assert.notEqual(titleIndex, -1, "app.js must render an h3.card-title in the shop card");
  assert.notEqual(priceIndex, -1, "app.js must render a span.card-price in the shop card");
  assert.ok(
    titleIndex < priceIndex,
    "the price element must follow the product name in the card template"
  );

  const linkIndex = app.lastIndexOf('class="card-link"', priceIndex);
  const buttonIndex = app.indexOf('data-add="${p.id}"', priceIndex);
  assert.ok(linkIndex !== -1 && linkIndex < priceIndex, "the price must sit inside .card-link");
  assert.ok(
    priceIndex < buttonIndex,
    "the price must come before the Add to cart button in the card"
  );
});
