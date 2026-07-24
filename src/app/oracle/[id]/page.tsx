import { redirect } from "next/navigation";

export default async function DatasetPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/app?m=oracle&d=${encodeURIComponent(id)}`);
}
