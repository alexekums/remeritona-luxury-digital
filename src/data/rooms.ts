import standardImg from "@/assets/room-deluxe.jpg";
import deluxeImg from "@/assets/room-executive.jpg";
import executiveImg from "@/assets/room-presidential.jpg";
import extra1 from "@/assets/room-extra-1.jpg";
import extra2 from "@/assets/room-extra-2.jpg";
import extra3 from "@/assets/room-extra-3.jpg";
import extra4 from "@/assets/room-extra-4.jpg";
import extra5 from "@/assets/room-extra-5.jpg";

export const roomGalleryExtras = [extra1, extra2, extra3, extra4, extra5];

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
    slug: "standard",
    name: "Standard Room",
    tagline: "Comfort and warmth, thoughtfully designed",
    description:
      "Our Standard Room offers a serene retreat with all the comforts you need for a restful stay — a plush bed, modern amenities, and a calming, contemporary interior.",
    price: 40000,
    size: "28 m²",
    beds: "1 King Bed",
    capacity: 3,
    occupancy: "Max 2 Adults + 1 Extra Bed + 1 Child",
    image: standardImg,
    gallery: [standardImg, extra1, extra4, extra2, extra3, extra5],
    amenities: ["Free Wi-Fi", "Air Conditioning", "Smart TV", "Mini Bar", "En-suite Bathroom", "Daily Housekeeping"],
  },
  {
    slug: "deluxe",
    name: "Deluxe Room",
    tagline: "Refined comfort with a golden touch",
    description:
      "The Deluxe Room blends warm wood accents with elevated finishes, premium bedding, and a spacious layout — an inviting sanctuary in the heart of Abakaliki.",
    price: 65000,
    size: "38 m²",
    beds: "1 King Bed",
    capacity: 3,
    occupancy: "Max 2 Adults + 1 Extra Bed + 1 Child",
    image: deluxeImg,
    gallery: [deluxeImg, extra2, extra5, extra1, extra3, extra4],
    amenities: ["Free Wi-Fi", "Air Conditioning", "Smart TV", "Mini Bar", "Bathtub / Rain Shower", "Workspace"],
  },
  {
    slug: "executive-suite",
    name: "Executive Suite",
    tagline: "The pinnacle of Abakaliki luxury",
    description:
      "Our flagship Executive Suite features a generous living area, premium furnishings, and bespoke service — an iconic stay for discerning guests and visiting dignitaries.",
    price: 125000,
    size: "62 m²",
    beds: "1 King Bed + Lounge",
    capacity: 3,
    occupancy: "Max 2 Adults + 1 Extra Bed + 1 Child",
    image: executiveImg,
    gallery: [executiveImg, extra3, extra5, extra2, extra1, extra4],
    amenities: ["Free Wi-Fi", "Air Conditioning", "Separate Living Area", "Premium Mini Bar", "Spa Bath", "Concierge Service"],
  },
];

export const getRoom = (slug: string) => rooms.find((r) => r.slug === slug);

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
