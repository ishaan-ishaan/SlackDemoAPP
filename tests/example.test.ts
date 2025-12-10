import { describe, it, expect } from "vitest";
import { sum } from "../src/core/sum";

describe("sum()", () => {
    it("adds numbers", () => {
        expect(sum(1, 2)).toBe(3);
    });
});
