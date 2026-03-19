export const metadata = {
  title: "Terms of Service | PG Manager",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: March 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using PG Manager, you agree to be bound by these Terms of Service.
            If you do not agree, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. Description of Service</h2>
          <p>
            PG Manager is a multi-tenant SaaS platform for managing paying guest (PG) accommodations,
            including tenant management, invoicing, complaints, housekeeping, and related operations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. Account Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials.
            You agree to notify us immediately of any unauthorized use of your account. You are
            responsible for all activity that occurs under your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Acceptable Use</h2>
          <p>
            You agree not to use PG Manager for any unlawful purpose, to upload malicious content,
            to attempt to gain unauthorized access to other users&apos; data, or to interfere with the
            platform&apos;s operation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Data Ownership</h2>
          <p>
            You retain ownership of all data you upload to PG Manager. By using the service, you
            grant us a limited license to host and process your data solely to provide the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Payments & Billing</h2>
          <p>
            Online payments are processed through Stripe. We do not store card information.
            Subscription fees (if applicable) are billed in advance and are non-refundable
            except as required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Limitation of Liability</h2>
          <p>
            PG Manager is provided &quot;as is&quot; without warranty of any kind. We are not liable for
            any indirect, incidental, or consequential damages arising from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">8. Termination</h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms.
            You may delete your account at any time by contacting support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">9. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the service after
            changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">10. Contact</h2>
          <p>
            For questions about these terms, contact us at{" "}
            <a href="mailto:legal@pgmanager.app" className="underline">
              legal@pgmanager.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
