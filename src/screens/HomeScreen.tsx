import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { colors } from "../theme/colors";
import ServiceTypeCard from "../components/ServiceTypeCard";
import ActiveJobCard from "../components/ActiveJobCard";

export default function HomeScreen() {
  const userName = "Maulik";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome, {userName} 👋</Text>
          <Text style={styles.subtitle}>What needs fixing today?</Text>
        </View>
        <View style={styles.avatar} />
      </View>

      {/* Create Job Card */}
      <TouchableOpacity style={styles.createCard} activeOpacity={0.85}>
        <Text style={styles.createTitle}>Create Service Request</Text>
        <Text style={styles.createSubtitle}>
          Tell us what’s broken and we’ll handle the rest
        </Text>
      </TouchableOpacity>

      {/* Service Type */}
      <Text style={styles.sectionTitle}>Choose Service Type</Text>
      <View style={styles.row}>
        <ServiceTypeCard
          title="Regular"
          description="Standard pricing & scheduling"
          onPress={() => console.log("Regular")}
        />
        <ServiceTypeCard
          title="Pro"
          description="Priority support & faster service"
          highlight
          onPress={() => console.log("Pro")}
        />
      </View>

      {/* Active Jobs */}
      <Text style={styles.sectionTitle}>Your Active Jobs</Text>
      <ActiveJobCard title="Washing Machine Repair" status="Scheduled" />
      <ActiveJobCard title="AC Maintenance" status="In Progress" />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcome: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.border,
  },
  createCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  createTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  createSubtitle: {
    color: "#E0E7FF",
    fontSize: 14,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    marginBottom: 24,
  },
});