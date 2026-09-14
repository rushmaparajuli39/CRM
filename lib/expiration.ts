export type ExpiryUrgency = "expired" | "30" | "60" | null;

// null = not expiring soon (or no expiration date at all)
export function expiryUrgency(expirationDate: string | null): ExpiryUrgency {
  if (!expirationDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expires = new Date(expirationDate);
  const daysUntil = Math.floor((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return "expired";
  if (daysUntil <= 30) return "30";
  if (daysUntil <= 60) return "60";
  return null;
}

export function expiryLabel(urgency: ExpiryUrgency): string {
  switch (urgency) {
    case "expired":
      return "Expired";
    case "30":
      return "Expires within 30 days";
    case "60":
      return "Expires within 60 days";
    default:
      return "";
  }
}

export function expiryBadgeClasses(urgency: ExpiryUrgency): string {
  switch (urgency) {
    case "expired":
      return "bg-red-100 text-red-800 border-red-300";
    case "30":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "60":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    default:
      return "bg-gray-100 text-gray-600 border-gray-300";
  }
}
