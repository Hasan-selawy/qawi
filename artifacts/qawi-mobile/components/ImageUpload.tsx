import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  labelAr?: string;
  isAr?: boolean;
}

export function ImageUpload({ value, onChange, label = "Image", labelAr = "صورة", isAr }: ImageUploadProps) {
  const c = useColors();
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState("");
  useEffect(() => { setDraft(value || ""); }, [value]);
  const commit = () => {
    if (!draft.trim()) { setError(""); onChange(null); return; }
    try {
      const url = new URL(draft.trim());
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
      setError(""); onChange(url.href);
    } catch { setError(isAr ? "أدخل رابط صورة يبدأ بـ https://" : "Enter an https:// image URL"); }
  };
  return <View style={{ gap: 8 }}>
    <Text style={{ color: c.mutedForeground }}>{isAr ? labelAr : label}</Text>
    <TextInput value={draft} onChangeText={setDraft} onEndEditing={commit} keyboardType="url" autoCapitalize="none"
      accessibilityLabel={isAr ? labelAr : label} placeholder="https://example.com/image.jpg" placeholderTextColor={c.mutedForeground}
      style={{ minHeight: 44, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 10, color: c.foreground }} />
    <Text accessibilityLiveRegion="polite" style={{ color: error ? "#ef4444" : c.mutedForeground, fontSize: 12 }}>
      {error || (isAr ? "ألصق رابط صورة مستضافة. رفع الملفات غير متاح." : "Paste a hosted image URL. File uploads are unavailable.")}
    </Text>
    {!!value && <Image source={{ uri: value }} accessibilityLabel={isAr ? labelAr : label} style={{ height: 128, borderRadius: 8 }} resizeMode="cover" />}
  </View>;
}
