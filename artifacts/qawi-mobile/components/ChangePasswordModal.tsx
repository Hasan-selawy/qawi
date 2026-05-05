import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ visible, onClose }: Props) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const resetFields = () => {
    setCurrentPass(""); setNewPass(""); setConfirmPass("");
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
  };

  const handleClose = () => { resetFields(); onClose(); };

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/auth/change-password", {
        method: "POST",
        data: { currentPassword: currentPass, newPassword: newPass },
      }),
    onSuccess: () => {
      Alert.alert(
        lang === "ar" ? "✅ تم" : "✅ Done",
        lang === "ar" ? "تم تحديث كلمة المرور بنجاح" : "Password updated successfully"
      );
      handleClose();
    },
    onError: (err: any) => {
      Alert.alert(
        lang === "ar" ? "خطأ" : "Error",
        lang === "ar"
          ? (err?.messageAr || "فشل تحديث كلمة المرور")
          : (err?.error || "Failed to update password")
      );
    },
  });

  const handleSave = () => {
    if (!currentPass) {
      Alert.alert("", lang === "ar" ? "الرجاء إدخال كلمة المرور الحالية" : "Please enter your current password");
      return;
    }
    if (newPass.length < 8) {
      Alert.alert("", lang === "ar" ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters");
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert("", lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    mutation.mutate();
  };

  const inputStyle = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: c.foreground,
    fontSize: 15,
    textAlign: isRTL ? "right" as const : "left" as const,
    flex: 1,
  };

  const PasswordRow = ({
    label, value, onChange, show, onToggle,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void;
  }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 12, fontWeight: "600", marginBottom: 6, textAlign: isRTL ? "right" : "left" }}>
        {label}
      </Text>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={c.mutedForeground}
          style={inputStyle}
        />
        <TouchableOpacity onPress={onToggle} style={{ padding: 8 }}>
          <Feather name={show ? "eye-off" : "eye"} size={18} color={c.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" }}>
        <View style={{
          backgroundColor: c.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 44,
        }}>
          {/* Header */}
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center" }}>
              <Feather name="lock" size={18} color={c.primary} />
            </View>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800" }}>
              {lang === "ar" ? "تغيير كلمة المرور" : "Change Password"}
            </Text>
          </View>

          <PasswordRow
            label={lang === "ar" ? "كلمة المرور الحالية" : "Current Password"}
            value={currentPass}
            onChange={setCurrentPass}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
          />
          <PasswordRow
            label={lang === "ar" ? "كلمة المرور الجديدة" : "New Password"}
            value={newPass}
            onChange={setNewPass}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
          />
          <PasswordRow
            label={lang === "ar" ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}
            value={confirmPass}
            onChange={setConfirmPass}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
          />

          <Text style={{ color: c.mutedForeground, fontSize: 12, marginBottom: 20, textAlign: isRTL ? "right" : "left" }}>
            {lang === "ar" ? "• 8 أحرف على الأقل" : "• Minimum 8 characters"}
          </Text>

          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title={lang === "ar" ? "إلغاء" : "Cancel"} variant="ghost" onPress={handleClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={lang === "ar" ? "حفظ" : "Save"}
                onPress={handleSave}
                loading={mutation.isPending}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
