import React, { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "@/hooks/useColors";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  labelAr?: string;
  isAr?: boolean;
}

export function ImageUpload({ value, onChange, label = "Image", labelAr = "\u0635\u0648\u0631\u0629", isAr }: ImageUploadProps) {
  const c = useColors();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const requestPresignedUrl = async (file: { name: string; size: number; type: string }) => {
    const baseUrl = process.env["EXPO_PUBLIC_DOMAIN"]
      ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api/storage`
      : "https://d4769cb1-1efe-49e8-bc76-43e3163caa75-00-sdutkzkwul7u.pike.replit.dev/api/storage";

    const res = await fetch(`${baseUrl}/uploads/request-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to get upload URL");
    }
    return res.json();
  };

  const uploadToPresignedUrl = async (fileUri: string, uploadURL: string, contentType: string) => {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const uploadRes = await fetch(uploadURL, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": contentType },
    });
    if (!uploadRes.ok) {
      throw new Error("Upload failed");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError(isAr ? "\u064a\u062c\u0628 \u0627\u0644\u0633\u0645\u0627\u062d \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0635\u0648\u0631" : "Permission required to access photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const fileUri = asset.uri;
    const fileName = asset.fileName || `image-${Date.now()}.jpg`;
    const fileType = asset.mimeType || "image/jpeg";
    const fileSize = asset.fileSize || 0;

    if (fileSize > 5 * 1024 * 1024) {
      setError(isAr ? "\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0645\u0644\u0641 \u0647\u0648 5MB" : "Max file size is 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(10);

    try {
      const { uploadURL, objectPath } = await requestPresignedUrl({
        name: fileName,
        size: fileSize,
        type: fileType,
      });
      setProgress(40);

      await uploadToPresignedUrl(fileUri, uploadURL, fileType);
      setProgress(100);

      const baseUrl = process.env["EXPO_PUBLIC_DOMAIN"]
        ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api/storage`
        : "https://d4769cb1-1efe-49e8-bc76-43e3163caa75-00-sdutkzkwul7u.pike.replit.dev/api/storage";
      const servingUrl = `${baseUrl}${objectPath}`;
      onChange(servingUrl);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
        {isAr ? labelAr : label}
      </Text>
      {value ? (
        <View style={{ position: "relative" }}>
          <Image source={{ uri: value }} style={{ width: "100%", height: 140, borderRadius: 12 }} resizeMode="cover" />
          <Pressable
            onPress={() => onChange(null)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "rgba(0,0,0,0.6)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="x" size={16} color="white" />
          </Pressable>
        </View>
      ) : isUploading ? (
        <View style={{ height: 140, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", gap: 8 }}>
          <ActivityIndicator color={c.primary} />
          <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{progress}%</Text>
        </View>
      ) : (
        <Pressable
          onPress={pickImage}
          style={{ height: 140, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Feather name="image" size={24} color={c.mutedForeground} />
          <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
            {isAr ? "\u0627\u0646\u0642\u0631 \u0644\u0644\u0631\u0641\u0639 \u0635\u0648\u0631\u0629" : "Tap to upload image"}
          </Text>
        </Pressable>
      )}
      {error && <Text style={{ color: "#ef4444", fontSize: 12 }}>{error}</Text>}
    </View>
  );
}
