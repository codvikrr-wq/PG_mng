import { UserProvider } from "@/context/user-context";
import { OrgProvider } from "@/context/org-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { OrgGate } from "@/components/layout/org-gate";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export const metadata = {
  title: { template: "%s | PG Manager", default: "PG Manager" },
  description: "Manage your PG properties, tenants, finances, and more.",
};

export default function DashboardLayout({ children }) {
  return (
    <UserProvider>
      <OrgProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <TopBar />
            <main className="flex-1 p-4 md:p-6">
              <OrgGate>{children}</OrgGate>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </OrgProvider>
    </UserProvider>
  );
}
