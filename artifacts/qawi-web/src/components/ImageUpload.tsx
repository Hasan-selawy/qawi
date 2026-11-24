import { useEffect, useId, useState } from "react";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  labelAr?: string;
  isAr?: boolean;
}

/** Hosted-image URLs replace the retired storage sidecar. No file is uploaded. */
export function ImageUpload({ value, onChange, label = "Image", labelAr = "صورة", isAr }: ImageUploadProps) {
  const id = useId();
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState("");
  useEffect(() => { setDraft(value || ""); }, [value]);
  const commit = () => {
    if (!draft.trim()) { setError(""); onChange(undefined); return; }
    try {
      const url = new URL(draft.trim());
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
      setError(""); onChange(url.href);
    } catch { setError(isAr ? "أدخل رابط صورة يبدأ بـ https://" : "Enter an https:// image URL"); }
  };
  return <div className="space-y-2">
    <label htmlFor={id} className="text-xs text-muted-foreground block">{isAr ? labelAr : label}</label>
    <input id={id} type="url" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit}
      placeholder="https://example.com/image.jpg" aria-invalid={!!error} aria-describedby={`${id}-help`}
      className="w-full min-h-11 rounded-md border border-white/15 bg-background px-3 text-sm" />
    <p id={`${id}-help`} role={error ? "alert" : undefined} className={error ? "text-xs text-red-400" : "text-xs text-muted-foreground"}>
      {error || (isAr ? "ألصق رابط صورة مستضافة. رفع الملفات غير متاح." : "Paste a hosted image URL. File uploads are unavailable.")}
    </p>
    {value && <img src={value} alt={isAr ? labelAr : label} className="h-32 rounded-lg object-cover" loading="lazy" />}
  </div>;
}
