import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCellConfig, CellConfig } from "../services/sheetsService";

export default function SettingsScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<CellConfig | null>(null);

  useEffect(() => { getCellConfig().then(setConfig); }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Células configuradas</Text>
      <View style={styles.card}>
        <Row icon="stats-chart-outline" label="Célula do saldo"  value={config?.cellSaldo ?? "—"} />
        <View style={styles.divider} />
        <Row icon="add-circle-outline"  label="Célula de gastos" value={config?.cellGasto ?? "—"} />
      </View>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push("/setup")}
        activeOpacity={0.85}
      >
        <Ionicons name="pencil-outline" size={18} color="#fff" />
        <Text style={styles.btnText}>Alterar células</Text>
      </TouchableOpacity>

      <Text style={styles.info}>
        A planilha está configurada diretamente no servidor.{"\n"}
        Altere as células acima se reorganizar a planilha.
      </Text>
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color="#8b949e" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  rowValue: { color: "#e6edf3", fontSize: 16, fontWeight: "700" },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1f6feb", borderRadius: 12,
    paddingVertical: 14, marginTop: 20,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  info: {
    color: "#484f58", fontSize: 12,
    textAlign: "center", marginTop: 24, lineHeight: 18,
  },
});
