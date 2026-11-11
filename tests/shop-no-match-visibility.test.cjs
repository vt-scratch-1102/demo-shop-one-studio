"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

// Returns the declaration body of every rule whose selector list contains the
// exact selector given. The selector must start a rule (or follow a comma,
// closing brace, or line break) so that e.g. [hidden] does not match
// .card[hidden]'s body.
function ruleBodies(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(?:^|[},\\n])\\s*" + escaped + "\\s*\\{([^}]*)\\}", "g");
  return [...source.matchAll(re)].map((match) => match[1]);
}

test("hidden attribute is enforced with display: none important", () => {
  const bodies = ruleBodies(css, "[hidden]");
  assert.ok(bodies.length > 0, "styles.css must define a [hidden] rule");

  const enforced = bodies.some((body) =>
    /display\s*:\s*none\s*!important/i.test(body)
  );
  assert.ok(
    enforced,
    "[hidden] must set display: none !important so it beats class rules that set display"
  );
});

test("the empty panel class sets display, so the hidden marker must win over it", () => {
  const bodies = ruleBodies(css, ".empty");
  assert.ok(bodies.length > 0, "styles.css must define the .empty panel rule");
  assert.ok(
    bodies.some((body) => /display\s*:/i.test(body)),
    ".empty sets its own display, which is why [hidden] needs !important to hide it"
  );
});

test("shop template renders the no-match message with the hidden attribute", () => {
  assert.match(
    app,
    /<p\b[^>]*\bid="no-match"[^>]*\bhidden\b[^>]*>\s*No products match your search\.\s*<\/p>/,
    "the #no-match paragraph must start hidden until a search hides every product"
  );
});
