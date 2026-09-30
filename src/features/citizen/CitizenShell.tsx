import { Outlet } from "react-router-dom";
import { CitizenHeader } from "./CitizenHeader";
import { DemoControls } from "@/features/demo/DemoControls";

export function CitizenShell() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <CitizenHeader />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
      <footer className="border-t bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-muted-foreground space-y-1">
          <p>भारत सरकार / Government of India — भूमि संसाधन विभाग / Department of Land Resources</p>
          <p>Terranex — Land Acquisition Information & Citizen Services</p>
          <p className="text-amber-600 font-medium">All monetary values are MOCK / SANDBOX for demonstration</p>
        </div>
      </footer>
      <DemoControls />
    </div>
  );
}
