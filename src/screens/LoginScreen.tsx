import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../App";
import {
  AuthProvider,
  canUseRealGoogleLogin,
  formatPhoneForDisplay,
  loginWithGoogle,
  PendingIdentity,
  requestPhoneOtpMock,
  startEmailIdentityMock,
  verifyProfileOtpAndLogin,
} from "../services/authService";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;
type AuthStep = "email" | "profile" | "otp";

const DEMO_OTP = "123456";

export default function LoginScreen({ navigation }: Props) {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [identity, setIdentity] = useState<PendingIdentity | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (step === "email") return "Welcome to Fixee Go";
    if (step === "profile") return "Create your customer profile";
    return "Verify your mobile number";
  }, [step]);

  const subtitle = useMemo(() => {
    if (step === "email") {
      return "Use Google or continue manually with any email address.";
    }

    if (step === "profile") {
      return identity?.email ? `Account email: ${identity.email}` : "Tell us who is booking service.";
    }

    return `We sent a demo code to ${formatPhoneForDisplay(otpSentTo)}.`;
  }, [identity?.email, otpSentTo, step]);

  async function onStartIdentity(provider: AuthProvider) {
    try {
      setLoading(true);
      const nextIdentity = await startEmailIdentityMock(email, provider);
      setIdentity(nextIdentity);
      setStep("profile");
    } catch (error: any) {
      Alert.alert("Email Required", error?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onContinueWithGoogle() {
    if (!canUseRealGoogleLogin()) {
      Alert.alert(
        "Google Login Setup",
        "Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then enable Google in Supabase Auth.",
      );
      return;
    }

    try {
      setLoading(true);
      await loginWithGoogle();
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (error: any) {
      Alert.alert("Google Login", error?.message ?? "Could not sign in with Google.");
    } finally {
      setLoading(false);
    }
  }

  async function onSendOtp() {
    try {
      setLoading(true);
      const otpRequest = await requestPhoneOtpMock(phone);
      setOtpSentTo(otpRequest.phone);
      setOtp(DEMO_OTP);
      setStep("otp");
    } catch (error: any) {
      Alert.alert("Mobile Verification", error?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp() {
    try {
      if (!identity) {
        throw new Error("Please enter your email first.");
      }

      setLoading(true);
      await verifyProfileOtpAndLogin({
        email: identity.email,
        provider: identity.provider,
        firstName,
        lastName,
        phone,
        code: otp,
      });

      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (error: any) {
      Alert.alert("Verification Failed", error?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (step === "otp") {
      setStep("profile");
      setOtp("");
      return;
    }

    if (step === "profile") {
      setStep("email");
      setIdentity(null);
      setFirstName("");
      setLastName("");
      setPhone("");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandRow}>
            <Image source={require("../assets/logo.png")} style={styles.logo} resizeMode="contain" />
            <View style={styles.brandTextBlock}>
              <Text style={styles.brandName}>Fixee Go</Text>
              <Text style={styles.brandTag}>Maintenance booking for homes and businesses</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            {["Email", "Profile", "Verify"].map((item, index) => {
              const activeIndex = step === "email" ? 0 : step === "profile" ? 1 : 2;

              return (
                <View key={item} style={styles.stepItem}>
                  <View style={[styles.stepDot, index <= activeIndex && styles.stepDotActive]} />
                  <Text style={[styles.stepText, index === activeIndex && styles.stepTextActive]}>{item}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.panel}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {step === "email" && (
              <>
                <Pressable
                  style={styles.googleButton}
                  onPress={onContinueWithGoogle}
                  disabled={loading}
                >
                  <Text style={styles.googleMark}>G</Text>
                  <Text style={styles.googleText}>
                    {loading ? "Opening Google..." : "Continue with Google"}
                  </Text>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or use email manually</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
                <Pressable
                  style={styles.secondaryAction}
                  onPress={() => onStartIdentity("email")}
                  disabled={loading}
                >
                  <Text style={styles.secondaryActionText}>Continue with email manually</Text>
                </Pressable>
              </>
            )}

            {step === "profile" && (
              <>
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <Text style={styles.label}>First name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="First"
                      value={firstName}
                      onChangeText={setFirstName}
                      editable={!loading}
                    />
                  </View>
                  <View style={styles.nameField}>
                    <Text style={styles.label}>Last name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Last"
                      value={lastName}
                      onChangeText={setLastName}
                      editable={!loading}
                    />
                  </View>
                </View>
                <Text style={styles.label}>Mobile number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(617) 555-0198"
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!loading}
                />
                <Pressable style={styles.primaryButton} onPress={onSendOtp} disabled={loading}>
                  <Text style={styles.primaryText}>{loading ? "Sending code..." : "Send verification code"}</Text>
                </Pressable>
              </>
            )}

            {step === "otp" && (
              <>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  editable={!loading}
                />
                <Pressable style={styles.primaryButton} onPress={onVerifyOtp} disabled={loading}>
                  <Text style={styles.primaryText}>{loading ? "Verifying..." : "Enter account"}</Text>
                </Pressable>
                <Pressable style={styles.secondaryAction} onPress={onSendOtp} disabled={loading}>
                  <Text style={styles.secondaryActionText}>Resend code</Text>
                </Pressable>
              </>
            )}

            {step !== "email" && (
              <Pressable style={styles.backButton} onPress={goBack} disabled={loading}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            )}

            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Development mode</Text>
              <Text style={styles.demoText}>
                OTP is {DEMO_OTP}. Backend hooks are ready for real Google Auth, SMS, database,
                media uploads, and payments.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF6F5",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  brandRow: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  brandTextBlock: {
    flex: 1,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  brandName: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  brandTag: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  stepRow: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#CBD5E1",
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  stepTextActive: {
    color: colors.textPrimary,
  },
  panel: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#D6E3E0",
    borderRadius: 8,
    padding: 22,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 22,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.textPrimary,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  nameRow: {
    flexDirection: "row",
    gap: 10,
  },
  nameField: {
    flex: 1,
  },
  otpInput: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  googleButton: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  googleMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#F1F5F9",
    color: "#1F2937",
    fontWeight: "800",
  },
  googleText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryAction: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  backButton: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 6,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  demoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 12,
    marginTop: 18,
  },
  demoTitle: {
    color: "#1E3A8A",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  demoText: {
    color: "#1E40AF",
    fontSize: 12,
    lineHeight: 17,
  },
});
