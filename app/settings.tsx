import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCellConfig, CellConfig, getScriptUrl, getSpreadsheetId, clearScriptUrl } from "../services/sheetsService";

export default function SettingsScreen() {
  const router = useRouter();
  const [config,         setConfig]         = useState<CellConfig | null>(null);
  const [scriptUrl,      setScriptUrl]      = useState<string | null>(null);
  const [spreadsheetId,  setSpreadsheetId]  = useState<string | null>(null);

  useEffect(() => {
    getCellConfig().then(setConfig);
    getScriptUrl().then(setScriptUrl);
    getSpreadsheetId().then(setSpreadsheetId);
  }, []);

  const urlDisplay = scriptUrl
    ? scriptUrl.replace("https://script.google.com/macros/s/", "").slice(0, 34) + "…"
    : "—";

  async function handleReconfigurar() {
    Alert.alert(
      "Reconfigurar planilha?",
      "Isso removerá a URL do script atual e retornará ao onboarding.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reconfigurar",
          style: "destructive",
          onPress: async () => {
            await clearScriptUrl();
            router.replace("/onboarding");
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Planilha conectada ── */}
      <Text style={styles.sectionTitle}>Planilha conectada</Text>
      <View style={styles.card}>
        <Row icon="link-outline" label="Web App URL" value={urlDisplay} />
      </View>
      <TouchableOpacity style={styles.btnDanger} onPress={handleReconfigurar} activeOpacity={0.85}>
        <Ionicons name="swap-horizontal-outline" size={16} color="#f85149" />
        <Text style={styles.btnDangerText}>Trocar planilha</Text>
      </TouchableOpacity>

      {/* ── Células ── */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Células configuradas</Text>
      <View style={styles.card}>
        <Row icon="stats-chart-outline" label="Célula do saldo"  value={config?.cellSaldo ?? "—"} />
        <View style={styles.divider} />
        <Row icon="add-circle-outline"  label="Célula de gastos" value={config?.cellGasto ?? "—"} />
        {config?.cellParcelasStart && (
          <>
            <View style={styles.divider} />
            <Row icon="card-outline" label="Célula de parcelas" value={config.cellParcelasStart} />
          </>
        )}
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => router.push("/setup")} activeOpacity={0.85}>
        <Ionicons name="pencil-outline" size={18} color="#fff" />
        <Text style={styles.btnText}>Alterar células</Text>
      </TouchableOpacity>

      <Text style={styles.info}>
        Configure as células sempre que reorganizar a planilha.
      </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  content:   { padding: 20, paddingTop: 24 },
  sectionTitle: {
    color: "#8b949e", fontSize: 12,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 12,
  },
  card: {
    backgroundColor: "#161b22", borderRadius: 16,
    borderWidth: 1, borderColor: "#21262d",
    paddingVertical: 4, paddingHorizontal: 16,
  },
  divider: { height: 1, backgroundColor: "#21262d" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  rowLabel: { color: "#8b949e", fontSize: 14, flex: 1 },
  rowValue: { color: "#e6edf3", fontSize: 14, fontWeight: "700", maxWidth: "45%" },

  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1f6feb", borderRadius: 12,
    paddingVertical: 14, marginTop: 14,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  btnDanger: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 12, marginTop: 12,
    borderWidth: 1, borderColor: "#3a1a1a", backgroundColor: "#1a0a0a",
  },
  btnDangerText: { color: "#f85149", fontSize: 14, fontWeight: "600" },

  info: {
    color: "#484f58", fontSize: 12,
    textAlign: "center", marginTop: 24, lineHeight: 18,
  },
});
