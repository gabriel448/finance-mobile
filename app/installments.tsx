import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated,
  Vibration,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getInstallments, Installment, payInstallment, payAllInstallments, deleteInstallment, getCellConfig } from "../services/sheetsService";
import { getPaidInstallments, togglePaidInstallment, markInstallmentPaid, markAllInstallmentsPaid } from "../services/localStorage";
import { Ionicons } from "@expo/vector-icons";
import InstallmentDetailModal from "../components/InstallmentDetailModal";
import AddInstallmentModal from "../components/AddInstallmentModal";
import { useAudioPlayer } from "expo-audio";

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
  
  const [paidNomes, setPaidNomes] = useState<Set<string>>(new Set());
  const [confirmAllVisible, setConfirmAllVisible] = useState(false);
  const [successAllVisible, setSuccessAllVisible] = useState(false);
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const playerCheck = useAudioPlayer(require("../assets/check.mp3"));

  async function checkConfigAndLoad() {
    setLoading(true);
    const config = await getCellConfig();
    if (!config || !config.cellParcelasStart) {
      setIsConfigured(false);
      setLoading(false);
      return;
    }
    setIsConfigured(true);
    const [, paid] = await Promise.all([
      carregarParcelas(),
      getPaidInstallments(),
    ]) as [void, string[]];
    setPaidNomes(new Set(paid));
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

  async function handleLongPress(item: Installment) {
    const nowPaid = await togglePaidInstallment(item.nome);
    if (nowPaid) Vibration.vibrate([0, 40, 60, 40]);
    setPaidNomes((prev) => {
      const next = new Set(prev);
      if (nowPaid) next.add(item.nome);
      else next.delete(item.nome);
      return next;
    });
  }

  async function executePayAll() {
    setPayingAll(true);
    try {
      await payAllInstallments();
      await markAllInstallmentsPaid(installments.map((i) => i.nome));
      setPaidNomes(new Set(installments.map((i) => i.nome)));
      await carregarParcelas();

      setConfirmAllVisible(false);
      setSuccessAllVisible(true);
      
      try {
        playerCheck.volume = 1.0;
        playerCheck.seekTo(0);
        playerCheck.play();
      } catch {}

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 18, speed: 14 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        setSuccessAllVisible(false);
        scaleAnim.setValue(0);
        opacityAnim.setValue(0);
      }, 1500);

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

  function renderItem({ item }: { item: Installment }) {
    const paid = paidNomes.has(item.nome);
    return (
      <TouchableOpacity
        style={[styles.item, paid && styles.itemPaid]}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
        activeOpacity={0.7}
      >
        <View style={[styles.itemBadge, paid && styles.itemBadgePaid]}>
          {paid
            ? <Ionicons name="checkmark" size={18} color="#3fb950" />
            : <Text style={styles.itemRestantes}>{item.restantes}x</Text>
          }
        </View>
        <View style={styles.itemLeft}>
          <Text style={[styles.itemNome, paid && styles.itemNomePaid]} numberOfLines={1}>
            {item.nome}
          </Text>
          {paid && (
            <Text style={styles.itemPaidLabel}>Paga</Text>
          )}
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemValor, paid && styles.itemValorPaid]}>
            {formatValor(item.valor)}
          </Text>
          <Ionicons name="chevron-forward-outline" size={16} color={paid ? "#3fb95040" : "#484f58"} />
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
              onPress={() => setConfirmAllVisible(true)}
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
          await markInstallmentPaid(inst.nome);
          setPaidNomes((prev) => new Set([...prev, inst.nome]));
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

      <Modal visible={confirmAllVisible} transparent animationType="fade" onRequestClose={() => setConfirmAllVisible(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="help-outline" size={36} color="#58a6ff" />
            </View>
            <Text style={styles.confirmTitle}>Pagar Todas?</Text>
            <Text style={styles.confirmSubtitle}>
              Pagar 1 parcela de {installments.length} itens?
            </Text>

            <TouchableOpacity style={styles.btnConfirm} onPress={executePayAll} activeOpacity={0.8} disabled={payingAll}>
              {payingAll ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.btnConfirmText}>Confirmar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancelar} onPress={() => setConfirmAllVisible(false)} activeOpacity={0.8} disabled={payingAll}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {successAllVisible && (
        <Animated.View style={[styles.successOverlay, { opacity: opacityAnim }]}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={56} color="#fff" />
            </View>
          </Animated.View>
          <Animated.Text style={[styles.successText, { opacity: opacityAnim }]}>
            {installments.length} itens atualizados!
          </Animated.Text>
        </Animated.View>
      )}
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
    paddingBottom: 120,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#161b22",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  itemPaid: {
    backgroundColor: "rgba(63,185,80,0.05)",
    borderColor: "rgba(63,185,80,0.25)",
  },
  itemLeft: {
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
  itemBadgePaid: {
    backgroundColor: "rgba(63,185,80,0.12)",
    borderWidth: 1,
    borderColor: "rgba(63,185,80,0.3)",
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
  },
  itemNomePaid: {
    color: "#8b949e",
  },
  itemPaidLabel: {
    color: "#3fb950",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2,
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
  itemValorPaid: {
    color: "#3fb950",
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
    bottom: 60,
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
  confirmOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28,
  },
  confirmCard: {
    backgroundColor: "#161b22", borderRadius: 20, width: "100%", padding: 28, alignItems: "center", borderWidth: 1, borderColor: "#30363d",
  },
  confirmIconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#0d1117", alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: "#58a6ff40",
  },
  confirmTitle: {
    color: "#e6edf3", fontSize: 20, fontWeight: "700", marginBottom: 10, textAlign: "center",
  },
  confirmSubtitle: {
    color: "#8b949e", fontSize: 15, textAlign: "center", marginBottom: 28,
  },
  btnConfirm: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", backgroundColor: "#238636", borderRadius: 12, paddingVertical: 15, marginBottom: 10,
  },
  btnConfirmText: {
    color: "#fff", fontSize: 16, fontWeight: "700",
  },
  btnCancelar: {
    width: "100%", alignItems: "center", paddingVertical: 14, borderRadius: 12, backgroundColor: "#21262d", borderWidth: 1, borderColor: "#30363d",
  },
  btnCancelarText: {
    color: "#8b949e", fontSize: 15, fontWeight: "600",
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "#161b22", alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  checkCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: "#238636", alignItems: "center", justifyContent: "center", shadowColor: "#3fb950", shadowOpacity: 0.5, shadowRadius: 24, elevation: 10,
  },
  successText: {
    color: "#3fb950", fontSize: 20, fontWeight: "700", marginTop: 20, letterSpacing: 0.3,
  },
});
