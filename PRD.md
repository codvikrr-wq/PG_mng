# PG Management SaaS — Product Requirements Document (PRD)

**Version:** 1.0

**Author:** Product Team

**Date:** 2026-03-17

---

# 1. Executive Summary

This document defines the product requirements for a web-based, responsive PG (Paying Guest) Management SaaS tool designed to serve multiple organizations (property management companies, PG chains, student housing operators, hostels) and individual PGs. The platform supports multi-organization multi-tenant architecture, role-based access control, per-organization customizations, and tenant-facing features (complaints, absence reports, payments, notices, food, events). It targets operators who need an end-to-end solution to manage occupancy, finance, housekeeping, inventory, vendor payments, communication, and reporting.

**Primary target users:** PG Operators (Org Admins), PG Managers, Frontdesk/Housekeepers, Finance/Admin, Tenants (Residents), Support/Helpdesk.

**Problem statement:** Current workflows are fragmented (spreadsheets, paper), multi-PG organizations face duplicate work across locations, limited visibility into finances & occupancy, slow tenant communications, and no centralized tenant self-service.

**Solution:** A single SaaS platform that supports multiple organizations (each organization can manage multiple PGs), full role/permission controls, tenant self-service portal, integrated finance & food & events modules, configurable templates and legal/compliance document storage, and strong data isolation between organizations.

---

# 2. Objectives & Success Metrics

## Objectives
- Deliver an MVP that supports multi-tenant organizations with:
  - Organization-level administration (create/manage PGs, users, roles)
  - PG-level operations (rooms, beds, tenants, check-in/out)
  - Tenant self-service (complaints, absence reports, payments, requests)
  - Finance tracking (invoices, payments, refunds, expense tracking)
  - Notices, events, food & meal management
- Ensure strict data isolation and configurability per organization.
- Achieve >95% uptime, sub-300ms median page load for core pages, and scale to thousands of organizations.

## Success Metrics (first 12 months)
- Time to onboard a new organization: < 30 minutes (guided and automated).
- Tenant adoption: 60% of tenants perform at least 1 self-service action within 7 days of onboarding.
- Churn rate (organization customers): < 5% monthly after 6 months of usage.
- Financial accuracy: <0.1% reconciliation errors between recorded payments and bank statement sampling.
- Uptime: 99.9% (SLA target for paid tiers).
- NPS (organization admins): ≥ 40.

---

# 3. User Personas

1. **Org Admin (Primary buyer)** — Owner/COO of a chain managing multiple PGs. Needs consolidated dashboards, billing, user/role management, reports across PGs.
2. **PG Manager** — Manages day-to-day PG operations: rooms, check-ins, housekeeping, events, notices.
3. **Frontdesk / Operator** — Handles tenant onboarding, payments, complaints, visitor logs.
4. **Finance/Admin** — Manages invoices, payments, payroll, tax reports, vendor payments.
5. **Tenant (Resident)** — Books rooms, pays rent, raises complaints, submits absence reports, views notices, orders food.
6. **Support Agent** — Handles tenant tickets and escalations.

---

# 4. High-level Product Scope

## Core modules (MVP and immediate roadmap):
- Multi-Organization & Multi-PG Management (tenant isolation, org admin controls)
- User & Role Management (RBAC, per-org roles, PG-level scoping)
- Room / Inventory Management (rooms, beds, amenities)
- Tenant Management (profiles, ID docs, contracts, check-in/out)
- Tenant Self-Service Portal (complaints, absence, service requests, payments)
- Finance Module (invoicing, receipts, bills, expense, taxation basics)
- Notices & Announcements (org/pg-level notices)
- Events & Attendance (events calendar, RSVP)
- Food & Meal Management (meal plans, orders, kitchen management)
- Housekeeping & Maintenance (schedules, checklists, vendor assignment)
- Reporting & Dashboards (occupancy, revenue, AR, churn)
- Audit Logging & Compliance (activity logs, document storage)
- Integrations (payment gateway, SMS/Email provider, accounting tools, SSO)
- Admin & Onboarding (org setup, trial, subscription management)

---

# 5. Detailed Requirements

## 5.1 Multi-Organization & Multi-PG Architecture

### Goals
- Each organization (Org) can create and manage multiple PG properties (PG entities).
- Organizations are strictly isolated: configuration, data, branding, and users (unless shared by invitation) must not leak between orgs.
- The SaaS platform supports a single global account per organization and sub-accounts for PGs.

### Functional Requirements
- FR-ORG-001: Admins can create an Organization and add billing details, branding (logo, colors), and contact info.
- FR-ORG-002: Within an Organization, Admins can create/edit/delete PGs (name, address, time zone, currency, tax settings).
- FR-ORG-003: Organizations can invite users to the org; invitations are scoped to the org and optionally scoped to specific PGs.
- FR-ORG-004: Data isolation must be enforced at the application and database layer (see technical section).
- FR-ORG-005: Organizations may define default templates (lease, deposit rules, charges) that PGs can inherit or override.

### Non-functional Requirements
- NFR-ORG-001: A single data breach or data mutation for one org must not compromise others.
- NFR-ORG-002: Tenant data residency and encryption at rest for sensitive PII.

## 5.2 User, Roles & Permissions (RBAC)

### Goals
- Flexible role creation at the Organization level; roles can be assigned to users at org or PG level.

### Functional Requirements
- FR-ROLE-001: Org Admin can create roles with a granular set of permissions (CRUD on modules, access to PGs, report access, finance access).
- FR-ROLE-002: System provides default roles: Org Admin, PG Manager, Frontdesk, Finance, Housekeeping, Tenant, Support.
- FR-ROLE-003: Permissions include per-page and per-resource restrictions; e.g., a Frontdesk role may have access to check-in/out but not org billing.
- FR-ROLE-004: Role-based SSO mappings: integrate with IdP claims to auto-assign roles.
- FR-ROLE-005: Audit trail for role changes and privilege escalations.

## 5.3 Tenant (Resident) Management

### Goals
- Simplify onboarding, document capture, contract generation, and lifecycle management for tenants.

### Functional Requirements
- FR-TEN-001: Create tenant profile with personal details, ID documents, emergency contacts.
- FR-TEN-002: Assign tenant to PG -> room -> bed. Support multiple tenants per room when applicable.
- FR-TEN-003: Digital contract generation: standard templates with org/pg variable substitution; e-sign capability.
- FR-TEN-004: Check-in, check-out workflows — including inventory & damage deposit capture.
- FR-TEN-005: Tenant status lifecycle: prospective, active, on-leave, vacated, blacklisted.

## 5.4 Tenant Self-Service Portal (web & mobile responsive)

### Goals
- Provide tenants with an easy portal to manage payments, requests, complaints, absence reports, and view notices.

### Functional Requirements
- FR-PORTAL-001: Login via email/phone + OTP, or SSO if enabled.
- FR-PORTAL-002: Create absence reports (with start/end dates) that integrate to attendance/occupancy reports.
- FR-PORTAL-003: Create complaints and maintenance requests with attachments; track status (open, assigned, in progress, resolved).
- FR-PORTAL-004: View & pay invoices (full or partial), download receipts, setup standing instructions / autopay if allowed.
- FR-PORTAL-005: View notices, events, meal menus, and respond to RSVPs.
- FR-PORTAL-006: Roommate chat/group (optional) and visitor pre-approval flow.

## 5.5 Finance & Payments

### Goals
- Accurate revenue & expense tracking, multi-currency support per organization, reconciliation, and exporting to accounting systems.

### Functional Requirements
- FR-FIN-001: Generate recurring invoices (monthly/weekly/custom), pro-rata charges on move-in/move-out.
- FR-FIN-002: Accept online payments via integrated gateways; support manual offline payments with receipt logging.
- FR-FIN-003: Security deposit, refundable deposit handling, and automated calculations at checkout.
- FR-FIN-004: Expense and vendor bill entry (one-off and recurring). Support attachments.
- FR-FIN-005: AR aging report, cash flow report, monthly P&L (basic) per PG and consolidated per Org.
- FR-FIN-006: Export to CSV/Excel and integrations with accounting tools (e.g., QuickBooks, Xero) via API.
- FR-FIN-007: Refund processing and partial refund rules with approval workflow.

### Compliance & Security
- PCI-DSS considerations: We will integrate with external payment gateways to avoid handling card data.

## 5.6 Notices, Events & Communication

### Functional Requirements
- FR-COM-001: Create notices at org-level or PG-level; notices can be pushed as in-app, email, and SMS.
- FR-COM-002: Events calendar with capacity, RSVP, and attendance tracking.
- FR-COM-003: Scheduled broadcasts and templated messages for move-in/out, rent reminders, policy updates.

## 5.7 Food & Meal Management

### Goals
- Manage meal plans, menus, orders, and kitchen operations.

### Functional Requirements
- FR-FOOD-001: Define meal plans per tenant (daily, weekly, prepaid credits).
- FR-FOOD-002: Menus publishing and daily menu items.
- FR-FOOD-003: Tenant ordering flow (pre-order, same-day order) and meal attendance tracking.
- FR-FOOD-004: Billing for meals: per-order, per-plan, or as part of rent; integrate with finance module.
- FR-FOOD-005: Kitchen dashboard for meal prep counts by date/time and auto-generated shopping lists.

## 5.8 Housekeeping & Maintenance

### Functional Requirements
- FR-HK-001: Create housekeeping schedules (daily/weekly/monthly) and assign staff.
- FR-HK-002: Maintenance ticket lifecycle (tenant or staff created), vendor assignment, SLA timers.
- FR-HK-003: Inventory for consumables (bedding, toiletries) with reorder alerts.

## 5.9 Reporting & Analytics

### Functional Requirements
- FR-REP-001: Occupancy dashboard (current, historical, trend), vacancy forecasting.
- FR-REP-002: Revenue dashboard (by PG, by Org), AR ageing, rent collection rates.
- FR-REP-003: Tenant lifecycle reports (average stay duration, churn by PG).
- FR-REP-004: Custom report builder (filters, groupings) and scheduled report delivery.

## 5.10 Integrations & APIs

### Integrations
- Payment gateways (Stripe/Paypal/Razorpay/PayU — pluggable adapter)
- SMS providers and Email service (Twilio, SendGrid)
- Accounting tools (QuickBooks, Xero)
- SSO/IdP (SAML, OIDC, Google Workspace)
- Background check and ID verification providers (optional)

### API
- Public REST API for common operations (tenants, invoices, reports) with OAuth2.
- Webhook support for events (payment succeeded, tenant created, complaint resolved).

---

# 6. Data Model (High-level)

> This section provides core entities and relationships; it is not exhaustive but sufficient for engineering to begin data modeling.

- **Organization**: id, name, billing_info, branding, timezone, currency, tax_settings, created_at
- **PG (Property)**: id, org_id, name, address, capacity, manager_user_id, created_at
- **User**: id, org_id, email, phone, roles[], profile, created_at
- **Role**: id, org_id, name, permissions[]
- **Room**: id, pg_id, name, room_type, capacity, amenities[]
- **Bed**: id, room_id, bed_number, status
- **Tenant**: id, user_id, pg_id, room_id, bed_id, status, lease_id
- **Lease / Contract**: id, tenant_id, pg_id, start_date, end_date, deposit_amount, rent_amount, terms
- **Invoice**: id, tenant_id, org_id, pg_id, period, amount, status
- **Payment**: id, invoice_id, amount, method, status, transaction_ref
- **Complaint / Ticket**: id, tenant_id, pg_id, category, status, assignee

---

# 7. Technical Architecture & Multi-Tenancy Strategy

## Architecture overview
- Cloud-native, microservices-friendly architecture hosted on AWS/GCP/Azure (customer choice).
- Core components: API Gateway, Auth Service, Tenant Management, Billing Service, Finance Service, Notification Service, File Service (S3), Reporting/Analytics Service.

## Multi-tenancy model
Two primary options considered; recommended: **shared schema, tenant-isolated data with row-level tenancy controls** for cost-efficiency and scalability; allow opt-in for dedicated schema or dedicated database for Enterprise customers.

### Implementation guidelines
- Logical tenancy: each row includes `org_id` and `pg_id` where applicable.
- Enforce tenancy at API layer and database layer via ORM middleware.
- Use perimeter access control lists (ACLs) and per-organization encryption keys for sensitive fields.
- Support per-org feature flags and configurable settings stored in a fast key-value store (Redis / DynamoDB).

## Security & Data Protection
- TLS everywhere (in transit encryption), AES-256 at rest for sensitive data.
- Role-based access checks on every API call.
- Audit logs for critical actions (payment, user role changes, deletion of tenants).
- Data retention & deletion policy per GDPR/Local regulations.
- Regular pentesting & vulnerability scanning.

---

# 8. Non-Functional Requirements

- **Performance**: Core API median response <200 ms, UI pages <300 ms for key interactions.
- **Scalability**: Auto-scale services to handle peaks (monthly rent cycles, new tenant intake season).
- **Availability**: 99.9% uptime for paid tiers. Graceful degradation for non-critical services.
- **Backup & DR**: Daily backups, point-in-time recovery for 30 days, documented DR runbooks.
- **Localization**: Support for multiple languages; start with English + 1 regional language (configurable per org).
- **Accessibility**: WCAG AA compliance goals for tenant-facing UI.
- **Logging & Monitoring**: Centralized logs, metrics (Prometheus/Grafana), alerting.

---

# 9. UX / UI Principles

- Mobile-first responsive design; key tenant flows first (pay rent, raise complaint, view notice).
- Clean dashboards for org admins with clear KPIs.
- Guided onboarding wizard for org setup and first PG creation.
- Minimal clicks for frequent tasks (check-in, generate invoice, resolve complaint).
- Provide contextual help and in-product tooltips.

---

# 10. MVP Definition (Scope for initial launch)

**MVP (3–4 months aggressive roadmap)**
- Multi-org sign up & org settings
- Create/manage PGs (basic room/bed modeling)
- User invite & default roles
- Tenant profiles, digital contract templates (no e-sign in MVP; PDF download)
- Check-in/check-out minimal workflow
- Invoicing (manual & recurring) and online payments via 1 payment gateway
- Tenant portal: complaints, absence reporting, view & pay invoices
- Basic dashboards: occupancy, revenue
- Audit logs and basic security; simple backups

**MVP exclusions (to be scheduled)**
- Full integrations (accounting, background checks)
- Advanced meal kitchen management and shopping lists
- Multi-currency complex tax scenarios
- Advanced custom report builder

---

# 11. Roadmap & Phased Features

**Phase 1 (MVP):** Core multi-tenant, tenant portal, finance, notices, complaints.

**Phase 2:** Role customization, advanced finance (refund workflows, vendor bills), events & RSVP, meal pre-order module.

**Phase 3:** Integrations (QuickBooks, SSO), mobile apps (iOS/Android), dedicated DB option for Enterprise, advanced analytics & forecasting.

**Phase 4:** Marketplace integrations (background checks, insurance), AI-assisted tenant matching, churn prediction, dynamic pricing for rooms.

---

# 12. Acceptance Criteria & Sample User Stories

## Sample user stories (formatted: As a [persona], I want [goal], so that [benefit])
- As an **Org Admin**, I want to create a new PG under my organization so that I can manage its rooms and tenants separately.
  - AC: New PG appears in Org dashboard; only users invited to PG can see its data.
- As a **Tenant**, I want to raise a complaint with photo attachments so that the PG manager can act.
  - AC: Complaint created with attachments; status changes visible in tenant portal; ticket assigned to staff.
- As a **Finance Admin**, I want to generate recurring invoices for tenants so that rent collection is automated.
  - AC: Invoices generated on schedule; payments update invoice status on success.

---

# 13. Security, Compliance, & Privacy

- PII minimization: collect only required data, encrypt sensitive fields, mask data in UI when not necessary.
- Data retention and deletion: configurable retention policy per org; right to be forgotten workflow.
- Access controls: MFA for Org Admins; session timeout policies.
- Compliance: prepare for SOC2 Type II, GDPR and local tax/regulatory compliance in target markets.

---

# 14. Operational Requirements

- Onboarding flows and help center (knowledge base, docs)
- Support tiers: Email/support portal for free tier; SLA & phone for enterprise.
- Billing & subscription management: in-app upgrade/downgrade and metered billing for add-ons (API calls, number of PGs over quota).

---

# 15. Metrics & Analytics (Instrumentation)

Instrument product to capture:
- Monthly active organizations, active PGs, active tenants
- Tenant portal adoption rates
- Time-to-resolve complaints
- Rent collection rate & late payments
- API latency and error rates

---

# 16. Edge Cases & Considerations

- Data migration from spreadsheets (CSV import for tenants/rooms/invoices).
- Handling overlapping leases and pro-rata calculations.
- Split invoices (roommates splitting rent) and auto-reconciliation.
- Offline operations: frontdesk should function with intermittent internet (future offline sync capability).

---

# 17. Open Questions (to resolve during discovery)

- Which payment gateways to prioritize per target market?
- Local tax requirements and invoice formats per country/region.
- Level of auditability / financial controls desired by enterprise customers.
- Will each organization require custom domain / white-labeling on paid tiers?

---

# 18. Deliverables & Next Steps

- Product: Approve PRD and MVP scope.
- Design: High-fidelity designs for onboarding, tenant portal, org dashboard (2 weeks).
- Engineering: Architecture spike on multi-tenancy model & infra cost estimates (1 week).
- Legal/Finance: Decide payment partners and tax compliance list (2 weeks).

---

# 19. Appendix

## 19.1 Example API Endpoints (illustrative)
- `POST /api/v1/orgs` — create organization
- `POST /api/v1/orgs/{id}/pgs` — create PG
- `POST /api/v1/pgs/{id}/rooms` — create room
- `POST /api/v1/tenants` — create tenant
- `POST /api/v1/invoices` — create invoice
- `POST /api/v1/payments/webhook` — payment gateway webhook

## 19.2 CSV Import Columns (examples)
- Rooms: `pg_id,room_name,room_type,capacity,monthly_rent`
- Tenants: `first_name,last_name,email,phone,pg_id,room_name,bed_number,start_date,end_date,rent`


---

*End of PRD v1.0*


