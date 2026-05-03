"use client";

import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Navigate, Route, Routes } from "react-router";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";
import { Navbar } from "./components/Navbar";
import YourNextCategory from "./pages/YourNextCategory";
import JoinGroup from "./pages/JoinGroup";
import { HomePage } from "./pages/Home";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="p-8">
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
        <Authenticated>
          <UserSync />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/join-group/:groupId" element={<JoinGroup />} />
            <Route path="/your-next-category" element={<YourNextCategory />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Authenticated>
      </main>
    </>
  );
}

function UserSync() {
  const syncUser = useMutation(api.users.upsertCurrentUser);

  useEffect(() => {
    syncUser({});
  }, [syncUser]);

  return null;
}

function SignInForm() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <p>Log in to see the numbers</p>
      <SignInButton mode="modal">
        <button className="btn btn-xl btn-primary">Sign in</button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="btn btn-xl btn-soft">Sign up</button>
      </SignUpButton>
    </div>
  );
}
