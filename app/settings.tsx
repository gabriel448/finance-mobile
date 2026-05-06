import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSheetConfig, signOut } from "../services/localStorage";
import { useEffect, useState } from "react";
import { SheetConfig } from "../services/localStorage";

export default function SettingsScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<SheetConfig | null>(null);

  useEffect(() => {
    getSheetConfig().then(setConfig);
  }, []);

  async function handleSignOut() {
    Alert.alert(
      "Sair da conta",
      "Você será desconectado. Os dados locais serão apagados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/login");
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Planilha atual */}
      <Text style={styles.sectionTitle}>Planilha conectada</Text>
      <View style={styles.card}>
        <Row icon="document-text-outline" label="Nome" value={config?.spreadsheetName ?? "—"} />
        <Divider />
        <Row icon="grid-outline"           label="Célula de saldo" value={config?.cellSaldo ?? "—"} />
        <Divider />
        <Row icon="add-outline"            label="Célula de gastos" value={config?.cellGasto ?? "—"} />
      </View>

      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={() => router.push("/setup")}
        activeOpacity={0.85}
      >
        <Ionicons name="pencil-outline" size={18} color="#fff" />
        <Text style={styles.btnPrimaryText}>Alterar planilha ou células</Text>
      </TouchableOpacity>

      {/* Conta */}
      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Conta</Text>
      <TouchableOpacity style={styles.btnDanger} onPress={handleSignOut} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color="#f85149" />
        <Text style={styles.btnDangerText}>Sair da conta Google</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color="#8b949e" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#21262d", marginVertical: 4 }} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  content:   { padding: 20, paddingTop: 24 },
  sectionTitle: { color: "#8b949e", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },
  card: {
    backgroundColor: "#161b22",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#21262d",
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  rowLabel: { color: "#8b949e", fontSize: 14, flex: 1 },
  rowValue: { color: "#e6edf3", fontSize: 14, fontWeight: "600", maxWidth: "50%", textAlign: "right" },
  btnPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1f6feb", borderRadius: 12, paddingVertical: 14, marginTop: 16,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnDanger: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: "#3a1a1a", backgroundColor: "#1a0a0a",
    borderRadius: 12, paddingVertical: 14,
  },
  btnDangerText: { color: "#f85149", fontSize: 16, fontWeight: "600" },
});
