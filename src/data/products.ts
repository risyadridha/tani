export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  grade: "A" | "B" | "C";
  price: number;
  unit: string;
  minOrder: number;
  stock: number;
  location: string;
  farmerId: string;
  farmerName: string;
  farmerVerified: boolean;
  farmerRating: number;
  farmerReviewCount: number;
  category: string;
  tags: string[];
  harvestDate: string;
  availableUntil: string;
  rating: number;
  reviewCount: number;
}

export const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Cabai Merah Keriting",
    description:
      "Cabai merah keriting segar panen hari ini. Kualitas grade A, cocok untuk sambal, masakan padang, dan industri makanan. Ditanam secara organik tanpa pestisida berbahaya.",
    images: [
      "https://images.unsplash.com/photo-1584017411815-0d8b8c8b8b8b?w=800&q=80",
      "https://images.unsplash.com/photo-1561136594-7f6a4e8b8b8b?w=800&q=80",
    ],
    grade: "A",
    price: 38000,
    unit: "kg",
    minOrder: 10,
    stock: 500,
    location: "Serang, Banten",
    farmerId: "farmer-1",
    farmerName: "Pak Budi Santoso",
    farmerVerified: true,
    farmerRating: 4.9,
    farmerReviewCount: 127,
    category: "Sayuran",
    tags: ["organik", "segar", "grade-a"],
    harvestDate: "2024-09-15",
    availableUntil: "2024-09-25",
    rating: 4.8,
    reviewCount: 89,
  },
  {
    id: "prod-2",
    name: "Bawang Merah Brebes",
    description:
      "Bawang merah khas Brebes ukuran jumbo. Aroma khas, tekstur padat, tahan lama. Cocok untuk bumbu masak, gorengan, dan industri kuliner.",
    images: [
      "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=800&q=80",
    ],
    grade: "A",
    price: 28000,
    unit: "kg",
    minOrder: 20,
    stock: 1000,
    location: "Brebes, Jawa Tengah",
    farmerId: "farmer-2",
    farmerName: "Ibu Siti Rahayu",
    farmerVerified: true,
    farmerRating: 4.7,
    farmerReviewCount: 89,
    category: "Sayuran",
    tags: ["khas-brebes", "jumbo", "tahan-lama"],
    harvestDate: "2024-09-10",
    availableUntil: "2024-10-10",
    rating: 4.6,
    reviewCount: 156,
  },
  {
    id: "prod-3",
    name: "Tomat Merah",
    description:
      "Tomat merah segar, manis dan segar. Cocok untuk salad, jus, saus, dan masakan sehari-hari. Panen pagi ini, masih sangat segar.",
    images: [
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80",
    ],
    grade: "A",
    price: 15000,
    unit: "kg",
    minOrder: 10,
    stock: 300,
    location: "Bandung, Jawa Barat",
    farmerId: "farmer-3",
    farmerName: "Pak Ahmad Hidayat",
    farmerVerified: true,
    farmerRating: 4.8,
    farmerReviewCount: 203,
    category: "Sayuran",
    tags: ["manis", "segar", "organik"],
    harvestDate: "2024-09-16",
    availableUntil: "2024-09-22",
    rating: 4.7,
    reviewCount: 92,
  },
  {
    id: "prod-4",
    name: "Beras Premium IR64",
    description:
      "Beras IR64 premium, pulen dan wangi. Dikeringkan alami, dibersihkan berkala. Cocok untuk kebutuhan rumah tangga dan kuliner.",
    images: [
      "https://images.unsplash.com/photo-1586201375761-83865011e358?w=800&q=80",
    ],
    grade: "A",
    price: 14500,
    unit: "kg",
    minOrder: 50,
    stock: 5000,
    location: "Karawang, Jawa Barat",
    farmerId: "farmer-4",
    farmerName: "Koperasi Tani Makmur",
    farmerVerified: true,
    farmerRating: 4.9,
    farmerReviewCount: 312,
    category: "Beras & Biji-bijian",
    tags: ["premium", "pulen", "organik"],
    harvestDate: "2024-08-20",
    availableUntil: "2025-02-20",
    rating: 4.9,
    reviewCount: 234,
  },
  {
    id: "prod-5",
    name: "Pisang Cavendish",
    description:
      "Pisang Cavendish matang sempurna, manis dan legit. Ukuran standar ekspor. Cocok untuk konsumsi langsung, gorengan, dan olahan.",
    images: [
      "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=800&q=80",
    ],
    grade: "A",
    price: 18000,
    unit: "kg",
    minOrder: 25,
    stock: 800,
    location: "Lampung",
    farmerId: "farmer-5",
    farmerName: "Pak Joko Widodo",
    farmerVerified: true,
    farmerRating: 4.6,
    farmerReviewCount: 67,
    category: "Buah",
    tags: ["ekspor", "manis", "matang"],
    harvestDate: "2024-09-14",
    availableUntil: "2024-09-28",
    rating: 4.5,
    reviewCount: 78,
  },
  {
    id: "prod-6",
    name: "Cabai Rawit",
    description:
      "Cabai rawit merah, pedasnya nendang. Grade B untuk kebutuhan industri sambal dan makanan pedas. Harga lebih ekonomis.",
    images: [
      "https://images.unsplash.com/photo-1584017411815-0d8b8c8b8b8b?w=800&q=80",
    ],
    grade: "B",
    price: 25000,
    unit: "kg",
    minOrder: 20,
    stock: 200,
    location: "Magelang, Jawa Tengah",
    farmerId: "farmer-6",
    farmerName: "Pak Slamet Riyadi",
    farmerVerified: true,
    farmerRating: 4.5,
    farmerReviewCount: 45,
    category: "Sayuran",
    tags: ["pedas", "industri", "ekonomis"],
    harvestDate: "2024-09-12",
    availableUntil: "2024-09-22",
    rating: 4.4,
    reviewCount: 34,
  },
  {
    id: "prod-7",
    name: "Wortel Import",
    description:
      "Wortel segar ukuran besar, manis dan renyah. Cocok untuk jus, sup, tumisan, dan snack sehat. Tahan lama di suhu ruang.",
    images: [
      "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800&q=80",
    ],
    grade: "A",
    price: 22000,
    unit: "kg",
    minOrder: 15,
    stock: 400,
    location: "Pangalengan, Jawa Barat",
    farmerId: "farmer-7",
    farmerName: "Ibu Dewi Sartika",
    farmerVerified: true,
    farmerRating: 4.7,
    farmerReviewCount: 112,
    category: "Sayuran",
    tags: ["manis", "renyah", "sehat"],
    harvestDate: "2024-09-13",
    availableUntil: "2024-10-01",
    rating: 4.6,
    reviewCount: 87,
  },
  {
    id: "prod-8",
    name: "Jagung Manis",
    description:
      "Jagung manis super sweet, biji penuh dan manis. Cocok untuk direbus, dibakar, atau dijadikan olahan jagung manis.",
    images: [
      "https://images.unsplash.com/photo-1571672909055-5d9e3e8b8b8b?w=800&q=80",
    ],
    grade: "A",
    price: 12000,
    unit: "kg",
    minOrder: 30,
    stock: 600,
    location: "Malang, Jawa Timur",
    farmerId: "farmer-8",
    farmerName: "Pak Budi Hartono",
    farmerVerified: false,
    farmerRating: 4.3,
    farmerReviewCount: 28,
    category: "Sayuran",
    tags: ["manis", "super-sweet", "segar"],
    harvestDate: "2024-09-11",
    availableUntil: "2024-09-20",
    rating: 4.2,
    reviewCount: 41,
  },
];

export const mockCategories = [
  "Semua",
  "Sayuran",
  "Buah",
  "Beras & Biji-bijian",
  "Rempah & Bumbu",
  "Hasil Peternakan",
  "Hasil Perikanan",
  "Olahan",
];

export const mockLocations = [
  "Semua Lokasi",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Banten",
  "DKI Jakarta",
  "Sumatera",
  "Kalimantan",
  "Sulawesi",
  "Bali & Nusa Tenggara",
];

export function getProductById(id: string): Product | undefined {
  return mockProducts.find((p) => p.id === id);
}

export function getProductsByFarmerId(farmerId: string): Product[] {
  return mockProducts.filter((p) => p.farmerId === farmerId);
}

export function getRelatedProducts(category: string, excludeId: string, limit = 4): Product[] {
  return mockProducts
    .filter((p) => p.category === category && p.id !== excludeId)
    .slice(0, limit);
}