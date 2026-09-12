
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col pt-8 sm:pt-12 pb-12 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
      {children}
    </div>
  );
}
