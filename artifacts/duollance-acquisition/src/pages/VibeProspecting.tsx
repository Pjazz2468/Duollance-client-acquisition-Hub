import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiUrl } from "@/lib/api";
import { Loader2, Building2, User, Mail, Linkedin, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  { value: "software development", label: "Software Development" },
  { value: "information technology and services", label: "IT & Services" },
  { value: "internet", label: "Internet / Tech" },
  { value: "marketing and advertising", label: "Marketing & Advertising" },
  { value: "design", label: "Design" },
  { value: "staffing and recruiting", label: "Staffing & Recruiting" },
  { value: "e-learning", label: "E-Learning" },
  { value: "financial services", label: "Financial Services" },
];

const COMPANY_SIZES = [
  { value: "1-10", label: "1–10 (Micro)" },
  { value: "11-50", label: "11–50 (Small)" },
  { value: "51-200", label: "51–200 (Mid)" },
  { value: "201-500", label: "201–500 (Growth)" },
];

const COUNTRIES = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "ng", label: "Nigeria" },
  { value: "za", label: "South Africa" },
];

type Business = {
  business_id: string;
  name: string;
  domain?: string;
  country_name?: string;
  number_of_employees_range?: string;
  linkedin_category?: string;
  linkedin_url?: string;
  prospects?: Prospect[];
  loadingProspects?: boolean;
};

type Prospect = {
  prospect_id: string;
  full_name: string;
  job_title?: string;
  job_department?: string;
  linkedin_url?: string;
  email?: string;
  imported?: boolean;
  enriching?: boolean;
};

export default function VibeProspecting() {
  const { toast } = useToast();
  const [industry, setIndustry] = useState("software development");
  const [companySize, setCompanySize] = useState("11-50");
  const [country, setCountry] = useState("us");
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  async function search() {
    setLoading(true);
    setBusinesses([]);
    try {
      const res = await fetch(getApiUrl("/vibe/search"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ industry, company_size: companySize, country_code: country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setBusinesses(data.data || []);
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function loadProspects(business: Business) {
    setBusinesses(prev => prev.map(b => b.business_id === business.business_id ? { ...b, loadingProspects: true } : b));
    try {
      const res = await fetch(getApiUrl("/vibe/prospects"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ business_ids: [business.business_id] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load prospects");
      setBusinesses(prev => prev.map(b => b.business_id === business.business_id
        ? { ...b, prospects: data.data || [], loadingProspects: false }
        : b));
    } catch (err: any) {
      toast({ title: "Failed to load prospects", description: err.message, variant: "destructive" });
      setBusinesses(prev => prev.map(b => b.business_id === business.business_id ? { ...b, loadingProspects: false } : b));
    }
  }

  async function enrichProspect(business: Business, prospect: Prospect) {
    setBusinesses(prev => prev.map(b => b.business_id === business.business_id ? {
      ...b, prospects: b.prospects?.map(p => p.prospect_id === prospect.prospect_id ? { ...p, enriching: true } : p)
    } : b));
    try {
      const res = await fetch(getApiUrl("/vibe/enrich"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prospect_id: prospect.prospect_id }),
      });
      const data = await res.json();
      const email = data.data?.emails?.[0] || data.data?.professions_email;
      setBusinesses(prev => prev.map(b => b.business_id === business.business_id ? {
        ...b, prospects: b.prospects?.map(p => p.prospect_id === prospect.prospect_id
          ? { ...p, email, enriching: false }
          : p)
      } : b));
    } catch (err: any) {
      toast({ title: "Enrichment failed", description: err.message, variant: "destructive" });
    }
  }

  async function importLead(business: Business, prospect: Prospect) {
    try {
      const res = await fetch(getApiUrl("/vibe/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companyName: business.name,
          contactName: prospect.full_name,
          contactTitle: prospect.job_title,
          contactEmail: prospect.email,
          contactLinkedIn: prospect.linkedin_url,
          companySize: business.number_of_employees_range,
          industry: business.linkedin_category,
          sourceUrl: business.linkedin_url || business.domain,
          fitScore: 75,
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      setBusinesses(prev => prev.map(b => b.business_id === business.business_id ? {
        ...b, prospects: b.prospects?.map(p => p.prospect_id === prospect.prospect_id ? { ...p, imported: true } : p)
      } : b));
      toast({ title: "Lead imported!", description: `${prospect.full_name} from ${business.name}` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vibe Prospecting</h1>
        <p className="text-sm text-muted-foreground">Find companies needing digital talent — powered by Explorium's 800M+ contact database.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Search Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Industry</label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Company Size</label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Country</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-4" onClick={search} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching...</> : "Find Companies"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {businesses.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{businesses.length} companies found</p>
          {businesses.map(business => (
            <Card key={business.business_id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{business.name}</span>
                      {business.domain && <span className="text-xs text-muted-foreground">{business.domain}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {business.linkedin_category && <Badge variant="secondary">{business.linkedin_category}</Badge>}
                      {business.number_of_employees_range && <Badge variant="outline">{business.number_of_employees_range} employees</Badge>}
                      {business.country_name && <span className="text-xs text-muted-foreground capitalize">{business.country_name}</span>}
                    </div>
                  </div>
                  {!business.prospects && (
                    <Button size="sm" variant="outline" onClick={() => loadProspects(business)} disabled={business.loadingProspects}>
                      {business.loadingProspects ? <Loader2 className="h-3 w-3 animate-spin" /> : "Find Contacts"}
                    </Button>
                  )}
                </div>

                {/* Prospects */}
                {business.prospects && business.prospects.length > 0 && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    {business.prospects.map(prospect => (
                      <div key={prospect.prospect_id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{prospect.full_name}</span>
                            {prospect.job_title && <span className="text-xs text-muted-foreground">· {prospect.job_title}</span>}
                          </div>
                          {prospect.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />{prospect.email}
                            </div>
                          )}
                          {prospect.linkedin_url && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Linkedin className="h-3 w-3" />LinkedIn profile
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!prospect.email && (
                            <Button size="sm" variant="outline" onClick={() => enrichProspect(business, prospect)} disabled={prospect.enriching}>
                              {prospect.enriching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Get Email"}
                            </Button>
                          )}
                          {prospect.imported ? (
                            <div className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3 w-3" />Imported</div>
                          ) : (
                            <Button size="sm" onClick={() => importLead(business, prospect)}>Import Lead</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {business.prospects && business.prospects.length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">No decision-maker contacts found for this company.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && businesses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>Set your filters and click "Find Companies" to start prospecting.</p>
        </div>
      )}
    </div>
  );
}
