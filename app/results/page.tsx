import { ResultsClient, type RawSearchParams } from "@/components/parking/results-client";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return <ResultsClient searchParams={resolvedSearchParams} />;
}
