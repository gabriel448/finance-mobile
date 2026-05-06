import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getValidToken,
  saveSheetConfig,
  getSheetConfig,
} from "../services/localStorage";
import {
  extractSpreadsheetId,
  getSpreadsheetName,
  getSaldo,
} from "../services/sheetsAPIService";

interface Props {
  isEditing?: boolean; // true = veio das configurações
}

export default function SetupScreen({ isEditing = false }: Props) {
  const router = useRouter();
  const [urlInput, setUrlInput]       = useState("");
  const [cellSaldo, setCellSaldo]     = useState("F9");
  const [cellGasto, setCellGasto]     = useState("I8");
  const [loading, setLoading]         = useState(false);
  const [step, setStep]               = useState<"url" | "cells">("url");
  const [sheetName, setSheetName]     = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");

  async function handleValidateUrl() {
    const id = extractSpreadsheetId(urlInput.trim());
    if (!id) {
      Alert.alert("URL inválida", "Cole a URL completa da planilha ou apenas o ID.");
      return;
    }
    setLoading(true);
    try {
      const token = await getValidToken();
      if (!token) { router.replace("/login"); return; }
      const name = await getSpreadsheetName(token, id);
      setSpreadsheetId(id);
      setSheetName(name);
      setStep("cells");
    } catch (e: any) {
      Alert.alert("Erro ao acessar planilha", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const saldoCell = cellSaldo.trim().toUpperCase();
    const gastoCell = cellGasto.trim().toUpperCase();
    if (!saldoCell || !gastoCell) {
      Alert.alert("Preencha as células", "Informe as referências das células.");
      return;
    }
    setLoading(true);
    try {
      const token = await getValidToken();
      if (!token) { router.replace("/login"); return; }

      // Testa se consegue ler a célula de saldo
      const saldo = await getSaldo(token, spreadsheetId, saldoCell);

      await saveSheetConfig({
        spreadsheetId,
        spreadsheetName: sheetName,
        cellSaldo: saldoCell,
        cellGasto: gastoCell,
      });

      Alert.alert(
        "Configurado! ✅",
        `Saldo atual: R$ ${saldo.toFixed(2).replace(".", ",")}`,
        [{ text: "Ir para o app", onPress: () => router.replace("/") }]
      );
    } catch (e: any) {
      Alert.alert("Erro ao testar célula", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0d1117" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Ionicons name="grid-outline" size={48} color="#58a6ff" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>
          {isEditing ? "Reconfigurar planilha" : "Conectar planilha"}
        </Text>

        {step === "url" ? (
          <>
            <Text style={styles.label}>URL ou ID da planilha</Text>
            <Text style={styles.hint}>
              Abra sua planilha no Google Sheets e cole a URL completa abaixo.
            </Text>
            <TextInput
              style={styles.input}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              placeholderTextColor="#484f58"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleValidateUrl}
              disabled={loading || !urlInput}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="search-outline" size={18} color="#fff" /><Text style={styles.btnText}>Validar planilha</Text></>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Planilha encontrada */}
            <View style={styles.foundCard}>
              <Ionicons name="checkmark-circle" size={20} color="#3fb950" />
              <Text style={styles.foundText} numberOfLines={1}>{sheetName}</Text>
            </View>

            <Text style={styles.sectionTitle}>Configurar células</Text>

            <Text style={styles.label}>Célula do saldo disponível</Text>
            <Text style={styles.hint}>Célula que mostra o saldo restante (calculado pela sua planilha)</Text>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              value={cellSaldo}
              onChangeText={setCellSaldo}
              placeholder="ex: F9"
              placeholderTextColor="#484f58"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={styles.label}>Célula de gastos acumulados</Text>
            <Text style={styles.hint}>Célula onde o app vai somar os gastos registrados</Text>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              value={cellGasto}
              onChangeText={setCellGasto}
              placeholder="ex: I8"
              placeholderTextColor="#484f58"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setStep("url")}
              >
                <Text style={styles.btnSecondaryText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { flex: 1 }, loading && styles.btnDisabled]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="checkmark-outline" size={18} color="#fff" /><Text style={styles.btnText}>Salvar e testar</Text></>
                }
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 48,
    alignItems: "center",
  },
  title: {
    color: "#e6edf3",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 32,
    textAlign: "center",
  },
  sectionTitle: {
    color: "#e6edf3",
    fontSize: 17,
    fontWeight: "700",
    alignSelf: "flex-start",
    marginTop: 24,
    marginBottom: 8,
  },
  label: {
    color: "#8b949e",
    fontSize: 13,
    alignSelf: "flex-start",
    marginBottom: 4,
    marginTop: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  hint: {
    color: "#484f58",
    fontSize: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
    lineHeight: 17,
  },
  input: {
    width: "100%",
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#21262d",
    borderRadius: 12,
    color: "#e6edf3",
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
    lineHeight: 20,
  },
  inputSmall: {
    width: "100%",
    letterSpacing: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#238636",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    width: "100%",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSecondary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#30363d",
    marginRight: 10,
  },
  btnSecondaryText: { color: "#8b949e", fontSize: 16 },
  foundCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1a3a2a",
    borderWidth: 1,
    borderColor: "#238636",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
  },
  foundText: { color: "#3fb950", fontSize: 14, fontWeight: "600", flex: 1 },
  row: { flexDirection: "row", width: "100%", alignItems: "center" },
});
