import { describe, it, expect } from "vitest";
import {
  SYSTEM_ROLES,
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  DEFAULT_ROLE_PERMISSIONS,
  TENANT_STATUS,
  INVOICE_STATUS,
  PAYMENT_METHODS,
  COMPLAINT_STATUS,
  COMPLAINT_CATEGORIES,
  ROOM_TYPES,
} from "./constants";

describe("SYSTEM_ROLES", () => {
  it("defines all 7 system roles", () => {
    const roles = Object.values(SYSTEM_ROLES);
    expect(roles).toHaveLength(7);
    expect(roles).toContain("Org Admin");
    expect(roles).toContain("Tenant");
  });
});

describe("PERMISSION_MODULES", () => {
  it("has 14 modules", () => {
    expect(Object.keys(PERMISSION_MODULES)).toHaveLength(14);
  });
});

describe("PERMISSION_ACTIONS", () => {
  it("has exactly view, create, edit, delete", () => {
    expect(Object.values(PERMISSION_ACTIONS)).toEqual(["view", "create", "edit", "delete"]);
  });
});

describe("DEFAULT_ROLE_PERMISSIONS", () => {
  it("Org Admin has full access to every module", () => {
    const adminPerms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.ORG_ADMIN];
    const allModules = Object.values(PERMISSION_MODULES);
    allModules.forEach((mod) => {
      expect(adminPerms[mod]).toEqual(
        expect.arrayContaining(["view", "create", "edit", "delete"])
      );
    });
  });

  it("Tenant role cannot access finance", () => {
    const tenantPerms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.TENANT];
    expect(tenantPerms.finance).toBeUndefined();
  });

  it("Tenant role can view and create complaints", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.TENANT];
    expect(perms.complaints).toContain("view");
    expect(perms.complaints).toContain("create");
    expect(perms.complaints).not.toContain("delete");
  });

  it("Housekeeping role cannot access finance", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.HOUSEKEEPING];
    expect(perms.finance).toBeUndefined();
  });

  it("Finance role has full finance access", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.FINANCE];
    expect(perms.finance).toEqual(
      expect.arrayContaining(["view", "create", "edit", "delete"])
    );
  });

  it("PG Manager cannot delete from finance", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.PG_MANAGER];
    expect(perms.finance).not.toContain("delete");
  });

  it("defines permissions for all 7 roles", () => {
    Object.values(SYSTEM_ROLES).forEach((role) => {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toBeDefined();
    });
  });
});

describe("TENANT_STATUS", () => {
  it("has 5 statuses", () => {
    expect(Object.values(TENANT_STATUS)).toHaveLength(5);
  });

  it("includes active and vacated", () => {
    expect(Object.values(TENANT_STATUS)).toContain("active");
    expect(Object.values(TENANT_STATUS)).toContain("vacated");
  });
});

describe("INVOICE_STATUS", () => {
  it("has 6 statuses", () => {
    expect(Object.values(INVOICE_STATUS)).toHaveLength(6);
  });

  it("includes paid and overdue", () => {
    expect(Object.values(INVOICE_STATUS)).toContain("paid");
    expect(Object.values(INVOICE_STATUS)).toContain("overdue");
  });
});

describe("PAYMENT_METHODS", () => {
  it("includes cash and upi", () => {
    const methods = Object.values(PAYMENT_METHODS);
    expect(methods).toContain("cash");
    expect(methods).toContain("upi");
  });
});

describe("COMPLAINT_CATEGORIES", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(COMPLAINT_CATEGORIES)).toBe(true);
    expect(COMPLAINT_CATEGORIES.length).toBeGreaterThan(0);
    COMPLAINT_CATEGORIES.forEach((c) => expect(typeof c).toBe("string"));
  });

  it("includes common categories", () => {
    expect(COMPLAINT_CATEGORIES).toContain("Plumbing");
    expect(COMPLAINT_CATEGORIES).toContain("Electrical");
  });
});

describe("ROOM_TYPES", () => {
  it("has 5 types", () => {
    expect(ROOM_TYPES).toHaveLength(5);
  });

  it("includes Single and Double", () => {
    expect(ROOM_TYPES).toContain("Single");
    expect(ROOM_TYPES).toContain("Double");
  });
});
