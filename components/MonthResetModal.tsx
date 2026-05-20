import React, { useState, useRef, useEffect } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import {
  getCellConfig, resetMonthlyCells, readCellAsNumber, addGanhoVariavel,
} from "../services/sheetsService";
import { markMonthResetSeen } from "../services/localStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step = "reset" | "loading" | "success" | "saldo" | "saldo-loading";

function formatValor(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MonthResetModal({ visible, onClose }: Props) {
  const [step,           setStep]           = useState<Step>("reset");
  const [dontShowAgain,  setDontShowAgain]  = useState(false);
  const [saldoAnterior,  setSaldoAnterior]  = useState(0);
  const [erro,           setErro]           = useState("");

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const player      = useAudioPlayer(require("../assets/reembolso.mp3"));

  useEffect(() => {
    if (visible) {
      setStep("reset");
      setDontShowAgain(false);
      setErro("");
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  async function handleResetar() {
    setErro("");
    setStep("loading");
    try {
      const config = await getCellConfig();
      if (!config?.cellGasto) throw new Error("Célula de gastos não configurada.");

      // Lê saldo ANTES do reset para oferecer carry-over depois
      const saldoAtual = config.cellSaldo
        ? await readCellAsNumber(config.cellSaldo)
        : 0;
      setSaldoAnterior(saldoAtual);

      await resetMonthlyCells();
      await markMonthResetSeen();

      setStep("success");
      try { player.volume = 1.0; player.seekTo(0); player.play(); } catch {}

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 18, speed: 14 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      // Usa variável local (não state) para evitar problema de closure
      setTimeout(() => (saldoAtual > 0 ? setStep("saldo") : onClose()), 1400);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao resetar. Tente novamente.");
      setStep("reset");
    }
  }

  async function handleNao() {
    if (dontShowAgain) await markMonthResetSeen();
    onClose();
  }

  async function handleAdicionarSaldo() {
    setStep("saldo-loading");
    try {
      await addGanhoVariavel("Saldo do mês anterior", saldoAnterior);
    } catch {
      // silencioso — usuário já fechou, não mostrar erro
    }
    onClose();
  }

  function handleRequestClose() {
    if (step === "saldo") { onClose(); return; }
    if (step === "reset")  { handleNao(); return; }
    // loading / success: ignora back button
  }

  const busy = step === "loading" || step === "saldo-loading";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* ── Loading ── */}
          {busy && (
            <View style={styles.centeredPad}>
              <ActivityIndicator size="large" color="#58a6ff" style={{ marginBottom: 14 }} />
              <Text style={styles.loadingText}>
                {step === "loading" ? "Resetando células…" : "Adicionando ganho…"}
              </Text>
            </View>
          )}

          {/* ── Sucesso ── */}
          {step === "success" && (
            <Animated.View style={[styles.centeredPad, { opacity: opacityAnim }]}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={48} color="#fff" />
                </View>
              </Animated.View>
              <Text style={styles.successText}>Células resetadas!</Text>
            </Animated.View>
          )}

          {/* ── Reset ── */}
          {step === "reset" && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(88,166,255,0.08)", borderColor: "#58a6ff40" }]}>
                <Ionicons name="refresh-circle-outline" size={36} color="#58a6ff" />
              </View>
              <Text style={styles.title}>Virada de mês!</Text>
              <Text style={styles.subtitle}>
                Um novo mês começou. Deseja zerar as células de Gastos e Ganhos Variáveis na planilha?
              </Text>

              {!!erro && <Text style={styles.erro}>{erro}</Text>}

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setDontShowAgain((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                  {dontShowAgain && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Não mostrar novamente esse mês</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleResetar} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Resetar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSecondary} onPress={handleNao} activeOpacity={0.8}>
                <Text style={styles.btnSecondaryText}>Não, vou resetar manualmente</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Saldo carry-over ── */}
          {step === "saldo" && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(63,185,80,0.08)", borderColor: "#3fb95040" }]}>
                <Ionicons name="trending-up-outline" size={36} color="#3fb950" />
              </View>
              <Text style={styles.title}>Saldo restante do mês passado</Text>
              <Text style={styles.subtitle}>
                Sobrou do mês passado:
              </Text>
              <Text style={styles.saldoValor}>{formatValor(saldoAnterior)}</Text>
              <Text style={styles.subtitle}>
                Deseja adicionar esse valor nos Ganhos Variáveis deste mês?
              </Text>

              <View style={styles.recomendadoBadge}>
                <Ionicons name="star" size={11} color="#d4a017" />
                <Text style={styles.recomendadoText}>RECOMENDADO</Text>
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: "#238636" }]}
                onPress={handleAdicionarSaldo}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Adicionar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSecondary} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}

        </View>
      </View>
    </Modal>
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
  },
  centeredPad: { paddingVertical: 28, alignItems: "center", width: "100%" },
  loadingText: { color: "#8b949e", fontSize: 14 },

  checkCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#238636",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#3fb950", shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
    marginBottom: 16,
  },
  successText: { color: "#3fb950", fontSize: 18, fontWeight: "700" },

  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    color: "#e6edf3", fontSize: 18, fontWeight: "700",
    textAlign: "center", marginBottom: 8,
  },
  subtitle: {
    color: "#8b949e", fontSize: 14, textAlign: "center",
    lineHeight: 20, marginBottom: 6,
  },
  erro: { color: "#f85149", fontSize: 13, textAlign: "center", marginBottom: 10 },

  saldoValor: {
    color: "#3fb950", fontSize: 32, fontWeight: "800",
    letterSpacing: -0.5, marginVertical: 8,
  },
  recomendadoBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(212,160,23,0.12)",
    borderWidth: 1, borderColor: "rgba(212,160,23,0.3)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 18, marginTop: 4,
  },
  recomendadoText: { color: "#d4a017", fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },

  checkboxRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    alignSelf: "flex-start", marginBottom: 20, marginTop: 4,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: "#484f58",
    backgroundColor: "#0d1117",
    alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#1f6feb", borderColor: "#1f6feb" },
  checkboxLabel: { color: "#8b949e", fontSize: 13 },

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
