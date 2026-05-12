import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Modal,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getDespesas, removeDespesa, Despesa, clearDespesas } from "../services/sheetsService";
import { subtractExpense, getCellConfig } from "../services/sheetsService";
import ExpenseDetailModal from "../components/ExpenseDetailModal";
import { Ionicons } from "@expo/vector-icons";

function getDayKey(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatSectionTitle(isoString: string): string {
  const d = new Date(isoString);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  if (getDayKey(isoString) === getDayKey(hoje.toISOString())) return "Hoje";
  if (getDayKey(isoString) === getDayKey(ontem.toISOString())) return "Ontem";

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = String(d.getFullYear()).slice(2);
  return `${dia}/${mes}/${ano}`;
}

function formatValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Section {
  title: string;
  dayKey: string;
  timestamp: number; // início do dia em ms, usado para ordenação
  total: number;
  data: Despesa[];
}

function groupByDay(despesas: Despesa[]): Section[] {
  const map = new Map<string, Section>();

  for (const d of despesas) {
    const key = getDayKey(d.data);
    if (!map.has(key)) {
      const date = new Date(d.data);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      map.set(key, {
        title: formatSectionTitle(d.data),
        dayKey: key,
        timestamp: startOfDay,
        total: 0,
        data: [],
      });
    }
    const section = map.get(key)!;
    section.data.push(d);
    section.total += d.valor;
  }

  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export default function HistoryScreen() {
  const [sections,       setSections]       = useState<Section[]>([]);
  const [allDespesas,    setAllDespesas]    = useState<Despesa[]>([]);
  const [refreshing,     setRefreshing]     = useState(false);
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null);
  const [detailVisible,  setDetailVisible]  = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  async function carregarHistorico() {
    const data = await getDespesas();
    setAllDespesas(data);
    setSections(groupByDay(data));
  }

  useFocusEffect(
    useCallback(() => {
      carregarHistorico();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await carregarHistorico();
    setRefreshing(false);
  }

  function handlePress(item: Despesa) {
    setSelectedDespesa(item);
    setDetailVisible(true);
  }

  async function handleRefund(despesa: Despesa) {
    const config = await getCellConfig();
    if (!config) throw new Error("Células não configuradas. Vá em Configurações.");
    await subtractExpense(despesa.valor, config.cellGasto, config.cellSaldo);
    await removeDespesa(despesa.id);
    const updated = allDespesas.filter((d) => d.id !== despesa.id);
    setAllDespesas(updated);
    setSections(groupByDay(updated));
  }

  async function handleClearAll() {
    await clearDespesas();
    setAllDespesas([]);
    setSections([]);
    setConfirmVisible(false);
  }

  const totalLancamentos = allDespesas.length;

  function renderSectionHeader({ section }: { section: Section }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionTotal}>{formatValor(section.total)}</Text>
      </View>
    );
  }

  function renderItem({ item }: { item: Despesa }) {
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handlePress(item)}
        activeOpacity={0.75}
      >
        <View style={styles.itemIconBox}>
          <Ionicons name="arrow-down-outline" size={18} color="#f85149" />
        </View>
        <Text style={styles.itemNome} numberOfLines={1}>{item.nome}</Text>
        <View style={styles.itemRight}>
          <Text style={styles.itemValor}>{formatValor(item.valor)}</Text>
          <Ionicons name="chevron-forward-outline" size={14} color="#30363d" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#21262d" />
          <Text style={styles.emptyTitle}>Sem despesas</Text>
          <Text style={styles.emptySubtitle}>
            Adicione sua primeira despesa na tela inicial.
          </Text>
        </View>
      ) : (
        <>
          {/* Barra de resumo geral */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {totalLancamentos} lançamento{totalLancamentos !== 1 ? "s" : ""}
            </Text>
            <Text style={styles.summaryDays}>
              {sections.length} dia{sections.length !== 1 ? "s" : ""}
            </Text>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#58a6ff"
                colors={["#58a6ff"]}
              />
            }
            SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          />
        </>
      )}

      {/* FAB — apagar histórico */}
      {sections.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setConfirmVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <ExpenseDetailModal
        visible={detailVisible}
        despesa={selectedDespesa}
        onClose={() => setDetailVisible(false)}
        onRefund={handleRefund}
      />

      {/* Modal de confirmação — apagar tudo */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="warning-outline" size={36} color="#f85149" />
            </View>

            <Text style={styles.confirmTitle}>Apagar histórico?</Text>
            <Text style={styles.confirmSubtitle}>
              Todos os {totalLancamentos} lançamento{totalLancamentos !== 1 ? "s" : ""} serão removidos permanentemente. Esta ação não pode ser desfeita.
            </Text>

            <TouchableOpacity
              style={styles.btnDeletar}
              onPress={handleClearAll}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.btnDeletarText}>Apagar tudo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={() => setConfirmVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelarText}>Cancelar</Text>
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
  },

  // ── Barra de resumo geral ──────────────────────────────────────────────────
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#21262d",
  },
  summaryText: {
    color: "#8b949e",
    fontSize: 12,
  },
  summaryDays: {
    color: "#484f58",
    fontSize: 12,
  },

  // ── Cabeçalho de seção (dia) ───────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0d1117",
    borderBottomWidth: 1,
    borderColor: "#21262d",
    marginTop: 8,
  },
  sectionTitle: {
    color: "#8b949e",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionTotal: {
    color: "#f85149",
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Itens ─────────────────────────────────────────────────────────────────
  listContent: {
    paddingBottom: 120,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#161b22",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  itemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(248,81,73,0.08)",
    borderWidth: 1,
    borderColor: "rgba(248,81,73,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemNome: {
    flex: 1,
    color: "#e6edf3",
    fontSize: 15,
    fontWeight: "600",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemValor: {
    color: "#f85149",
    fontSize: 15,
    fontWeight: "700",
  },
  itemSeparator: {
    height: 0,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: "#484f58",
    fontSize: 22,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#484f58",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: 60,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#b91c1c",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f85149",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Modal de confirmação ───────────────────────────────────────────────────
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  confirmCard: {
    backgroundColor: "#161b22",
    borderRadius: 20,
    width: "100%",
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  confirmIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2d1117",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f8514940",
  },
  confirmTitle: {
    color: "#e6edf3",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  confirmSubtitle: {
    color: "#8b949e",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  btnDeletar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#b91c1c",
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f85149",
    shadowColor: "#f85149",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDeletarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnCancelar: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  btnCancelarText: {
    color: "#8b949e",
    fontSize: 15,
    fontWeight: "600",
  },
});
