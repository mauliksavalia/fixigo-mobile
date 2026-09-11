import { env } from "../../config/env";
import { ServiceJob } from "../../services/businessService";
import { StoredUser } from "../../storage/authStorage";
import { ServiceRequestInput } from "./types";

export type BackendServiceRequest = {
  id: string;
  status: "New" | "Assigned" | "In Progress" | "Completed";
  category: string;
  otherCategory?: string;
  issueType: string;
  otherIssue?: string;
  description: string;
  deviceInfo?: string;
  location: string;
  appointmentPreference?: string;
  createdAt: string;
};

export async function fetchBackendServiceRequests() {
  const response = await fetch(`${env.apiBaseUrl}/service-requests`);

  if (!response.ok) {
    throw new Error("Could not load service requests.");
  }

  const data = await response.json();
  return (data.requests || []) as BackendServiceRequest[];
}

export async function submitServiceRequestToBackend(input: ServiceRequestInput, user: StoredUser | null) {
  const formData = new FormData();

  appendFormValue(formData, "customerName", user?.name || "Customer");
  appendFormValue(formData, "customerEmail", user?.email || "");
  appendFormValue(formData, "customerPhone", user?.phone || "");
  appendFormValue(formData, "category", input.category);
  appendFormValue(formData, "otherCategory", input.otherCategory);
  appendFormValue(formData, "issueType", input.issueType);
  appendFormValue(formData, "otherIssue", input.otherIssue);
  appendFormValue(formData, "description", input.description);
  appendFormValue(formData, "deviceInfo", input.deviceInfo);
  appendFormValue(formData, "location", input.location);
  appendFormValue(formData, "appointmentPreference", input.appointmentPreference);

  for (const item of input.media) {
    formData.append("media", {
      uri: item.uri,
      name: item.fileName || `${item.id}.${item.type === "video" ? "mp4" : "jpg"}`,
      type: item.mimeType || (item.type === "video" ? "video/mp4" : "image/jpeg"),
    } as any);
  }

  const response = await fetch(`${env.apiBaseUrl}/service-requests`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Could not submit request to backend.");
  }

  const data = await response.json();
  return data.request as BackendServiceRequest;
}

export function mapBackendRequestToJob(request: BackendServiceRequest): ServiceJob {
  return {
    id: request.id,
    title: request.issueType === "Other" ? request.otherIssue || "Maintenance request" : request.issueType,
    category: request.category === "Other" ? request.otherCategory || "Other" : request.category,
    status: mapBackendStatus(request.status),
    address: request.location || "Address pending",
    appointmentWindow: request.appointmentPreference || "Schedule pending",
  };
}

function mapBackendStatus(status: BackendServiceRequest["status"]): ServiceJob["status"] {
  if (status === "Completed") return "Completed";
  if (status === "In Progress") return "In Progress";
  if (status === "Assigned") return "Scheduled";
  return "Pending";
}

function appendFormValue(formData: FormData, key: string, value?: string) {
  formData.append(key, value || "");
}
