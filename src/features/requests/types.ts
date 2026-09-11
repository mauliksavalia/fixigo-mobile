export type RequestMedia = {
  id: string;
  uri: string;
  type: "image" | "video";
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
};

export type ServiceRequestInput = {
  category: string;
  otherCategory: string;
  issueType: string;
  otherIssue: string;
  description: string;
  deviceInfo: string;
  location: string;
  appointmentPreference: string;
  media: RequestMedia[];
};

export type StoredServiceRequest = ServiceRequestInput & {
  id: string;
  status: "Pending";
  createdAt: string;
};
