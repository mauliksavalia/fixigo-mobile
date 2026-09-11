import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { mediaPolicy, serviceCategories } from "../../services/businessService";
import { StoredUser } from "../../storage/authStorage";
import { colors } from "../../theme/colors";
import { submitServiceRequestToBackend } from "./requestApi";
import { createStoredServiceRequest, mapRequestToJob } from "./requestStorage";
import { RequestMedia, ServiceRequestInput } from "./types";

type Props = {
  user: StoredUser | null;
  onCancel: () => void;
  onCreated: (job: ReturnType<typeof mapRequestToJob>) => void;
};

const issueOptions = ["Leak", "No power", "No heat / cooling", "Clogged", "Broken part", "Maintenance", "Other"];
const categoryOptions = Array.from(new Set([...serviceCategories.map((item) => item.title), "Other"]));

export default function CreateRequestScreen({ user, onCancel, onCreated }: Props) {
  const [category, setCategory] = useState(serviceCategories[0]?.title || "Lawn & Yard");
  const [otherCategory, setOtherCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [issueType, setIssueType] = useState(issueOptions[0]);
  const [otherIssue, setOtherIssue] = useState("");
  const [description, setDescription] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [location, setLocation] = useState("");
  const [appointmentPreference, setAppointmentPreference] = useState("");
  const [media, setMedia] = useState<RequestMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const imageCount = media.filter((item) => item.type === "image").length;
  const videoCount = media.filter((item) => item.type === "video").length;
  const canSubmit = useMemo(() => {
    return category && issueType && description.trim().length >= 10 && location.trim().length >= 3;
  }, [category, description, issueType, location]);

  async function onPickMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Photos Permission", "Please allow photo access to attach issue photos or videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.75,
      videoMaxDuration: 45,
    });

    if (result.canceled || !result.assets?.length) return;

    const nextMedia: RequestMedia[] = [];
    let nextImages = imageCount;
    let nextVideos = videoCount;

    for (const asset of result.assets) {
      const type = asset.type === "video" ? "video" : "image";
      const fileSize = asset.fileSize || 0;
      const maxBytes =
        type === "video" ? mediaPolicy.maxVideoMb * 1024 * 1024 : mediaPolicy.maxPhotoMb * 1024 * 1024;

      if (type === "image" && nextImages >= mediaPolicy.maxPhotos) {
        Alert.alert("Photo limit", `You can attach up to ${mediaPolicy.maxPhotos} photos.`);
        continue;
      }

      if (type === "video" && nextVideos >= mediaPolicy.maxVideos) {
        Alert.alert("Video limit", `You can attach up to ${mediaPolicy.maxVideos} videos.`);
        continue;
      }

      if (fileSize > maxBytes) {
        Alert.alert(
          "File too large",
          `${asset.fileName || "Selected file"} is over the ${type === "video" ? mediaPolicy.maxVideoMb : mediaPolicy.maxPhotoMb} MB limit.`,
        );
        continue;
      }

      if (type === "image") nextImages += 1;
      if (type === "video") nextVideos += 1;

      nextMedia.push({
        id: `${Date.now()}_${nextMedia.length}`,
        uri: asset.uri,
        type,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize,
      });
    }

    setMedia((current) => [...current, ...nextMedia]);
  }

  function removeMedia(id: string) {
    setMedia((current) => current.filter((item) => item.id !== id));
  }

  async function onSubmit() {
    if (!canSubmit) {
      Alert.alert("Request Details", "Please add a category, location, and at least 10 characters describing the problem.");
      return;
    }

    if (issueType === "Other" && otherIssue.trim().length < 3) {
      Alert.alert("Other Issue", "Please tell us what type of problem this is.");
      return;
    }

    if (category === "Other" && otherCategory.trim().length < 3) {
      Alert.alert("Other Category", "Please tell us what category this request belongs to.");
      return;
    }

    try {
      setSubmitting(true);
      const input: ServiceRequestInput = {
        category,
        otherCategory: otherCategory.trim(),
        issueType,
        otherIssue: otherIssue.trim(),
        description: description.trim(),
        deviceInfo: deviceInfo.trim(),
        location: location.trim(),
        appointmentPreference: appointmentPreference.trim(),
        media,
      };
      const created = await createStoredServiceRequest(input);
      try {
        await submitServiceRequestToBackend(input, user);
      } catch {
        Alert.alert(
          "Saved Locally",
          "Your request was saved in the app. The backend is not reachable right now, so admin upload sync will happen after backend is running.",
        );
      }
      onCreated(mapRequestToJob(created));
    } catch {
      Alert.alert("Request Failed", "Could not save your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.eyebrow}>New request</Text>
          <Text style={styles.title}>Tell us what needs service</Text>
        </View>
        <Pressable style={styles.closeButton} onPress={onCancel}>
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Category</Text>
      <Pressable style={styles.dropdownButton} onPress={() => setCategoryOpen((open) => !open)}>
        <Text style={styles.dropdownValue}>{category}</Text>
        <Text style={styles.dropdownArrow}>{categoryOpen ? "Hide" : "Select"}</Text>
      </Pressable>
      {categoryOpen && (
        <View style={styles.dropdownMenu}>
          {categoryOptions.map((item) => (
            <Pressable
              key={item}
              style={[styles.dropdownItem, category === item && styles.dropdownItemActive]}
              onPress={() => {
                setCategory(item);
                setCategoryOpen(false);
              }}
            >
              <Text style={[styles.dropdownItemText, category === item && styles.dropdownItemTextActive]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {category === "Other" && (
        <>
          <Text style={styles.label}>Other category</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: Pool, fence, garage door, appliance"
            value={otherCategory}
            onChangeText={setOtherCategory}
          />
        </>
      )}

      <Text style={styles.label}>Problem type</Text>
      <View style={styles.optionGrid}>
        {issueOptions.map((item) => (
          <Pressable
            key={item}
            style={[styles.optionChip, issueType === item && styles.optionChipActive]}
            onPress={() => setIssueType(item)}
          >
            <Text style={[styles.optionText, issueType === item && styles.optionTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {issueType === "Other" && (
        <>
          <Text style={styles.label}>What type of issue?</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: Fence repair, appliance issue, pipe size question"
            value={otherIssue}
            onChangeText={setOtherIssue}
          />
        </>
      )}

      <Text style={styles.label}>Describe the problem</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Tell us what happened, when it started, and what you need fixed."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Model, brand, size, or part details</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Kohler sink, 1/2 inch pipe, Carrier AC model..."
        value={deviceInfo}
        onChangeText={setDeviceInfo}
      />

      <Text style={styles.label}>Service location</Text>
      <TextInput
        style={styles.input}
        placeholder="Street, town, or business address"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Preferred appointment time</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Tomorrow morning, weekday after 3 PM"
        value={appointmentPreference}
        onChangeText={setAppointmentPreference}
      />

      <View style={styles.mediaBox}>
        <View style={styles.mediaHeader}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.mediaTitle}>Photos or videos</Text>
            <Text style={styles.mediaText}>
              {imageCount}/{mediaPolicy.maxPhotos} photos, {videoCount}/{mediaPolicy.maxVideos} videos
            </Text>
          </View>
          <TouchableOpacity style={styles.mediaButton} onPress={onPickMedia} activeOpacity={0.85}>
            <Text style={styles.mediaButtonText}>Attach</Text>
          </TouchableOpacity>
        </View>

        {media.length === 0 ? (
          <Text style={styles.emptyMediaText}>Attach clear photos or a short video so the team can estimate faster.</Text>
        ) : (
          media.map((item) => (
            <View key={item.id} style={styles.mediaItem}>
              <Text style={styles.mediaItemText}>
                {item.type.toUpperCase()} {item.fileName || "attachment"}
              </Text>
              <Pressable onPress={() => removeMedia(item.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={submitting} activeOpacity={0.85}>
        <Text style={styles.submitButtonText}>{submitting ? "Sending request..." : "Submit request"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  headerTextBlock: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginTop: 4,
  },
  closeButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  label: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 4,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  dropdownButton: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dropdownValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  dropdownArrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  dropdownItem: {
    minHeight: 44,
    paddingHorizontal: 13,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: "#EFF6FF",
  },
  dropdownItemText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  optionChip: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  optionTextActive: {
    color: "#FFFFFF",
  },
  input: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    color: colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 13,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  mediaBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  mediaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mediaTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  mediaText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  mediaButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyMediaText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  mediaItem: {
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 10,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  mediaItemText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  removeText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
