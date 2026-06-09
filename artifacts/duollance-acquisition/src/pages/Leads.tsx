import { useState } from "react";
import { useListLeads, useDeleteLead, useApproveLead, getListLeadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SiReddit, SiX, SiProducthunt, SiIndiehackers } from "react-icons/si";
import { Search, Plus, Trash2, CheckCircle, ExternalLink, Loader2, Linkedin } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import CreateLeadDialog from "@/components/leads/CreateLeadDialog";

export function SourceIcon({ source }: { source: string }) {
  switch (source.toLowerCase()) {
    case 'reddit': return <SiReddit className="h-4 w-4 text-orange-500" />;
    case 'linkedin': return <Linkedin className="h-4 w-4 text-blue-600" />;
    case 'twitter': return <SiX className="h-4 w-4 text-gray-900 dark:text-white" />;
    case 'producthunt': return <SiProducthunt className="h-4 w-4 text-orange-600" />;
    case 'indiehackers': return <SiIndiehackers className="h-4 w-4 text-blue-900" />;
    default: return <ExternalLink className="h-4 w-4 text-gray-500" />;
  }
}

export function FitScoreBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">{score}</Badge>;
  if (score >= 50) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">{score}</Badge>;
  return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">{score}</Badge>;
}

export function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    discovered: "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200",
    contacted: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
    in_discussion: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
    onboarded: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200",
    rejected: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200"
  };
  
  return (
    <Badge variant="outline" className={styles[stage] || styles.discovered}>
      {stage.replace('_', ' ').toUpperCase()}
    </Badge>
  );
}

export default function Leads() {
  const [search, setSearch] = useState("");
  const { data: leads, isLoading } = useListLeads({ search: search || undefined });
  const deleteLead = useDeleteLead();
  const approveLead = useApproveLead();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteLead.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          toast({ title: "Lead deleted" });
        }
      });
    }
  };

  const handleApprove = (id: number) => {
    approveLead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        toast({ title: "Lead approved" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">Manage and qualify your potential clients.</p>
        </div>
        <CreateLeadDialog />
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search leads..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Fit Score</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading leads...
                </TableCell>
              </TableRow>
            ) : leads?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              leads?.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{lead.companyName}</div>
                    <div className="text-xs text-muted-foreground">{lead.industry}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{lead.contactName}</div>
                    <div className="text-xs text-muted-foreground">{lead.contactTitle}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <SourceIcon source={lead.source} />
                      <span className="text-sm capitalize">{lead.source}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <FitScoreBadge score={lead.fitScore} />
                  </TableCell>
                  <TableCell>
                    <StageBadge stage={lead.stage} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {!lead.approved && (
                      <Button variant="outline" size="sm" onClick={() => handleApprove(lead.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    )}
                    <Link href={`/leads/${lead.id}`}>
                      <Button variant="secondary" size="sm">View</Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(lead.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
