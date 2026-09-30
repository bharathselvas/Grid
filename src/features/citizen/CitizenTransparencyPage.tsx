import { AlertTriangle, FolderOpen, MapPin, Bell, MessageSquare, CheckCircle2, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PUBLIC_AGGREGATE } from "./citizenData";

const STAGE_DISPLAY: Record<string, { label: string; color: string }> = {
  preliminary: { label: "Preliminary", color: "bg-blue-100 text-blue-800" },
  notification: { label: "Notification", color: "bg-indigo-100 text-indigo-800" },
  objection: { label: "Objection", color: "bg-amber-100 text-amber-800" },
  declaration: { label: "Declaration", color: "bg-orange-100 text-orange-800" },
  verification: { label: "Verification", color: "bg-purple-100 text-purple-800" },
  award: { label: "Award", color: "bg-emerald-100 text-emerald-800" },
  compensation: { label: "Compensation", color: "bg-green-100 text-green-800" },
  possession: { label: "Possession", color: "bg-teal-100 text-teal-800" },
};

export default function CitizenTransparencyPage() {
  const stats = [
    { label: "Total Projects", value: PUBLIC_AGGREGATE.totalProjects, icon: FolderOpen },
    { label: "Affected Villages", value: PUBLIC_AGGREGATE.totalAffectedVillages, icon: MapPin },
    { label: "Notifications Published", value: PUBLIC_AGGREGATE.totalNotificationsPublished, icon: Bell },
    { label: "Objections Received", value: PUBLIC_AGGREGATE.totalObjectionsReceived, icon: MessageSquare },
    { label: "Objections Resolved", value: PUBLIC_AGGREGATE.totalObjectionsResolved, icon: CheckCircle2 },
    { label: "States Covered", value: PUBLIC_AGGREGATE.statesCovered, icon: Map },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-amber-100 border border-amber-300 rounded-md px-4 py-2 flex items-center gap-2 text-amber-800 text-xs font-medium">
        <AlertTriangle className="h-4 w-4" />
        MOCK / SANDBOX — All data shown is fictional demonstration data
      </div>

      <div>
        <h1 className="text-3xl font-bold text-[#0F2340]">Acquisition Transparency</h1>
        <p className="text-muted-foreground mt-1">
          Public aggregate data for all land acquisition projects tracked on Terranex.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center space-y-2">
              <s.icon className="h-5 w-5 mx-auto text-[#0F2340]" />
              <p className="text-2xl font-bold text-[#0F2340]">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#0F2340]">Compensation Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-[#0F2340]">{PUBLIC_AGGREGATE.compensationProgress}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F2340] rounded-full transition-all"
                style={{ width: `${PUBLIC_AGGREGATE.compensationProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {PUBLIC_AGGREGATE.compensationProgress}% of compensation payments processed across all projects.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#0F2340]">R&R Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-[#0F2340]">{PUBLIC_AGGREGATE.rrProgress}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${PUBLIC_AGGREGATE.rrProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {PUBLIC_AGGREGATE.rrProgress}% of Rehabilitation & Resettlement entitlements delivered.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#0F2340]">Projects by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(PUBLIC_AGGREGATE.projectsByStage).map(([key, count]) => {
              const info = STAGE_DISPLAY[key];
              return (
                <div key={key} className="flex flex-col items-center p-3 rounded-lg border">
                  <Badge className={`${info?.color ?? "bg-slate-100 text-slate-800"} mb-2`}>
                    {count}
                  </Badge>
                  <span className="text-xs text-muted-foreground text-center">{info?.label ?? key}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
