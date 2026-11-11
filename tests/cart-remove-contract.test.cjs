"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

// The delegated click handler reads a product id from t.dataset.<name> and
// dispatches to an action. Every attribute it reads must be rendered by the
// template that owns that control, using the data-<name> convention.
function clickHandler(source) {
  const start = source.indexOf('app.addEventListener("click"');
  assert.notEqual(start, -1, "app.js must register a delegated click handler");
  const end = source.indexOf("});", start);
  assert.notEqual(end, -1, "the delegated click handler must be closed");
  return source.slice(start, end);
}

function datasetReads(handler) {
  return [...new Set([...handler.matchAll(/dataset\.([A-Za-z0-9_]+)/g)].map((m) => m[1]))];
}

function dataAttribute(name) {
  return "data-" + name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

test("every dataset read in the click handler has a matching rendered data- attribute", () => {
  const handler = clickHandler(app);
  const reads = datasetReads(handler);
  assert.ok(reads.includes("remove"), "the click handler must still handle the remove action");

  for (const name of reads) {
    const attr = dataAttribute(name);
    assert.match(
      app,
      new RegExp("\\b" + attr + "=\""),
      `the click handler reads dataset.${name}, so app.js must render a ${attr} attribute`
    );
  }
});

test("the cart line's Remove button carries the data-remove attribute with the product id", () => {
  const cartTemplate = app.slice(app.indexOf("function cartPage("), app.indexOf("function summary("));
  assert.match(
    cartTemplate,
    /<button\b[^>]*\bdata-remove="\$\{p\.id\}"[^>]*>\s*Remove\s*<\/button>/,
    "the Remove button must render data-remove=\"${p.id}\" so the handler can remove that line"
  );
});
