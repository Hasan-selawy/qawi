import React, { useState } from "react";
import { Text, View } from "react-native";

import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { RoleHeader } from "@/components/RoleHeader";
import { Avatar, Button, Card, Screen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function AdminProfile() {
  const c = useColors();
  const { t, lang, setLang } = useLanguage();
  const { user, logout } = useAuth();
  const [changePwOpen, setChangePwOpen] = useState(false);

  return (
    <Screen>
      <RoleHeader title={t("admin.tabs.profile")} />
      <View style={{ padding: 16, gap: 14 }}>
        <Card style={{ alignItems: "center", paddingVertical: 28, gap: 8 }}>
          <Avatar name={user?.name ?? "?"} size={72} />
          <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", marginTop: 8 }}>{user?.name}</Text>
          <Text style={{ color: c.mutedForeground }}>{user?.email}</Text>
          {user?.gymName ? <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{user.gymName}</Text> : null}
        </Card>
        <Button title={lang === "en" ? "العربية" : "English"} variant="secondary" icon="globe" onPress={() => setLang(lang === "en" ? "ar" : "en")} />
        <Button
          title={lang === "ar" ? "تغيير كلمة المرور" : "Change Password"}
          variant="secondary"
          icon="lock"
          onPress={() => setChangePwOpen(true)}
        />
        <Button title={t("common.logout")} variant="danger" icon="log-out" onPress={() => logout()} />
      </View>

      <ChangePasswordModal visible={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </Screen>
  );
}
