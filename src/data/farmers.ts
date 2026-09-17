export interface Farmer {
  id: string;
  name: string;
  avatar?: string;
  location: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseRate: number;
  memberSince: string;
  commodities: string[];
  description: string;
  farmSize: string;
  certifications: string[];
  upcomingHarvests: {
    crop: string;
    estimatedDate: string;
    estimatedQuantity: string;
  }[];
}

export const mockFarmers: Farmer[] = [
  {
    id: "farmer-1",
    name: "Pak Budi Santoso",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    location: "Serang, Banten",
    verified: true,
    rating: 4.9,
    reviewCount: 127,
    completedOrders: 342,
    responseRate: 98,
    memberSince: "2022",
    commodities: ["Cabai", "Tomat", "Bawang"],
    description:
      "Petani cabai berpengalaman 15+ tahun. Menggunakan metode budidaya organik dan sistem irigasi tetes. Komitmen kualitas dan pengiriman tepat waktu.",
    farmSize: "5 Hektar",
    certifications: ["Organik Indonesia", "GAP", "HACCP"],
    upcomingHarvests: [
      { crop: "Cabai Merah", estimatedDate: "2024-10-15", estimatedQuantity: "800 kg" },
      { crop: "Tomat", estimatedDate: "2024-11-01", estimatedQuantity: "500 kg" },
    ],
  },
  {
    id: "farmer-2",
    name: "Ibu Siti Rahayu",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    location: "Brebes, Jawa Tengah",
    verified: true,
    rating: 4.7,
    reviewCount: 89,
    completedOrders: 215,
    responseRate: 95,
    memberSince: "2021",
    commodities: ["Bawang Merah", "Bawang Putih"],
    description:
      "Petani bawang merah keturunan kelima di Brebes. Warisan ilmu budidaya bawang merah khas Brebes yang sudah tersebar ke seluruh Indonesia.",
    farmSize: "3 Hektar",
    certifications: ["Indikasi Geografis Brebes", "GAP"],
    upcomingHarvests: [
      { crop: "Bawang Merah", estimatedDate: "2024-10-20", estimatedQuantity: "1.2 Ton" },
    ],
  },
  {
    id: "farmer-3",
    name: "Pak Ahmad Hidayat",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    location: "Bandung, Jawa Barat",
    verified: true,
    rating: 4.8,
    reviewCount: 203,
    completedOrders: 567,
    responseRate: 99,
    memberSince: "2020",
    commodities: ["Tomat", "Wortel", "Kentang"],
    description:
      "Koperasi petani sayuran di Lembang. Fokus pada sayuran hidroponik dan organik. Sistem panen bertahap menjamin ketersediaan sepanjang tahun.",
    farmSize: "8 Hektar",
    certifications: ["Organik Indonesia", "GAP", "HACCP", "ISO 22000"],
    upcomingHarvests: [
      { crop: "Tomat", estimatedDate: "2024-10-10", estimatedQuantity: "600 kg" },
      { crop: "Wortel", estimatedDate: "2024-10-25", estimatedQuantity: "400 kg" },
      { crop: "Kentang", estimatedDate: "2024-11-15", estimatedQuantity: "1 Ton" },
    ],
  },
  {
    id: "farmer-4",
    name: "Koperasi Tani Makmur",
    avatar: "https://images.unsplash.com/photo-1522075252006-174a714a884a?w=200&q=80",
    location: "Karawang, Jawa Barat",
    verified: true,
    rating: 4.9,
    reviewCount: 312,
    completedOrders: 1245,
    responseRate: 97,
    memberSince: "2019",
    commodities: ["Beras IR64", "Beras Ciherang", "Jagung"],
    description:
      "Koperasi petani beras terbesar di Karawang. Mengelola 500+ hektar lahan sawah. Sistem pengolahan beras modern dengan standar BULOG.",
    farmSize: "500+ Hektar",
    certifications: ["SNI", "BULOG Certified", "Organik Indonesia", "GAP"],
    upcomingHarvests: [
      { crop: "Beras IR64", estimatedDate: "2025-01-15", estimatedQuantity: "50 Ton" },
      { crop: "Beras Ciherang", estimatedDate: "2025-02-01", estimatedQuantity: "30 Ton" },
    ],
  },
  {
    id: "farmer-5",
    name: "Pak Joko Widodo",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    location: "Lampung",
    verified: true,
    rating: 4.6,
    reviewCount: 67,
    completedOrders: 189,
    responseRate: 92,
    memberSince: "2022",
    commodities: ["Pisang", "Kelapa", "Kakao"],
    description:
      "Petani buah-buahan tropis di Lampung. Spesialis pisang Cavendish kelas ekspor. Menggunakan praktik pertanian berkelanjutan.",
    farmSize: "12 Hektar",
    certifications: ["GlobalG.A.P.", "Organik Indonesia", "Rainforest Alliance"],
    upcomingHarvests: [
      { crop: "Pisang Cavendish", estimatedDate: "2024-10-05", estimatedQuantity: "2 Ton" },
      { crop: "Kelapa", estimatedDate: "2024-11-20", estimatedQuantity: "5.000 biji" },
    ],
  },
];

export function getFarmerById(id: string): Farmer | undefined {
  return mockFarmers.find((f) => f.id === id);
}