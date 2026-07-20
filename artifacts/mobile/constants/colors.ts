const colors = {
  light: {
    // Legacy aliases
    text: '#1C1C2E',
    tint: '#1565C0',

    // Core surfaces
    background: '#F0F2F8',
    foreground: '#1C1C2E',

    // Cards
    card: '#FFFFFF',
    cardForeground: '#1C1C2E',

    // Primary action
    primary: '#1565C0',
    primaryForeground: '#FFFFFF',
    primaryLight: '#E3F2FD',

    // Secondary
    secondary: '#283593',
    secondaryForeground: '#FFFFFF',

    // Muted
    muted: '#EEF0F6',
    mutedForeground: '#6B7280',

    // Accent
    accent: '#00897B',
    accentForeground: '#FFFFFF',

    // Destructive
    destructive: '#D32F2F',
    destructiveForeground: '#FFFFFF',

    // Status colors
    success: '#2E7D32',
    successLight: '#E8F5E9',
    warning: '#E65100',
    warningLight: '#FFF3E0',
    info: '#0277BD',
    infoLight: '#E1F5FE',

    // Borders
    border: '#E0E6EF',
    input: '#E0E6EF',

    // Call type colors
    incoming: '#2E7D32',
    incomingLight: '#E8F5E9',
    outgoing: '#1565C0',
    outgoingLight: '#E3F2FD',
    missed: '#D32F2F',
    missedLight: '#FFEBEE',

    // Category colors
    newLead: '#1565C0',
    newLeadLight: '#E3F2FD',
    interested: '#2E7D32',
    interestedLight: '#E8F5E9',
    followUp: '#E65100',
    followUpLight: '#FFF3E0',
    customer: '#00897B',
    customerLight: '#E0F2F1',
    paymentPending: '#D32F2F',
    paymentPendingLight: '#FFEBEE',
    closed: '#546E7A',
    closedLight: '#ECEFF1',

    // Priority colors
    high: '#D32F2F',
    medium: '#E65100',
    low: '#2E7D32',

    // Surface overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    headerBackground: '#1565C0',
    headerForeground: '#FFFFFF',
    tabBar: '#FFFFFF',
  },

  radius: 12,
};

export default colors;

// Category helpers
export const CATEGORIES = [
  'New Lead',
  'Interested',
  'Follow-up',
  'Customer',
  'Payment Pending',
  'Closed',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CALL_TYPES = ['Incoming', 'Outgoing', 'Missed'] as const;
export type CallType = (typeof CALL_TYPES)[number];

export function getCategoryColor(
  category: string,
  c: typeof colors.light,
): { bg: string; text: string } {
  switch (category) {
    case 'New Lead':
      return { bg: c.newLeadLight, text: c.newLead };
    case 'Interested':
      return { bg: c.interestedLight, text: c.interested };
    case 'Follow-up':
      return { bg: c.followUpLight, text: c.followUp };
    case 'Customer':
      return { bg: c.customerLight, text: c.customer };
    case 'Payment Pending':
      return { bg: c.paymentPendingLight, text: c.paymentPending };
    case 'Closed':
      return { bg: c.closedLight, text: c.closed };
    default:
      return { bg: c.muted, text: c.mutedForeground };
  }
}

export function getPriorityColor(
  priority: string,
  c: typeof colors.light,
): string {
  switch (priority) {
    case 'High':
      return c.high;
    case 'Medium':
      return c.medium;
    case 'Low':
      return c.low;
    default:
      return c.mutedForeground;
  }
}

export function getCallTypeColor(
  type: string,
  c: typeof colors.light,
): { color: string; bg: string } {
  switch (type) {
    case 'Incoming':
      return { color: c.incoming, bg: c.incomingLight };
    case 'Outgoing':
      return { color: c.outgoing, bg: c.outgoingLight };
    case 'Missed':
      return { color: c.missed, bg: c.missedLight };
    default:
      return { color: c.mutedForeground, bg: c.muted };
  }
}
