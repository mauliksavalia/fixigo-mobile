import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { ServiceJob } from "../../services/businessService";
import { ServiceRequestInput, StoredServiceRequest } from "./types";

const REQUESTS_KEY = "fixigo_service_requests_json";

async function setStoredItem(key: string, value: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function getStoredServiceRequests(): Promise<StoredServiceRequest[]> {
  const raw = await getStoredItem(REQUESTS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as StoredServiceRequest[];
  } catch {
    return [];
  }
}

export async function createStoredServiceRequest(input: ServiceRequestInput) {
  const requests = await getStoredServiceRequests();
  const request: StoredServiceRequest = {
    ...input,
    id: `request_${Date.now()}`,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  await setStoredItem(REQUESTS_KEY, JSON.stringify([request, ...requests]));
  return request;
}

export function mapRequestToJob(request: StoredServiceRequest): ServiceJob {
  return {
    id: request.id,
    title: request.issueType === "Other" ? request.otherIssue || "Maintenance request" : request.issueType,
    category: request.category === "Other" ? request.otherCategory || "Other" : request.category,
    status: request.status,
    address: request.location || "Address pending",
    appointmentWindow: request.appointmentPreference || "Schedule pending",
  };
}
