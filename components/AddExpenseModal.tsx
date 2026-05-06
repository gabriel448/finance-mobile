import React, { useState } from "react";
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
} from "react-native";
import { addExpense } from "../services/sheetsAPIService";
import { addDespesa, getValidToken, getSheetConfig } from "../services/localStorage";
import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (novoSaldo: number) => void;
}

export default function AddExpenseModal({ visible, onClose, onSuccess }: Props) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();
  const player = useAudioPlayer(require("../assets/check.mp3"));

  async function playCheckSound() {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Som opcional — ignora erros
    }
  }

  async function handleAdicionar() {
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!nome.trim()) return setErro("Informe o nome da despesa.");
    if (isNaN(valorNum) || valorNum <= 0) return setErro("Informe um valor válido.");

    setErro("");
    setLoading(true);
    try {
      const token  = await getValidToken();
      const config = await getSheetConfig();
      if (!token || !config) { router.replace("/login"); return; }

      const novoSaldo = await addExpense(
        token,
        config.spreadsheetId,
        config.cellGasto,
        config.cellSaldo,
        valorNum
      );
      await addDespesa({ nome: nome.trim(), valor: valorNum, data: new Date().toISOString() });
      await playCheckSound();
      setNome("");
      setValor("");
      onSuccess(novoSaldo);
      onClose();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao adicionar. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Nova Despesa</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Mercado"
            placeholderTextColor="#555"
            value={nome}
            onChangeText={setNome}
            editable={!loading}
          />

          <Text style={styles.label}>Valor (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 35,90"
            placeholderTextColor="#555"
            value={valor}
            onChangeText={setValor}
            keyboardType="decimal-pad"
            editable={!loading}
          />

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          <TouchableOpacity
            style={[styles.btnAdd, loading && styles.btnDisabled]}
            onPress={handleAdicionar}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Adicionar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={loading}>
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
  },
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
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnCancel: {
    alignItems: "center",
    paddingVertical: 12,
  },
  btnCancelText: {
    color: "#8b949e",
    fontSize: 15,
  },
});
