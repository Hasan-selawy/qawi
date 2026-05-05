import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const { lang } = useLanguage();
  const isRTL = lang === 'ar';

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ currentPass?: string; newPass?: string; confirmPass?: string }>({});

  const reset = () => {
    setCurrentPass(''); setNewPass(''); setConfirmPass('');
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
    setErrors({});
  };

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/auth/change-password', {
        method: 'POST',
        data: { currentPassword: currentPass, newPassword: newPass },
      }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully');
      reset();
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast.error(
        isRTL
          ? (err.messageAr || 'فشل تحديث كلمة المرور')
          : (err.error || 'Failed to update password')
      ),
  });

  const validate = () => {
    const e: typeof errors = {};
    if (!currentPass)
      e.currentPass = isRTL ? 'الرجاء إدخال كلمة المرور الحالية' : 'Current password is required';
    if (newPass.length < 8)
      e.newPass = isRTL ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters';
    if (newPass !== confirmPass)
      e.confirmPass = isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) mutation.mutate();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const PasswordField = ({
    label, value, onChange, show, onToggle, error, placeholder,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; error?: string; placeholder: string;
  }) => (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`bg-black/20 pr-10 rtl:pl-10 rtl:pr-3 ${error ? 'border-red-500' : ''}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-card border-white/10 sm:max-w-[400px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={18} className="text-primary" />
            {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <PasswordField
            label={isRTL ? 'كلمة المرور الحالية' : 'Current Password'}
            value={currentPass}
            onChange={setCurrentPass}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            error={errors.currentPass}
            placeholder={isRTL ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
          />
          <PasswordField
            label={isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
            value={newPass}
            onChange={setNewPass}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            error={errors.newPass}
            placeholder={isRTL ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
          />
          <PasswordField
            label={isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            value={confirmPass}
            onChange={setConfirmPass}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            error={errors.confirmPass}
            placeholder={isRTL ? 'أكد كلمة المرور الجديدة' : 'Confirm new password'}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => handleOpenChange(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" className="flex-1 glow-hover" disabled={mutation.isPending}>
              {mutation.isPending
                ? (isRTL ? 'جارٍ الحفظ…' : 'Saving…')
                : (isRTL ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
