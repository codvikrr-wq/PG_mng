// System roles
export const SYSTEM_ROLES = {
  ORG_ADMIN: "Org Admin",
  PG_MANAGER: "PG Manager",
  FRONTDESK: "Frontdesk",
  FINANCE: "Finance",
  HOUSEKEEPING: "Housekeeping",
  TENANT: "Tenant",
  SUPPORT: "Support",
};

// Permission modules
export const PERMISSION_MODULES = {
  ORGANIZATION: "organization",
  PGS: "pgs",
  ROOMS: "rooms",
  TENANTS: "tenants",
  FINANCE: "finance",
  COMPLAINTS: "complaints",
  ABSENCES: "absences",
  NOTICES: "notices",
  EVENTS: "events",
  FOOD: "food",
  HOUSEKEEPING: "housekeeping",
  ANALYTICS: "analytics",
  SETTINGS: "settings",
  AUDIT: "audit",
};

// Permission actions
export const PERMISSION_ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
};

// Default permissions per system role
export const DEFAULT_ROLE_PERMISSIONS = {
  [SYSTEM_ROLES.ORG_ADMIN]: {
    // Full access to everything
    ...Object.fromEntries(
      Object.values(PERMISSION_MODULES).map((mod) => [
        mod,
        Object.values(PERMISSION_ACTIONS),
      ])
    ),
  },
  [SYSTEM_ROLES.PG_MANAGER]: {
    pgs: ["view", "edit"],
    rooms: ["view", "create", "edit", "delete"],
    tenants: ["view", "create", "edit", "delete"],
    finance: ["view", "create", "edit"],
    complaints: ["view", "create", "edit"],
    absences: ["view", "edit"],
    notices: ["view", "create", "edit", "delete"],
    events: ["view", "create", "edit", "delete"],
    food: ["view", "create", "edit", "delete"],
    housekeeping: ["view", "create", "edit", "delete"],
    analytics: ["view"],
    settings: ["view"],
  },
  [SYSTEM_ROLES.FRONTDESK]: {
    pgs: ["view"],
    rooms: ["view"],
    tenants: ["view", "create", "edit"],
    finance: ["view", "create"],
    complaints: ["view", "create", "edit"],
    absences: ["view"],
    notices: ["view"],
    events: ["view"],
  },
  [SYSTEM_ROLES.FINANCE]: {
    pgs: ["view"],
    rooms: ["view"],
    tenants: ["view"],
    finance: ["view", "create", "edit", "delete"],
    analytics: ["view"],
  },
  [SYSTEM_ROLES.HOUSEKEEPING]: {
    pgs: ["view"],
    rooms: ["view"],
    housekeeping: ["view", "create", "edit"],
  },
  [SYSTEM_ROLES.TENANT]: {
    complaints: ["view", "create"],
    absences: ["view", "create"],
    notices: ["view"],
    events: ["view"],
    food: ["view"],
  },
  [SYSTEM_ROLES.SUPPORT]: {
    tenants: ["view"],
    complaints: ["view", "create", "edit"],
    absences: ["view", "edit"],
    notices: ["view"],
  },
};

// Tenant status options
export const TENANT_STATUS = {
  PROSPECTIVE: "prospective",
  ACTIVE: "active",
  ON_LEAVE: "on_leave",
  VACATED: "vacated",
  BLACKLISTED: "blacklisted",
};

// Invoice status options
export const INVOICE_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  PARTIAL: "partial",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
};

// Payment methods
export const PAYMENT_METHODS = {
  ONLINE: "online",
  CASH: "cash",
  BANK_TRANSFER: "bank_transfer",
  UPI: "upi",
  CHEQUE: "cheque",
};

// Complaint status options
export const COMPLAINT_STATUS = {
  OPEN: "open",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

// Complaint categories
export const COMPLAINT_CATEGORIES = [
  "Electrical",
  "Plumbing",
  "Furniture",
  "Housekeeping",
  "Noise",
  "Internet",
  "Food",
  "Security",
  "Other",
];

// Room types
export const ROOM_TYPES = [
  "Single",
  "Double",
  "Triple",
  "Quad",
  "Dormitory",
];

// Bed status
export const BED_STATUS = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance",
};

// Meal types
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

// Expense categories
export const EXPENSE_CATEGORIES = [
  "Maintenance",
  "Utilities",
  "Supplies",
  "Salaries",
  "Food",
  "Internet",
  "Insurance",
  "Other",
];

// Maintenance ticket priority
export const TICKET_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

// Sidebar navigation items (admin dashboard)
export const ADMIN_NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", permission: null },
  { title: "PG Properties", href: "/pgs", icon: "Building2", permission: "pgs.view" },
  { title: "Rooms & Beds", href: "/rooms", icon: "BedDouble", permission: "rooms.view" },
  { title: "Tenants", href: "/tenants", icon: "Users", permission: "tenants.view" },
  {
    title: "Payments",
    icon: "IndianRupee",
    permission: "finance.view",
    children: [
      { title: "Invoices", href: "/payments/invoices" },
      { title: "Records", href: "/payments/records" },
      { title: "Expenses", href: "/payments/expenses" },
      { title: "Reports", href: "/payments/reports" },
    ],
  },
  { title: "Complaints", href: "/complaints", icon: "MessageSquareWarning", permission: "complaints.view" },
  { title: "Absences", href: "/absences", icon: "CalendarOff", permission: "absences.view" },
  { title: "Notices", href: "/notices", icon: "Megaphone", permission: "notices.view" },
  { title: "Events", href: "/events", icon: "CalendarDays", permission: "events.view" },
  {
    title: "Food",
    icon: "UtensilsCrossed",
    permission: "food.view",
    children: [
      { title: "Meal Plans", href: "/food/plans" },
      { title: "Menus", href: "/food/menus" },
      { title: "Kitchen", href: "/food/kitchen" },
    ],
  },
  {
    title: "Housekeeping",
    icon: "SprayCan",
    permission: "housekeeping.view",
    children: [
      { title: "Schedules", href: "/housekeeping/schedules" },
      { title: "Maintenance", href: "/housekeeping/maintenance" },
      { title: "Inventory", href: "/housekeeping/inventory" },
    ],
  },
  {
    title: "Analytics",
    icon: "BarChart3",
    permission: "analytics.view",
    children: [
      { title: "Occupancy", href: "/analytics/occupancy" },
      { title: "Revenue", href: "/analytics/revenue" },
      { title: "Tenants", href: "/analytics/tenants" },
      { title: "Audit Log", href: "/analytics/audit" },
    ],
  },
  {
    title: "Settings",
    icon: "Settings",
    permission: "settings.view",
    children: [
      { title: "Organization", href: "/settings/organization" },
      { title: "Users", href: "/settings/users" },
      { title: "Roles", href: "/settings/roles" },
    ],
  },
];

// Tenant portal navigation items
export const TENANT_NAV_ITEMS = [
  { title: "Dashboard", href: "/tenant/dashboard", icon: "LayoutDashboard" },
  { title: "Invoices", href: "/tenant/invoices", icon: "FileText" },
  { title: "Complaints", href: "/tenant/complaints", icon: "MessageSquareWarning" },
  { title: "Absences", href: "/tenant/absences", icon: "CalendarOff" },
  { title: "Notices", href: "/tenant/notices", icon: "Megaphone" },
  { title: "Events", href: "/tenant/events", icon: "CalendarDays" },
  { title: "Food", href: "/tenant/food", icon: "UtensilsCrossed" },
  { title: "Profile", href: "/tenant/profile", icon: "User" },
];
