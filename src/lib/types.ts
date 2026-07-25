export type AccountType = 'particulier' | 'pro' | 'asso';
export type Civilite = 'Monsieur' | 'Madame' | 'Iel';
export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type ProfileStatus = 'active' | 'suspended' | 'banned' | 'pending';
export type ConnectionStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportTargetType = 'profile' | 'review' | 'message';

export interface Profile {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  civilite: Civilite | null;
  pronouns: string | null;
  account_type: AccountType;
  bio: string | null;
  photo_url: string | null;
  city: string | null;
  skills: string[];
  needs: string[];
  siret: string | null;
  service_category: string | null;
  intervention_zone: string | null;
  indicative_rates: string | null;
  charte_accepted: boolean;
  charte_accepted_at: string | null;
  verification_status: VerificationStatus;
  profile_status: ProfileStatus;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  label: string;
  slug: string;
  icon: string | null;
  sort_order: number;
}

export interface Subcategory {
  id: string;
  category_id: string;
  label: string;
  slug: string;
  sort_order: number;
}

export interface Badge {
  id: string;
  code: string;
  label: string;
  description: string | null;
  icon: string | null;
}

export interface ProfileBadge {
  profile_id: string;
  badge_id: string;
  awarded_at: string;
  source_rule: string | null;
  badge?: Badge;
}

export interface Review {
  id: string;
  author_id: string;
  target_id: string;
  connection_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  author?: Pick<Profile, 'id' | 'display_name' | 'photo_url'>;
}

export interface Connection {
  id: string;
  user_a: string;
  user_b: string;
  service_label: string | null;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  handled_by: string | null;
  resolution_note: string | null;
}
