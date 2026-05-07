import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getInstallments, Installment, payInstallment, payAllInstallments, deleteInstallment, getCellConfig } from "../services/sheetsService";
import { Ionicons } from "@expo/vector-icons";
import InstallmentDetailModal from "../components/InstallmentDetailModal";
import AddInstallmentModal from "../components/AddInstallmentModal";

function formatValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function InstallmentsScreen() {
  const router = useRouter();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);
  
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [payingAll, setPayingAll] = useState(false);

  async function checkConfigAndLoad() {
    setLoading(true);
    const config = await getCellConfig();
    if (!config || !config.cellParcelasStart) {
      setIsConfigured(false);
      setLoading(false);
      return;
    }
    setIsConfigured(true);
    await carregarParcelas();
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      checkConfigAndLoad();
    }, [])
  );

  async function carregarParcelas() {
    try {
      const data = await getInstallments();
      setInstallments(data);
    } catch (e) {
      console.log(e);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await carregarParcelas();
    setRefreshing(false);
  }

  function handlePress(item: Installment) {
    setSelectedInstallment(item);
    setDetailVisible(true);
  }

  async function handlePayAll() {
    setPayingAll(true);
    try {
      await payAllInstallments();
      await carregarParcelas();
    } catch (e) {
      console.log(e);
    } finally {
      setPayingAll(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#58a6ff" />
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1117" />
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color="#21262d" />
          <Text style={styles.emptyTitle}>Configuração Necessária</Text>
          <Text style={styles.emptySubtitle}>
            Para ter acesso à aba de parcelas, você precisa configurar a célula inicial na tela de configurações.
          </Text>
          <TouchableOpacity
            style={styles.btnConfig}
            onPress={() => router.push("/setup")}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={styles.btnConfigText}>Configurar Agora</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderItem({ item, index }: { item: Installment; index: number }) {
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <View style={styles.itemBadge}>
            <Text style={styles.itemRestantes}>{item.restantes}x</Text>
          </View>
          <View>
            <Text style={styles.itemNome} numberOfLines={1}>{item.nome}</Text>
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

      {installments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color="#21262d" />
          <Text style={styles.emptyTitle}>Sem parcelas</Text>
          <Text style={styles.emptySubtitle}>
            Você não possui nenhuma parcela ativa.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>{installments.length} item(s) parcelado(s)</Text>
            <TouchableOpacity
              style={styles.btnPayAll}
              onPress={handlePayAll}
              disabled={payingAll}
              activeOpacity={0.7}
            >
              {payingAll ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="cash-outline" size={16} color="#fff" />
                  <Text style={styles.btnPayAllText}>Pagar Todas</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={installments}
            keyExtractor={(item) => String(item.rowIndex)}
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

      {/* ── FAB — adicionar parcela ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAddVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <InstallmentDetailModal
        visible={detailVisible}
        installment={selectedInstallment}
        onClose={() => setDetailVisible(false)}
        onPay={async (inst) => {
          const res = await payInstallment(inst.rowIndex);
          carregarParcelas();
          return res;
        }}
        onDelete={async (inst) => {
          await deleteInstallment(inst.rowIndex);
          carregarParcelas();
        }}
      />

      <AddInstallmentModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={() => carregarParcelas()}
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
  btnPayAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#238636",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnPayAllText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    padding: 12,
    paddingBottom: 96,
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
  itemBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#21262d",
    justifyContent: "center",
    alignItems: "center",
  },
  itemRestantes: {
    color: "#3fb950",
    fontSize: 14,
    fontWeight: "700",
  },
  itemNome: {
    color: "#e6edf3",
    fontSize: 16,
    fontWeight: "600",
    maxWidth: 180,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemValor: {
    color: "#f85149",
    fontSize: 16,
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
    color: "#e6edf3",
    fontSize: 22,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#8b949e",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  btnConfig: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1f6feb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnConfigText: {
    color: "#fff",
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1f6feb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#58a6ff",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
