import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../App";
import BottomTabs from "../navigation/BottomTabs";
import { logout } from "../services/authService";
import { getUser, StoredUser } from "../storage/authStorage";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    getUser().then(setUser).catch(() => setUser(null));
  }, []);

  async function onLogout() {
    try {
      await logout();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch {
      Alert.alert("Sign Out", "Could not sign out. Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <BottomTabs user={user} onLogout={onLogout} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
