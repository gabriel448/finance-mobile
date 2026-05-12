import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { saveCellConfig, getCellConfig, getSaldo, getScriptUrl, clearScriptUrl } from "../services/sheetsService";

export default function SetupScreen() {
  const router = useRouter();
  const [cellSaldo,        setCellSaldo]        = useState("F9");
  const [cellGasto,        setCellGasto]        = useState("I8");
  const [cellParcelasStart,setCellParcelasStart] = useState("");
  const [cellCustoFixo,    setCellCustoFixo]    = useState("");
  const [cellSalario,      setCellSalario]      = useState("");
  const [salarioManual,    setSalarioManual]    = useState("");
  const [loading,          setLoading]          = useState(false);
  const [scriptUrl,        setScriptUrl]        = useState("");
  const [infoVisible,      setInfoVisible]      = useState(false);
  const [infoSimVisible,   setInfoSimVisible]   = useState(false);

  useEffect(() => {
    getCellConfig().then((c) => {
      if (!c) return;
      setCellSaldo(c.cellSaldo);
      setCellGasto(c.cellGasto);
      if (c.cellParcelasStart) setCellParcelasStart(c.cellParcelasStart);
      if (c.cellCustoFixo)    setCellCustoFixo(c.cellCustoFixo);
      if (c.cellSalario)      setCellSalario(c.cellSalario);
      if (c.salarioManual != null) setSalarioManual(String(c.salarioManual));
    });
    getScriptUrl().then((u) => setScriptUrl(u ?? ""));
  }, []);

  async function handleSalvar() {
    const saldo = cellSaldo.trim().toUpperCase();
    const gasto = cellGasto.trim().toUpperCase();
    if (!saldo || !gasto) {
      Alert.alert("Preencha os campos", "Informe as referências das duas células.");
      return;
    }
    setLoading(true);
    try {
      const valor = await getSaldo(saldo);

      const salarioNum = salarioManual.trim()
        ? parseFloat(salarioManual.replace(",", "."))
        : undefined;

      await saveCellConfig({
        cellSaldo: saldo,
        cellGasto: gasto,
        cellParcelasStart: cellParcelasStart.trim().toUpperCase() || undefined,
        cellCustoFixo:     cellCustoFixo.trim().toUpperCase()     || undefined,
        cellSalario:       cellSalario.trim().toUpperCase()        || undefined,
        salarioManual:     (!cellSalario.trim() && salarioNum && !isNaN(salarioNum))
                             ? salarioNum
                             : undefined,
      });

      Alert.alert(
        "Configurado! ✅",
        `Saldo atual lido: R$ ${valor.toFixed(2).replace(".", ",")}`,
        [{ text: "Ir para o app", onPress: () => router.replace("/") }]
      );
    } catch (e: any) {
      Alert.alert("Erro ao testar célula", e.message ?? "Verifique a referência informada.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTrocarPlanilha() {
    Alert.alert(
      "Trocar planilha?",
      "Isso removerá a URL do script configurada. Você precisará configurar novamente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Trocar",
          style: "destructive",
          onPress: async () => {
            await clearScriptUrl();
            router.replace("/onboarding");
          },
        },
      ]
    );
  }

  const urlDisplay = scriptUrl
    ? scriptUrl.replace("https://script.google.com/macros/s/", "…/s/").slice(0, 40) + "…"
    : "Não configurada";

  const usandoCelulaSalario = cellSalario.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0d1117" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Ionicons name="grid-outline" size={48} color="#58a6ff" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Configurar células</Text>
        <Text style={styles.subtitle}>
          Informe quais células da planilha{"\n"}correspondem ao saldo e aos gastos.
        </Text>

        {/* Script conectado */}
        <TouchableOpacity style={styles.scriptChip} onPress={handleTrocarPlanilha} activeOpacity={0.75}>
          <Ionicons name="link-outline" size={14} color="#3fb950" />
          <Text style={styles.scriptChipText} numberOfLines={1}>{urlDisplay}</Text>
          <Ionicons name="swap-horizontal-outline" size={14} color="#484f58" />
        </TouchableOpacity>

        {/* ── Card principal ── */}
        <View style={styles.card}>
          <Text style={styles.label}>Célula do saldo disponível</Text>
          <Text style={styles.hint}>Calculada pela fórmula da sua planilha (só leitura)</Text>
          <TextInput style={styles.input} value={cellSaldo} onChangeText={setCellSaldo}
            placeholder="ex: F9" placeholderTextColor="#484f58" autoCapitalize="characters" autoCorrect={false} />

          <View style={styles.divider} />

          <Text style={styles.label}>Célula de gastos acumulados</Text>
          <Text style={styles.hint}>O app soma os gastos nesta célula</Text>
          <TextInput style={styles.input} value={cellGasto} onChangeText={setCellGasto}
            placeholder="ex: I8" placeholderTextColor="#484f58" autoCapitalize="characters" autoCorrect={false} />

          <View style={styles.divider} />

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 6 }}>
            <Text style={[styles.label, { marginBottom: 0 }]}>Célula de Parcelas (Opcional)</Text>
            <TouchableOpacity onPress={() => setInfoVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="information-circle-outline" size={18} color="#58a6ff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>1ª célula da coluna "Restantes" (ex: K5)</Text>
          <TextInput style={styles.input} value={cellParcelasStart} onChangeText={setCellParcelasStart}
            placeholder="ex: K5" placeholderTextColor="#484f58" autoCapitalize="characters" autoCorrect={false} />
        </View>

        {/* ── Card de simulação ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="calculator-outline" size={16} color="#58a6ff" />
          <Text style={styles.sectionTitle}>Simulação de saldo futuro</Text>
          <TouchableOpacity onPress={() => setInfoSimVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="information-circle-outline" size={16} color="#484f58" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Célula dos custos fixos</Text>
          <Text style={styles.hint}>Célula com o total dos seus custos fixos mensais (ex: D20)</Text>
          <TextInput style={styles.input} value={cellCustoFixo} onChangeText={setCellCustoFixo}
            placeholder="ex: D20" placeholderTextColor="#484f58" autoCapitalize="characters" autoCorrect={false} />

          <View style={styles.divider} />

          <Text style={styles.label}>Salário / Capital</Text>

          {/* Recomendação forte para usar célula */}
          <View style={styles.recommendBanner}>
            <Ionicons name="star" size={13} color="#d4a017" />
            <Text style={styles.recommendText}>
              Recomendado: use a célula da planilha para evitar desincronização.
            </Text>
          </View>

          <Text style={styles.hint}>Célula com seu salário ou capital disponível (ex: B2)</Text>
          <TextInput style={styles.input} value={cellSalario} onChangeText={setCellSalario}
            placeholder="ex: B2" placeholderTextColor="#484f58" autoCapitalize="characters" autoCorrect={false} />

          {/* Valor manual — só aparece quando célula está vazia */}
          {!usandoCelulaSalario && (
            <>
              <View style={styles.dividerOr}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerOrText}>ou insira manualmente</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.warnBanner}>
                <Ionicons name="warning-outline" size={13} color="#f0a500" />
                <Text style={styles.warnText}>
                  Valor manual pode ficar desatualizado se o capital mudar na planilha.
                </Text>
              </View>

              <TextInput
                style={[styles.input, { fontSize: 18 }]}
                value={salarioManual}
                onChangeText={setSalarioManual}
                placeholder="ex: 3500,00"
                placeholderTextColor="#484f58"
                keyboardType="decimal-pad"
              />
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleSalvar}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="checkmark-outline" size={18} color="#fff" /><Text style={styles.btnText}>Salvar e testar</Text></>
          }
        </TouchableOpacity>

        <Text style={styles.footer}>
          O app vai ler o saldo de {cellSaldo || "?"} e somar gastos em {cellGasto || "?"}
        </Text>

        {/* ── Modal info parcelas ── */}
        <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
          <View style={styles.infoOverlay}>
            <View style={styles.infoCard}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="information" size={32} color="#58a6ff" />
              </View>
              <Text style={styles.infoTitle}>Como organizar a planilha</Text>
              <Text style={styles.infoText}>
                Para que a aba de Parcelas funcione corretamente, a sua planilha precisa ter 3 colunas vizinhas para as parcelas, nesta exata ordem:
              </Text>
              <View style={styles.infoList}>
                <Text style={styles.infoListItem}><Text style={{ fontWeight: "bold", color: "#e6edf3" }}>1ª Coluna (Ex: K):</Text> Restantes</Text>
                <Text style={styles.infoListItem}><Text style={{ fontWeight: "bold", color: "#e6edf3" }}>2ª Coluna (Ex: L):</Text> Produto</Text>
                <Text style={styles.infoListItem}><Text style={{ fontWeight: "bold", color: "#e6edf3" }}>3ª Coluna (Ex: M):</Text> Valor</Text>
              </View>
              <Text style={styles.infoText}>
                A célula que você deve configurar aqui (ex: K5) é exatamente a{" "}
                <Text style={{ fontWeight: "bold", color: "#e6edf3" }}>primeira linha da primeira coluna</Text>{" "}
                (Parcelas Restantes). O app se encarregará de ler os itens vizinhos automaticamente!
              </Text>
              <TouchableOpacity style={styles.btnInfoClose} onPress={() => setInfoVisible(false)} activeOpacity={0.8}>
                <Text style={styles.btnInfoCloseText}>Entendi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Modal info simulação ── */}
        <Modal visible={infoSimVisible} transparent animationType="fade" onRequestClose={() => setInfoSimVisible(false)}>
          <View style={styles.infoOverlay}>
            <View style={styles.infoCard}>
              <View style={[styles.infoIconCircle, { borderColor: "#58a6ff40" }]}>
                <Ionicons name="calculator" size={32} color="#58a6ff" />
              </View>
              <Text style={styles.infoTitle}>Como funciona a simulação</Text>
              <Text style={styles.infoText}>
                O botão <Text style={{ color: "#e6edf3", fontWeight: "700" }}>"Simular saldo que vem"</Text> na tela inicial calcula quanto você terá disponível no próximo mês subtraindo:
              </Text>
              <View style={styles.infoList}>
                <Text style={styles.infoListItem}>• Custos fixos do mês</Text>
                <Text style={styles.infoListItem}>• Parcelas que ainda precisarão ser pagas no próximo mês</Text>
              </View>
              <Text style={styles.infoText}>
                Itens parcelados que encerrarem neste mês não entram na conta do próximo.
              </Text>
              <TouchableOpacity style={styles.btnInfoClose} onPress={() => setInfoSimVisible(false)} activeOpacity={0.8}>
                <Text style={styles.btnInfoCloseText}>Entendi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, alignItems: "center" },
  title:    { color: "#e6edf3", fontSize: 24, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { color: "#8b949e", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },

  scriptChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#161b22", borderRadius: 20,
    borderWidth: 1, borderColor: "#238636",
    paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: 24, maxWidth: "100%",
  },
  scriptChipText: { color: "#3fb950", fontSize: 11, flex: 1 },

  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    alignSelf: "flex-start", marginTop: 28, marginBottom: 12,
  },
  sectionTitle: { color: "#58a6ff", fontSize: 13, fontWeight: "700", flex: 1 },

  card: {
    width: "100%", backgroundColor: "#161b22",
    borderRadius: 16, borderWidth: 1, borderColor: "#21262d", padding: 20,
  },
  label:   { color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  hint:    { color: "#484f58", fontSize: 12, marginBottom: 10 },
  input: {
    backgroundColor: "#0d1117", color: "#e6edf3",
    borderWidth: 1, borderColor: "#30363d", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 22, fontWeight: "700", textAlign: "center", letterSpacing: 2,
  },
  divider: { height: 1, backgroundColor: "#21262d", marginVertical: 20 },

  dividerOr: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#21262d" },
  dividerOrText: { color: "#484f58", fontSize: 11 },

  recommendBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "rgba(212,160,23,0.08)", borderRadius: 8,
    borderWidth: 1, borderColor: "rgba(212,160,23,0.2)",
    padding: 10, marginBottom: 12,
  },
  recommendText: { color: "#d4a017", fontSize: 12, flex: 1, lineHeight: 17 },

  warnBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "rgba(240,165,0,0.06)", borderRadius: 8,
    borderWidth: 1, borderColor: "rgba(240,165,0,0.15)",
    padding: 10, marginBottom: 12,
  },
  warnText: { color: "#f0a500", fontSize: 12, flex: 1, lineHeight: 17 },

  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#238636", borderRadius: 12, paddingVertical: 14,
    marginTop: 24, width: "100%",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footer:  { color: "#484f58", fontSize: 12, textAlign: "center", marginTop: 20, marginBottom: 40 },

  infoOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  infoCard: { backgroundColor: "#161b22", borderRadius: 20, width: "100%", padding: 28, borderWidth: 1, borderColor: "#30363d" },
  infoIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#0d1117", alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: "#58a6ff40", alignSelf: "center" },
  infoTitle: { color: "#e6edf3", fontSize: 20, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  infoText: { color: "#8b949e", fontSize: 14, lineHeight: 22, marginBottom: 16, textAlign: "center" },
  infoList: { backgroundColor: "#0d1117", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#30363d" },
  infoListItem: { color: "#8b949e", fontSize: 14, marginBottom: 8 },
  btnInfoClose: { backgroundColor: "#1f6feb", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  btnInfoCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
