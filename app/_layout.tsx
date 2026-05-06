import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, TouchableWithoutFeedback,
  Animated, StyleSheet, StatusBar, ActivityIndicator,
} from "react-native";
import { Stack, useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCellConfig } from "../services/sheetsService";

const DRAWER_WIDTH = 280;

export default function RootLayout() {
  const router   = useRouter();
  const pathname = usePathname();
  const checked  = useRef(false);

  const [ready,      setReady]      = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const translateX     = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // ── Verifica configuração uma única vez ──────────────────────────────────
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    getCellConfig().then((config) => {
      setReady(true);
      if (!config) router.replace("/setup");
    });
  }, []);

  // ── Animação do drawer ───────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
        duration: 250, useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: drawerOpen ? 1 : 0,
        duration: 250, useNativeDriver: true,
      }),
    ]).start();
  }, [drawerOpen]);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const isSetup = pathname === "/setup";

  const navItems = [
    { label: "Início",        icon: "home-outline"     as const, route: "/"         },
    { label: "Histórico",     icon: "time-outline"     as const, route: "/history"  },
    { label: "Configurações", icon: "settings-outline" as const, route: "/settings" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#0d1117" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0d1117" },
          headerTintColor: "#e6edf3",
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
          contentStyle: { backgroundColor: "#0d1117" },
          headerLeft: isSetup ? undefined : () => (
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
        <Stack.Screen name="setup"    options={{ title: "Configurar células", headerLeft: () => null }} />
        <Stack.Screen name="index"    options={{ title: "Finanças" }} />
        <Stack.Screen name="history"  options={{ title: "Histórico" }} />
        <Stack.Screen name="settings" options={{ title: "Configurações" }} />
      </Stack>

      {/* Loading overlay */}
      {!ready && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#58a6ff" size="large" />
        </View>
      )}

      {/* Overlay */}
      {!isSetup && (
        <Animated.View
          pointerEvents={drawerOpen ? "auto" : "none"}
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* Drawer */}
      {!isSetup && (
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.drawerHeader}>
              <Ionicons name="stats-chart" size={28} color="#58a6ff" />
              <Text style={styles.drawerTitle}>Finanças</Text>
            </View>

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
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0d1117",
    alignItems: "center", justifyContent: "center", zIndex: 50,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)", zIndex: 10,
  },
  drawer: {
    position: "absolute", top: 0, left: 0, bottom: 0,
    width: DRAWER_WIDTH, backgroundColor: "#0d1117",
    borderRightWidth: 1, borderRightColor: "#21262d",
    zIndex: 20, elevation: 10,
  },
  drawerHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: "#21262d",
  },
  drawerTitle:    { color: "#e6edf3", fontSize: 20, fontWeight: "800" },
  navItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    marginTop: 4, marginHorizontal: 8, borderRadius: 10,
  },
  navItemActive:  { backgroundColor: "#161b22" },
  navLabel:       { color: "#8b949e", fontSize: 15, fontWeight: "600" },
  navLabelActive: { color: "#58a6ff" },
});
