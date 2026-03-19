import { describe, it, expect } from "vitest";
import {
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
} from "./constants";

/**
 * Simulates the hasPermission logic from OrgContext:
 *   hasPermission(module, action) — checks if the given permissions object
 *   grants the action on the module.
 */
function checkPermission(permissions, module, action) {
  return Array.isArray(permissions[module]) && permissions[module].includes(action);
}

describe("permission matrix — Org Admin", () => {
  const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.ORG_ADMIN];

  it("can do everything on every module", () => {
    Object.values(PERMISSION_MODULES).forEach((mod) => {
      Object.values(PERMISSION_ACTIONS).forEach((action) => {
        expect(checkPermission(perms, mod, action)).toBe(true);
      });
    });
  });
});

describe("permission matrix — Frontdesk", () => {
  const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.FRONTDESK];

  it("can view tenants", () => {
    expect(checkPermission(perms, "tenants", "view")).toBe(true);
  });

  it("cannot delete tenants", () => {
    expect(checkPermission(perms, "tenants", "delete")).toBe(false);
  });

  it("cannot access finance delete", () => {
    expect(checkPermission(perms, "finance", "delete")).toBe(false);
  });

  it("cannot access analytics", () => {
    expect(checkPermission(perms, "analytics", "view")).toBe(false);
  });

  it("cannot access settings", () => {
    expect(checkPermission(perms, "settings", "view")).toBe(false);
  });
});

describe("permission matrix — Tenant", () => {
  const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.TENANT];

  it("can view and create complaints", () => {
    expect(checkPermission(perms, "complaints", "view")).toBe(true);
    expect(checkPermission(perms, "complaints", "create")).toBe(true);
  });

  it("cannot edit or delete complaints", () => {
    expect(checkPermission(perms, "complaints", "edit")).toBe(false);
    expect(checkPermission(perms, "complaints", "delete")).toBe(false);
  });

  it("cannot access rooms", () => {
    expect(checkPermission(perms, "rooms", "view")).toBe(false);
  });

  it("cannot access finance", () => {
    expect(checkPermission(perms, "finance", "view")).toBe(false);
  });

  it("cannot access analytics", () => {
    expect(checkPermission(perms, "analytics", "view")).toBe(false);
  });
});

describe("permission matrix — Finance", () => {
  const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.FINANCE];

  it("has full finance access", () => {
    ["view", "create", "edit", "delete"].forEach((action) => {
      expect(checkPermission(perms, "finance", action)).toBe(true);
    });
  });

  it("cannot create or edit tenants", () => {
    expect(checkPermission(perms, "tenants", "create")).toBe(false);
    expect(checkPermission(perms, "tenants", "edit")).toBe(false);
  });

  it("can view analytics", () => {
    expect(checkPermission(perms, "analytics", "view")).toBe(true);
  });

  it("cannot delete analytics", () => {
    expect(checkPermission(perms, "analytics", "delete")).toBe(false);
  });
});

describe("permission matrix — Housekeeping", () => {
  const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.HOUSEKEEPING];

  it("can manage housekeeping", () => {
    expect(checkPermission(perms, "housekeeping", "view")).toBe(true);
    expect(checkPermission(perms, "housekeeping", "create")).toBe(true);
    expect(checkPermission(perms, "housekeeping", "edit")).toBe(true);
  });

  it("cannot delete housekeeping items", () => {
    expect(checkPermission(perms, "housekeeping", "delete")).toBe(false);
  });

  it("cannot access finance at all", () => {
    ["view", "create", "edit", "delete"].forEach((action) => {
      expect(checkPermission(perms, "finance", action)).toBe(false);
    });
  });
});

describe("permission matrix — Support", () => {
  const perms = DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.SUPPORT];

  it("can view tenants but not create them", () => {
    expect(checkPermission(perms, "tenants", "view")).toBe(true);
    expect(checkPermission(perms, "tenants", "create")).toBe(false);
  });

  it("can manage complaints", () => {
    expect(checkPermission(perms, "complaints", "view")).toBe(true);
    expect(checkPermission(perms, "complaints", "create")).toBe(true);
    expect(checkPermission(perms, "complaints", "edit")).toBe(true);
  });

  it("cannot delete anything", () => {
    Object.values(PERMISSION_MODULES).forEach((mod) => {
      expect(checkPermission(perms, mod, "delete")).toBe(false);
    });
  });
});
