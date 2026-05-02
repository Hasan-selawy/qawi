import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Dumbbell, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Templates() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery<any[]>({
    queryKey: ['templates'],
    queryFn: () => apiFetch('/templates'),
  });

  const { data: members } = useQuery<any[]>({
    queryKey: ['coach', 'members'],
    queryFn: () => apiFetch('/coach/members'),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiFetch(`/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    },
  });

  const applyTemplate = useMutation({
    mutationFn: (data: any) => apiFetch('/workouts/from-template', { method: 'POST', data }),
    onSuccess: () => toast.success('Template applied to member successfully'),
    onError: (err: any) => toast.error(lang === 'ar' ? err.messageAr : err.error || 'Failed'),
  });

  const createTemplate = useMutation({
    mutationFn: (data: any) => apiFetch('/templates', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created');
    },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  return (
    <PageWrapper>
      <PageHeader
        title={t('common.templates')}
        actions={
          <Dialog>
            <DialogTrigger asChild><Button className="glow-hover"><Plus className="mr-2 h-4 w-4" /> New Template</Button></DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-md">
              <DialogHeader><DialogTitle>Quick Template Create</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  createTemplate.mutate({
                    name: fd.get('name'),
                    nameAr: fd.get('nameAr'),
                    description: fd.get('description'),
                  });
                }}
                className="space-y-4"
              >
                <Input name="name" placeholder="Template Name" required className="bg-black/20" />
                <Input name="nameAr" placeholder="Template Name (Arabic)" className="bg-black/20" dir="rtl" />
                <Input name="description" placeholder="Description" className="bg-black/20" />
                <Button type="submit" className="w-full" disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? <Loader2 className="animate-spin" /> : 'Create Template'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates?.map((tpl: any) => (
            <div key={tpl.id} className="glass-card flex flex-col hover:-translate-y-1 transition-transform overflow-hidden border border-white/5">
              <div className="p-6 pb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 text-primary">
                  <Dumbbell size={24} />
                </div>
                <h3 className="text-xl font-bold mb-1">{lang === 'ar' ? (tpl.nameAr || tpl.name) : tpl.name}</h3>
                {tpl.description && <p className="text-xs text-muted-foreground mt-2">{tpl.description}</p>}
                <p className="text-xs text-muted-foreground mt-3">Created {tpl.createdAt ? format(new Date(tpl.createdAt), 'PP') : '-'}</p>
              </div>

              <div className="border-t border-white/10 mt-auto bg-black/10 p-3 flex gap-2">
                <Dialog>
                  <DialogTrigger asChild><Button variant="secondary" className="flex-1 text-xs h-8">Use</Button></DialogTrigger>
                  <DialogContent className="glass-card border-white/10">
                    <DialogHeader><DialogTitle>Apply Template: {tpl.name}</DialogTitle></DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        applyTemplate.mutate({ templateId: tpl.id, memberId: fd.get('memberId'), startDate: fd.get('startDate') });
                      }}
                      className="space-y-4"
                    >
                      <Select name="memberId" required>
                        <SelectTrigger className="bg-black/20"><SelectValue placeholder="Select Member" /></SelectTrigger>
                        <SelectContent>
                          {members?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input name="startDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="bg-black/20" />
                      <Button type="submit" className="w-full" disabled={applyTemplate.isPending}>
                        {applyTemplate.isPending ? <Loader2 className="animate-spin" /> : 'Apply to Member'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/20"
                  onClick={() => { if (confirm('Delete template?')) deleteTemplate.mutate(tpl.id); }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
          {templates?.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground glass-card border-dashed">
              No templates available. Create one to save time.
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
