"use client";

/* Category glyphs for the explorer, 16px stroke icons in the row's
   category color. Hand-drawn to match the map's icon language. */

const PATHS: Record<string, React.ReactNode> = {
  droplet: (
    <path d="M8 1.8C8 1.8 3.6 7.5 3.6 10.4a4.4 4.4 0 0 0 8.8 0C12.4 7.5 8 1.8 8 1.8Z" />
  ),
  rig: (
    <>
      <path d="M5 14 8 2l3 12" />
      <path d="M4.6 10.5h6.8M5.6 6.8h4.8M2.5 14h11" />
    </>
  ),
  coin: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.6v6.8M10.2 6a2.6 2.6 0 0 0-4.4 1c0 2.4 4.4 1 4.4 3a2.6 2.6 0 0 1-4.4 1" />
    </>
  ),
  chart: (
    <>
      <path d="M2 13.5h12" />
      <path d="M2.8 10.5 6 7l2.5 2.2L13.2 4" />
      <path d="M10.5 4h2.7v2.7" />
    </>
  ),
  atom: (
    <>
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <ellipse cx="8" cy="8" rx="6.2" ry="2.5" />
      <ellipse cx="8" cy="8" rx="6.2" ry="2.5" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6.2" ry="2.5" transform="rotate(120 8 8)" />
    </>
  ),
  hammer: (
    <>
      <path d="M9.2 5.2 3 11.4l1.6 1.6 6.2-6.2" />
      <path d="M7.6 3.4l3.4-1.2 2.8 2.8-1.2 3.4-5-5Z" />
    </>
  ),
  pipe: (
    <>
      <path d="M1.5 6h13M1.5 10h13" />
      <path d="M6 6v4M10 6v4" />
    </>
  ),
  bars: (
    <>
      <path d="M3 13.5V9M8 13.5V4.5M13 13.5V7" />
      <path d="M1.5 13.5h13" />
    </>
  ),
  ingot: (
    <>
      <path d="M4 5.5h8l2 5H2l2-5Z" />
      <path d="M6 8h4" />
    </>
  ),
  diamond: (
    <>
      <path d="M4.5 2.5h7L14 6l-6 7.5L2 6l2.5-3.5Z" />
      <path d="M2 6h12M8 13.5 5.5 6l2.5-3.5L10.5 6 8 13.5Z" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="5" width="11" height="6.5" rx="1.2" />
      <path d="M14.5 7v2.5" />
      <path d="M7.8 6 6 8.4h2.2l-1.4 2.2" />
    </>
  ),
  crystal: (
    <>
      <path d="M8 1.5 11.5 5 8 14.5 4.5 5 8 1.5Z" />
      <path d="M4.5 5h7" />
    </>
  ),
  eye: (
    <>
      <path d="M1.5 8S4 3.8 8 3.8 14.5 8 14.5 8 12 12.2 8 12.2 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="1.6" />
    </>
  ),
  bolt: <path d="M9 1.5 3.5 9h3.4L7 14.5 12.5 7H9.1L9 1.5Z" />,
};

export default function CatIcon({ icon }: { icon: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[icon] ?? PATHS.coin}
    </svg>
  );
}
