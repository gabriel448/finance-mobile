import React, { useState, useEffect } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCellConfig, getInstallments, readCellAsNumber, Installment } from "../services/sheetsService";
import { getPaidInstallments } from "../services/localStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step = "loading" | "unpaid-warning" | "result" | "error";

interface SimResult {
  salario:               number;
  custoFixo:             number;
  parcelasProximoMes:    number;
  saldoSimulado:         number;
  detalheParcelas:       { nome: string; valor: number; motivo: string }[];
}

function formatValor(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SimulateModal({ visible, onClose }: Props) {
  const router = useRouter();
  const [step,         setStep]         = useState<Step>("loading");
  const [erro,         setErro]         = useState("");
  const [result,       setResult]       = useState<SimResult | null>(null);
  const [unpaidItems,  setUnpaidItems]  = useState<Installment[]>([]);

  // State intermediário guardado para após o warning
  const [pendingCalc, setPendingCalc] = useState<{
    salario: number;
    custoFixo: number;
    allInstallments: Installment[];
    paidSet: Set<string>;
  } | null>(null);

  useEffect(() => {
    if (visible) runSimulation();
  }, [visible]);

  async function runSimulation() {
    setStep("loading");
    setErro("");
    setResult(null);
    setUnpaidItems([]);
    setPendingCalc(null);

    try {
      const config = await getCellConfig();
      if (!config) throw new Error("Configuração não encontrada.");
      if (!config.cellCustoFixo) throw new Error("Célula de custos fixos não configurada.");

      const temSalario = config.cellSalario || config.salarioManual != null;
      if (!temSalario) throw new Error("Salário/capital não configurado.");

      // Busca em paralelo
      const [custoFixo, salarioCell, paidList, allInstallments] = await Promise.all([
        readCellAsNumber(config.cellCustoFixo),
        config.cellSalario ? readCellAsNumber(config.cellSalario) : Promise.resolve(null),
        getPaidInstallments(),
        config.cellParcelasStart ? getInstallments() : Promise.resolve([]),
      ]);

      const salario = salarioCell ?? config.salarioManual ?? 0;
      const paidSet = new Set(paidList);

      const unpaid = allInstallments.filter((i) => !paidSet.has(i.nome));

      if (unpaid.length > 0) {
        setUnpaidItems(unpaid);
        setPendingCalc({ salario, custoFixo, allInstallments, paidSet });
        setStep("unpaid-warning");
      } else {
        calcResult(salario, custoFixo, allInstallments, paidSet);
      }
    } catch (e: any) {
      setErro(e.message ?? "Erro ao simular.");
      setStep("error");
    }
  }

  function calcResult(
    salario: number,
    custoFixo: number,
    allInstallments: Installment[],
    paidSet: Set<string>
  ) {
    const detalhe: SimResult["detalheParcelas"] = [];
    let totalParcelas = 0;

    for (const item of allInstallments) {
      const paid = paidSet.has(item.nome);

      if (paid) {
        // Já pagou este mês: restantes na planilha já foi decrementado.
        // Se ainda sobra, vai aparecer no próximo mês.
        if (item.restantes > 0) {
          detalhe.push({ nome: item.nome, valor: item.valor, motivo: "ainda tem parcelas" });
          totalParcelas += item.valor;
        }
        // restantes == 0 → encerrou, não entra
      } else {
        // Não pagou ainda: vai pagar este mês → restantes - 1
        // Se restantes - 1 > 0, ainda vai aparecer no próximo mês
        if (item.restantes > 1) {
          detalhe.push({ nome: item.nome, valor: item.valor, motivo: `${item.restantes - 1}x restantes após este mês` });
          totalParcelas += item.valor;
        }
        // restantes == 1 → vai encerrar este mês, não entra no próximo
      }
    }

    const saldoSimulado = salario - custoFixo - totalParcelas;

    setResult({ salario, custoFixo, parcelasProximoMes: totalParcelas, saldoSimulado, detalheParcelas: detalhe });
    setStep("result");
  }

  function handleContinuarSemPagar() {
    if (!pendingCalc) return;
    const { salario, custoFixo, allInstallments, paidSet } = pendingCalc;
    calcResult(salario, custoFixo, allInstallments, paidSet);
  }

  function handleClose() {
    setStep("loading");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>

        {/* ── Loading ── */}
        {step === "loading" && (
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#58a6ff" style={{ marginVertical: 32 }} />
            <Text style={styles.loadingText}>Calculando simulação…</Text>
          </View>
        )}

        {/* ── Erro ── */}
        {step === "error" && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle-outline" size={36} color="#f85149" />
            </View>
            <Text style={styles.title}>Não foi possível simular</Text>
            <Text style={styles.subtitle}>{erro}</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Aviso de parcelas não pagas ── */}
        {step === "unpaid-warning" && (
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(88,166,255,0.08)", borderColor: "#58a6ff40" }]}>
              <Ionicons name="card-outline" size={36} color="#58a6ff" />
            </View>
            <Text style={styles.title}>Parcelas não pagas</Text>
            <Text style={styles.subtitle}>
              Você tem {unpaidItems.length} item{unpaidItems.length !== 1 ? "s" : ""} parcelado{unpaidItems.length !== 1 ? "s" : ""} não {unpaidItems.length !== 1 ? "pagos" : "pago"} este mês. Deseja pagá-los agora?
            </Text>

            <View style={styles.unpaidList}>
              {unpaidItems.map((item) => (
                <View key={item.rowIndex} style={styles.unpaidItem}>
                  <Text style={styles.unpaidNome} numberOfLines={1}>{item.nome}</Text>
                  <Text style={styles.unpaidValor}>{formatValor(item.valor)}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => { handleClose(); router.push("/installments"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={16} color="#fff" />
              <Text style={styles.btnPrimaryText}>Ir para Parcelas</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={handleContinuarSemPagar} activeOpacity={0.8}>
              <Text style={styles.btnSecondaryText}>Continuar assim</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Resultado ── */}
        {step === "result" && result && (
          <View style={[styles.card, { paddingBottom: 24 }]}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(63,185,80,0.08)", borderColor: "#3fb95040" }]}>
              <Ionicons name="analytics-outline" size={36} color="#3fb950" />
            </View>
            <Text style={styles.title}>Saldo simulado do próximo mês</Text>

            <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
              {/* Linha de saldo simulado */}
              <View style={[styles.resultBigCard, {
                borderColor: result.saldoSimulado >= 0 ? "rgba(63,185,80,0.3)" : "rgba(248,81,73,0.3)",
                backgroundColor: result.saldoSimulado >= 0 ? "rgba(63,185,80,0.06)" : "rgba(248,81,73,0.06)",
              }]}>
                <Text style={styles.resultBigLabel}>Saldo previsto</Text>
                <Text style={[styles.resultBigValue, { color: result.saldoSimulado >= 0 ? "#3fb950" : "#f85149" }]}>
                  {formatValor(result.saldoSimulado)}
                </Text>
              </View>

              {/* Breakdown */}
              <View style={styles.breakdown}>
                <BreakdownRow label="Salário / Capital" value={result.salario} positive />
                <BreakdownRow label="Custos fixos" value={result.custoFixo} />
                <BreakdownRow label="Parcelas do próximo mês" value={result.parcelasProximoMes} />
              </View>

              {/* Detalhe das parcelas */}
              {result.detalheParcelas.length > 0 && (
                <>
                  <Text style={styles.detailSectionTitle}>Parcelas incluídas no cálculo</Text>
                  {result.detalheParcelas.map((p, i) => (
                    <View key={i} style={styles.detailItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailNome} numberOfLines={1}>{p.nome}</Text>
                        <Text style={styles.detailMotivo}>{p.motivo}</Text>
                      </View>
                      <Text style={styles.detailValor}>{formatValor(p.valor)}</Text>
                    </View>
                  ))}
                </>
              )}

              {result.detalheParcelas.length === 0 && result.parcelasProximoMes === 0 && (
                <View style={styles.noInstallments}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#3fb950" />
                  <Text style={styles.noInstallmentsText}>Nenhuma parcela no próximo mês!</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

function BreakdownRow({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const color = positive ? "#3fb950" : "#f85149";
  const sign  = positive ? "+" : "−";
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, { color }]}>{sign} {formatValor(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#161b22", borderRadius: 20, width: "100%",
    padding: 24, alignItems: "center",
    borderWidth: 1, borderColor: "#30363d",
    maxHeight: "88%",
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(248,81,73,0.08)",
    borderWidth: 1, borderColor: "#f8514940",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  title: {
    color: "#e6edf3", fontSize: 18, fontWeight: "700",
    textAlign: "center", marginBottom: 8,
  },
  subtitle: {
    color: "#8b949e", fontSize: 14, textAlign: "center",
    lineHeight: 20, marginBottom: 20,
  },
  loadingText: { color: "#8b949e", fontSize: 14, marginBottom: 16 },

  // ── Unpaid list ────────────────────────────────────────────────────────────
  unpaidList: {
    width: "100%", backgroundColor: "#0d1117",
    borderRadius: 10, borderWidth: 1, borderColor: "#21262d",
    marginBottom: 20, maxHeight: 160, overflow: "hidden",
  },
  unpaidItem: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: "#21262d",
  },
  unpaidNome:  { color: "#e6edf3", fontSize: 14, fontWeight: "600", flex: 1 },
  unpaidValor: { color: "#f85149", fontSize: 14, fontWeight: "700" },

  // ── Resultado ─────────────────────────────────────────────────────────────
  resultScroll: { width: "100%", marginBottom: 4 },
  resultBigCard: {
    width: "100%", borderRadius: 14, borderWidth: 1,
    paddingVertical: 18, paddingHorizontal: 20,
    alignItems: "center", marginBottom: 16,
  },
  resultBigLabel: { color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  resultBigValue: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },

  breakdown: {
    width: "100%", backgroundColor: "#0d1117",
    borderRadius: 10, borderWidth: 1, borderColor: "#21262d",
    marginBottom: 16, paddingVertical: 4,
  },
  breakdownRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: "#21262d",
  },
  breakdownLabel: { color: "#8b949e", fontSize: 13 },
  breakdownValue: { fontSize: 13, fontWeight: "700" },

  detailSectionTitle: {
    color: "#484f58", fontSize: 11, textTransform: "uppercase",
    letterSpacing: 0.8, alignSelf: "flex-start", marginBottom: 8,
  },
  detailItem: {
    width: "100%", flexDirection: "row", alignItems: "center",
    backgroundColor: "#0d1117", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 6, borderWidth: 1, borderColor: "#21262d",
  },
  detailNome:   { color: "#e6edf3", fontSize: 13, fontWeight: "600" },
  detailMotivo: { color: "#484f58", fontSize: 11, marginTop: 2 },
  detailValor:  { color: "#f85149", fontSize: 13, fontWeight: "700" },

  noInstallments: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, justifyContent: "center",
  },
  noInstallmentsText: { color: "#3fb950", fontSize: 14, fontWeight: "600" },

  // ── Botões ────────────────────────────────────────────────────────────────
  btnPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%", backgroundColor: "#1f6feb", borderRadius: 12,
    paddingVertical: 14, marginBottom: 10,
  },
  btnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnSecondary: {
    width: "100%", alignItems: "center",
    paddingVertical: 13, borderRadius: 12,
    backgroundColor: "#21262d", borderWidth: 1, borderColor: "#30363d",
  },
  btnSecondaryText: { color: "#8b949e", fontSize: 15, fontWeight: "600" },
});
