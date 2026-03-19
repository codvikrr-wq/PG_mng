export const metadata = {
  title: "Privacy Policy | PG Manager",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: March 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as your name, email address,
            and organization details when you create an account. We also collect data about how
            you use the platform (usage logs, feature interactions) to improve our service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
          <p>
            We use the information to provide, maintain, and improve PG Manager, process
            transactions, send service notifications, and respond to your requests. We do not
            sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. Data Storage & Security</h2>
          <p>
            Your data is stored on Supabase (PostgreSQL) with row-level security enforced.
            All data is encrypted in transit (TLS) and at rest. We take reasonable technical
            and organizational measures to protect your information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Tenant Data</h2>
          <p>
            Tenant personal data (name, contact, lease details, payment records) is owned by
            the PG organization and processed on their behalf. Tenants may request access to
            or deletion of their data by contacting their PG manager.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Cookies</h2>
          <p>
            We use cookies solely for authentication session management (Supabase auth tokens).
            We do not use advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Third-Party Services</h2>
          <p>
            We use Stripe for payment processing (governed by Stripe&apos;s Privacy Policy) and
            Supabase for database and authentication (governed by Supabase&apos;s Privacy Policy).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Contact</h2>
          <p>
            For privacy-related questions, contact us at{" "}
            <a href="mailto:privacy@pgmanager.app" className="underline">
              privacy@pgmanager.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
