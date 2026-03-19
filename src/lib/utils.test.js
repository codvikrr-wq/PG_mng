import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (class name utility)", () => {
  it("merges class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    // tailwind-merge: p-4 overrides p-2
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles objects", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe(
      "text-red-500"
    );
  });

  it("handles arrays", () => {
    expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
