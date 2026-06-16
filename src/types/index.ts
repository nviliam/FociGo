// FociGo — TypeScript típusok
// Minden modell típus itt van definiálva, egységes referencia az egész projekthez

export type RsvpStatus = "going" | "not_going";

export type User = {
  id: string;
  email: string;
  nickname: string;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  default_venue: string | null;
  default_schedule: string | null;
  default_venue_fee: number | null; // egész szám fillérben
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  is_admin: boolean;
  created_at: string;
};

export type Match = {
  id: string;
  group_id: string;
  venue: string;
  match_date: string; // ISO 8601
  venue_fee: number; // egész szám fillérben
  public_token: string;
  created_at: string;
};

export type Rsvp = {
  id: string;
  match_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
};
