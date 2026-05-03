import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SuperLeads() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('ALL');

  const { data: leads, isLoading } = useQuery<any[]>({
    queryKey: ['super', 'leads', filter],
    queryFn: () => apiFetch(`/super/leads${filter !== 'ALL' ? `?filter=${filter}` : ''}`),
  });

  const markContacted = useMutation({
    mutationFn: (id: string) => apiFetch(`/super/leads/${id}/contacted`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super', 'leads'] });
      toast.success('Lead marked as contacted');
    },
  });

  return (
    <PageWrapper>
      <PageHeader title="Leads" actions={<Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-48 bg-black/20"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="CONTACTED">Contacted</SelectItem></SelectContent></Select>} />
      <div className="glass-card p-6 border-white/5">
        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div> : <div className="rounded-md border border-white/10 overflow-hidden"><Table><TableHeader className="bg-black/20"><TableRow className="border-white/10"><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Gym</TableHead><TableHead>City</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{leads?.map((lead: any) => (<TableRow key={lead.id} className="border-white/10"><TableCell>{lead.fullName}</TableCell><TableCell>{lead.phoneNumber}</TableCell><TableCell>{lead.gymName}</TableCell><TableCell>{lead.city}</TableCell><TableCell>{format(new Date(lead.createdAt), 'PP')}</TableCell><TableCell>{lead.contacted ? 'Contacted' : 'Pending'}</TableCell><TableCell className="text-right">{!lead.contacted && <Button size="sm" onClick={() => markContacted.mutate(lead.id)} disabled={markContacted.isPending}>{markContacted.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Mark as Contacted</Button>}</TableCell></TableRow>))}{leads?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No leads yet</TableCell></TableRow>}</TableBody></Table></div>}
      </div>
    </PageWrapper>
  );
}
