import test from "node:test";
import assert from "node:assert/strict";
import { waterPlan } from "../dist/guide-calculator.js";

test("water shopping aid subtracts existing stock and rounds up complete bottles", () => {
  assert.deepEqual(waterPlan(2, 10, "10", 1.5), { target: 40, missing: 30, bottles: 20, bottleSize: 1.5 });
  assert.deepEqual(waterPlan(2, 10, "0", 1.5), { target: 40, missing: 40, bottles: 27, bottleSize: 1.5 });
  assert.equal(waterPlan(2, 10, "40").bottles, 0);
  assert.equal(waterPlan(2, 10, "50").missing, 0);
  assert.equal(waterPlan(2, 10, "1,5").missing, 38.5);
  assert.equal(waterPlan(2, 10, "1.5").missing, 38.5);
  assert.equal(waterPlan(1, 3, "5,9", 0.5).bottles, 1);
});

test("water shopping aid rejects empty, negative, ambiguous and out-of-range inputs", () => {
  for (const stock of ["", " ", null, "-1", "1.000,50", "1,000.50", "Infinity", "1e3", "abc", "100001"]) assert.equal(waterPlan(2, 10, stock), null);
  for (const people of [0, -1, 1.5, 101, NaN]) assert.equal(waterPlan(people, 10), null);
  for (const days of [0, -1, 1.5, 31, NaN]) assert.equal(waterPlan(2, days), null);
  assert.equal(waterPlan(2, 10, "0", 3), null);
});
