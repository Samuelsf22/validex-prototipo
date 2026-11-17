// Run with: node --test pa3/prototipo/tests
const test = require("node:test");
const assert = require("node:assert");
const C = require("../calc.js");

test("HU11: V = 0,92 and Score interval 0,65 to 0,99 for 4, 4, 3, 4 on a 1-4 scale", () => {
  const v = C.aikenV([4, 4, 3, 4], 1, 4);
  assert.strictEqual(C.r2(v), 0.92);
  const ci = C.scoreInterval(v, 4, 3);
  assert.strictEqual(C.r2(ci.lower), 0.65);
  assert.strictEqual(C.r2(ci.upper), 0.99);
});

test("HU11: V = 0,83 and interval 0,55 to 0,95 for 3, 3, 4, 4", () => {
  const v = C.aikenV([3, 3, 4, 4], 1, 4);
  assert.strictEqual(C.r2(v), 0.83);
  const ci = C.scoreInterval(v, 4, 3);
  assert.strictEqual(C.r2(ci.lower), 0.55);
  assert.strictEqual(C.r2(ci.upper), 0.95);
});

test("HU11: total agreement at the top of the scale gives V = 1", () => {
  assert.strictEqual(C.aikenV([4, 4, 4, 4], 1, 4), 1);
  const ci = C.scoreInterval(1, 4, 3);
  assert.ok(ci.upper <= 1 + 1e-9 && ci.lower > 0);
});

test("HU12: panel of 10, 9 essential gives CVR 0,80 and passes; 8 gives 0,60 and fails", () => {
  assert.strictEqual(C.r2(C.cvr(9, 10)), 0.8);
  assert.strictEqual(C.r2(C.cvr(8, 10)), 0.6);
  const crit = C.criticalCvr(10);
  assert.strictEqual(C.r2(crit), 0.8);
  assert.ok(C.cvr(9, 10) >= crit - 1e-9);
  assert.ok(C.cvr(8, 10) < crit);
});

test("HU12: critical values for panels of 5, 8, 12, 15 and 20", () => {
  assert.strictEqual(C.r2(C.criticalCvr(5)), 1);
  assert.strictEqual(C.r2(C.criticalCvr(8)), 0.75);
  assert.strictEqual(C.r2(C.criticalCvr(12)), 0.67);
  assert.strictEqual(C.r2(C.criticalCvr(15)), 0.6);
  assert.strictEqual(C.r2(C.criticalCvr(20)), 0.5);
});

test("HU12: panel of 5, 4 essential gives CVR 0,60 and fails (critical is 1,00)", () => {
  assert.strictEqual(C.r2(C.cvr(4, 5)), 0.6);
  assert.ok(C.cvr(4, 5) < C.criticalCvr(5));
});
