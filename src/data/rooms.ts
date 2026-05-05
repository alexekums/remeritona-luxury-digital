import deluxe from "@/assets/room-deluxe.jpg";
import executive from "@/assets/room-executive.jpg";
import presidential from "@/assets/room-presidential.jpg";

export type Room = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  size: string;
  beds: string;
  capacity: number;
  image: string;
  amenities: string[];
};

export const rooms: Room[] = [
  {
    slug: "deluxe-king",
    name: "Deluxe King",
    tagline: "Industrial elegance, refined comfort",
    description:
      "Spacious and elegantly appointed, the Deluxe King blends exposed brick and dark wood with a plush king bed and contemporary amenities. A signature retreat for the discerning traveler.",
    price: 85000,
    size: "38 m²",
    beds: "1 King Bed",
    capacity: 2,
    image: deluxe,
    amenities: ["King bed", "Smart TV", "Workspace", "Minibar", "Free Wi-Fi", "Rain shower"],
  },
  {
    slug: "executive-suite",
    name: "Executive Suite",
    tagline: "A private lounge in the city",
    description:
      "An expansive suite with a separate living area, marble bathroom, and bespoke gold-trim detailing. Includes club lounge access and personalized concierge service.",
    price: 120000,
    size: "62 m²",
    beds: "1 King + Sofa Bed",
    capacity: 3,
    image: executive,
    amenities: ["Separate living room", "Club lounge access", "Espresso machine", "Bathtub", "City view", "Premium toiletries"],
  },
  {
    slug: "presidential-suite",
    name: "Presidential Suite",
    tagline: "The pinnacle of Abakaliki luxury",
    description:
      "Our flagship suite features a four-poster bed, panoramic city views, a private dining area, and bespoke butler service. An iconic stay for visiting dignitaries and connoisseurs.",
    price: 250000,
    size: "120 m²",
    beds: "1 King + Living & Dining",
    capacity: 4,
    image: presidential,
    amenities: ["Private butler", "Dining for 6", "Panoramic windows", "Walk-in wardrobe", "Spa bath", "Chauffeur service"],
  },
];

export const getRoom = (slug: string) => rooms.find((r) => r.slug === slug);

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
