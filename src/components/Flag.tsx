import { countryFlagCode } from "@/lib/flags";

/** Mini inline country flag (flag-icons SVG). Renders nothing when the
 *  country string isn't a known single country (e.g. "Qatar · Iran"). */
export default function Flag({ country }: { country: string }) {
  const code = countryFlagCode(country);
  if (!code) return null;
  return <span className={`fi fi-${code} flag-mini`} aria-hidden="true" />;
}
