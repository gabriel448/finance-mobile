import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { GanhoVariavel } from "../services/sheetsService";

interface Props {
  visible: boolean;
  ganho: GanhoVariavel | null;
  onClose: () => void;
  onRevoke: (ganho: GanhoVariavel) => Promise<void>;
  onAlter: (ganho: GanhoVariavel, novoValor: number) => Promise<void>;
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

export default function GanhoDetailModal({ visible, ganho, onClose, onRevoke, onAlter }: Props) {
  const [view,        setView]        = useState<"detail" | "editing">("detail");
  const [novoValor,   setNovoValor]   = useState("");
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [successMsg,  setSuccessMsg]  = useState("Concluído!");
  const [erro,        setErro]        = useState("");

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const player      = useAudioPlayer(require("../assets/reembolso.mp3"));

  useEffect(() => {
    if (visible) {
      setView("detail");
      setNovoValor("");
      setLoading(false);
      setSuccess(false);
      setSuccessMsg("Concluído!");
      setErro("");
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  function showSuccessAndClose(msg: string) {
    setSuccessMsg(msg);
    setSuccess(true);

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

    setTimeout(() => onClose(), 1400);
  }

  async function handleRevoke() {
    if (!ganho) return;
    setErro("");
    setLoading(true);
    try {
      await onRevoke(ganho);
      showSuccessAndClose("Ganho revogado!");
    } catch (e: any) {
      setErro(e.message ?? "Erro ao revogar ganho.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAlter() {
    if (!ganho) return;
    const num = parseFloat(novoValor.replace(",", "."));
    if (isNaN(num) || num <= 0) { setErro("Informe um valor válido."); return; }
    setErro("");
    setLoading(true);
    try {
      await onAlter(ganho, num);
      showSuccessAndClose("Valor atualizado!");
    } catch (e: any) {
      setErro(e.message ?? "Erro ao alterar ganho.");
    } finally {
      setLoading(false);
    }
  }

  if (!ganho) return null;

  const busy = loading || success;

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
                {successMsg}
              </Animated.Text>
            </Animated.View>
          )}

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Detalhes do Ganho</Text>
          </View>

          {/* ── Linhas ── */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>📅 Data</Text>
            <Text style={styles.rowValue}>{formatData(ganho.data)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>💰 Ganho</Text>
            <Text style={styles.rowValue} numberOfLines={2}>{ganho.nome}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>📈 Valor</Text>
            <Text style={[styles.rowValue, styles.valorText]}>{formatValor(ganho.valor)}</Text>
          </View>

          {/* ── Input de edição ── */}
          {view === "editing" && (
            <>
              <View style={styles.divider} />
              <View style={styles.editArea}>
                <Text style={styles.editLabel}>Novo valor (R$)</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="0,00"
                  placeholderTextColor="#484f58"
                  value={novoValor}
                  onChangeText={setNovoValor}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
            </>
          )}

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          {/* ── Botões ── */}
          <View style={styles.buttons}>
            {view === "detail" ? (
              <>
                <TouchableOpacity
                  style={[styles.btnRevogar, busy && styles.btnDisabled]}
                  onPress={handleRevoke}
                  disabled={busy}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={18} color="#fff" />
                      <Text style={styles.btnText}>Revogar ganho</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnAlterar, busy && styles.btnDisabled]}
                  onPress={() => { setErro(""); setView("editing"); }}
                  disabled={busy}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>Alterar valor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnCancelar, busy && styles.btnDisabled]}
                  onPress={onClose}
                  disabled={busy}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.btnAlterar, busy && styles.btnDisabled]}
                  onPress={handleAlter}
                  disabled={busy}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-outline" size={18} color="#fff" />
                      <Text style={styles.btnText}>Confirmar alteração</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnCancelar, busy && styles.btnDisabled]}
                  onPress={() => { setView("detail"); setErro(""); setNovoValor(""); }}
                  disabled={busy}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnCancelarText}>Voltar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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

  // ── Linhas ────────────────────────────────────────────────────────────────
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
  valorText: {
    color: "#3fb950",
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#21262d",
    marginHorizontal: 20,
  },

  // ── Edição ────────────────────────────────────────────────────────────────
  editArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  editLabel: {
    color: "#8b949e",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: "#0d1117",
    color: "#e6edf3",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1,
  },

  // ── Erro ──────────────────────────────────────────────────────────────────
  erro: {
    color: "#f85149",
    fontSize: 13,
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: -4,
  },

  // ── Botões ────────────────────────────────────────────────────────────────
  buttons: {
    padding: 20,
    gap: 10,
  },
  btnRevogar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#b91c1c",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#f85149",
    shadowColor: "#f85149",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnAlterar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#58a6ff",
    shadowColor: "#58a6ff",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnCancelar: {
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
  btnDisabled: {
    opacity: 0.5,
  },
});
