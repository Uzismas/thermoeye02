import type { Metadata } from "next";
import { ThermoeyeConsole } from "@/features/clinical-console/ThermoeyeConsole";

export const metadata: Metadata = {
  title: "Thermoeye Clinical Console",
  description: "Doctor-gated OCTA/OCT screening workflow for Thermoeye pilot review.",
};

type ConsoleLayoutProps = {
  children: React.ReactNode;
};

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  return (
    <>
      <ThermoeyeConsole />
      {children}
    </>
  );
}
