export type Room = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  size: string;
  beds: string;
  capacity: number;
  occupancy: string;
  image: string;
  gallery?: string[];
  amenities: string[];
};

export const rooms: Room[] = [
  {
    slug: "classic",
    name: "Classic",
    tagline: "Comfort and warmth, thoughtfully designed",
    description:
      "Our Classic room offers a serene retreat with all the comforts you need for a restful stay — a plush bed, modern amenities, and a calming, contemporary interior.",
    price: 60000,
    size: "28 m²",
    beds: "1 King Bed",
    capacity: 3,
    occupancy: "Max 2 Adults + 1 Extra Bed + 1 Child",
    image: "/Remeritona Hotel Gallery/Classic/IMG_7034input.webp",
    gallery: [
      "/Remeritona Hotel Gallery/Classic/IMG_7034input.webp",
      "/Remeritona Hotel Gallery/Classic/IMG_7035.webp",
      "/Remeritona Hotel Gallery/Classic/IMG_7037.webp",
      "/Remeritona Hotel Gallery/Classic/IMG_7039.webp",
      "/Remeritona Hotel Gallery/Classic/IMG_7041.webp"
    ],
    amenities: ["Free Wi-Fi", "Air Conditioning", "Smart TV", "Mini Bar", "En-suite Bathroom", "Daily Housekeeping"],
  },
  {
    slug: "superior",
    name: "Superior",
    tagline: "Refined comfort with a golden touch",
    description:
      "The Superior room blends warm wood accents with elevated finishes, premium bedding, and a spacious layout — an inviting sanctuary in the heart of Abakaliki.",
    price: 70000,
    size: "38 m²",
    beds: "1 King Bed",
    capacity: 3,
    occupancy: "Max 2 Adults + 1 Extra Bed + 1 Child",
    image: "/Remeritona Hotel Gallery/Classic/IMG_7040.webp",
    gallery: [
      "/Remeritona Hotel Gallery/Classic/IMG_7040.webp",
      "/Remeritona Hotel Gallery/Classic/IMG_7043.webp"
    ],
    amenities: ["Free Wi-Fi", "Air Conditioning", "Smart TV", "Mini Bar", "Bathtub / Rain Shower", "Workspace"],
  },
  {
    slug: "executive",
    name: "Executive",
    tagline: "The pinnacle of Abakaliki luxury",
    description:
      "Our flagship Executive room features a generous living area, premium furnishings, and bespoke service — an iconic stay for discerning guests and visiting dignitaries.",
    price: 80000,
    size: "62 m²",
    beds: "1 King Bed + Lounge",
    capacity: 3,
    occupancy: "Max 2 Adults + 1 Extra Bed + Child",
    image: "/Remeritona Hotel Gallery/Executive/IMG_7007.webp",
    gallery: [
      "/Remeritona Hotel Gallery/Executive/IMG_7007.webp",
      "/Remeritona Hotel Gallery/Executive/IMG_7009.webp",
      "/Remeritona Hotel Gallery/Executive/IMG_7012.webp",
      "/Remeritona Hotel Gallery/Executive/IMG_7013.webp",
      "/Remeritona Hotel Gallery/Executive/IMG_7014.webp",
      "/Remeritona Hotel Gallery/Executive/IMG_7017.webp",
      "/Remeritona Hotel Gallery/Executive/IMG_7019.webp",
      "/Remeritona Hotel Gallery/Executive/IMG_7022.webp",
      "/Remeritona Hotel Gallery/Executive/IMG_7023.webp",
      "/Remeritona Hotel Gallery/Executive Room/IMG_6989.webp",
      "/Remeritona Hotel Gallery/Executive Room/IMG_6992.webp",
      "/Remeritona Hotel Gallery/Executive Room/IMG_6994.webp",
      "/Remeritona Hotel Gallery/Executive Room/IMG_6995.webp",
      "/Remeritona Hotel Gallery/Executive Room/IMG_6997.webp",
      "/Remeritona Hotel Gallery/Executive Room/IMG_6998.webp",
      "/Remeritona Hotel Gallery/Executive Room/IMG_6999.webp",
      "/Remeritona Hotel Gallery/Executive Room/IMG_7000.webp"
    ],
    amenities: ["Free Wi-Fi", "Air Conditioning", "Separate Living Area", "Premium Mini Bar", "Spa Bath", "Concierge Service"],
  },
  {
    slug: "business-suites",
    name: "Business Suites",
    tagline: "Statesman comfort with bespoke detailing",
    description:
      "An elevated business executive experience featuring a grand king bed, marble bathroom, and warm gold-toned interiors — designed for VIPs seeking comfort and discretion.",
    price: 140000,
    size: "75 m²",
    beds: "1 King Bed",
    capacity: 3,
    occupancy: "Max 2 Adults + 1 Extra Bed + 1 Child",
    image: "/Remeritona Hotel Gallery/Business Suite/IMG_7124.webp",
    gallery: [
      "/Remeritona Hotel Gallery/Business Suite/IMG_7124.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7126.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7129.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7132.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7133.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7136.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7137.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7138.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7139.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7141.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7146.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7147.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7148.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7150.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7151.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7152.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7153.webp",
      "/Remeritona Hotel Gallery/Business Suite/IMG_7154.webp"
    ],
    amenities: ["Free Wi-Fi", "Air Conditioning", "Marble Bathroom", "Premium Mini Bar", "Lounge Seating", "Concierge Service"],
  },
  {
    slug: "executive-suites",
    name: "Executive Suites",
    tagline: "The summit of Remeritona luxury",
    description:
      "Our flagship executive suite features a chandelier-lit lounge, panoramic views, and dedicated concierge service — the definitive choice for heads of state and discerning travellers.",
    price: 170000,
    size: "95 m²",
    beds: "1 King Bed + Grand Lounge",
    capacity: 3,
    occupancy: "Max 2 Adults + 1 Extra Bed + 1 Child",
    image: "/Remeritona Hotel Gallery/Executive Suite/IMG_7157.webp",
    gallery: [
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7157.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7158.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7160.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7161.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7164.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7165.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7166.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7168.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7172.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7173.webp",
      "/Remeritona Hotel Gallery/Executive Suite/IMG_7176.webp"
],
    amenities: ["Free Wi-Fi", "Air Conditioning", "Grand Lounge", "Premium Mini Bar", "Spa Bath", "24/7 Concierge", "Panoramic View"],
  },
];

export const getRoom = (slug: string) => rooms.find((r) => r.slug === slug);

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
