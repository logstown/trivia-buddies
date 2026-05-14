import { UserButton } from "@clerk/clerk-react";
import { Sparkles } from "lucide-react";
import { NavLink } from "react-router";

export const Navbar = () => {
  return (
    <div className="navbar sticky top-0 z-20 bg-primary text-primary-content px-4 shadow-md backdrop-blur">
      <div className="flex-1">
        <NavLink
          to="/"
          className="group inline-flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-primary-content/10"
          aria-label="Trivia Buddies home"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-linear-to-br from-success via-info to-warning p-1 shadow-md shadow-primary-content/10 transition group-hover:scale-105">
            <img
              src="/favicon.svg"
              alt=""
              className="size-full rounded-lg"
              aria-hidden="true"
            />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-lg font-black leading-tight tracking-normal sm:text-xl">
              Trivia Buddies
            </span>
            <span className="text-xs font-medium leading-tight text-primary-content/60">
              Fresh questions with friends
            </span>
          </span>
        </NavLink>
      </div>
      <div className="flex items-center gap-3">
        <div className="badge badge-outline hidden gap-1.5 border-primary/30 px-3 py-3 text-primary sm:inline-flex">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Daily trivia
        </div>
        <UserButton />
      </div>
    </div>
  );
};
