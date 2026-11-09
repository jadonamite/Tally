import { LegalPage } from "@/components/tally/LegalPage";

export const metadata = { title: "Privacy — Tally" };

const SECTIONS = [
  {
    h: "Information We Collect",
    p: [
      "Tally operates on an anonymous model. We generate a random 16-character hexadecimal identifier stored in an HTTP-only cookie (tally_uid) to associate your tracked voices, calls, and display preferences.",
      "We record the voices and calls you explicitly add, the raw text of those calls, market selections, and your configured bankroll setting.",
      "We do not collect names, email addresses, personal wallet private keys, or dates of birth. The age verification prompt determines only eligibility (eligible or blocked); your birth date is never recorded or transmitted to our database.",
      "Tally runs no third-party tracking scripts, advertising trackers, or telemetry analytics.",
    ],
  },
  {
    h: "Where Data Is Stored",
    p: [
      "Operational indexing data is stored in Neon Postgres. This includes your anonymous identifier, tracked voice metadata, call records, and computed standings.",
      "Call texts, resolution records, and standing histories are archived in Walrus Memory via the Walrus relayer. As documented by Walrus, relayer-processed writes handle storage and encryption keys, meaning data in transit is handled through their relayer infrastructure.",
      "Cryptographic hashes representing call commitments are permanently published to the Sui blockchain (or Polygon for imported wallet transactions). These hashes contain no personal data but are permanent and immutable.",
    ],
  },
  {
    h: "Data Retention and Erasure",
    p: [
      "Data stored on public blockchains (Sui and Polygon) is permanent and cannot be modified or deleted. Blobs stored on Walrus persist according to decentralized storage epochs.",
      "To request manual deletion of your operational database records in Neon, email jadonamite@gmail.com referencing your anonymous identifier.",
    ],
  },
  {
    h: "Contact",
    p: [
      "For questions regarding data processing and privacy on Tally, contact jadonamite@gmail.com.",
    ],
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy" updated="10 November 2026" sections={SECTIONS} />;
}
