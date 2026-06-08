import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetLead, 
  useUpdateLeadStage, 
  useGeneratePitch, 
  useCreateOutreach, 
  useListOutreach,
  getGetLeadQueryKey,
  getListOutreachQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Wand2, Send, Clock, Building, User, Mail, Linkedin, Link as LinkIcon, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FitScoreBadge, StageBadge, SourceIcon } from "./Leads";
import { format } from "date-fns";

export default function LeadDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading: leadLoading } = useGetLead(id, { query: { enabled: !!id, queryKey: getGetLeadQueryKey(id) } });
  const { data: outreachHistory, isLoading: outreachLoading } = useListOutreach({ leadId: id }, { query: { enabled: !!id, queryKey: getListOutreachQueryKey({ leadId: id }) } });
  
  const updateStage = useUpdateLeadStage();
  const generatePitch = useGeneratePitch();
  const createOutreach = useCreateOutreach();

  const [messageContent, setMessageContent] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("email");

  const handleStageChange = (newStage: string) => {
    updateStage.mutate({ id, data: { stage: newStage } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
        toast({ title: "Stage updated" });
      }
    });
  };

  const handleGeneratePitch = () => {
    generatePitch.mutate({ data: { leadId: id, channel: selectedChannel } }, {
      onSuccess: (res) => {
        setMessageContent(res.pitch);
        toast({ title: "Pitch generated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to generate pitch", variant: "destructive" });
      }
    });
  };

  const handleSendOutreach = () => {
    if (!messageContent.trim()) {
      toast({ title: "Message cannot be empty", variant: "destructive" });
      return;
    }

    createOutreach.mutate({ data: { leadId: id, channel: selectedChannel, message: messageContent, status: "sent" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOutreachQueryKey({ leadId: id }) });
        setMessageContent("");
        toast({ title: "Outreach logged successfully" });
      }
    });
  };

  if (leadLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) return <div>Lead not found.</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center space-x-3">
              <span>{lead.companyName}</span>
              <FitScoreBadge score={lead.fitScore} />
            </h1>
            <p className="text-sm text-muted-foreground">{lead.industry} • {lead.companySize} employees</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-muted-foreground">Current Stage:</span>
            <Select value={lead.stage} onValueChange={handleStageChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discovered">Discovered</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="in_discussion">In Discussion</SelectItem>
                <SelectItem value="onboarded">Onboarded</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{lead.contactName}</div>
                  <div className="text-xs text-muted-foreground">{lead.contactTitle}</div>
                </div>
              </div>
              
              {lead.contactEmail && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.contactEmail}`} className="text-sm text-primary hover:underline">{lead.contactEmail}</a>
                </div>
              )}
              
              {lead.contactLinkedIn && (
                <div className="flex items-center space-x-3">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  <a href={lead.contactLinkedIn} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">LinkedIn Profile</a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Source Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <SourceIcon source={lead.source} />
                  <span className="text-sm font-medium capitalize">{lead.source}</span>
                </div>
                {lead.sourceUrl && (
                  <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="text-primary">
                    <LinkIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pain Point</div>
                <Badge variant="outline" className="capitalize">{lead.painPoint}</Badge>
              </div>

              {lead.sourceContext && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Context</div>
                  <p className="text-sm text-foreground bg-muted p-3 rounded-md italic">"{lead.sourceContext}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Outreach</CardTitle>
              <CardDescription>Draft and send messages to {lead.contactName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">Twitter / X</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="secondary" 
                  onClick={handleGeneratePitch} 
                  disabled={generatePitch.isPending}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 border"
                >
                  {generatePitch.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  Generate AI Pitch
                </Button>
              </div>

              <Textarea 
                placeholder="Type your message here, or generate an AI pitch..." 
                className="min-h-[200px] resize-y"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />

              <div className="flex justify-end">
                <Button onClick={handleSendOutreach} disabled={createOutreach.isPending || !messageContent.trim()}>
                  {createOutreach.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Log as Sent
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {outreachLoading ? (
                <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : outreachHistory && outreachHistory.length > 0 ? (
                <div className="space-y-6">
                  {outreachHistory.map((msg) => (
                    <div key={msg.id} className="relative pl-6 border-l-2 border-border pb-6 last:pb-0">
                      <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 ring-4 ring-background"></div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="capitalize text-xs">{msg.channel}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No outreach history yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
