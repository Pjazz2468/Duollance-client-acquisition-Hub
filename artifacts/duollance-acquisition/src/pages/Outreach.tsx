import { useListOutreach } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Mail, MessageSquare, Twitter, Linkedin } from "lucide-react";
import { Link } from "wouter";

export function ChannelIcon({ channel }: { channel: string }) {
  switch (channel.toLowerCase()) {
    case 'email': return <Mail className="h-4 w-4 text-gray-500" />;
    case 'linkedin': return <Linkedin className="h-4 w-4 text-blue-600" />;
    case 'twitter': return <Twitter className="h-4 w-4 text-sky-500" />;
    case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-500" />;
    default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
  }
}

export default function Outreach() {
  const { data: messages, isLoading } = useListOutreach();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Outreach Log</h1>
        <p className="text-sm text-muted-foreground">History of all messages sent to leads.</p>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Message Snippet</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading outreach history...
                </TableCell>
              </TableRow>
            ) : messages?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No messages logged yet.
                </TableCell>
              </TableRow>
            ) : (
              messages?.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell>
                    <Link href={`/leads/${msg.leadId}`} className="text-sm font-medium hover:underline hover:text-primary">
                      Lead #{msg.leadId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <ChannelIcon channel={msg.channel} />
                      <span className="text-sm capitalize">{msg.channel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-md truncate text-muted-foreground">
                      {msg.message}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={msg.status === 'sent' ? 'default' : 'secondary'} className="capitalize">
                      {msg.status.replace('_', ' ')}
                    </Badge>
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
