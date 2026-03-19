import { describe, it, expect } from "vitest";

// Pure hexToHSL logic extracted for testing
function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

describe("hexToHSL", () => {
  it("converts pure red #FF0000 correctly", () => {
    const { h, s, l } = hexToHSL("#FF0000");
    expect(h).toBe(0);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it("converts pure white #FFFFFF to l=100", () => {
    const { l, s } = hexToHSL("#FFFFFF");
    expect(l).toBe(100);
    expect(s).toBe(0);
  });

  it("converts pure black #000000 to l=0", () => {
    const { l, s } = hexToHSL("#000000");
    expect(l).toBe(0);
    expect(s).toBe(0);
  });

  it("converts blue #0000FF correctly", () => {
    const { h, s, l } = hexToHSL("#0000FF");
    expect(h).toBe(240);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it("produces values in valid ranges", () => {
    const colors = ["#007BFF", "#6366F1", "#22C55E", "#EF4444", "#EAB308"];
    colors.forEach((hex) => {
      const { h, s, l } = hexToHSL(hex);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(360);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThanOrEqual(100);
    });
  });
});
