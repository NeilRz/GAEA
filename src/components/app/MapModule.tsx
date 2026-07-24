"use client";

import ReserveMap from "@/components/ReserveMap";
import type { MapFocusRequest } from "./GeomApp";

export default function MapModule({
  focusRequest,
}: {
  focusRequest: MapFocusRequest | null;
}) {
  return <ReserveMap focusRequest={focusRequest} />;
}
