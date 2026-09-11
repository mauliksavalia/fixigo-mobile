import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ActiveJobCard from "../components/ActiveJobCard";
import ServiceTypeCard from "../components/ServiceTypeCard";
import CreateRequestScreen from "../features/requests/CreateRequestScreen";
import { fetchBackendServiceRequests, mapBackendRequestToJob } from "../features/requests/requestApi";
import { getStoredServiceRequests, mapRequestToJob } from "../features/requests/requestStorage";
import {
  backendReadiness,
  formatCurrency,
  mediaPolicy,
  sampleChats,
  sampleJobs,
  serviceCategories,
} from "../services/businessService";
import { getPaymentSetupStatus, runMockPaymentCheck } from "../services/payments";
import { fetchPlatformStatus, PlatformStatus } from "../services/platformStatus";
import { StoredUser } from "../storage/authStorage";
import { colors } from "../theme/colors";

type TabKey = "home" | "jobs" | "chat" | "profile";

type Props = {
  user: StoredUser | null;
  onLogout: () => void;
};

const tabs: Array<{ key: TabKey; label: string; marker: string }> = [
  { key: "home", label: "Home", marker: "H" },
  { key: "jobs", label: "Jobs", marker: "J" },
  { key: "chat", label: "Chat", marker: "C" },
  { key: "profile", label: "Profile", marker: "P" },
];

export default function BottomTabs({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [customerJobs, setCustomerJobs] = useState(sampleJobs);
  const [syncingJobs, setSyncingJobs] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState("Local demo data loaded");
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({
    database: "offline",
    payments: "offline",
    paymentMode: "unknown",
  });
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "there";
  const title = isCreatingRequest ? "New Request" : tabs.find((tab) => tab.key === activeTab)?.label || "Home";

  useEffect(() => {
    refreshJobs();
    refreshPlatformStatus();
  }, []);

  async function refreshPlatformStatus() {
    const status = await fetchPlatformStatus().catch(() => ({
      database: "offline" as const,
      payments: "offline" as const,
      paymentMode: "unknown" as const,
    }));

    setPlatformStatus(status);
  }

  async function refreshJobs() {
    try {
      setSyncingJobs(true);
      const [localRequests, backendRequests] = await Promise.all([
        getStoredServiceRequests(),
        fetchBackendServiceRequests().catch(() => []),
      ]);
      const merged = dedupeJobs([
        ...backendRequests.map(mapBackendRequestToJob),
        ...localRequests.map(mapRequestToJob),
        ...sampleJobs,
      ]);

      setCustomerJobs(merged);
      setLastSyncMessage(
        backendRequests.length > 0
          ? `Synced ${backendRequests.length} backend request${backendRequests.length === 1 ? "" : "s"}`
          : "Backend empty or offline; showing local jobs",
      );
    } catch {
      setCustomerJobs(sampleJobs);
      setLastSyncMessage("Could not refresh jobs");
    } finally {
      setSyncingJobs(false);
    }
  }

  const content = useMemo(() => {
    if (isCreatingRequest) {
      return (
        <CreateRequestScreen
          user={user}
          onCancel={() => setIsCreatingRequest(false)}
          onCreated={(job) => {
            setCustomerJobs((current) => [job, ...current]);
            setIsCreatingRequest(false);
            setActiveTab("jobs");
          }}
        />
      );
    }

    if (activeTab === "jobs") {
      return (
        <JobsTab
          jobs={customerJobs}
          syncing={syncingJobs}
          syncMessage={lastSyncMessage}
          onRefresh={refreshJobs}
        />
      );
    }
    if (activeTab === "chat") return <ChatTab />;
    if (activeTab === "profile") return <ProfileTab user={user} onLogout={onLogout} />;
    return (
      <HomeTab
        firstName={firstName}
        jobs={customerJobs}
        platformStatus={platformStatus}
        syncing={syncingJobs}
        syncMessage={lastSyncMessage}
        onCreateRequest={() => setIsCreatingRequest(true)}
        onRefresh={() => {
          refreshJobs();
          refreshPlatformStatus();
        }}
      />
    );
  }, [activeTab, customerJobs, firstName, isCreatingRequest, lastSyncMessage, onLogout, platformStatus, syncingJobs, user]);

  return (
    <View style={styles.shell}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topEyebrow}>Fixee Go</Text>
          <Text style={styles.topTitle}>{title}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>Customer</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {content}
      </ScrollView>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <View style={[styles.tabMarker, isActive && styles.tabMarkerActive]}>
                <Text style={[styles.tabMarkerText, isActive && styles.tabMarkerTextActive]}>
                  {tab.marker}
                </Text>
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function dedupeJobs(jobs: typeof sampleJobs) {
  const seen = new Set<string>();

  return jobs.filter((job) => {
    if (seen.has(job.id)) return false;
    seen.add(job.id);
    return true;
  });
}

function HomeTab({
  firstName,
  jobs,
  platformStatus,
  syncing,
  syncMessage,
  onCreateRequest,
  onRefresh,
}: {
  firstName: string;
  jobs: typeof sampleJobs;
  platformStatus: PlatformStatus;
  syncing: boolean;
  syncMessage: string;
  onCreateRequest: () => void;
  onRefresh: () => void;
}) {
  const openJobs = jobs.filter((job) => job.status !== "Completed");
  const nextJob = openJobs[0];
  const databaseOnline = platformStatus.database === "online";
  const paymentsReady = platformStatus.payments === "configured";

  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Customer dashboard</Text>
        <Text style={styles.heroTitle}>Welcome, {firstName}</Text>
        <Text style={styles.heroText}>
          Book maintenance, attach issue photos, and track every job from request to completion.
        </Text>
        <TouchableOpacity style={styles.heroButton} onPress={onCreateRequest} activeOpacity={0.85}>
          <Text style={styles.heroButtonText}>Create service request</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.healthGrid}>
        <StatusCard
          label="Database"
          value={databaseOnline ? "Online" : "Offline"}
          tone={databaseOnline ? "good" : "warn"}
        />
        <StatusCard
          label="Payments"
          value={paymentsReady ? `Stripe ${platformStatus.paymentMode}` : "Setup needed"}
          tone={paymentsReady ? "good" : "warn"}
        />
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Your next job</Text>
          <Text style={styles.syncText}>{syncMessage}</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={syncing} activeOpacity={0.85}>
          <Text style={styles.refreshButtonText}>{syncing ? "Syncing" : "Refresh"}</Text>
        </TouchableOpacity>
      </View>

      {nextJob ? (
        <View style={styles.featureJobCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{nextJob.title}</Text>
            <Text style={styles.listStatus}>{nextJob.status}</Text>
          </View>
          <Text style={styles.listMeta}>{nextJob.category}</Text>
          <Text style={styles.listText}>{nextJob.address}</Text>
          <Text style={styles.listText}>{nextJob.appointmentWindow}</Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No open jobs</Text>
          <Text style={styles.emptyText}>Create a request and the FixiGo team will review it from the admin portal.</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Popular categories</Text>
      <View style={styles.categoryGrid}>
        {serviceCategories.slice(0, 6).map((category) => (
          <TouchableOpacity key={category.id} style={styles.categoryTile} onPress={onCreateRequest} activeOpacity={0.85}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryText}>{category.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Active jobs</Text>
      {openJobs.slice(0, 3).map((job) => (
        <ActiveJobCard key={job.id} title={job.title} status={job.status} />
      ))}
    </View>
  );
}

function JobsTab({
  jobs,
  syncing,
  syncMessage,
  onRefresh,
}: {
  jobs: typeof sampleJobs;
  syncing: boolean;
  syncMessage: string;
  onRefresh: () => void;
}) {
  return (
    <View>
      <View style={styles.summaryRow}>
        <MetricCard label="Open" value={String(jobs.filter((job) => job.status !== "Completed").length)} />
        <MetricCard label="Completed" value={String(jobs.filter((job) => job.status === "Completed").length)} />
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Previous and active jobs</Text>
          <Text style={styles.syncText}>{syncMessage}</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={syncing} activeOpacity={0.85}>
          <Text style={styles.refreshButtonText}>{syncing ? "Syncing" : "Refresh"}</Text>
        </TouchableOpacity>
      </View>
      {jobs.map((job) => (
        <View key={job.id} style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{job.title}</Text>
            <Text style={styles.listStatus}>{job.status}</Text>
          </View>
          <Text style={styles.listMeta}>{job.category}</Text>
          <Text style={styles.listText}>{job.address}</Text>
          <Text style={styles.listText}>{job.appointmentWindow}</Text>
          <Text style={styles.priceText}>{formatCurrency(job.estimateCents)}</Text>
        </View>
      ))}
    </View>
  );
}

function ChatTab() {
  return (
    <View>
      <Text style={styles.sectionTitle}>Messages</Text>
      {sampleChats.map((chat) => (
        <TouchableOpacity key={chat.id} style={styles.listCard} activeOpacity={0.85}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{chat.technicianName}</Text>
            <Text style={styles.listMeta}>{chat.updatedAt}</Text>
          </View>
          <Text style={styles.listMeta}>{chat.jobTitle}</Text>
          <Text style={styles.listText}>{chat.lastMessage}</Text>
          {chat.unreadCount > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>{chat.unreadCount} new</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ProfileTab({ user, onLogout }: Props) {
  const [checkingPayment, setCheckingPayment] = useState(false);
  const paymentSetup = getPaymentSetupStatus();

  async function onCheckPaymentSetup() {
    try {
      setCheckingPayment(true);
      const result = await runMockPaymentCheck();
      Alert.alert("Payment Setup", result.message);
    } finally {
      setCheckingPayment(false);
    }
  }

  return (
    <View>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {(user?.firstName?.[0] || "F") + (user?.lastName?.[0] || "G")}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || "Fixee Go Customer"}</Text>
          <Text style={styles.profileMeta}>{user?.email || "Email not added"}</Text>
          <Text style={styles.profileMeta}>{user?.phone || "Mobile not verified"}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Backend setup</Text>
      {Object.entries(backendReadiness).map(([key, value]) => (
        <View key={key} style={styles.settingRow}>
          <Text style={styles.settingTitle}>{key}</Text>
          <Text style={styles.settingText}>{value}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Media limits</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingTitle}>Photos and videos</Text>
        <Text style={styles.settingText}>
          {mediaPolicy.maxPhotos} photos up to {mediaPolicy.maxPhotoMb} MB each, plus{" "}
          {mediaPolicy.maxVideos} videos up to {mediaPolicy.maxVideoMb} MB each.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Payments</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingTitle}>Stripe setup</Text>
        <Text style={styles.settingText}>Publishable key: {paymentSetup.publishableKeyPreview}</Text>
        <Text style={styles.settingText}>Backend URL: {paymentSetup.apiBaseUrl}</Text>
        <TouchableOpacity
          style={styles.inlineButton}
          onPress={onCheckPaymentSetup}
          disabled={checkingPayment}
          activeOpacity={0.85}
        >
          <Text style={styles.inlineButtonText}>
            {checkingPayment ? "Checking..." : "Check payment setup"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  return (
    <View style={styles.statusCard}>
      <View style={[styles.statusDot, tone === "good" ? styles.statusDotGood : styles.statusDotWarn]} />
      <View style={styles.statusCardText}>
        <Text style={styles.statusCardLabel}>{label}</Text>
        <Text style={styles.statusCardValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topEyebrow: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
  },
  statusPill: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 110,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 20,
    marginBottom: 22,
  },
  heroEyebrow: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  heroText: {
    color: "#DBEAFE",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  heroButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  heroButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  healthGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statusCard: {
    flex: 1,
    minHeight: 74,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  statusDotGood: {
    backgroundColor: "#16A34A",
  },
  statusDotWarn: {
    backgroundColor: "#F59E0B",
  },
  statusCardText: {
    flex: 1,
  },
  statusCardLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  statusCardValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  syncText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  refreshButton: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  refreshButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  featureJobCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 22,
  },
  categoryTile: {
    width: "48%",
    minHeight: 132,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
  },
  categoryTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  categoryMeta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
  },
  serviceRow: {
    flexDirection: "row",
    marginBottom: 22,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    minHeight: 82,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    justifyContent: "center",
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  listCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  listTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  listStatus: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  listMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  listText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  priceText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  unreadPill: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  unreadText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  profileCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#D7EEE7",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#14532D",
    fontSize: 16,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },
  profileMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  settingRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  settingTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  settingText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  inlineButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  inlineButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    backgroundColor: "#FFFFFF",
  },
  logoutText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 78,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    minHeight: 56,
  },
  tabButtonActive: {
    backgroundColor: "#EFF6FF",
  },
  tabMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tabMarkerActive: {
    backgroundColor: colors.primary,
  },
  tabMarkerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  tabMarkerTextActive: {
    color: "#FFFFFF",
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
