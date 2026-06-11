// Shared avatar utilities so chat sidebar, header and CRM display the same
// initials and color for the same contact/phone.

export const CHAT_AVATAR_COLORS = [
  "bg-[#00a884]",
  "bg-[#53bdeb]",
  "bg-[#7f66ff]",
  "bg-[#ff6f69]",
  "bg-[#ffa62b]",
  "bg-[#25d366]",
  "bg-[#5f66cd]",
  "bg-[#ff4081]",
];

export function getChatAvatarColor(phone: string | null | undefined): string {
  const key = (phone || "").replace(/\D/g, "");
  if (!key) return CHAT_AVATAR_COLORS[0];
  const hash = key.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CHAT_AVATAR_COLORS[hash % CHAT_AVATAR_COLORS.length];
}

export function getChatInitials(name: string | null | undefined, phone: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  const digits = (phone || "").replace(/\D/g, "");
  return digits.slice(-2) || "??";
}
