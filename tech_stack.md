# MVP Tech Stack (Minimal)

Clean, focused technology stack for the MVP. Separate payment providers, external hosting layers, and third‑party communication systems are intentionally excluded at this stage. Supabase capabilities will be used for basic communication and notifications until the product matures.

---

## Frontend

- Next.js (React-based application, JavaScript)
- React
- Tailwind CSS
- shadcn/ui component library

## Backend (MVP)

- Supabase
  - Authentication
  - PostgreSQL database (single instance)
  - Storage
  - Edge Functions (light business logic, webhooks, realtime updates)

Supabase features may also be used for simple notifications and transactional email during the MVP phase.

## Development and CI

- GitHub (source control and repository management)
- GitHub Actions for continuous integration (linting, tests, builds)

---

## MVP Architecture

```
User
 ↓
Next.js (Frontend)
 ↓
Supabase
   - Authentication
   - PostgreSQL
   - Storage
   - Edge Functions
```

External payment processors and specialized communication platforms will be introduced later once the product reaches production maturity and requires dedicated services.

---

## MVP Development Rules

1. **Single Database**  
   Maintain a single PostgreSQL database managed through Supabase. Keep the schema simple and consistent.

2. **Multi‑Tenant Design from Day One**  
   Every table must contain an `organization_id` field to support tenant isolation.

3. **Use Supabase Authentication**  
   Do not implement custom authentication during the MVP phase.

4. **No Microservices**  
   The MVP should remain a single application with minimal architectural complexity.

5. **Avoid Premature Optimization**  
   Do not introduce Redis, Kubernetes, or container orchestration during the MVP stage.

6. **Keep Business Logic Minimal**  
   Prefer Next.js API routes or Supabase Edge Functions for small workflows. Complex background jobs can be introduced later if necessary.

7. **Backups and Disaster Recovery**  
   Enable Supabase backups and point‑in‑time recovery. Restoration procedures should be tested periodically.

8. **Basic Observability**  
   Implement logging and error monitoring early for critical flows such as authentication and core transactions.

9. **Security First**  
   Implement PostgreSQL Row Level Security (RLS) policies and ensure sensitive data is encrypted at rest.

10. **Plan Future Service Separation**  
   Identify areas where dedicated services may eventually be required (e.g., billing, notifications, analytics) and document them clearly to ease future refactoring.

