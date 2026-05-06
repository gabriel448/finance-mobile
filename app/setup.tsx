import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { saveCellConfig, getCellConfig, getSaldo, getScriptUrl, clearScriptUrl } from "../services/sheetsService";

export default function SetupScreen() {
  const router = useRouter();
  const [cellSaldo, setCellSaldo] = useState("F9");
  const [cellGasto, setCellGasto] = useState("I8");
  const [loading,   setLoading]   = useState(false);
  const [scriptUrl, setScriptUrl] = useState("");

  // Pré-preenche se já existir configuração
  useEffect(() => {
    getCellConfig().then((c) => {
      if (c) { setCellSaldo(c.cellSaldo); setCellGasto(c.cellGasto); }
    });
    getScriptUrl().then((u) => setScriptUrl(u ?? ""));
  }, []);

  async function handleSalvar() {
    const saldo = cellSaldo.trim().toUpperCase();
    const gasto = cellGasto.trim().toUpperCase();
    if (!saldo || !gasto) {
      Alert.alert("Preencha os campos", "Informe as referências das duas células.");
      return;
    }
    setLoading(true);
    try {
      const valor = await getSaldo(saldo);
      await saveCellConfig({ cellSaldo: saldo, cellGasto: gasto });
      Alert.alert(
        "Configurado! ✅",
        `Saldo atual lido: R$ ${valor.toFixed(2).replace(".", ",")}`,
        [{ text: "Ir para o app", onPress: () => router.replace("/") }]
      );
    } catch (e: any) {
      Alert.alert("Erro ao testar célula", e.message ?? "Verifique a referência informada.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTrocarPlanilha() {
    Alert.alert(
      "Trocar planilha?",
      "Isso removerá a URL do script configurada. Você precisará configurar novamente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Trocar",
          style: "destructive",
          onPress: async () => {
            await clearScriptUrl();
            router.replace("/onboarding");
          },
        },
      ]
    );
  }

  // URL resumida para exibição
  const urlDisplay = scriptUrl
    ? scriptUrl.replace("https://script.google.com/macros/s/", "…/s/").slice(0, 40) + "…"
    : "Não configurada";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0d1117" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Ionicons name="grid-outline" size={48} color="#58a6ff" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Configurar células</Text>
        <Text style={styles.subtitle}>
          Informe quais células da planilha{"\n"}correspondem ao saldo e aos gastos.
        </Text>

        {/* Script conectado */}
        <TouchableOpacity style={styles.scriptChip} onPress={handleTrocarPlanilha} activeOpacity={0.75}>
          <Ionicons name="link-outline" size={14} color="#3fb950" />
          <Text style={styles.scriptChipText} numberOfLines={1}>{urlDisplay}</Text>
          <Ionicons name="swap-horizontal-outline" size={14} color="#484f58" />
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.label}>Célula do saldo disponível</Text>
          <Text style={styles.hint}>Calculada pela fórmula da sua planilha (só leitura)</Text>
          <TextInput
            style={styles.input}
            value={cellSaldo}
            onChangeText={setCellSaldo}
            placeholder="ex: F9"
            placeholderTextColor="#484f58"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <View style={styles.divider} />

          <Text style={styles.label}>Célula de gastos acumulados</Text>
          <Text style={styles.hint}>O app soma os gastos nesta célula</Text>
          <TextInput
            style={styles.input}
            value={cellGasto}
            onChangeText={setCellGasto}
            placeholder="ex: I8"
            placeholderTextColor="#484f58"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleSalvar}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="checkmark-outline" size={18} color="#fff" /><Text style={styles.btnText}>Salvar e testar</Text></>
          }
        </TouchableOpacity>

        <Text style={styles.footer}>
          O app vai ler o saldo de {cellSaldo || "?"} e somar gastos em {cellGasto || "?"}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, alignItems: "center" },
  title:    { color: "#e6edf3", fontSize: 24, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { color: "#8b949e", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },

  scriptChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#161b22", borderRadius: 20,
    borderWidth: 1, borderColor: "#238636",
    paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: 24, maxWidth: "100%",
  },
  scriptChipText: { color: "#3fb950", fontSize: 11, flex: 1 },

  card: {
    width: "100%", backgroundColor: "#161b22",
    borderRadius: 16, borderWidth: 1, borderColor: "#21262d", padding: 20,
  },
  label:   { color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  hint:    { color: "#484f58", fontSize: 12, marginBottom: 10 },
  input: {
    backgroundColor: "#0d1117", color: "#e6edf3",
    borderWidth: 1, borderColor: "#30363d", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 22, fontWeight: "700", textAlign: "center", letterSpacing: 2,
  },
  divider: { height: 1, backgroundColor: "#21262d", marginVertical: 20 },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#238636", borderRadius: 12, paddingVertical: 14,
    marginTop: 24, width: "100%",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footer:  { color: "#484f58", fontSize: 12, textAlign: "center", marginTop: 20 },
});
