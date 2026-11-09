import { LegalPage } from "@/components/tally/LegalPage";

export const metadata = { title: "Terms — Tally" };

const SECTIONS = [
  {
    h: "Operator",
    p: [
      "Tally is operated by jadonamite (contact: jadonamite@gmail.com). By accessing or using Tally, you agree to these Terms of Service.",
    ],
  },
  {
    h: "Age Requirement",
    p: [
      "You must be at least 18 years old, or the age of legal majority in your jurisdiction, to use Tally. If you are under this age, you are not permitted to use this service.",
    ],
  },
  {
    h: "Information Tool Only",
    p: [
      "Tally is an informational and tracking utility. Tally is not a bookmaker, broker, gambling operator, or financial institution. Tally does not accept bets, execute trades, hold deposits, or handle user funds in any form.",
      "Nothing on Tally constitutes financial advice, investment advice, betting advice, or a recommendation to place any wager. Any stake calculations or suggestions displayed within the service are purely mathematical calculations based on Kelly criterion formulas and are not recommendations to risk money.",
    ],
  },
  {
    h: "Data Sources and Verification",
    p: [
      "Market information, prices, and outcome resolutions are retrieved from external sources including Polymarket, Sui mainnet, Polygon, and Walrus. Tally does not guarantee the timeliness, completeness, or accuracy of third-party market data.",
      "Cryptographic seals on the Sui blockchain record only the timestamp and hash of submitted text before market lock times. A seal proves that a specific text existed prior to kickoff; it does not verify the truth, accuracy, or quality of the prediction.",
    ],
  },
  {
    h: "User Conduct",
    p: [
      "You are responsible for any text you input into Tally. You must not submit unlawful content, intellectual property infringements, or content you do not have permission to process.",
    ],
  },
  {
    h: "Disclaimer of Warranties and Limitation of Liability",
    p: [
      "Tally is provided on an 'as is' and 'as available' basis without warranties of any kind. To the maximum extent permitted by applicable law, the operator shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the service or reliance on any records displayed.",
    ],
  },
  {
    h: "Changes and Contact",
    p: [
      "These terms may be updated from time to time. Continued use of Tally constitutes acceptance of revised terms. For inquiries, contact jadonamite@gmail.com.",
    ],
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms" updated="10 November 2026" sections={SECTIONS} />;
}
