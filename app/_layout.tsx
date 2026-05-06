import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter, usePathname, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getValidToken,
  getSheetConfig,
  getUserInfo,
  signOut,
} from "../services/localStorage";

const DRAWER_WIDTH = 280;

export default function RootLayout() {
  const router     = useRouter();
  const segments   = useSegments();
  const pathname   = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ready, setReady]           = useState(false);
  const [userName, setUserName]     = useState<string | null>(null);
  const [userEmail, setUserEmail]   = useState<string | null>(null);
  const translateX    = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // ── Auth check ao iniciar ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const token  = await getValidToken();
      const config = await getSheetConfig();
      const info   = await getUserInfo();
      setUserName(info.name ?? null);
      setUserEmail(info.email ?? null);
      setReady(true);

      if (!token) {
        router.replace("/login");
      } else if (!config) {
        router.replace("/setup");
      }
    })();
  }, []);

  // ── Animação do drawer ───────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: drawerOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerOpen]);

  // Oculta drawer ao navegar
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const navItems = [
    { label: "Início",        icon: "home-outline"     as const, route: "/"          },
    { label: "Histórico",     icon: "time-outline"     as const, route: "/history"   },
    { label: "Configurações", icon: "settings-outline" as const, route: "/settings"  },
  ];

  async function handleSignOut() {
    setDrawerOpen(false);
    await signOut();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0d1117", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#58a6ff" size="large" />
      </View>
    );
  }

  // Telas sem drawer (login/setup)
  const isAuthScreen = segments[0] === "login" || segments[0] === "setup";

  return (
    <View style={{ flex: 1, backgroundColor: "#0d1117" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0d1117" },
          headerTintColor: "#e6edf3",
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
          contentStyle: { backgroundColor: "#0d1117" },
          headerLeft: isAuthScreen ? undefined : () => (
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={{ marginLeft: 4, padding: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="menu-outline" size={28} color="#e6edf3" />
            </TouchableOpacity>
          ),
        }}
      >
        <Stack.Screen name="login"    options={{ headerShown: false }} />
        <Stack.Screen name="setup"    options={{ title: "Configurar planilha", headerLeft: () => null }} />
        <Stack.Screen name="index"    options={{ title: "Finanças" }} />
        <Stack.Screen name="history"  options={{ title: "Histórico" }} />
        <Stack.Screen name="settings" options={{ title: "Configurações" }} />
      </Stack>

      {/* Overlay */}
      {!isAuthScreen && (
        <Animated.View
          pointerEvents={drawerOpen ? "auto" : "none"}
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* Drawer panel */}
      {!isAuthScreen && (
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Cabeçalho do drawer com info do usuário */}
            <View style={styles.drawerHeader}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={24} color="#58a6ff" />
              </View>
              <View style={{ flex: 1 }}>
                {userName && <Text style={styles.drawerUserName} numberOfLines={1}>{userName}</Text>}
                {userEmail && <Text style={styles.drawerUserEmail} numberOfLines={1}>{userEmail}</Text>}
              </View>
            </View>

            {/* Itens de navegação */}
            {navItems.map((item) => {
              const active = pathname === item.route;
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.navItem, active && styles.navItemActive]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon} size={22} color={active ? "#58a6ff" : "#8b949e"} />
                  <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Sair */}
            <View style={styles.signOutWrap}>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
                <Ionicons name="log-out-outline" size={20} color="#f85149" />
                <Text style={styles.signOutText}>Sair da conta</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 10,
  },
  drawer: {
    position: "absolute",
    top: 0, left: 0, bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#0d1117",
    borderRightWidth: 1,
    borderRightColor: "#21262d",
    zIndex: 20,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#30363d",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerUserName:  { color: "#e6edf3", fontSize: 15, fontWeight: "700" },
  drawerUserEmail: { color: "#8b949e", fontSize: 12, marginTop: 2 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 4,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  navItemActive:  { backgroundColor: "#161b22" },
  navLabel:       { color: "#8b949e", fontSize: 15, fontWeight: "600" },
  navLabelActive: { color: "#58a6ff" },
  signOutWrap: {
    position: "absolute",
    bottom: 32,
    left: 0, right: 0,
    paddingHorizontal: 16,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a1a1a",
    backgroundColor: "#1a0a0a",
  },
  signOutText: { color: "#f85149", fontSize: 15, fontWeight: "600" },
});
