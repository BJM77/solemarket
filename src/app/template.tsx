// Previously a framer-motion fade/slide wrapper on every page. It shipped
// framer-motion to every route and kept content at opacity 0 until hydration,
// which delayed LCP on phones. Pages now paint immediately.
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
