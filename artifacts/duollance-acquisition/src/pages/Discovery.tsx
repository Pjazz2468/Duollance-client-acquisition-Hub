import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  Loader2,
  Flame,
  Thermometer,
  Snowflake,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Triangle,
  MessageSquare,
  Linkedin,
} from "lucide-react";
import { SiReddit } from "react-icons/si";
import { formatDistanceToNow } from "date-fns";
import { getApiUrl } from "@/lib/api";

interface DiscoveredPost {
  hnId: string;
  title: string;
  body: string;
  author: string;
  url: string;
  source: string;
  platform: "hn" | "reddit" | "twitter" | "linkedin";
  type: "story" | "ask_hn" | "comment" | "show_hn" | "post" | "tweet";
  createdAt: number;
  points: number;
  fitScore: number | null;
  painPoint: string | null;
  companyHint: string | null;
  reasoning: string | null;
  qualificationStatus: "hot" | "warm" | "cold" | "pending";
}

interface FeedResponse {
  posts: DiscoveredPost[];
  total: number;
  fetchedAt: string;
  sources?: { hn: number; reddit: number; twitter: number; linkedin: number };
}

function useDiscoveryFeed() {
  return useQuery<FeedResponse>({
    queryKey: ["discovery-feed"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/discovery/feed"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch discovery feed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

function useImportLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (post: DiscoveredPost) => {
      const res = await fetch(getApiUrl("/discovery/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(post),
      });
      if (!res.ok) throw new Error("Failed to import lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

function QualificationBadge({ status, score }: { status: DiscoveredPost["qualificationStatus"]; score: number | null }) {
  if (status === "hot")
    return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 font-semibold"><Flame className="h-3 w-3" /> Hot {score !== null ? `· ${score}` : ""}</Badge>;
  if (status === "warm")
    return <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1 font-semibold"><Thermometer className="h-3 w-3" /> Warm {score !== null ? `· ${score}` : ""}</Badge>;
  if (status === "cold")
    return <Badge className="bg-slate-100 text-slate-500 border-slate-200 gap-1"><Snowflake className="h-3 w-3" /> Cold {score !== null ? `· ${score}` : ""}</Badge>;
  return <Badge className="bg-gray-100 text-gray-500 border-gray-200 gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
}

function PainPointChip({ painPoint }: { painPoint: string | null }) {
  if (!painPoint) return null;
  const styles: Record<string, string> = {
    cost: "bg-violet-100 text-violet-700 border-violet-200",
    reliability: "bg-blue-100 text-blue-700 border-blue-200",
    speed: "bg-yellow-100 text-yellow-700 border-yellow-200",
    vetting: "bg-green-100 text-green-700 border-green-200",
    other: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return <Badge variant="outline" className={`text-xs capitalize ${styles[painPoint] || styles.other}`}>{painPoint}</Badge>;
}

function SourceBadge({ platform, source }: { platform: DiscoveredPost["platform"]; source: string }) {
  if (platform === "reddit")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500">
        <SiReddit className="h-3 w-3" /> {source}
      </span>
    );
  if (platform === "twitter")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800">
        <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.736l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        {source}
      </span>
    );
  if (platform === "linkedin")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
        <Linkedin className="h-3 w-3" /> {source}
      </span>
    );
  // HN
  const color = source === "Ask HN" ? "text-blue-600" : source === "HN Comment" ? "text-purple-500" : "text-orange-500";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Triangle className="h-3 w-3 fill-current" /> {source}
    </span>
  );
}

function PostCard({ post, imported, onImport, importing }: {
  post: DiscoveredPost;
  imported: boolean;
  onImport: () => void;
  importing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = post.body && post.body.length > 10;

  return (
    <Card className={`transition-all border ${
      post.qualificationStatus === "hot" ? "border-red-200 shadow-sm shadow-red-50"
      : post.qualificationStatus === "warm" ? "border-orange-200" : "border-border"
    } ${imported ? "opacity-60" : ""}`}>
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <QualificationBadge status={post.qualificationStatus} score={post.fitScore} />
              <PainPointChip painPoint={post.painPoint} />
              <SourceBadge platform={post.platform ?? "hn"} source={post.source} />
            </div>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm text-foreground hover:text-primary transition-colors leading-snug line-clamp-2 flex items-start gap-1 group"
            >
              {post.title}
              <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
            </a>
          </div>

          {imported ? (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4" /> Imported
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="whitespace-nowrap text-xs gap-1.5 hover:bg-primary hover:text-white hover:border-primary transition-colors"
              onClick={onImport}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpRight className="h-3 w-3" />}
              Import Lead
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-4 space-y-3">
        {post.reasoning && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 border border-border/50 italic">
            {post.reasoning}
          </div>
        )}
        {post.companyHint && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Company signal:</span> {post.companyHint}
          </div>
        )}
        {hasBody && (
          <div>
            <p className={`text-xs text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
              {post.body}
            </p>
            {post.body.length > 200 && (
              <button
                className="mt-1 flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show more</>}
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <span className="font-medium">{post.author}</span>
          {post.points > 0 && (
            <><span>·</span><span>{post.points} pts</span></>
          )}
          <span>·</span>
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:text-foreground transition-colors">
            <MessageSquare className="h-3 w-3" /> View post
          </a>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(post.createdAt * 1000), { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
] as const;

const PLATFORM_OPTIONS = [
  { value: "all", label: "All platforms" },
  { value: "hn", label: "Hacker News" },
  { value: "reddit", label: "Reddit" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
] as const;

export default function Discovery() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useDiscoveryFeed();
  const importMutation = useImportLead();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | "hn" | "reddit" | "twitter" | "linkedin">("all");
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const posts = data?.posts ?? [];
  const filtered = posts.filter((p) => {
    const statusOk = filter === "all" || p.qualificationStatus === filter;
    const platformOk = platformFilter === "all" || (p.platform ?? "hn") === platformFilter;
    return statusOk && platformOk;
  });

  const counts = {
    all: posts.length,
    hot: posts.filter((p) => p.qualificationStatus === "hot").length,
    warm: posts.filter((p) => p.qualificationStatus === "warm").length,
    cold: posts.filter((p) => p.qualificationStatus === "cold").length,
  };

  const sources = data?.sources;

  async function handleImport(post: DiscoveredPost) {
    try {
      await importMutation.mutateAsync(post);
      setImportedIds((prev) => new Set([...prev, post.hnId]));
      toast({ title: "Lead imported", description: `"${post.title.slice(0, 60)}…" added to your leads pipeline.` });
    } catch {
      toast({ title: "Import failed", description: "Could not import lead. Please try again.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Discovery</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-qualified signals from Hacker News, Reddit, X, and LinkedIn — ranked by fit score.
          </p>
          {sources && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {sources.hn > 0 && <span className="text-xs text-orange-500 font-medium">▲ {sources.hn} HN</span>}
              {sources.reddit > 0 && <span className="text-xs text-orange-600 font-medium">r/ {sources.reddit} Reddit</span>}
              {sources.twitter > 0 && <span className="text-xs text-gray-700 font-medium">𝕏 {sources.twitter} X</span>}
              {sources.linkedin > 0 && <span className="text-xs text-blue-600 font-medium">in {sources.linkedin} LinkedIn</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Updated {formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Scanning..." : "Refresh Feed"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium text-foreground">Scanning all platforms for leads…</p>
            <p className="text-sm mt-1">Fetching from HN, Reddit, X, and LinkedIn, then qualifying with AI. Takes ~15s.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList>
                  {FILTER_OPTIONS.map((opt) => (
                    <TabsTrigger key={opt.value} value={opt.value} className="gap-2">
                      {opt.label}
                      <span className="ml-1 text-xs font-mono bg-muted rounded px-1.5 py-0.5 text-muted-foreground">{counts[opt.value]}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Tabs value={platformFilter} onValueChange={(v) => setPlatformFilter(v as typeof platformFilter)}>
                <TabsList className="h-8">
                  {PLATFORM_OPTIONS.map((opt) => (
                    <TabsTrigger key={opt.value} value={opt.value} className="text-xs px-2 py-1 h-7">
                      {opt.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            {importedIds.size > 0 && (
              <span className="text-xs text-green-600 font-medium">
                {importedIds.size} lead{importedIds.size !== 1 ? "s" : ""} imported this session
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Triangle className="h-10 w-10 mx-auto mb-3 text-orange-300 fill-orange-200" />
              <p className="font-medium text-foreground">No {filter !== "all" ? filter : ""} signals found</p>
              <p className="text-sm mt-1">Try refreshing the feed or switching the platform filter.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((post) => (
                <PostCard
                  key={post.hnId}
                  post={post}
                  imported={importedIds.has(post.hnId)}
                  onImport={() => handleImport(post)}
                  importing={importMutation.isPending && (importMutation.variables as DiscoveredPost)?.hnId === post.hnId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
