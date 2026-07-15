import os
import json

def read_files():
    with open('public/gallery_files.txt', 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
    res = []
    for line in lines:
        path = line
        if path.lower().endswith('.jpg') or path.lower().endswith('.jpeg'):
            path = path[:-4] + '.webp'
        elif path.lower().endswith('.png'):
            path = path[:-4] + '.webp'
        res.append("/" + path)
    return res

files = read_files()

def get_images(folder_prefixes):
    if isinstance(folder_prefixes, str):
        folder_prefixes = [folder_prefixes]
    res = []
    for f in files:
        for pref in folder_prefixes:
            if f.startswith(pref):
                path = f.replace('/Remeritona Hotel Gallery/Superior/', '/Remeritona Hotel Gallery/Classic/')
                res.append(path)
    return res

def sort_business(images):
    img_39 = next((i for i in images if 'IMG_7139' in i), None)
    img_24 = next((i for i in images if 'IMG_7124' in i), None)
    rest = [i for i in images if i != img_39 and i != img_24]
    res = []
    if img_39: res.append(img_39)
    if img_24: res.append(img_24)
    res.extend(rest)
    return res

def sort_executive(images):
    img_72 = next((i for i in images if 'IMG_7172' in i), None)
    img_57 = next((i for i in images if 'IMG_7157' in i), None)
    rest = [i for i in images if i != img_72 and i != img_57]
    res = []
    if img_72: res.append(img_72)
    if img_57: res.append(img_57)
    res.extend(rest)
    return res

rooms_data = f"""export type Room = {{
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
}};

export const rooms: Room[] = [
  {{
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
    image: "{get_images('/Remeritona Hotel Gallery/Classic/')[0]}",
    gallery: {json.dumps(get_images('/Remeritona Hotel Gallery/Classic/'), indent=6)},
    amenities: ["Free Wi-Fi", "Air Conditioning", "Smart TV", "En-suite Bathroom", "Daily Housekeeping"],
  }},
  {{
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
    image: "{get_images('/Remeritona Hotel Gallery/Superior/')[0]}",
    gallery: {json.dumps(get_images('/Remeritona Hotel Gallery/Superior/'), indent=6)},
    amenities: ["Free Wi-Fi", "Air Conditioning", "Smart TV", "Bathtub / Rain Shower", "Workspace"],
  }},
  {{
    slug: "executive",
    name: "Executive",
    tagline: "The pinnacle of Abakaliki luxury",
    description:
      "Our flagship Executive room features premium furnishings and bespoke service — an iconic stay for discerning guests and visiting dignitaries.",
    price: 80000,
    size: "62 m²",
    beds: "1 King Bed + Lounge",
    capacity: 3,
    occupancy: "Max 2 Adults + 1 Extra Bed + Child",
    image: "{get_images(['/Remeritona Hotel Gallery/Executive/', '/Remeritona Hotel Gallery/Executive Room/'])[0]}",
    gallery: {json.dumps(get_images(['/Remeritona Hotel Gallery/Executive/', '/Remeritona Hotel Gallery/Executive Room/']), indent=6)},
    amenities: ["Free Wi-Fi", "Air Conditioning", "Concierge Service"],
  }},
  {{
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
    image: "{sort_business(get_images('/Remeritona Hotel Gallery/Business Suite/'))[0]}",
    gallery: {json.dumps(sort_business(get_images('/Remeritona Hotel Gallery/Business Suite/')), indent=6)},
    amenities: ["Free Wi-Fi", "Air Conditioning", "Marble Bathroom", "Separate Living Area (Parlor)", "Smart Mirror", "Concierge Service"],
  }},
  {{
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
    image: "{sort_executive(get_images('/Remeritona Hotel Gallery/Executive Suite/'))[0]}",
    gallery: {json.dumps(sort_executive(get_images('/Remeritona Hotel Gallery/Executive Suite/')), indent=6)},
    amenities: ["Free Wi-Fi", "Air Conditioning", "Separate Living Area (Parlor)", "Premium Mini Bar", "Smart Mirror", "Two toilets (one luxury ensuite bathroom inside the bedroom with a bathtub, toilet, and smart mirror, plus one separate guest half-bath toilet)", "24/7 Concierge", "Panoramic View"],
  }},
];

export const getRoom = (slug: string) => rooms.find((r) => r.slug === slug);

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", {{ style: "currency", currency: "NGN", maximumFractionDigits: 0 }}).format(n);
"""

with open('src/data/rooms.ts', 'w', encoding='utf-8') as f:
    f.write(rooms_data)

gallery_images = []
for p in get_images('/Remeritona Hotel Gallery/Looby/'):
    gallery_images.append({"src": p, "alt": "Hotel Lobby", "category": "Interior"})
for p in get_images('/Remeritona Hotel Gallery/Hall Way/'):
    gallery_images.append({"src": p, "alt": "Hallway Interior", "category": "Interior"})

for p in get_images('/Remeritona Hotel Gallery/Restaurant/'):
    gallery_images.append({"src": p, "alt": "Restaurant", "category": "Dining"})
for p in get_images('/Remeritona Hotel Gallery/VIP Bar/'):
    gallery_images.append({"src": p, "alt": "VIP Bar", "category": "Dining"})

for p in get_images('/Remeritona Hotel Gallery/Pool/'):
    gallery_images.append({"src": p, "alt": "Pool", "category": "Facilities"})
for p in get_images(['/Remeritona Hotel Gallery/In-house gym/', '/Remeritona Hotel Gallery/Wokers gym/']):
    gallery_images.append({"src": p, "alt": "Gym", "category": "Facilities"})
for p in get_images('/Remeritona Hotel Gallery/Saloon/'):
    gallery_images.append({"src": p, "alt": "Salon", "category": "Facilities"})

for p in get_images(['/Remeritona Hotel Gallery/Conference room/', '/Remeritona Hotel Gallery/Conference hall/', '/Remeritona Hotel Gallery/Event Hall/']):
    gallery_images.append({"src": p, "alt": "Event Space", "category": "Events"})

# We will also add a few room images to the general gallery 'Rooms' category
for p in get_images('/Remeritona Hotel Gallery/Business Suite/')[:5]:
    gallery_images.append({"src": p, "alt": "Business Suite", "category": "Rooms"})
for p in get_images('/Remeritona Hotel Gallery/Executive Suite/')[:5]:
    gallery_images.append({"src": p, "alt": "Executive Suite", "category": "Rooms"})
for p in get_images('/Remeritona Hotel Gallery/Classic/')[:3]:
    gallery_images.append({"src": p, "alt": "Classic Room", "category": "Rooms"})

gallery_ts = f"""export const galleryImages = {json.dumps(gallery_images, indent=2)};
"""

with open('src/data/gallery.ts', 'w', encoding='utf-8') as f:
    f.write(gallery_ts)

print("Generated src/data/rooms.ts and src/data/gallery.ts successfully.")
