import { useState, useCallback } from "react";
import { Image, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  labelAr?: string;
  isAr?: boolean;
}

export function ImageUpload({ value, onChange, label = "Image", labelAr = "\u0635\u0648\u0631\u0629", isAr }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(isAr ? "\u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0627\u0644\u0645\u0644\u0641 \u0635\u0648\u0631\u0629" : "File must be an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(isAr ? "\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0645\u0644\u0641 \u0647\u0648 5MB" : "Max file size is 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(10);

    try {
      // Step 1: Request presigned URL
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadURL, objectPath } = await metaRes.json();
      setProgress(40);

      // Step 2: Upload directly to GCS
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }
      setProgress(100);

      // Construct serving URL
      const servingUrl = `/api/storage${objectPath}`;
      onChange(servingUrl);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [isAr, onChange]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground mb-1 block">
        {isAr ? labelAr : label}
      </label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-white/10">
          <img src={value} alt="Uploaded" className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      ) : isUploading ? (
        <div className="h-32 rounded-lg border border-white/10 bg-black/20 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      ) : (
        <label className="block h-32 rounded-lg border border-dashed border-white/15 bg-black/10 hover:bg-black/20 hover:border-white/25 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
          <Image className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {isAr ? "\u0627\u0646\u0642\u0631 \u0644\u0644\u0631\u0641\u0639 \u0635\u0648\u0631\u0629" : "Click to upload image"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={onInputChange} />
        </label>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
