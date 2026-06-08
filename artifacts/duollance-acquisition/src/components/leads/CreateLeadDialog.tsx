import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateLead, useScoreLead, getListLeadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Wand2 } from "lucide-react";

const leadFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactTitle: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactLinkedIn: z.string().url("Invalid URL").optional().or(z.literal("")),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  source: z.string().min(1, "Source is required"),
  sourceUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  sourceContext: z.string().optional(),
  painPoint: z.string().min(1, "Pain point is required"),
  fitScore: z.coerce.number().min(1).max(100),
  notes: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

export default function CreateLeadDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createLead = useCreateLead();
  const scoreLead = useScoreLead();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      contactTitle: "",
      contactEmail: "",
      contactLinkedIn: "",
      companySize: "",
      industry: "",
      source: "manual",
      sourceUrl: "",
      sourceContext: "",
      painPoint: "other",
      fitScore: 50,
      notes: "",
    },
  });

  const onSubmit = (data: LeadFormValues) => {
    createLead.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        toast({ title: "Lead created successfully" });
        setOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({ title: "Failed to create lead", variant: "destructive" });
      }
    });
  };

  const handleScoreLead = async () => {
    const values = form.getValues();
    if (!values.companyName || !values.painPoint || !values.sourceContext) {
      toast({ 
        title: "Missing fields", 
        description: "Please fill in Company Name, Source Context, and Pain Point to score.",
        variant: "destructive"
      });
      return;
    }

    scoreLead.mutate({
      data: {
        companyName: values.companyName,
        sourceContext: values.sourceContext,
        painPoint: values.painPoint,
        industry: values.industry
      }
    }, {
      onSuccess: (data) => {
        form.setValue("fitScore", data.score);
        form.setValue("painPoint", data.painPointCategory);
        toast({ 
          title: "AI Score Generated", 
          description: `Score: ${data.score}. Reason: ${data.reasoning}`
        });
      },
      onError: () => {
        toast({ title: "Failed to generate AI score", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter lead details or use AI to score based on context.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="Software" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Title</FormLabel>
                    <FormControl>
                      <Input placeholder="CEO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="reddit">Reddit</SelectItem>
                        <SelectItem value="producthunt">Product Hunt</SelectItem>
                        <SelectItem value="indiehackers">Indie Hackers</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="painPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pain Point</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a pain point" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cost">Cost</SelectItem>
                        <SelectItem value="reliability">Reliability</SelectItem>
                        <SelectItem value="speed">Speed</SelectItem>
                        <SelectItem value="vetting">Vetting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sourceContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Context (Required for AI Score)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Paste the post or comment here..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-end gap-4">
              <FormField
                control={form.control}
                name="fitScore"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Fit Score (1-100)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleScoreLead}
                disabled={scoreLead.isPending}
                className="mb-0.5"
              >
                {scoreLead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Score with AI
              </Button>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLead.isPending}>
                {createLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Lead
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
