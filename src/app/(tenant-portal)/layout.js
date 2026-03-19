import { UserProvider } from "@/context/user-context";
import { OrgProvider } from "@/context/org-context";
import { TenantNav } from "@/components/layout/tenant-nav";

export const metadata = {
  title: { template: "%s | My PG", default: "My PG" },
  description: "Your PG tenant portal — invoices, complaints, food, and more.",
};

export default function TenantPortalLayout({ children }) {
  return (
    <UserProvider>
      <OrgProvider>
        <div className="min-h-screen bg-background">
          <TenantNav />
          <main className="mx-auto max-w-3xl p-4 pb-20 md:pb-6">{children}</main>
        </div>
      </OrgProvider>
    </UserProvider>
  );
}
