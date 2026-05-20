import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Modal, TextInput, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getCellConfig, CellConfig, getScriptUrl, getSpreadsheetId,
  clearScriptUrl, saveScriptUrl, pingScript,
} from "../services/sheetsService";

export default function SettingsScreen() {
  const router = useRouter();
  const [config,           setConfig]           = useState<CellConfig | null>(null);
  const [scriptUrl,        setScriptUrl]        = useState<string | null>(null);
  const [changeUrlVisible, setChangeUrlVisible] = useState(false);
  const [newUrl,           setNewUrl]           = useState("");
  const [testingUrl,       setTestingUrl]       = useState(false);

  useEffect(() => {
    getCellConfig().then(setConfig);
    getScriptUrl().then(setScriptUrl);
  }, []);

  const urlDisplay = scriptUrl
    ? scriptUrl.replace("https://script.google.com/macros/s/", "").slice(0, 34) + "…"
    : "—";

  async function handleTrocarUrl() {
    const url = newUrl.trim();
    if (!url) { Alert.alert("Cole a URL do Apps Script."); return; }
    setTestingUrl(true);
    try {
      const sheetId = await getSpreadsheetId();
      if (!sheetId) throw new Error("Planilha não encontrada.");
      await pingScript(url, sheetId);
      await saveScriptUrl(url);
      setScriptUrl(url);
      setNewUrl("");
      setChangeUrlVisible(false);
      Alert.alert("URL atualizada!", "Conexão testada com sucesso.");
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível conectar com essa URL.");
    } finally {
      setTestingUrl(false);
    }
  }

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
      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => { setNewUrl(""); setChangeUrlVisible(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="code-slash-outline" size={16} color="#58a6ff" />
        <Text style={styles.btnSecondaryText}>Trocar URL do script</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnDanger} onPress={handleReconfigurar} activeOpacity={0.85}>
        <Ionicons name="swap-horizontal-outline" size={16} color="#f85149" />
        <Text style={styles.btnDangerText}>Trocar planilha</Text>
      </TouchableOpacity>

      {/* ── Células ── */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Células configuradas</Text>
      <View style={styles.card}>
        <Row icon="stats-chart-outline"  label="Célula do saldo"   value={config?.cellSaldo ?? "—"} />
        <View style={styles.divider} />
        <Row icon="add-circle-outline"   label="Célula de gastos"  value={config?.cellGasto ?? "—"} />
        {config?.cellGanhosVariaveis && (
          <>
            <View style={styles.divider} />
            <Row icon="trending-up-outline" label="Ganhos variáveis" value={config.cellGanhosVariaveis} />
          </>
        )}
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

      {/* ── Modal: trocar URL do script ── */}
      <Modal visible={changeUrlVisible} transparent animationType="slide" onRequestClose={() => setChangeUrlVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Trocar URL do Script</Text>

            <View style={styles.warnBanner}>
              <Ionicons name="warning-outline" size={15} color="#d4a017" />
              <Text style={styles.warnText}>
                Ao trocar a URL você precisará copiar o código <Text style={{ fontWeight: "700" }}>Code.gs</Text> disponível no site e publicar um novo Apps Script.
              </Text>
            </View>

            <Text style={styles.modalLabel}>Nova URL do Web App</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://script.google.com/macros/s/…"
              placeholderTextColor="#484f58"
              value={newUrl}
              onChangeText={setNewUrl}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />

            <TouchableOpacity
              style={[styles.btnConfirm, testingUrl && { opacity: 0.6 }]}
              onPress={handleTrocarUrl}
              disabled={testingUrl}
              activeOpacity={0.85}
            >
              {testingUrl
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="checkmark-outline" size={18} color="#fff" /><Text style={styles.btnConfirmText}>Testar e salvar</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancelar} onPress={() => setChangeUrlVisible(false)} activeOpacity={0.8}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  btnSecondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 12, marginTop: 12,
    borderWidth: 1, borderColor: "#1f4a8a", backgroundColor: "#0d1e3a",
  },
  btnSecondaryText: { color: "#58a6ff", fontSize: 14, fontWeight: "600" },

  btnDanger: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 12, marginTop: 10,
    borderWidth: 1, borderColor: "#3a1a1a", backgroundColor: "#1a0a0a",
  },
  btnDangerText: { color: "#f85149", fontSize: 14, fontWeight: "600" },

  info: {
    color: "#484f58", fontSize: 12,
    textAlign: "center", marginTop: 24, lineHeight: 18,
  },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#161b22", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, borderTopWidth: 1, borderColor: "#30363d",
  },
  modalTitle: { color: "#e6edf3", fontSize: 20, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  modalLabel: { color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  modalInput: {
    backgroundColor: "#0d1117", color: "#e6edf3",
    borderWidth: 1, borderColor: "#30363d", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, marginBottom: 20, minHeight: 60,
  },
  warnBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(212,160,23,0.08)", borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(212,160,23,0.2)",
    padding: 12, marginBottom: 20,
  },
  warnText: { color: "#d4a017", fontSize: 13, flex: 1, lineHeight: 18 },
  btnConfirm: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1f6feb", borderRadius: 12, paddingVertical: 14, marginBottom: 10,
  },
  btnConfirmText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnCancelar: {
    alignItems: "center", paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#21262d", borderWidth: 1, borderColor: "#30363d",
  },
  btnCancelarText: { color: "#8b949e", fontSize: 15, fontWeight: "600" },
});
