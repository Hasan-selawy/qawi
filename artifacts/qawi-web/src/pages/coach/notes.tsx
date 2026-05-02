import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CoachNotes() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [memberId, setMemberId] = useState<string>('');
  const [content, setContent] = useState('');

  const { data: members } = useQuery<any[]>({
    queryKey: ['coach', 'members'],
    queryFn: () => apiFetch('/coach/members'),
  });

  const { data: notes, isLoading } = useQuery<any[]>({
    queryKey: ['notes', 'member', memberId],
    queryFn: () => apiFetch(`/notes/member/${memberId}`),
    enabled: !!memberId,
  });

  const addNote = useMutation({
    mutationFn: (data: any) => apiFetch('/notes', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'member', memberId] });
      setContent('');
      toast.success('Note saved successfully');
    },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const deleteNote = useMutation({
    mutationFn: (id: string) => apiFetch(`/notes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'member', memberId] });
      toast.success('Note deleted');
    },
  });

  return (
    <PageWrapper className="max-w-4xl mx-auto">
      <PageHeader title={t('common.notes')} />

      <div className="glass-card p-6 border-white/5 mb-8">
        <label className="text-sm font-medium mb-2 block">Select Member</label>
        <Select value={memberId} onValueChange={setMemberId}>
          <SelectTrigger className="bg-black/20 w-full md:w-72 h-12">
            <SelectValue placeholder="Choose a member to view/add notes" />
          </SelectTrigger>
          <SelectContent>
            {members?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {memberId && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write an observation, goal, or reminder for this member..."
              className="bg-black/20 min-h-[120px] resize-y mb-3 border-white/10 focus-visible:ring-primary"
            />
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{content.length} characters</span>
              <Button
                onClick={() => addNote.mutate({ memberId, note: content })}
                disabled={!content.trim() || addNote.isPending}
                className="glow-hover"
              >
                {addNote.isPending ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Note</>}
              </Button>
            </div>
          </div>
        )}
      </div>

      {memberId && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg mb-4">Past Notes</h3>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : notes && notes.length > 0 ? (
            notes.map((note: any) => (
              <div key={note.id} className="glass-card p-5 border-white/5 relative group hover:border-white/20 transition-colors">
                <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-3">
                  <span className="text-xs text-muted-foreground font-medium">{format(new Date(note.createdAt), 'EEEE, MMMM do, yyyy • h:mm a')}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { if (confirm('Delete note?')) deleteNote.mutate(note.id); }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.note}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground glass-card border-dashed">No notes for this member yet.</div>
          )}
        </div>
      )}

      {!memberId && (
        <div className="text-center py-16 text-muted-foreground opacity-50">
          <p>Please select a member above to view and add notes.</p>
        </div>
      )}
    </PageWrapper>
  );
}
