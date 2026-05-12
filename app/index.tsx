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
import { getSaldo, getCellConfig, CellConfig } from "../services/sheetsService";
import AddExpenseModal from "../components/AddExpenseModal";
import SimulateModal from "../components/SimulateModal";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Cache de módulo: sobrevive à desmontagem do componente (Stack navigator) ──
let cachedSaldo: number | null = null;

type LoadMode = "idle" | "bg" | "full";
// bg   → Estado 1: valor visível + spinner pequeno no canto
// full → Estado 2: valor some + spinner grande no centro

export default function HomeScreen() {
  const router = useRouter();

  // Inicializa com cache — se já temos um valor, não pisca ao voltar
  const [saldo,          setSaldo]          = useState<number | null>(cachedSaldo);
  const [loadMode,       setLoadMode]       = useState<LoadMode>("idle");
  const [erro,           setErro]           = useState("");
  const [modalVisible,   setModalVisible]   = useState(false);
  const [simulateVisible,setSimulateVisible]= useState(false);
  const [cellConfig,     setCellConfig]     = useState<CellConfig | null>(null);
  const [pulseAnim]                         = useState(new Animated.Value(1));

  // ── Função central de carga ───────────────────────────────────────────────
  async function carregarSaldo(mode: "bg" | "full") {
    setLoadMode(mode);
    setErro("");
    if (mode === "full") setSaldo(null); // Estado 2: apaga o valor
    try {
      const config = await getCellConfig();
      if (!config) { router.replace("/setup"); return; }
      setCellConfig(config);
      const s = await getSaldo(config.cellSaldo);
      cachedSaldo = s;
      setSaldo(s);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao carregar saldo.");
    } finally {
      setLoadMode("idle");
    }
  }

  // ── Ao ganhar foco ────────────────────────────────────────────────────────
  // Primeiro acesso (sem cache) → full (Estado 2)
  // Retornando de outra aba (com cache) → bg (Estado 1, valor permanece)
  useFocusEffect(useCallback(() => {
    carregarSaldo(cachedSaldo !== null ? "bg" : "full");
  }, []));

  // ── Botão Atualizar → sempre Estado 2 ────────────────────────────────────
  function handleRefreshBtn() {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.85, duration: 100, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 150, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
    carregarSaldo("full");
  }

  const saldoColor = saldo !== null && saldo < 0 ? "#f85149" : "#3fb950";

  return (
    <View style={styles.container}>

      {/* ── Card do Saldo ── */}
      <View style={styles.card}>

        {/* ESTADO 1: spinner pequeno no canto, valor visível */}
        {loadMode === "bg" && (
          <ActivityIndicator size="small" color="#58a6ff" style={styles.cornerSpinner} />
        )}

        <Text style={styles.cardLabel}>Saldo Disponível</Text>

        {/* ESTADO 2: spinner grande, valor oculto */}
        {loadMode === "full" || saldo === null ? (
          <ActivityIndicator size="large" color="#58a6ff" style={{ marginVertical: 16 }} />
        ) : (
          <Text style={[styles.saldoValue, { color: saldoColor }]}>
            {formatCurrency(saldo)}
          </Text>
        )}

        {/* Badge — só aparece quando temos valor */}
        {saldo !== null && loadMode !== "full" && (
          <View style={[styles.saldoBadge, { backgroundColor: saldo >= 0 ? "#1a3a2a" : "#3a1a1a" }]}>
            <Ionicons
              name={saldo >= 0 ? "trending-up-outline" : "trending-down-outline"}
              size={14}
              color={saldoColor}
            />
            <Text style={[styles.badgeText, { color: saldoColor }]}>
              {saldo >= 0 ? "Saldo positivo" : "Saldo negativo"}
            </Text>
          </View>
        )}

        {!!erro && <Text style={styles.erroText}>{erro}</Text>}
      </View>

      {/* ── Adicionar ── */}
      <TouchableOpacity
        style={styles.btnAdicionar}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text style={styles.btnAdicionarText}>Adicionar Despesa</Text>
      </TouchableOpacity>

      {/* ── Atualizar ── */}
      <TouchableOpacity
        style={styles.btnRefresh}
        onPress={handleRefreshBtn}
        disabled={loadMode !== "idle"}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons
            name="refresh-outline"
            size={20}
            color={loadMode !== "idle" ? "#484f58" : "#58a6ff"}
          />
        </Animated.View>
        <Text style={[styles.btnRefreshText, loadMode !== "idle" && { color: "#484f58" }]}>
          Atualizar saldo
        </Text>
      </TouchableOpacity>

      {/* ── Simular saldo que vem ── */}
      {(() => {
        const simEnabled = !!(
          cellConfig?.cellCustoFixo &&
          (cellConfig?.cellSalario || cellConfig?.salarioManual != null)
        );
        return (
          <TouchableOpacity
            style={[styles.btnSimular, !simEnabled && styles.btnSimularLocked]}
            onPress={() => simEnabled && setSimulateVisible(true)}
            activeOpacity={simEnabled ? 0.85 : 1}
          >
            <Ionicons
              name={simEnabled ? "calculator-outline" : "lock-closed-outline"}
              size={20}
              color={simEnabled ? "#58a6ff" : "#484f58"}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.btnSimularText, !simEnabled && { color: "#484f58" }]}>
                Simular saldo que vem
              </Text>
              {!simEnabled && (
                <Text style={styles.btnSimularHint}>Configure custos fixos e salário em Configurações</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })()}

      <AddExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={(novoSaldo) => {
          cachedSaldo = novoSaldo;
          setSaldo(novoSaldo);
        }}
      />

      <SimulateModal
        visible={simulateVisible}
        onClose={() => setSimulateVisible(false)}
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
  cornerSpinner: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  cardLabel:  { color: "#8b949e", fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },
  saldoValue: { fontSize: 44, fontWeight: "800", letterSpacing: -1, marginBottom: 16 },
  saldoBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText:  { fontSize: 13, fontWeight: "600" },
  erroText:   { color: "#f85149", fontSize: 12, marginTop: 10, textAlign: "center" },
  btnAdicionar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#238636", borderRadius: 14, paddingVertical: 16, marginTop: 28,
    shadowColor: "#238636", shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnAdicionarText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  btnRefresh:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20, padding: 10 },
  btnRefreshText: { color: "#58a6ff", fontSize: 14 },
  btnSimular: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#161b22", borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 18,
    marginTop: 12, borderWidth: 1, borderColor: "#21262d",
  },
  btnSimularLocked: {
    borderColor: "#161b22",
    backgroundColor: "#0d1117",
  },
  btnSimularText: { color: "#58a6ff", fontSize: 15, fontWeight: "700" },
  btnSimularHint: { color: "#484f58", fontSize: 11, marginTop: 2 },
});
