"use client";

import { usePathname } from "next/navigation";
import { AgeGate } from "./AgeGate";
import { ConsentNotice } from "./ConsentNotice";
import { useTheme } from "./useTheme";

// Age check and cookie notice on every page. Legal pages skip the age check so they can be read first.
const LEGAL = ["/terms", "/privacy", "/cookies", "/blog"];

export function Gates() {
  const pathname = usePathname();
  const [theme] = useTheme();
  const legal = LEGAL.includes(pathname ?? "");

  return (
    <>
      {!legal && <AgeGate theme={theme} />}
      <ConsentNotice />
    </>
  );
}
