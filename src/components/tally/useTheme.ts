"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme(): [Theme, () => void] {
  // Dark is the ground this product sits on, so it is what a first visit gets. A saved
  // choice still wins, and so does an explicit system preference for light.
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("tally.theme") as Theme | null;
        if (saved === "light" || saved === "dark") setTheme(saved);
        else if (window.matchMedia("(prefers-color-scheme: light)").matches) setTheme("light");
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("tally.theme", next);
      } catch {}
      return next;
    });
  return [theme, toggle];
}
