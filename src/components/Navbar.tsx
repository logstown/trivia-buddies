import { UserButton } from "@clerk/clerk-react";
import { NavLink } from "react-router";

export const Navbar = () => {
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <NavLink to="/" className="btn btn-ghost text-xl">
          Trivia Buddies
        </NavLink>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li>
            <NavLink to="/your-next-category">Next Category</NavLink>
          </li>
        </ul>
      </div>
      <UserButton />
    </div>
  );
};
