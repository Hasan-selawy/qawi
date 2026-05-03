import React, { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { Feather } from "@expo/vector-icons";

export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

interface VideoThumbnailProps {
  videoUrl?: string | null;
  borderRadius?: number;
}

export function VideoThumbnail({ videoUrl, borderRadius = 12 }: VideoThumbnailProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const videoId = getYouTubeId(videoUrl);

  if (!videoId) return null;

  const thumbUri = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <>
      <Pressable
        onPress={() => setModalOpen(true)}
        style={[styles.thumb, { borderRadius }]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Play exercise video"
      >
        <Image
          source={{ uri: thumbUri }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
          resizeMode="cover"
        />
        <View style={styles.playBtn}>
          <View style={styles.triangle} />
        </View>
      </Pressable>

      <Modal
        visible={modalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setModalOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn} hitSlop={12}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
            <YoutubePlayer
              height={220}
              videoId={videoId}
              play={modalOpen}
              onChangeState={(state: string) => {
                if (state === "ended") setModalOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: {
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
  triangle: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 14,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#fff",
    marginLeft: 3,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#0a0f1e",
    borderRadius: 16,
    overflow: "hidden",
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
