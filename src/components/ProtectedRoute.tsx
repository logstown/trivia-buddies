import { RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import { useLocation } from "react-router";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  if (!isLoaded || (isSignedIn && isLoading)) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="loading loading-spinner loading-lg text-primary" />
          <div className="space-y-1">
            <p className="text-lg font-semibold">Signing you in...</p>
            <p className="text-sm text-base-content/70">
              Syncing your account with Trivia Buddies.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) return <RedirectToSignIn redirectUrl={returnTo} />;

  if (!isAuthenticated) return <div>Unable to authenticate with Convex.</div>;

  return children;
}
