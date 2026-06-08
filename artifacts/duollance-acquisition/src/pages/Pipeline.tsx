import { useListLeads, useUpdateLeadStage, getListLeadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FitScoreBadge } from "./Leads";
import { Link } from "wouter";
import { Loader2, ArrowRight, AlertTriangle, CalendarCheck } from "lucide-react";
import { isPast, isToday, format } from "date-fns";

function FollowUpIndicator({ followUpAt }: { followUpAt: string | null }) {
  if (!followUpAt) return null;
  const date = new Date(followUpAt);
  const overdue = isPast(date) && !isToday(date);
  const dueToday = isToday(date);
  if (!overdue && !dueToday) return null;

  return (
    <div className={`flex items-center gap-1 text-xs font-medium mt-1.5 ${overdue ? "text-red-600" : "text-orange-600"}`}>
      {overdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarCheck className="h-3 w-3" />}
      {overdue ? `Overdue: ${format(date, "MMM d")}` : "Follow-up today"}
    </div>
  );
}

export default function Pipeline() {
  const { data: leads, isLoading } = useListLeads();
  const updateStage = useUpdateLeadStage();
  const queryClient = useQueryClient();

  const stages = [
    { id: "discovered", label: "Discovered", color: "border-gray-200 bg-gray-50" },
    { id: "contacted", label: "Contacted", color: "border-blue-200 bg-blue-50" },
    { id: "in_discussion", label: "In Discussion", color: "border-orange-200 bg-orange-50" },
    { id: "onboarded", label: "Onboarded", color: "border-green-200 bg-green-50" }
  ];

  const handleMoveStage = (leadId: number, currentStage: string) => {
    const currentIndex = stages.findIndex(s => s.id === currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1].id;
      updateStage.mutate({ id: leadId, data: { stage: nextStage } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        }
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const overdueCount = leads?.filter(l => {
    if (!l.followUpAt) return false;
    const d = new Date(l.followUpAt);
    return isPast(d) && !isToday(d);
  }).length ?? 0;

  const dueTodayCount = leads?.filter(l => {
    if (!l.followUpAt) return false;
    return isToday(new Date(l.followUpAt));
  }).length ?? 0;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Track leads through your acquisition funnel.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueCount} overdue follow-up{overdueCount !== 1 ? "s" : ""}
            </div>
          )}
          {dueTodayCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
              <CalendarCheck className="h-3.5 w-3.5" />
              {dueTodayCount} due today
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = leads?.filter(l => l.stage === stage.id) || [];
          const stageOverdue = stageLeads.filter(l => {
            if (!l.followUpAt) return false;
            const d = new Date(l.followUpAt);
            return isPast(d) && !isToday(d);
          }).length;

          return (
            <div key={stage.id} className={`flex flex-col rounded-xl border ${stage.color} min-w-[280px]`}>
              <div className="p-4 border-b border-border/50 bg-white/50 backdrop-blur-sm rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  {stageOverdue > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      {stageOverdue}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-background border">{stageLeads.length}</span>
              </div>

              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {stageLeads.map((lead) => {
                  const hasFollowUp = !!lead.followUpAt;
                  const isOverdue = hasFollowUp && isPast(new Date(lead.followUpAt!)) && !isToday(new Date(lead.followUpAt!));

                  return (
                    <div
                      key={lead.id}
                      className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group relative ${isOverdue ? "border-red-200 ring-1 ring-red-100" : ""}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-sm hover:underline hover:text-primary">
                          {lead.companyName}
                        </Link>
                        <FitScoreBadge score={lead.fitScore} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lead.contactName}
                      </div>
                      <FollowUpIndicator followUpAt={lead.followUpAt ?? null} />

                      {stage.id !== 'onboarded' && (
                        <button
                          onClick={() => handleMoveStage(lead.id, stage.id)}
                          disabled={updateStage.isPending}
                          className="mt-2 w-full flex items-center justify-center py-1.5 px-3 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors"
                        >
                          Move to next <ArrowRight className="ml-1.5 h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
