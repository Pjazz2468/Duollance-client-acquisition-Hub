import { useListLeads, useUpdateLeadStage, getListLeadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FitScoreBadge } from "./Leads";
import { Link } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";

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

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Track leads through your acquisition funnel.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = leads?.filter(l => l.stage === stage.id) || [];
          
          return (
            <div key={stage.id} className={`flex flex-col rounded-xl border ${stage.color} min-w-[280px]`}>
              <div className="p-4 border-b border-border/50 bg-white/50 backdrop-blur-sm rounded-t-xl flex items-center justify-between">
                <h3 className="font-semibold text-sm">{stage.label}</h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-background border">{stageLeads.length}</span>
              </div>
              
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {stageLeads.map((lead) => (
                  <div key={lead.id} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group relative">
                    <div className="flex justify-between items-start mb-2">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-sm hover:underline hover:text-primary">
                        {lead.companyName}
                      </Link>
                      <FitScoreBadge score={lead.fitScore} />
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {lead.contactName}
                    </div>
                    
                    {stage.id !== 'onboarded' && (
                      <button 
                        onClick={() => handleMoveStage(lead.id, stage.id)}
                        disabled={updateStage.isPending}
                        className="w-full flex items-center justify-center py-1.5 px-3 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors"
                      >
                        Move to next <ArrowRight className="ml-1.5 h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
