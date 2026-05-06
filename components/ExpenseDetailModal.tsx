import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { Despesa } from "../services/localStorage";

interface Props {
  visible: boolean;
  despesa: Despesa | null;
  onClose: () => void;
  onRefund?: (despesa: Despesa) => Promise<void>;
}

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

export default function ExpenseDetailModal({ visible, despesa, onClose, onRefund }: Props) {
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [erro, setErro]         = useState("");

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const player      = useAudioPlayer(require("../assets/reembolso.mp3"));

  // Reseta ao (re)abrir o modal
  useEffect(() => {
    if (visible) {
      setLoading(false);
      setSuccess(false);
      setErro("");
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  function showSuccessAndClose() {
    setSuccess(true);

    // Som + animação de check ao mesmo tempo
    try {
      player.volume = 1.0;
      player.seekTo(0);
      player.play();
    } catch {
      // Som opcional — ignora erros
    }

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

    // Fecha após 1.4s — tempo suficiente para ver + ouvir
    setTimeout(() => {
      onClose();
    }, 1400);
  }

  async function handleReembolsar() {
    if (!despesa || !onRefund) return;
    setErro("");
    setLoading(true);
    try {
      await onRefund(despesa);
      showSuccessAndClose();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao reembolsar. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  if (!despesa) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* ── Overlay de sucesso ── */}
          {success && (
            <Animated.View style={[styles.successOverlay, { opacity: opacityAnim }]}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={56} color="#fff" />
                </View>
              </Animated.View>
              <Animated.Text style={[styles.successText, { opacity: opacityAnim }]}>
                Reembolso concluído!
              </Animated.Text>
            </Animated.View>
          )}

          <View style={styles.header}>
            <Text style={styles.headerText}>Detalhes</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>📅 Data</Text>
            <Text style={styles.rowValue}>{formatData(despesa.data)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>🛒 Item</Text>
            <Text style={styles.rowValue}>{despesa.nome}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>💸 Valor</Text>
            <Text style={[styles.rowValue, styles.valor]}>{formatValor(despesa.valor)}</Text>
          </View>

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          {/* ── Botão Reembolsar Gasto ── */}
          {onRefund && (
            <TouchableOpacity
              style={[styles.btnReembolsar, (loading || success) && styles.btnDisabled]}
              onPress={handleReembolsar}
              disabled={loading || success}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text style={styles.btnReembolsarText}>Reembolsar Gasto</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.btnVoltar, (loading || success) && styles.btnDisabled]}
            onPress={onClose}
            disabled={loading || success}
            activeOpacity={0.8}
          >
            <Text style={styles.btnVoltarText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#161b22",
    borderRadius: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#30363d",
    overflow: "hidden",
  },
  // ── Sucesso ───────────────────────────────────────────────────────────────
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#161b22",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderRadius: 20,
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#238636",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3fb950",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  successText: {
    color: "#3fb950",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 20,
    letterSpacing: 0.3,
  },
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: "#0d1117",
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#30363d",
  },
  headerText: {
    color: "#e6edf3",
    fontSize: 18,
    fontWeight: "700",
  },
  // ── Linhas de detalhes ────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowLabel: {
    color: "#8b949e",
    fontSize: 15,
  },
  rowValue: {
    color: "#e6edf3",
    fontSize: 16,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  valor: {
    color: "#f85149",
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#21262d",
    marginHorizontal: 20,
  },
  erro: {
    color: "#f85149",
    fontSize: 13,
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: -4,
  },
  // ── Botões ────────────────────────────────────────────────────────────────
  btnReembolsar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#b08800",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#d4a017",
    shadowColor: "#d4a017",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnReembolsarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnVoltar: {
    margin: 20,
    marginTop: 12,
    backgroundColor: "#21262d",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  btnVoltarText: {
    color: "#e6edf3",
    fontSize: 16,
    fontWeight: "600",
  },
});
