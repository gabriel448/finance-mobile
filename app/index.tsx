import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSaldo, getCellConfig, CellConfig, zeroCellGasto } from "../services/sheetsService";
import AddExpenseModal from "../components/AddExpenseModal";

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
  const [modalVisible,  setModalVisible]  = useState(false);
  const [zerarVisible,  setZerarVisible]  = useState(false);
  const [zerandoGastos,     setZerandoGastos]     = useState(false);
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

  async function handleZerarGastos() {
    if (!cellConfig) return;
    setZerandoGastos(true);
    try {
      const novoSaldo = await zeroCellGasto(cellConfig.cellGasto, cellConfig.cellSaldo);
      cachedSaldo = novoSaldo;
      setSaldo(novoSaldo);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao zerar gastos.");
    } finally {
      setZerandoGastos(false);
      setZerarVisible(false);
    }
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

      {/* ── Zerar Gastos ── */}
      <TouchableOpacity
        style={styles.btnZerar}
        onPress={() => setZerarVisible(true)}
        disabled={loadMode !== "idle" || !cellConfig}
        activeOpacity={0.8}
      >
        <Ionicons name="trash-outline" size={18} color="#f85149" />
        <Text style={styles.btnZerarText}>Zerar gastos do mês</Text>
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

      <AddExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={(novoSaldo) => {
          cachedSaldo = novoSaldo;
          setSaldo(novoSaldo);
        }}
      />

      <Modal visible={zerarVisible} transparent animationType="fade" onRequestClose={() => setZerarVisible(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="trash-outline" size={32} color="#f85149" />
            </View>
            <Text style={styles.confirmTitle}>Zerar gastos?</Text>
            <Text style={styles.confirmSubtitle}>
              O valor da célula de despesas será zerado na planilha. Esta ação não pode ser desfeita.
            </Text>
            <TouchableOpacity
              style={styles.btnConfirmZerar}
              onPress={handleZerarGastos}
              disabled={zerandoGastos}
              activeOpacity={0.8}
            >
              {zerandoGastos
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark-outline" size={18} color="#fff" /><Text style={styles.btnConfirmZerarText}>Confirmar</Text></>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnCancelarZerar}
              onPress={() => setZerarVisible(false)}
              disabled={zerandoGastos}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelarZerarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  btnZerar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, paddingVertical: 13, marginTop: 12,
    borderWidth: 1, borderColor: "rgba(248,81,73,0.3)",
    backgroundColor: "rgba(248,81,73,0.06)",
  },
  btnZerarText: { color: "#f85149", fontSize: 15, fontWeight: "700" },
  confirmOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 28,
  },
  confirmCard: {
    backgroundColor: "#161b22", borderRadius: 20, width: "100%",
    padding: 28, alignItems: "center", borderWidth: 1, borderColor: "#30363d",
  },
  confirmIconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "rgba(248,81,73,0.08)", borderWidth: 1, borderColor: "rgba(248,81,73,0.3)",
    alignItems: "center", justifyContent: "center", marginBottom: 18,
  },
  confirmTitle: { color: "#e6edf3", fontSize: 20, fontWeight: "700", marginBottom: 10 },
  confirmSubtitle: { color: "#8b949e", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 28 },
  btnConfirmZerar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%", backgroundColor: "#b91c1c", borderRadius: 12, paddingVertical: 15, marginBottom: 10,
  },
  btnConfirmZerarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnCancelarZerar: {
    width: "100%", alignItems: "center", paddingVertical: 14,
    borderRadius: 12, backgroundColor: "#21262d", borderWidth: 1, borderColor: "#30363d",
  },
  btnCancelarZerarText: { color: "#8b949e", fontSize: 15, fontWeight: "600" },
});
