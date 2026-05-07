import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addExpense, addDespesa, getCellConfig } from "../services/sheetsService";
import { useAudioPlayer } from "expo-audio";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (novoSaldo: number) => void;
}

export default function AddExpenseModal({ visible, onClose, onSuccess }: Props) {
  const [nome, setNome]       = useState("");
  const [valor, setValor]     = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");
  const [success, setSuccess] = useState(false);

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const player      = useAudioPlayer(require("../assets/check.mp3"));

  // Reseta ao abrir o modal
  useEffect(() => {
    if (visible) {
      setNome(""); setValor(""); setErro(""); setSuccess(false);
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  function showSuccessAndClose(novoSaldo: number) {
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
      onSuccess(novoSaldo);
      onClose();
    }, 1400);
  }

  async function handleAdicionar() {
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!nome.trim())                    return setErro("Informe o nome da despesa.");
    if (isNaN(valorNum) || valorNum <= 0) return setErro("Informe um valor válido.");

    setErro("");
    setLoading(true);
    try {
      const config = await getCellConfig();
      if (!config) throw new Error("Células não configuradas. Vá em Configurações.");
      const novoSaldo = await addExpense(nome.trim(), valorNum, config.cellGasto, config.cellSaldo);
      await addDespesa({ nome: nome.trim(), valor: valorNum, data: new Date().toISOString() });
      showSuccessAndClose(novoSaldo);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao adicionar. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.overlay}
      >
        <View style={styles.card}>

          {/* ── Overlay de sucesso (aparece sobre o formulário) ── */}
          {success && (
            <Animated.View
              style={[styles.successOverlay, { opacity: opacityAnim }]}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={56} color="#fff" />
                </View>
              </Animated.View>
              <Animated.Text style={[styles.successText, { opacity: opacityAnim }]}>
                Despesa adicionada!
              </Animated.Text>
            </Animated.View>
          )}

          <Text style={styles.title}>Nova Despesa</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Mercado"
            placeholderTextColor="#555"
            value={nome}
            onChangeText={setNome}
            editable={!loading && !success}
          />

          <Text style={styles.label}>Valor (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 35,90"
            placeholderTextColor="#555"
            value={valor}
            onChangeText={setValor}
            keyboardType="decimal-pad"
            editable={!loading && !success}
          />

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          <TouchableOpacity
            style={[styles.btnAdd, (loading || success) && styles.btnDisabled]}
            onPress={handleAdicionar}
            disabled={loading || success}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Adicionar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnCancel}
            onPress={onClose}
            disabled={loading || success}
          >
            <Text style={styles.btnCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#161b22",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: "#30363d",
    overflow: "hidden", // garante que o overlay não vaze para fora
  },
  // ── Sucesso ──────────────────────────────────────────────────────────────
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#161b22",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  // ── Formulário ────────────────────────────────────────────────────────────
  title: {
    color: "#e6edf3",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    color: "#8b949e",
    fontSize: 13,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: "#0d1117",
    color: "#e6edf3",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    marginBottom: 18,
  },
  erro: {
    color: "#f85149",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  btnAdd: {
    backgroundColor: "#238636",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnCancel:   { alignItems: "center", paddingVertical: 12 },
  btnCancelText: { color: "#8b949e", fontSize: 15 },
});
