export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">PG Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-tenant PG Management Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
