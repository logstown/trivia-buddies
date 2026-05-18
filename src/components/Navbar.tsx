import { UserButton } from "@clerk/clerk-react";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";

export const Navbar = () => {
  const themeDropdownRef = useRef<HTMLDetailsElement>(null);
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem("theme") ?? "light",
  );
  const [showClose, setShowClose] = useState(false);

  const formatThemeLabel = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

  useEffect(() => {
    window.localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const themes = [
    "light",
    "dark",
    "cupcake",
    "bumblebee",
    "emerald",
    "corporate",
    "synthwave",
    "retro",
    "cyberpunk",
    "valentine",
    "halloween",
    "garden",
    "forest",
    "aqua",
    "lofi",
    "pastel",
    "fantasy",
    "wireframe",
    "black",
    "luxury",
    "dracula",
    "cmyk",
    "autumn",
    "business",
    "acid",
    "lemonade",
    "night",
    "coffee",
    "winter",
    "dim",
    "nord",
    "sunset",
    "caramellatte",
    "abyss",
    "silk",
  ];

  const handleThemeChange = (themeName: string) => {
    setTheme(themeName);
    setShowClose(true);
  };

  const closeThemeDropdown = useCallback(() => {
    themeDropdownRef.current?.removeAttribute("open");
    setShowClose(false);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const dropdown = themeDropdownRef.current;
      const target = event.target;

      if (
        !dropdown ||
        !dropdown.hasAttribute("open") ||
        !(target instanceof Node)
      ) {
        return;
      }

      if (!dropdown.contains(target)) {
        closeThemeDropdown();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [closeThemeDropdown]);

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
        <ul className="menu menu-horizontal px-1">
          <li className="tooltip tooltip-left" data-tip="Change theme">
            <details ref={themeDropdownRef}>
              <summary className="capitalize">{theme}</summary>
              <ul
                className={`bg-base-100 text-base-content rounded-t-none p-2 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contains`}
              >
                {themes.map((themeName) => (
                  <li key={themeName}>
                    <input
                      type="radio"
                      name="theme-dropdown"
                      className="w-full btn btn-sm btn-block btn-ghost justify-start"
                      aria-label={formatThemeLabel(themeName)}
                      value={themeName}
                      checked={theme === themeName}
                      onChange={() => handleThemeChange(themeName)}
                    />
                  </li>
                ))}
              </ul>
            </details>
          </li>
        </ul>
        <UserButton />
      </div>
    </div>
  );
};
