"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { Navigate, Route, Routes } from "react-router";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";
import { Navbar } from "./components/Navbar";
import JoinGroup from "./pages/JoinGroup";
import { HomePage } from "./pages/Home";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <>
      <canvas className="absolute" id="my-canvas"></canvas>
      <ProtectedRoute>
        <Navbar />
        <main className="p-4 lg:p-8 pb-8">
          <UserSync />
          <Routes>
            <Route path="/join-group/:groupId" element={<JoinGroup />} />
            <Route path="/" element={<HomePage />} />
            {/* <Route path="/your-next-category" element={<YourNextCategory />} /> */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </ProtectedRoute>
    </>
  );
}

function UserSync() {
  const syncUser = useMutation(api.users.upsertCurrentUser);
  const { isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    void syncUser({});
  }, [isAuthenticated, syncUser]);

  return null;
}
