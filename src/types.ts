export interface CroissantSpot {
  id: string;
  lat: number;
  lng: number;
  createdAt: string; // ISO timestamp
  note?: string;
  address?: {
    displayName: string;
    shortAddress: string;
    fullAddress: string;
  };
}
