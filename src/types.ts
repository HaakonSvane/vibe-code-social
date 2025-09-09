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
  // 1-5 star rating (default when absent can be interpreted as 5 or unrated)
  rating?: number;
}
