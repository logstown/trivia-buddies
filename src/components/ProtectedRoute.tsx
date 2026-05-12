import { RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import { useLocation } from "react-router";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  if (!isLoaded || (isSignedIn && isLoading)) return <div>Loading...</div>;

  if (!isSignedIn) return <RedirectToSignIn redirectUrl={returnTo} />;

  if (!isAuthenticated) return <div>Unable to authenticate with Convex.</div>;

  return children;
}
