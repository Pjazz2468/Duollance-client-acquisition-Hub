import { useGetDashboardStats, useGetPipelineSummary, useGetSourceBreakdown, useGetHotLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, MessageSquare, TrendingUp, Zap, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

function StatCard({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: any, description?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: pipeline, isLoading: pipelineLoading } = useGetPipelineSummary();
  const { data: sources, isLoading: sourcesLoading } = useGetSourceBreakdown();
  const { data: hotLeads, isLoading: leadsLoading } = useGetHotLeads();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your lead pipeline and acquisition metrics.</p>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Leads" value={stats.totalLeads} icon={Users} description={`${stats.newToday} new today`} />
          <StatCard title="Approved Leads" value={stats.approvedLeads} icon={UserCheck} />
          <StatCard title="In Discussion" value={stats.inDiscussion} icon={MessageSquare} />
          <StatCard title="Avg Fit Score" value={stats.avgFitScore.toFixed(1)} icon={TrendingUp} />
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Hot Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : hotLeads && hotLeads.length > 0 ? (
              <div className="space-y-4">
                {hotLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium text-sm">{lead.companyName}</div>
                      <div className="text-xs text-muted-foreground">{lead.contactName} • {lead.contactTitle}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant={lead.fitScore >= 80 ? "default" : lead.fitScore >= 50 ? "secondary" : "destructive"}>
                        {lead.fitScore} Fit
                      </Badge>
                      <Link href={`/leads/${lead.id}`} className="text-xs text-primary hover:underline">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-6">No hot leads available.</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Pipeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : pipeline ? (
              <div className="space-y-3">
                {pipeline.map((stage) => (
                  <div key={stage.stage} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{stage.stage.replace('_', ' ')}</span>
                    <span className="text-sm text-muted-foreground">{stage.count}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-semibold mb-3">Top Sources</h4>
              {sourcesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : sources ? (
                <div className="space-y-3">
                  {sources.slice(0, 3).map((source) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{source.source}</span>
                      <span className="text-sm text-muted-foreground">{source.count}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
