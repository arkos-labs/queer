import { Home, HeartPulse, ShoppingBag, Handshake, Users, Briefcase, LayoutGrid } from 'lucide-react';

// Shared between DirectoryPage (authenticated) and PublicDirectoryPreview
// (logged-out) so the two never drift on which icon a category renders.
export const CATEGORY_ICONS: Record<string, typeof Home> = {
  Home,
  HeartPulse,
  Briefcase,
  ShoppingBag,
  Handshake,
  Users,
};

export const CATEGORY_ICON_FALLBACK = LayoutGrid;
