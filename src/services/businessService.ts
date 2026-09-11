export type ServiceCategory = {
  id: string;
  title: string;
  description: string;
  typicalResponse: string;
};

export type ServiceJob = {
  id: string;
  title: string;
  category: string;
  status: "Draft" | "Pending" | "Scheduled" | "In Progress" | "Completed";
  address: string;
  appointmentWindow: string;
  estimateCents?: number;
};

export type ChatThread = {
  id: string;
  technicianName: string;
  jobTitle: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

export type MediaPolicy = {
  maxPhotos: number;
  maxPhotoMb: number;
  maxVideos: number;
  maxVideoMb: number;
  allowedTypes: string[];
};

export const mediaPolicy: MediaPolicy = {
  maxPhotos: 8,
  maxPhotoMb: 8,
  maxVideos: 2,
  maxVideoMb: 80,
  allowedTypes: ["jpg", "jpeg", "png", "heic", "mp4", "mov"],
};

export const backendReadiness = {
  auth: "Mock now. Ready for Google Auth, email auth, and SMS OTP.",
  database: "Service request schema is ready for Firebase or Supabase.",
  storage: "Media limits are defined before connecting cloud storage.",
  payments: "Payment card can connect to Stripe PaymentSheet.",
};

export const serviceCategories: ServiceCategory[] = [
  {
    id: "lawn",
    title: "Lawn & Yard",
    description: "Cleanup, mowing, seasonal care, and outdoor maintenance.",
    typicalResponse: "Same or next day",
  },
  {
    id: "plumbing",
    title: "Plumbing",
    description: "Leaks, faucets, drains, toilets, and water fixture repairs.",
    typicalResponse: "2-4 hours",
  },
  {
    id: "electrical",
    title: "Electrical",
    description: "Outlets, lighting, breakers, switches, and inspections.",
    typicalResponse: "Today",
  },
  {
    id: "hvac",
    title: "HVAC",
    description: "Heating, cooling, filters, diagnostics, and maintenance.",
    typicalResponse: "Today",
  },
  {
    id: "general",
    title: "General Repair",
    description: "Small repairs, handyman work, doors, drywall, and fixtures.",
    typicalResponse: "1-2 days",
  },
];

export const sampleJobs: ServiceJob[] = [
  {
    id: "job_1001",
    title: "Lawn cleanup estimate",
    category: "Lawn & Yard",
    status: "Pending",
    address: "Lowell, MA",
    appointmentWindow: "Tomorrow, 9 AM - 12 PM",
  },
  {
    id: "job_1002",
    title: "AC maintenance",
    category: "HVAC",
    status: "Scheduled",
    address: "Boston, MA",
    appointmentWindow: "Friday, 1 PM - 3 PM",
    estimateCents: 14900,
  },
  {
    id: "job_1003",
    title: "Kitchen faucet leak",
    category: "Plumbing",
    status: "Completed",
    address: "Cambridge, MA",
    appointmentWindow: "Completed last week",
    estimateCents: 22500,
  },
];

export const sampleChats: ChatThread[] = [
  {
    id: "chat_2001",
    technicianName: "Fixee Support",
    jobTitle: "Lawn cleanup estimate",
    lastMessage: "Please upload two clear photos of the front and side yard.",
    updatedAt: "9:42 AM",
    unreadCount: 2,
  },
  {
    id: "chat_2002",
    technicianName: "Alex M.",
    jobTitle: "AC maintenance",
    lastMessage: "I am scheduled for Friday between 1 PM and 3 PM.",
    updatedAt: "Yesterday",
    unreadCount: 0,
  },
];

export function formatCurrency(cents?: number) {
  if (typeof cents !== "number") return "Estimate pending";

  return `$${(cents / 100).toFixed(2)}`;
}
