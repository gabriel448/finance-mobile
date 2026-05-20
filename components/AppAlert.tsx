import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface AppAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: "info" | "error" | "success" | "confirm";
  buttons?: AlertButton[];
  onClose: () => void;
}

const TYPE_CONFIG = {
  info:    { icon: "information-circle"  as const, color: "#58a6ff", bg: "rgba(88,166,255,0.08)",  border: "rgba(88,166,255,0.25)"  },
  error:   { icon: "alert-circle"        as const, color: "#f85149", bg: "rgba(248,81,73,0.08)",   border: "rgba(248,81,73,0.25)"   },
  success: { icon: "checkmark-circle"    as const, color: "#3fb950", bg: "rgba(63,185,80,0.08)",   border: "rgba(63,185,80,0.25)"   },
  confirm: { icon: "warning"             as const, color: "#d4a017", bg: "rgba(212,160,23,0.08)",  border: "rgba(212,160,23,0.25)"  },
};

export default function AppAlert({
  visible, title, message, type = "info", buttons, onClose,
}: AppAlertProps) {
  const cfg = TYPE_CONFIG[type];
  const resolvedButtons: AlertButton[] = buttons?.length ? buttons : [{ text: "OK" }];

  const actionBtns = resolvedButtons.filter((b) => b.style !== "cancel");
  const cancelBtns = resolvedButtons.filter((b) => b.style === "cancel");

  function handlePress(btn: AlertButton) {
    onClose();
    btn.onPress?.();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          <View style={[styles.iconCircle, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Ionicons name={cfg.icon} size={36} color={cfg.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          {actionBtns.map((btn, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.btnAction,
                btn.style === "destructive" ? styles.btnDestructive
                  : type === "success"      ? styles.btnSuccess
                  : undefined,
                (cancelBtns.length > 0 || i < actionBtns.length - 1) && { marginBottom: 10 },
              ]}
              onPress={() => handlePress(btn)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.btnActionText,
                btn.style === "destructive" && styles.btnDestructiveText,
              ]}>
                {btn.text}
              </Text>
            </TouchableOpacity>
          ))}

          {cancelBtns.map((btn, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.btnCancel, i > 0 && { marginTop: 8 }]}
              onPress={() => handlePress(btn)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelText}>{btn.text}</Text>
            </TouchableOpacity>
          ))}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 28,
  },
  card: {
    backgroundColor: "#161b22", borderRadius: 20, width: "100%",
    padding: 24, alignItems: "center",
    borderWidth: 1, borderColor: "#30363d",
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16, borderWidth: 1,
  },
  title: {
    color: "#e6edf3", fontSize: 18, fontWeight: "700",
    textAlign: "center", marginBottom: 8,
  },
  message: {
    color: "#8b949e", fontSize: 14, textAlign: "center",
    lineHeight: 21, marginBottom: 22,
  },
  btnAction: {
    width: "100%", alignItems: "center", justifyContent: "center",
    backgroundColor: "#1f6feb", borderRadius: 12, paddingVertical: 14,
  },
  btnSuccess:      { backgroundColor: "#238636" },
  btnDestructive:  { backgroundColor: "#da3633" },
  btnActionText:   { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDestructiveText: { color: "#fff" },
  btnCancel: {
    width: "100%", alignItems: "center",
    paddingVertical: 13, borderRadius: 12,
    backgroundColor: "#21262d", borderWidth: 1, borderColor: "#30363d",
  },
  btnCancelText: { color: "#8b949e", fontSize: 15, fontWeight: "600" },
});
