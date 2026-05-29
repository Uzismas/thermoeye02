import { notFound } from "next/navigation";
import type { ViewId } from "@/features/clinical-console/types";

const viewIds: ViewId[] = [
  "dashboard",
  "cases",
  "patients",
  "analysis",
  "report",
  "insights",
  "performance",
  "governance",
  "settings",
];

const viewSet = new Set<string>(viewIds);

type ConsolePageProps = {
  params: Promise<{
    view?: string[];
  }>;
};

export default async function ConsolePage({ params }: ConsolePageProps) {
  const { view: segments = [] } = await params;
  const [view = "dashboard", extraSegment] = segments;

  if (extraSegment || !viewSet.has(view)) {
    notFound();
  }

  return null;
}
