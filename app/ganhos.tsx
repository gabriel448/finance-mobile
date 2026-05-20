import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, Modal, TextInput, ActivityIndicator,
  Animated,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import {
  getGanhosVariaveis, addGanhoVariavel,
  clearGanhosVariaveis, zeroCellGanhosIfNewMonth, reconcileGanhosBonus,
  getCellConfig, GanhoVariavel, revogarGanhoVariavel, alterarGanhoVariavel,
} from "../services/sheetsService";
import GanhoDetailModal from "../components/GanhoDetailModal";
import AppAlert, { AppAlertProps } from "../components/AppAlert";

function formatValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatMonthTitle(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isCurrentMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const label = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
  return isCurrentMonth ? `${label} (este mês)` : label;
}

interface MonthSection {
  title: string;
  monthKey: string;
  timestamp: number;
  total: number;
  data: GanhoVariavel[];
}

function groupByMonth(ganhos: GanhoVariavel[]): MonthSection[] {
  const map = new Map<string, MonthSection>();
  for (const g of ganhos) {
    const key = getMonthKey(g.data);
    if (!map.has(key)) {
      const d = new Date(g.data);
      map.set(key, {
        title: formatMonthTitle(g.data),
        monthKey: key,
        timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        total: 0,
        data: [],
      });
    }
    const sec = map.get(key)!;
    sec.data.push(g);
    sec.total += g.valor;
  }
  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export default function GanhosScreen() {
  const [ganhos,         setGanhos]         = useState<GanhoVariavel[]>([]);
  const [refreshing,     setRefreshing]     = useState(false);
  const [addVisible,     setAddVisible]     = useState(false);
  const [clearVisible,   setClearVisible]   = useState(false);
  const [detailVisible,  setDetailVisible]  = useState(false);
  const [selectedGanho,  setSelectedGanho]  = useState<GanhoVariavel | null>(null);
  const [nome,           setNome]           = useState("");
  const [valor,          setValor]          = useState("");
  const [saving,         setSaving]         = useState(false);
  const [addSuccess,     setAddSuccess]     = useState(false);
  const [cellConfigured, setCellConfigured] = useState(true);
  const [alertConfig,    setAlertConfig]    = useState<Omit<AppAlertProps, "visible" | "onClose"> | null>(null);

  function showAlert(cfg: Omit<AppAlertProps, "visible" | "onClose">) { setAlertConfig(cfg); }

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const player      = useAudioPlayer(require("../assets/reembolso.mp3"));

  const sections = useMemo(() => groupByMonth(ganhos), [ganhos]);

  async function carregar() {
    const config = await getCellConfig();
    setCellConfigured(!!config?.cellGanhosVariaveis);
    const data = await getGanhosVariaveis();
    setGanhos(data);
  }

  useFocusEffect(
    useCallback(() => {
      zeroCellGanhosIfNewMonth();
      carregar().then(async () => {
        const reconciled = await reconcileGanhosBonus();
        setGanhos(reconciled);
      });
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  }

  function resetAddModal() {
    setNome("");
    setValor("");
    setAddSuccess(false);
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
  }

  function showAddSuccess() {
    setAddSuccess(true);

    try {
      player.volume = 1.0;
      player.seekTo(0);
      player.play();
    } catch {}

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 18,
        speed: 14,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setAddVisible(false);
      resetAddModal();
    }, 1400);
  }

  async function handleAdd() {
    const nomeTrimmed = nome.trim();
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!nomeTrimmed) { showAlert({ type: "error", title: "Campo obrigatório", message: "Informe o nome do ganho." }); return; }
    if (isNaN(valorNum) || valorNum <= 0) { showAlert({ type: "error", title: "Valor inválido", message: "Informe um valor válido." }); return; }

    setSaving(true);
    try {
      const novo = await addGanhoVariavel(nomeTrimmed, valorNum);
      setGanhos((prev) => [novo, ...prev]);
      showAddSuccess();
    } catch (e: any) {
      const msg = e.message ?? "Não foi possível adicionar o ganho.";
      const scriptDesatualizado = msg.toLowerCase().includes("desconhecida");
      showAlert({
        type: "error",
        title: "Erro",
        message: scriptDesatualizado
          ? "O Apps Script não reconheceu a ação. Recopie o código Code.gs no site ou no app (Onboarding) e publique uma nova versão no script.google.com."
          : msg,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleClearAll() {
    await clearGanhosVariaveis();
    setGanhos([]);
    setClearVisible(false);
  }

  function handleItemPress(item: GanhoVariavel) {
    if (item.id.startsWith("bonus_planilha_")) return;
    setSelectedGanho(item);
    setDetailVisible(true);
  }

  async function handleRevoke(ganho: GanhoVariavel) {
    await revogarGanhoVariavel(ganho.id, ganho.valor);
    setGanhos((prev) => prev.filter((g) => g.id !== ganho.id));
  }

  async function handleAlter(ganho: GanhoVariavel, novoValor: number) {
    const nova = await alterarGanhoVariavel(ganho.id, ganho.valor, novoValor);
    setGanhos(nova);
  }

  function renderSectionHeader({ section }: { section: MonthSection }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionTotal}>{formatValor(section.total)}</Text>
      </View>
    );
  }

  function renderItem({ item }: { item: GanhoVariavel }) {
    const hora    = new Date(item.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const dia     = new Date(item.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const isBonus = item.id.startsWith("bonus_planilha_");
    return (
      <TouchableOpacity
        style={[styles.item, isBonus && styles.itemBonus]}
        onPress={() => handleItemPress(item)}
        activeOpacity={isBonus ? 1 : 0.75}
      >
        <View style={[styles.itemIconBox, isBonus && styles.itemIconBoxBonus]}>
          <Ionicons name={isBonus ? "sparkles-outline" : "arrow-up-outline"} size={18} color={isBonus ? "#d4a017" : "#3fb950"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemNome, isBonus && styles.itemNomeBonus]} numberOfLines={1}>{item.nome}</Text>
          {isBonus && <Text style={styles.itemBonusLabel}>Calculado automaticamente</Text>}
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemValor, isBonus && styles.itemValorBonus]}>{formatValor(item.valor)}</Text>
          <Text style={styles.itemData}>{dia} {hora}</Text>
        </View>
        {!isBonus && <Ionicons name="chevron-forward-outline" size={14} color="#30363d" />}
      </TouchableOpacity>
    );
  }

  if (!cellConfigured) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1117" />
        <View style={styles.emptyState}>
          <Ionicons name="trending-up-outline" size={64} color="#21262d" />
          <Text style={styles.emptyTitle}>Célula não configurada</Text>
          <Text style={styles.emptySubtitle}>
            Configure a célula de ganhos variáveis em Configurações → Alterar células.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

      {ganhos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trending-up-outline" size={64} color="#21262d" />
          <Text style={styles.emptyTitle}>Sem ganhos variáveis</Text>
          <Text style={styles.emptySubtitle}>
            Toque em + para registrar um ganho extra deste mês.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {ganhos.length} registro{ganhos.length !== 1 ? "s" : ""}
            </Text>
            <Text style={styles.summaryMeses}>
              {sections.length} {sections.length !== 1 ? "meses" : "mês"}
            </Text>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                tintColor="#3fb950" colors={["#3fb950"]} />
            }
            SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
            ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          />
        </>
      )}

      {/* FAB — adicionar */}
      <TouchableOpacity style={styles.fab} onPress={() => { resetAddModal(); setAddVisible(true); }} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* FAB — apagar (canto esquerdo) */}
      {ganhos.length > 0 && (
        <TouchableOpacity style={styles.fabDelete} onPress={() => setClearVisible(true)} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal: adicionar ganho */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => { if (!saving && !addSuccess) { setAddVisible(false); resetAddModal(); } }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Overlay de sucesso dentro do modal de add */}
            {addSuccess && (
              <Animated.View style={[styles.addSuccessOverlay, { opacity: opacityAnim }]}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={56} color="#fff" />
                  </View>
                </Animated.View>
                <Animated.Text style={[styles.addSuccessText, { opacity: opacityAnim }]}>
                  Ganho adicionado!
                </Animated.Text>
              </Animated.View>
            )}

            <Text style={styles.modalTitle}>Novo Ganho Variável</Text>

            <Text style={styles.modalLabel}>Descrição</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="ex: Freelance, bônus..."
              placeholderTextColor="#484f58"
              value={nome}
              onChangeText={setNome}
              autoFocus
              editable={!saving && !addSuccess}
            />

            <Text style={styles.modalLabel}>Valor (R$)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputValor]}
              placeholder="0,00"
              placeholderTextColor="#484f58"
              value={valor}
              onChangeText={setValor}
              keyboardType="decimal-pad"
              editable={!saving && !addSuccess}
            />

            <TouchableOpacity
              style={[styles.btnConfirm, (saving || addSuccess) && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={saving || addSuccess}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="checkmark-outline" size={18} color="#fff" /><Text style={styles.btnConfirmText}>Adicionar</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnCancelar, (saving || addSuccess) && { opacity: 0.4 }]}
              onPress={() => { if (!saving && !addSuccess) { setAddVisible(false); resetAddModal(); } }}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: apagar tudo */}
      <Modal visible={clearVisible} transparent animationType="fade" onRequestClose={() => setClearVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="warning-outline" size={36} color="#f85149" />
            </View>
            <Text style={styles.modalTitle}>Apagar histórico?</Text>
            <Text style={styles.confirmSubtitle}>
              Todos os {ganhos.length} registro{ganhos.length !== 1 ? "s" : ""} serão removidos permanentemente.
            </Text>
            <TouchableOpacity style={styles.btnDeletar} onPress={handleClearAll} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.btnConfirmText}>Apagar tudo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setClearVisible(false)} activeOpacity={0.8}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {alertConfig && (
        <AppAlert
          {...alertConfig}
          visible
          onClose={() => setAlertConfig(null)}
        />
      )}

      {/* Modal: detalhe do ganho */}
      <GanhoDetailModal
        visible={detailVisible}
        ganho={selectedGanho}
        onClose={() => setDetailVisible(false)}
        onRevoke={handleRevoke}
        onAlter={handleAlter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },

  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: "#21262d",
  },
  summaryText:  { color: "#8b949e", fontSize: 12 },
  summaryMeses: { color: "#484f58", fontSize: 12 },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#0d1117",
    borderBottomWidth: 1, borderColor: "#21262d", marginTop: 8,
  },
  sectionTitle: {
    color: "#8b949e", fontSize: 12, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  sectionTotal: { color: "#3fb950", fontSize: 13, fontWeight: "700" },

  listContent: { paddingBottom: 120 },

  item: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#161b22",
    paddingHorizontal: 14, paddingVertical: 12,
    marginHorizontal: 12, marginVertical: 3,
    borderRadius: 12, borderWidth: 1, borderColor: "#21262d",
  },
  itemBonus: {
    borderColor: "rgba(212,160,23,0.35)",
    backgroundColor: "rgba(212,160,23,0.05)",
  },
  itemIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: "rgba(63,185,80,0.08)",
    borderWidth: 1, borderColor: "rgba(63,185,80,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  itemIconBoxBonus: {
    backgroundColor: "rgba(212,160,23,0.10)",
    borderColor: "rgba(212,160,23,0.25)",
  },
  itemNome:      { flex: 1, color: "#e6edf3", fontSize: 15, fontWeight: "600" },
  itemNomeBonus: { color: "#d4a017" },
  itemBonusLabel: { color: "#d4a01799", fontSize: 11, marginTop: 2 },
  itemRight: { alignItems: "flex-end", gap: 2 },
  itemValor:      { color: "#3fb950", fontSize: 15, fontWeight: "700" },
  itemValorBonus: { color: "#d4a017" },
  itemData:  { color: "#484f58", fontSize: 11 },

  emptyState: {
    flex: 1, justifyContent: "center", alignItems: "center",
    gap: 12, paddingHorizontal: 40,
  },
  emptyTitle:    { color: "#484f58", fontSize: 22, fontWeight: "700" },
  emptySubtitle: { color: "#484f58", fontSize: 14, textAlign: "center", lineHeight: 20 },

  fab: {
    position: "absolute", bottom: 60, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#238636",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#3fb950", shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabDelete: {
    position: "absolute", bottom: 60, left: 24,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#b91c1c",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#f85149", shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#161b22", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, borderTopWidth: 1, borderColor: "#30363d",
    overflow: "hidden",
  },

  // ── Sucesso no modal de add ────────────────────────────────────────────────
  addSuccessOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#161b22",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  checkCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "#238636",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#3fb950", shadowOpacity: 0.5, shadowRadius: 24, elevation: 10,
  },
  addSuccessText: {
    color: "#3fb950", fontSize: 20, fontWeight: "700",
    marginTop: 20, letterSpacing: 0.3,
  },

  modalTitle: { color: "#e6edf3", fontSize: 20, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  modalLabel: { color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  modalInput: {
    backgroundColor: "#0d1117", color: "#e6edf3",
    borderWidth: 1, borderColor: "#30363d", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, marginBottom: 16,
  },
  modalInputValor: { fontSize: 24, fontWeight: "700", textAlign: "center", letterSpacing: 1 },

  btnConfirm: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#238636", borderRadius: 12, paddingVertical: 14, marginBottom: 10,
  },
  btnConfirmText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  btnDeletar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#b91c1c", borderRadius: 12, paddingVertical: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#f85149",
  },

  btnCancelar: {
    alignItems: "center", paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#21262d", borderWidth: 1, borderColor: "#30363d",
  },
  btnCancelarText: { color: "#8b949e", fontSize: 15, fontWeight: "600" },

  confirmIconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#2d1117",
    alignItems: "center", justifyContent: "center", marginBottom: 16, alignSelf: "center",
    borderWidth: 1, borderColor: "#f8514940",
  },
  confirmSubtitle: {
    color: "#8b949e", fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 24,
  },
});
