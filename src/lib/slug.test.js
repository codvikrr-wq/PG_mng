import { describe, it, expect } from "vitest";

// Slug generation logic used in signup page (inline — must stay in sync)
function generateSlug(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

describe("org slug generation", () => {
  it("lowercases the org name", () => {
    expect(generateSlug("My PG")).toBe("my-pg");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSlug("Sunrise PG Homes")).toBe("sunrise-pg-homes");
  });

  it("collapses multiple consecutive spaces into a single hyphen", () => {
    // \s+ in the regex collapses multiple spaces into one hyphen
    expect(generateSlug("PG  Management")).toBe("pg-management");
  });

  it("handles single word names", () => {
    expect(generateSlug("GreenHaven")).toBe("greenhaven");
  });

  it("handles already lowercase names", () => {
    expect(generateSlug("my pg homes")).toBe("my-pg-homes");
  });

  it("handles numbers in names", () => {
    expect(generateSlug("PG123 Residency")).toBe("pg123-residency");
  });
});
