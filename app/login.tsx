import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { Ionicons } from "@expo/vector-icons";
import { GOOGLE_WEB_CLIENT_ID, SHEETS_SCOPE } from "../config";
import { saveAuthData, getValidToken } from "../services/localStorage";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    scopes: [SHEETS_SCOPE, "profile", "email"],
  });

  // Verifica se já tem sessão ativa
  useEffect(() => {
    getValidToken().then((token) => {
      if (token) router.replace("/");
    });
  }, []);

  // Processa resposta do OAuth
  useEffect(() => {
    if (response?.type !== "success") return;
    const { authentication } = response;
    if (!authentication?.accessToken) return;

    (async () => {
      // Busca dados do usuário
      let userInfo;
      try {
        const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        });
        userInfo = await res.json();
      } catch {}

      await saveAuthData(
        authentication.accessToken,
        authentication.expiresIn ?? 3600,
        userInfo
          ? { name: userInfo.name, email: userInfo.email, picture: userInfo.picture }
          : undefined
      );

      router.replace("/setup");
    })();
  }, [response]);

  return (
    <View style={styles.container}>
      {/* Logo / ícone */}
      <View style={styles.iconWrap}>
        <Ionicons name="stats-chart" size={64} color="#58a6ff" />
      </View>

      <Text style={styles.title}>Finanças</Text>
      <Text style={styles.subtitle}>
        Controle seus gastos conectado{"\n"}à sua planilha do Google
      </Text>

      <TouchableOpacity
        style={[styles.btnGoogle, !request && styles.btnDisabled]}
        onPress={() => promptAsync()}
        disabled={!request}
        activeOpacity={0.85}
      >
        {!request ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.btnGoogleText}>Entrar com Google</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Apenas acesso à sua planilha.{"\n"}Nenhum dado é armazenado em servidores externos.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#21262d",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#58a6ff",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    color: "#e6edf3",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 10,
  },
  subtitle: {
    color: "#8b949e",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 48,
  },
  btnGoogle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#238636",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
    shadowColor: "#238636",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnGoogleText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  disclaimer: {
    color: "#484f58",
    fontSize: 12,
    textAlign: "center",
    marginTop: 32,
    lineHeight: 18,
  },
});
