import TrackOrder from "@/components/TrackOrder";

export const metadata = { title: "Track your order | Macclesfield General Store", robots: { index: false, follow: false } };

export default function TrackPage({ params }) {
  return <TrackOrder token={params.token} />;
}
