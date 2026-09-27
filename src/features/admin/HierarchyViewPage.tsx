import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  MapPin,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getJurisdictionTree, listProjects, useRequiredApi } from "@/services/api";
import type { JurisdictionTreeNode } from "@/services/api";
import { ApiErrorState, ApiLoadingState } from "@/components/domain/ApiStates";

/**
 * Hierarchy View — tree comes from `GET /api/jurisdictions?tree=true`.
 * Per-node project counts are the server's direct counts rolled up over the
 * subtree (presentation-only aggregation); "Needs Attention" counts live
 * projects in the subtree whose derived risk is critical/high.
 */
type UiNode = {
  id: string;
  label: string;
  type: "national" | "state" | "district" | "tehsil" | "field";
  children?: UiNode[];
  projects?: number;
  attention?: number;
  officials?: string[];
};

const TYPE_ICON: Record<string, typeof Shield> = {
  national: Shield,
  state: MapPin,
  district: Building2,
  tehsil: MapPin,
  field: Users,
};

const TYPE_COLORS: Record<string, string> = {
  national: "bg-[#0F2340]",
  state: "bg-[#243E6B]",
  district: "bg-[#2E4A7A]",
  tehsil: "bg-[#4A6FA5]",
  field: "bg-[#5B7FB8]",
};

const TYPE_FOR_LEVEL: Record<string, UiNode["type"]> = {
  national: "national",
  state: "state",
  district: "district",
  tehsil: "tehsil",
  village: "field",
};

function buildNode(jurisdiction: JurisdictionTreeNode, attentionByJuris: Map<string, number>): UiNode {
  const children = (jurisdiction.children ?? []).map((child) => buildNode(child, attentionByJuris));
  const attentionDirect = attentionByJuris.get(jurisdiction.id) ?? 0;
  return {
    id: jurisdiction.id,
    label: jurisdiction.name,
    type: TYPE_FOR_LEVEL[jurisdiction.level] ?? "field",
    children,
    projects: jurisdiction.projectCount + children.reduce((sum, child) => sum + (child.projects ?? 0), 0),
    attention: attentionDirect + children.reduce((sum, child) => sum + (child.attention ?? 0), 0),
    officials: jurisdiction.officials,
  };
}

function TreeNode({
  node,
  level = 0,
  selectedId,
  onSelect,
}: {
  node: UiNode;
  level?: number;
  selectedId: string | null;
  onSelect: (node: UiNode) => void;
}) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const Icon = TYPE_ICON[node.type] ?? Building2;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          isSelected ? "bg-[#0F2340] text-white" : "hover:bg-slate-100 text-slate-700"
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${TYPE_COLORS[node.type]} ${isSelected ? "text-white" : "text-white"}`}>
          <Icon className="h-3 w-3" />
        </span>
        <span className="truncate flex-1">{node.label}</span>
        {node.projects !== undefined && (
          <span className={`text-[10px] ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>{node.projects} projects</span>
        )}
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchyViewPage() {
  const [selectedNode, setSelectedNode] = useState<UiNode | null>(null);

  const { data: roots, error, reload } = useRequiredApi(async () => {
    const [tree, projects] = await Promise.all([getJurisdictionTree(), listProjects({ limit: 200 })]);
    const attentionByJuris = new Map<string, number>();
    for (const project of projects.items) {
      if ((project.risk === "critical" || project.risk === "high") && project.jurisdictionId) {
        attentionByJuris.set(project.jurisdictionId, (attentionByJuris.get(project.jurisdictionId) ?? 0) + 1);
      }
    }
    return tree.items.map((jurisdiction) => buildNode(jurisdiction, attentionByJuris));
  }, []);

  if (error && !roots) {
    return (
      <div className="space-y-5">
        <ApiErrorState error={error} onRetry={reload} label="Unable to load the jurisdiction hierarchy." />
      </div>
    );
  }
  if (!roots) {
    return (
      <div className="space-y-5">
        <ApiLoadingState label="Loading hierarchy…" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#0F2340]">Hierarchy View</h1>
          <p className="text-xs text-muted-foreground">Jurisdiction hierarchy — National → State → District → Tehsil → Village</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Tree */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Jurisdiction Tree</CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[700px] overflow-auto">
            {roots.map((root) => (
              <TreeNode
                key={root.id}
                node={root}
                selectedId={selectedNode?.id ?? null}
                onSelect={setSelectedNode}
              />
            ))}
            {roots.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No jurisdictions recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Node Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-6 h-6 rounded flex items-center justify-center ${TYPE_COLORS[selectedNode.type]} text-white`}>
                        {(() => { const I = TYPE_ICON[selectedNode.type] ?? Building2; return <I className="h-3.5 w-3.5" />; })()}
                      </span>
                      <Badge variant="secondary" className="text-[10px] uppercase">{selectedNode.type}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-[#0F2340]">{selectedNode.label}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-[10px] text-muted-foreground">Active Projects</p>
                      <p className="text-lg font-bold text-[#0F2340]">{selectedNode.projects ?? 0}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-[10px] text-muted-foreground">Needs Attention</p>
                      <p className="text-lg font-bold text-amber-600">{selectedNode.attention ?? 0}</p>
                    </div>
                  </div>

                  {selectedNode.officials && selectedNode.officials.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Responsible Officials</p>
                      {selectedNode.officials.map((off, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-700 py-1">
                          <Users className="h-3.5 w-3.5 mt-0.5 text-slate-500 shrink-0" />
                          <span>{off}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedNode.children && selectedNode.children.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Child Authorities ({selectedNode.children.length})</p>
                      {selectedNode.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedNode(child)}
                          className="w-full text-left flex items-center gap-2 text-xs text-slate-700 py-1 hover:text-[#0F2340]"
                        >
                          <ChevronRight className="h-3 w-3" />
                          <span>{child.label}</span>
                          <span className="text-muted-foreground ml-auto">{child.projects} projects</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a node to view details</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Click any node in the hierarchy tree</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
