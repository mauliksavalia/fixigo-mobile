import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { bootstrapAuth } from "../services/authService";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export default function SplashScreen({ navigation }: Props) {
        useEffect(() => {
        let mounted = true;

        async function init() {
            try {
            const start = Date.now();

            const { token } = await bootstrapAuth();

            // 👇 MINIMUM splash time (milliseconds)
            const MIN_SPLASH_TIME = 2500; // 2.5 seconds

            const elapsed = Date.now() - start;
            const remaining = Math.max(0, MIN_SPLASH_TIME - elapsed);

            setTimeout(() => {
                if (!mounted) return;

                if (token) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: "Home" }],
                });
                } else {
                navigation.reset({
                    index: 0,
                    routes: [{ name: "Login" }],
                });
                }
            }, remaining);
            } catch {
            navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
            });
            }
        }

        init();

        return () => {
            mounted = false;
        };
        }, [navigation]);

  return (
    <View style={styles.container}>
      <Image source={require("../assets/logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Fixigo</Text>
      <ActivityIndicator size="large" />
      <Text style={styles.subtitle}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  logo: { width: 140, height: 140 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7 },
});