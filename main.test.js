import { describe, it } from "node:test";
import assert from "node:assert";

describe("A thing", () => {
  it("should work", () => {
    assert.strictEqual(1, 1);
  });

  it("should be ok", () => {
    assert.strictEqual(2, 2);
  });

  describe("a nested thing", () => {
    it("should work", () => {
      assert.strictEqual(3, 3);
    });
  });
});
