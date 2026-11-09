import { LegalPage } from "@/components/tally/LegalPage";

export const metadata = { title: "Cookies — Tally" };

const SECTIONS = [
  {
    h: "Essential Cookies Only",
    p: [
      "Tally uses only strictly necessary cookies and local storage entries required for core functionality. There are no advertising, profiling, marketing, or third-party analytics cookies.",
    ],
  },
  {
    h: "Cookies We Set",
    p: [
      "tally_uid: An HTTP-only cookie containing a random 16-hex-character identifier. Stored for up to 2 years to associate your anonymous tracking sessions across visits on this device.",
      "tally_age: An HTTP-only cookie indicating verification status (ok or blocked). Stored for up to 1 year so you do not have to complete the age gate on every session. Your date of birth is never stored in this cookie or anywhere else.",
    ],
  },
  {
    h: "Local Browser Storage",
    p: [
      "tally.theme: Stores your light or dark display mode preference.",
      "tally.cookies: Stores your acknowledgment of the cookie notice so the banner does not repeat.",
    ],
  },
  {
    h: "Managing and Clearing Cookies",
    p: [
      "You can clear or block cookies at any time through your browser settings. Clearing cookies will reset your device identifier and require you to complete the age confirmation screen again.",
    ],
  },
];

export default function CookiesPage() {
  return <LegalPage title="Cookies" updated="10 November 2026" sections={SECTIONS} />;
}
