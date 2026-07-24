import { redirect } from "next/navigation";

export default function TrackerPage() {
  redirect("/app?d=tokenized");
}
