import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  tenantLoginSchema,
} from "./auth";

// ─── signupSchema ──────────────────────────────────────────────────────────

describe("signupSchema", () => {
  const valid = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    password: "Password123",
    confirmPassword: "Password123",
    orgName: "My PG",
  };

  it("accepts a valid payload", () => {
    expect(() => signupSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty firstName", () => {
    const result = signupSchema.safeParse({ ...valid, firstName: "" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/First name is required/i);
  });

  it("rejects empty lastName", () => {
    const result = signupSchema.safeParse({ ...valid, lastName: "" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/Last name is required/i);
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = signupSchema.safeParse({
      ...valid,
      password: "abc",
      confirmPassword: "abc",
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/at least 8 characters/i);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      ...valid,
      password: "Password123",
      confirmPassword: "Different123",
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain("confirmPassword");
    expect(result.error.issues[0].message).toMatch(/don't match/i);
  });

  it("rejects orgName shorter than 2 chars", () => {
    const result = signupSchema.safeParse({ ...valid, orgName: "A" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/Organization name is required/i);
  });
});

// ─── loginSchema ──────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(() =>
      loginSchema.parse({ email: "a@b.com", password: "pass" })
    ).not.toThrow();
  });

  it("rejects invalid email", () => {
    const r = loginSchema.safeParse({ email: "bad", password: "pass" });
    expect(r.success).toBe(false);
  });

  it("rejects empty password", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toMatch(/Password is required/i);
  });
});

// ─── forgotPasswordSchema ─────────────────────────────────────────────────

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(() =>
      forgotPasswordSchema.parse({ email: "user@test.com" })
    ).not.toThrow();
  });

  it("rejects invalid email", () => {
    const r = forgotPasswordSchema.safeParse({ email: "nope" });
    expect(r.success).toBe(false);
  });
});

// ─── resetPasswordSchema ──────────────────────────────────────────────────

describe("resetPasswordSchema", () => {
  it("accepts valid matching passwords", () => {
    expect(() =>
      resetPasswordSchema.parse({
        password: "NewPass123",
        confirmPassword: "NewPass123",
      })
    ).not.toThrow();
  });

  it("rejects short password", () => {
    const r = resetPasswordSchema.safeParse({
      password: "short",
      confirmPassword: "short",
    });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toMatch(/at least 8 characters/i);
  });

  it("rejects mismatched passwords", () => {
    const r = resetPasswordSchema.safeParse({
      password: "NewPass123",
      confirmPassword: "WrongPass",
    });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toMatch(/don't match/i);
  });
});

// ─── tenantLoginSchema ────────────────────────────────────────────────────

describe("tenantLoginSchema", () => {
  it("accepts a valid email", () => {
    expect(() =>
      tenantLoginSchema.parse({ email: "tenant@pg.com" })
    ).not.toThrow();
  });

  it("rejects invalid email", () => {
    const r = tenantLoginSchema.safeParse({ email: "not-valid" });
    expect(r.success).toBe(false);
  });
});
