export type AccountType = 'particulier' | 'pro';
export type Civilite = 'Il' | 'Elle' | 'Iel' | 'Ielle' | 'Ne se prononce pas';
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
  intervention_zone: string | null;
  indicative_rates: string | null;
  budget_indicatif: string | null;
  linkedin_url: string | null;
  external_reviews_url: string | null;
  charte_accepted: boolean;
  charte_accepted_at: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  identity_document_path: string | null;
  profile_status: ProfileStatus;
  is_admin: boolean;
  is_community_member: boolean | null;
  is_ally: boolean;
  created_at: string;
  updated_at: string;
}

// What PUBLIC_PROFILE_COLUMNS actually returns: every Profile field except
// the ones that query deliberately omits (see its comment in lib/supabase.ts).
export type PublicProfile = Omit<Profile, 'identity_document_path' | 'is_admin'>;

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

// What the anon-readable public_directory_listings view returns — a
// deliberately narrow, anonymized shape (see its migration). Never has a
// full display_name, email, phone, photo or bio.
export interface PublicDirectoryListing {
  id: string;
  display_initial: string;
  city: string | null;
  account_type: AccountType;
  skills: string[];
  verification_status: VerificationStatus;
  avg_rating: number;
  review_count: number;
  subcategory_ids: string[];
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
  images?: string[] | null;
  created_at: string;
  author?: Pick<Profile, 'id' | 'display_name' | 'photo_url'>;
}

export interface Connection {
  id: string;
  user_a: string;
  user_b: string;
  service_label: string | null;
  status: ConnectionStatus;
  mission_request_id: string | null;
  phone_shared: boolean;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export type ResourceType = 'numero_utile' | 'guide';

export interface Resource {
  id: string;
  type: ResourceType;
  slug: string;
  title: string;
  description: string;
  content: string | null;
  phone: string | null;
  url: string | null;
  hours: string | null;
  sort_order: number;
}

export interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sender?: Pick<Profile, 'id' | 'display_name' | 'photo_url'>;
}

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Place {
  id: string;
  submitted_by: string;
  subcategory_id: string | null;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  photo_url: string | null;
  status: ModerationStatus;
  flagged: boolean;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  submitter?: Pick<Profile, 'id' | 'display_name' | 'photo_url'>;
  subcategory?: Pick<Subcategory, 'id' | 'label'>;
}

export interface PlaceReview {
  id: string;
  place_id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  status: ModerationStatus;
  flagged: boolean;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  author?: Pick<Profile, 'id' | 'display_name' | 'photo_url'>;
  place?: Pick<Place, 'id' | 'name'>;
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

export type NotificationType = 'message' | 'review' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export type EventStatus = 'draft' | 'published' | 'archived';

export interface Event {
  id: string;
  name: string;
  description: string | null;
  theme: string | null;
  city: string;
  address: string | null;
  event_date: string;
  event_end_date: string | null;
  photo_url: string | null;
  website_url: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}
