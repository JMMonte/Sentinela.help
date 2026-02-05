import { redirect } from "next/navigation";

export default async function ReportDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Redirect to main page with report query param to show in sidepanel
  redirect(`/?report=${id}`);
}

