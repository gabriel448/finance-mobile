import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Despesa } from "../services/localStorage";

interface Props {
  visible: boolean;
  despesa: Despesa | null;
  onClose: () => void;
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

export default function ExpenseDetailModal({ visible, despesa, onClose }: Props) {
  if (!despesa) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
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

          <TouchableOpacity style={styles.btnVoltar} onPress={onClose} activeOpacity={0.8}>
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
  btnVoltar: {
    margin: 20,
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
