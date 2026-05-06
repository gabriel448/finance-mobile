import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getValidToken, getSheetConfig } from "../services/localStorage";
import { getSaldo } from "../services/sheetsAPIService";
import AddExpenseModal from "../components/AddExpenseModal";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function HomeScreen() {
  const router = useRouter();
  const [saldo, setSaldo]               = useState<number | null>(null);
  const [loading, setLoading]           = useState(true);
  const [erro, setErro]                 = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [sheetName, setSheetName]       = useState("");
  const [pulseAnim]                     = useState(new Animated.Value(1));

  async function carregarSaldo() {
    setLoading(true);
    setErro("");
    try {
      const token  = await getValidToken();
      const config = await getSheetConfig();
      if (!token)  { router.replace("/login");  return; }
      if (!config) { router.replace("/setup");  return; }
      setSheetName(config.spreadsheetName ?? "");
      const s = await getSaldo(token, config.spreadsheetId, config.cellSaldo);
      setSaldo(s);
    } catch (e: any) {
      setErro(e.message ?? "Não foi possível carregar o saldo.");
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { carregarSaldo(); }, []));

  function pulseRefresh() {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.85, duration: 100, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 150, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
    carregarSaldo();
  }

  const saldoPositivo = saldo !== null && saldo >= 0;

  return (
    <View style={styles.container}>
      {/* Nome da planilha */}
      {sheetName ? (
        <View style={styles.sheetBadge}>
          <Ionicons name="document-text-outline" size={13} color="#58a6ff" />
          <Text style={styles.sheetBadgeText} numberOfLines={1}>{sheetName}</Text>
        </View>
      ) : null}

      {/* Saldo Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Saldo Disponível</Text>
        {erro ? (
          <Text style={styles.erroText}>{erro}</Text>
        ) : loading ? (
          <ActivityIndicator size="large" color="#58a6ff" style={{ marginVertical: 16 }} />
        ) : (
          <Text style={[styles.saldoValue, { color: saldoPositivo ? "#3fb950" : "#f85149" }]}>
            {formatCurrency(saldo!)}
          </Text>
        )}
        <View style={[styles.saldoBadge, { backgroundColor: saldoPositivo ? "#1a3a2a" : "#3a1a1a" }]}>
          <Ionicons
            name={saldoPositivo ? "trending-up-outline" : "trending-down-outline"}
            size={14}
            color={saldoPositivo ? "#3fb950" : "#f85149"}
          />
          <Text style={[styles.badgeText, { color: saldoPositivo ? "#3fb950" : "#f85149" }]}>
            {saldoPositivo ? "Saldo positivo" : "Saldo negativo"}
          </Text>
        </View>
      </View>

      {/* Botão Adicionar */}
      <TouchableOpacity
        style={styles.btnAdicionar}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text style={styles.btnAdicionarText}>Adicionar Despesa</Text>
      </TouchableOpacity>

      {/* Refresh */}
      <TouchableOpacity style={styles.btnRefresh} onPress={pulseRefresh} disabled={loading} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          {loading
            ? <ActivityIndicator size="small" color="#58a6ff" />
            : <Ionicons name="refresh-outline" size={20} color="#58a6ff" />
          }
        </Animated.View>
        <Text style={styles.btnRefreshText}>Atualizar saldo</Text>
      </TouchableOpacity>

      <AddExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={(novoSaldo) => setSaldo(novoSaldo)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#21262d",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
    maxWidth: "90%",
  },
  sheetBadgeText: { color: "#58a6ff", fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: "#161b22",
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: "#21262d",
    alignItems: "center",
    shadowColor: "#58a6ff",
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 8,
  },
  cardLabel: { color: "#8b949e", fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },
  saldoValue: { fontSize: 44, fontWeight: "800", letterSpacing: -1, marginBottom: 16 },
  saldoBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText:  { fontSize: 13, fontWeight: "600" },
  erroText:   { color: "#f85149", fontSize: 14, marginVertical: 16, textAlign: "center" },
  btnAdicionar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#238636",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 28,
    shadowColor: "#238636",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnAdicionarText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  btnRefresh: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20, padding: 10 },
  btnRefreshText: { color: "#58a6ff", fontSize: 14 },
});
