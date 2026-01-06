import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { loginWithEmail, loginWithGoogleMock } from "../services/authService";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onEmailLogin() {
    try {
      setLoading(true);
      await loginWithEmail(email.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e: any) {
      Alert.alert("Login Failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleLogin() {
    try {
      setLoading(true);
      await loginWithGoogleMock();
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e: any) {
      Alert.alert("Google Login Failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome to Fixigo</Text>
      <Text style={styles.subheader}>Login to continue</Text>

      <Pressable style={[styles.button, styles.google]} onPress={onGoogleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Please wait..." : "Continue with Google (Mock)"}</Text>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      <Pressable style={[styles.button, styles.primary]} onPress={onEmailLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login with Email (Mock)"}</Text>
      </Pressable>

      <Text style={styles.note}>
        Note: Phone number is NOT required now. We’ll collect it later during scheduling.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12, backgroundColor: "white" },
  header: { fontSize: 26, fontWeight: "800", marginTop: 10 },
  subheader: { fontSize: 14, opacity: 0.7, marginBottom: 10 },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },

  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: "#111" },
  google: { backgroundColor: "#2b2b2b" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ddd" },
  dividerText: { opacity: 0.6 },

  note: { marginTop: 12, fontSize: 12, opacity: 0.65 },
});