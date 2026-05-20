import React from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const HERO_URL = "https://hero-nine-pi.vercel.app";

export default function UpdateNoticeModal({ visible, onClose }: Props) {
  async function handleAbrirSite() {
    await Linking.openURL(HERO_URL);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle-outline" size={36} color="#d4a017" />
          </View>

          <Text style={styles.title}>Atualização do Apps Script</Text>

          <Text style={styles.body}>
            O código do Apps Script foi atualizado nessa versão do Hero.
            {"\n\n"}
            Para continuar usando todas as funcionalidades, você precisa copiar o código mais recente e publicar uma nova versão no Google Apps Script.
            {"\n\n"}
            O código atualizado está disponível no site do Hero:
          </Text>

          <TouchableOpacity style={styles.urlRow} onPress={handleAbrirSite} activeOpacity={0.7}>
            <Ionicons name="globe-outline" size={14} color="#58a6ff" />
            <Text style={styles.urlText}>hero-nine-pi.vercel.app</Text>
            <Ionicons name="open-outline" size={13} color="#58a6ff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleAbrirSite} activeOpacity={0.8}>
            <Ionicons name="code-slash-outline" size={16} color="#fff" />
            <Text style={styles.btnPrimaryText}>Abrir site e copiar código</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryText}>Entendi, farei depois</Text>
          </TouchableOpacity>

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
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    backgroundColor: "rgba(212,160,23,0.08)",
    borderWidth: 1, borderColor: "rgba(212,160,23,0.3)",
  },
  title: {
    color: "#e6edf3", fontSize: 18, fontWeight: "700",
    textAlign: "center", marginBottom: 12,
  },
  body: {
    color: "#8b949e", fontSize: 14, textAlign: "center",
    lineHeight: 21, marginBottom: 14,
  },
  urlRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(88,166,255,0.08)",
    borderWidth: 1, borderColor: "rgba(88,166,255,0.25)",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    marginBottom: 22,
  },
  urlText: { color: "#58a6ff", fontSize: 13, fontWeight: "600" },
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
