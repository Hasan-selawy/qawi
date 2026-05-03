import React from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

interface VideoThumbnailProps {
  videoUrl?: string | null;
  borderRadius?: number;
}

export function VideoThumbnail({ videoUrl, borderRadius = 12 }: VideoThumbnailProps) {
  const videoId = getYouTubeId(videoUrl);
  if (!videoId) return null;

  return (
    <Pressable
      onPress={() => videoUrl && Linking.openURL(videoUrl)}
      style={[styles.container, { borderRadius }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Play exercise video"
    >
      <Image
        source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
        style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        resizeMode="cover"
      />
      <View style={styles.playBtn}>
        <Text style={styles.playIcon}>▶</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#111",
    overflow: "hidden",
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    color: "#fff",
    fontSize: 18,
    marginLeft: 2,
  },
});
