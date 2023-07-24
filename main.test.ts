import { assert, expect, test } from "vitest";
import { hello } from "./main";

test("Hello World!", () => {
  expect(hello).toBe("world!");
});
