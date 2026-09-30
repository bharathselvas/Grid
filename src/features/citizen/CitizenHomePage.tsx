import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CITIZEN_TIMELINE, STAGE_LABELS } from "./citizenData";
import type { AcquisitionStage } from "./citizenData";

const STEPS: AcquisitionStage[] = [
  "proposal",
  "gis_identification",
  "section_11",
  "objections",
  "field_verification",
  "award",
  "compensation",
  "possession",
  "r_and_r",
];

function getStepStatus(stage: AcquisitionStage) {
  const entry = CITIZEN_TIMELINE.find((t) => t.stage === stage);
  if (!entry) return "upcoming";
  return entry.status === "completed" ? "completed" : entry.status === "in_progress" ? "in_progress" : "upcoming";
}

export default function CitizenHomePage() {
  return (
    <div className="space-y-8">
      <div className="bg-amber-100 border border-amber-300 rounded-md px-4 py-2 text-center text-sm font-medium text-amber-800">
        MOCK / SANDBOX — All data is fictional and for demonstration only
      </div>

      <section className="bg-gradient-to-br from-[#0F2340] to-[#1a3a6a] text-white rounded-xl px-6 py-12 md:px-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-2xl md:text-4xl font-bold">Know Your Land Acquisition Status</h1>
          <p className="text-sm md:text-base text-white/80 max-w-2xl mx-auto">
            Transparent, real-time access to every stage of the land acquisition process under the LARR Act, 2013.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link to="/citizen/status">
              <Button className="bg-[#0F7A5A] hover:bg-[#0d6a4d] text-white">Check Land Status</Button>
            </Link>
            <Link to="/citizen/status">
              <Button className="bg-white text-[#0F2340] hover:bg-slate-100">Track Case</Button>
            </Link>
            <Link to="/citizen/objections/new">
              <Button className="bg-white text-[#0F2340] hover:bg-slate-100">File Objection</Button>
            </Link>
            <Link to="/citizen/grievances/new">
              <Button className="bg-white text-[#0F2340] hover:bg-slate-100">Submit Grievance</Button>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0F2340]">How Terranex Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-200" />
              <div className="space-y-2">
                {STEPS.map((stage) => {
                  const status = getStepStatus(stage);
                  const timeline = CITIZEN_TIMELINE.find((t) => t.stage === stage);
                  return (
                    <div key={stage} className="relative flex items-center gap-4 pl-1">
                      <div className="relative z-10">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            status === "completed"
                              ? "bg-[#0F7A5A]"
                              : status === "in_progress"
                                ? "bg-amber-500"
                                : "bg-slate-300"
                          }`}
                        />
                      </div>
                      <div className="flex-1 flex items-center justify-between py-1">
                        <span className={`text-sm ${status === "upcoming" ? "text-slate-400" : "text-slate-700"}`}>
                          {STAGE_LABELS[stage]}
                        </span>
                        {timeline?.date && (
                          <span className="text-xs text-slate-400">{timeline.date}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
