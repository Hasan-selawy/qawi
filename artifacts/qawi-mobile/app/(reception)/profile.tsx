import React, { useState } from "react";
import { Text, View } from "react-native";

import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { RoleHeader } from "@/components/RoleHeader";
import { Avatar, Button, Card, Screen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function ReceptionProfile() {
  const c = useColors();
  const { lang, setLang } = useLanguage();
  const { user, logout } = useAuth();
  const [changePwOpen, setChangePwOpen] = useState(false);
  const isAr = lang === "ar";

  return (
    <Screen>
      <RoleHeader title={isAr ? "الملف الشخصي" : "Profile"} />
      <View style={{ padding: 16, gap: 14 }}>
        <Card style={{ alignItems: "center", paddingVertical: 28, gap: 8 }}>
          <Avatar name={user?.name ?? "?"} size={72} />
          <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", marginTop: 8 }}>{user?.name}</Text>
          <Text style={{ color: c.mutedForeground }}>{user?.email}</Text>
          <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: "#3B82F622", marginTop: 4 }}>
            <Text style={{ color: "#3B82F6", fontWeight: "700", fontSize: 12 }}>
              {isAr ? "موظف استقبال" : "Receptionist"}
            </Text>
          </View>
          {user?.gymName ? <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{user.gymName}</Text> : null}
        </Card>
        <Button title={lang === "en" ? "العربية" : "English"} variant="secondary" icon="globe" onPress={() => setLang(lang === "en" ? "ar" : "en")} />
        <Button title={isAr ? "تغيير كلمة المرور" : "Change Password"} variant="secondary" icon="lock" onPress={() => setChangePwOpen(true)} />
        <Button title={isAr ? "تسجيل الخروج" : "Logout"} variant="danger" icon="log-out" onPress={() => logout()} />
      </View>
      <ChangePasswordModal visible={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </Screen>
  );
}
