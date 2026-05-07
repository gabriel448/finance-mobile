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
import { Installment } from "../services/sheetsService";
import { getInstallmentMetadata } from "../services/localStorage";

interface Props {
  visible: boolean;
  installment: Installment | null;
  onClose: () => void;
  onPay: (installment: Installment) => Promise<number>;
  onDelete: (installment: Installment) => Promise<void>;
}

function formatData(isoString: string): string {
  if (!isoString) return "Desconhecida";
  const d = new Date(isoString);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = String(d.getFullYear()).slice(2);
  return `${dia}/${mes}/${ano}`;
}

function formatValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function InstallmentDetailModal({ visible, installment, onClose, onPay, onDelete }: Props) {
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [erro, setErro]         = useState("");
  const [dataAdicao, setDataAdicao] = useState("");

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const playerReembolso = useAudioPlayer(require("../assets/reembolso.mp3"));
  const playerCheck     = useAudioPlayer(require("../assets/check.mp3"));

  // Carrega a data buscando no histórico local
  useEffect(() => {
    if (visible && installment) {
      setLoading(false);
      setSuccess(false);
      setErro("");
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      
      getInstallmentMetadata(installment.nome).then(data => {
        if (data) {
          setDataAdicao(data);
        } else {
          setDataAdicao("");
        }
      });
    }
  }, [visible, installment]);

  function showSuccessAndClose(msg: string, playReembolso: boolean) {
    setSuccessMsg(msg);
    setSuccess(true);

    try {
      const player = playReembolso ? playerReembolso : playerCheck;
      player.volume = 1.0;
      player.seekTo(0);
      player.play();
    } catch {
      // Ignora erro
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

    setTimeout(() => {
      onClose();
    }, 1500);
  }

  async function handlePay() {
    if (!installment) return;
    setErro("");
    setLoading(true);
    try {
      const restantes = await onPay(installment);
      if (restantes <= 0) {
        showSuccessAndClose("Última parcela paga, item removido", true);
      } else {
        showSuccessAndClose(`Parcela paga! Restam ${restantes}`, false);
      }
    } catch (e: any) {
      setErro(e.message ?? "Erro ao pagar parcela.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!installment) return;
    setErro("");
    setLoading(true);
    try {
      await onDelete(installment);
      showSuccessAndClose("Produto excluído", true);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao excluir produto.");
    } finally {
      setLoading(false);
    }
  }

  if (!installment) return null;

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

          <View style={styles.header}>
            <Text style={styles.headerText}>Detalhes da Parcela</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>🛒 Produto</Text>
            <Text style={styles.rowValue}>{installment.nome}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>📅 Adicionado em</Text>
            <Text style={styles.rowValue}>{dataAdicao ? formatData(dataAdicao) : "—"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>📦 Restantes</Text>
            <Text style={[styles.rowValue, styles.restantes]}>{installment.restantes}x</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>💸 Valor</Text>
            <Text style={[styles.rowValue, styles.valor]}>{formatValor(installment.valor)}</Text>
          </View>

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          {/* ── Botões ── */}
          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={[styles.btnPay, (loading || success) && styles.btnDisabled]}
              onPress={handlePay}
              disabled={loading || success}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="cash-outline" size={18} color="#fff" />
                  <Text style={styles.btnPayText}>Pagar Parcela</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnDelete, (loading || success) && styles.btnDisabled]}
              onPress={handleDelete}
              disabled={loading || success}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#f85149" />
              <Text style={styles.btnDeleteText}>Excluir Produto</Text>
            </TouchableOpacity>
          </View>

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
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
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
  restantes: {
    color: "#3fb950",
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
    marginTop: 8,
    marginBottom: -4,
  },
  btnGroup: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  btnPay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#238636",
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnPayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnDelete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#f85149",
  },
  btnDeleteText: {
    color: "#f85149",
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
