import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getDespesas, removeDespesa, Despesa } from "../services/sheetsService";
import { subtractExpense, getCellConfig } from "../services/sheetsService";
import ExpenseDetailModal from "../components/ExpenseDetailModal";
import { Ionicons } from "@expo/vector-icons";

function formatData(isoString: string): string {
  const d = new Date(isoString);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = String(d.getFullYear()).slice(2);
  return `${dia}/${mes}/${ano}`;
}

function formatValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function HistoryScreen() {
  const [historico, setHistorico] = useState<Despesa[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  async function carregarHistorico() {
    const data = await getDespesas();
    setHistorico(data);
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

  // ── Reembolso: subtrai da planilha + apaga do histórico local ─────────────
  async function handleRefund(despesa: Despesa) {
    const config = await getCellConfig();
    if (!config) throw new Error("Células não configuradas. Vá em Configurações.");
    await subtractExpense(despesa.valor, config.cellGasto, config.cellSaldo);
    await removeDespesa(despesa.id);
    // Atualiza lista localmente sem reload completo
    setHistorico((prev) => prev.filter((d) => d.id !== despesa.id));
  }

  function renderItem({ item, index }: { item: Despesa; index: number }) {
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <View style={styles.itemIndexBadge}>
            <Text style={styles.itemIndex}>{index + 1}</Text>
          </View>
          <View>
            <Text style={styles.itemNome} numberOfLines={1}>{item.nome}</Text>
            <Text style={styles.itemData}>{formatData(item.data)}</Text>
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemValor}>{formatValor(item.valor)}</Text>
          <Ionicons name="chevron-forward-outline" size={16} color="#484f58" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

      {historico.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#21262d" />
          <Text style={styles.emptyTitle}>Sem despesas</Text>
          <Text style={styles.emptySubtitle}>
            Adicione sua primeira despesa na tela inicial.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>{historico.length} lançamento{historico.length !== 1 ? "s" : ""}</Text>
            <Text style={styles.summaryTotal}>
              Total:{" "}
              <Text style={styles.summaryTotalValue}>
                {formatValor(historico.reduce((acc, d) => acc + d.valor, 0))}
              </Text>
            </Text>
          </View>

          <FlatList
            data={historico}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#58a6ff"
                colors={["#58a6ff"]}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      )}

      <ExpenseDetailModal
        visible={detailVisible}
        despesa={selectedDespesa}
        onClose={() => setDetailVisible(false)}
        onRefund={handleRefund}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#21262d",
  },
  summaryText: {
    color: "#8b949e",
    fontSize: 13,
  },
  summaryTotal: {
    color: "#8b949e",
    fontSize: 13,
  },
  summaryTotalValue: {
    color: "#f85149",
    fontWeight: "700",
  },
  listContent: {
    padding: 12,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  itemIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#21262d",
    justifyContent: "center",
    alignItems: "center",
  },
  itemIndex: {
    color: "#8b949e",
    fontSize: 12,
    fontWeight: "700",
  },
  itemNome: {
    color: "#e6edf3",
    fontSize: 15,
    fontWeight: "600",
    maxWidth: 180,
  },
  itemData: {
    color: "#8b949e",
    fontSize: 12,
    marginTop: 2,
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
  separator: {
    height: 8,
  },
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
});
