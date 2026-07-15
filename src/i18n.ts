import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      nav: {
        home: "Home",
        rooms: "Rooms",
        offers: "Offers",
        restaurant: "Restaurant",
        gallery: "Gallery",
        about: "About",
        policies: "Policies",
        contact: "Contact",
        bookNow: "Book Now",
        guestPortal: "Guest Portal",
      },
      hero: {
        title: "Where Elegance Meets Comfort",
        subtitle: "in the Heart of Abakaliki",
        tagline: "...love and refreshment",
        reserve: "Reserve Your Suite",
        explore: "Explore Rooms",
      },
      common: {
        checkIn: "Check In",
        checkOut: "Check Out",
        adults: "Adults",
        children: "Children",
        rooms: "Rooms",
        checkAvailability: "Check Availability",
        continue: "Continue",
        back: "Back",
        bookingFor: "Booking for",
        bookingType: {
          self: "Booking for myself",
          family: "For family & friends",
          corporate: "Corporate team",
        },
        numberOfRooms: "Number of rooms",
      },
    },
  },
  ig: {
    translation: {
      nav: { home: "Ụlọ", rooms: "Ọnụ ụlọ", offers: "Onyinye", restaurant: "Ụlọ Nri", gallery: "Ngosi", about: "Maka anyị", policies: "Iwu", contact: "Kpọtụrụ", bookNow: "Debe Ugbu a", guestPortal: "Pọtụlụ Ọbịa" },
      hero: { title: "Ebe Mma na Nkasi Obi Na-ezukọ", subtitle: "n'Etiti Abakaliki", tagline: "...ịhụnanya na ume ọhụrụ", reserve: "Debe Ụlọ Gị", explore: "Lelee Ụlọ" },
      common: { checkIn: "Bata", checkOut: "Pụọ", adults: "Ndị okenye", children: "Ụmụaka", rooms: "Ụlọ", checkAvailability: "Lelee Onye Dị", continue: "Gaa n'ihu", back: "Laghachi", bookingFor: "Ndebe maka", bookingType: { self: "Maka onwe m", family: "Ezinụlọ na ndị enyi", corporate: "Otu ụlọ ọrụ" }, numberOfRooms: "Ọnụọgụ ụlọ" },
    },
  },
  yo: {
    translation: {
      nav: { home: "Ile", rooms: "Yara", offers: "Ipese", restaurant: "Iyàrá Oúnjẹ", gallery: "Aworan", about: "Nipa wa", policies: "Ofin", contact: "Kan si", bookNow: "Wewe Bayi", guestPortal: "Ẹnu-ọna Alejo" },
      hero: { title: "Ibi ti Ẹwa Pade Itunu", subtitle: "ni Aarin Abakaliki", tagline: "...ifẹ ati ìmúdàgbà", reserve: "Wewe Yara Rẹ", explore: "Wo Awọn Yara" },
      common: { checkIn: "Wọle", checkOut: "Jade", adults: "Awọn agbalagba", children: "Awọn ọmọde", rooms: "Yara", checkAvailability: "Ṣayẹwo Wiwa", continue: "Tẹsiwaju", back: "Pada", bookingFor: "Iwewe fun", bookingType: { self: "Fun ara mi", family: "Fun ẹbi & ọrẹ", corporate: "Ẹgbẹ ile-iṣẹ" }, numberOfRooms: "Iye yara" },
    },
  },
  ha: {
    translation: {
      nav: { home: "Gida", rooms: "Daki", offers: "Tayi", restaurant: "Gidan Abinci", gallery: "Hotuna", about: "Game da mu", policies: "Dokoki", contact: "Tuntube mu", bookNow: "Yi Rajista", guestPortal: "Tashar Baƙo" },
      hero: { title: "Inda Kyau Ke Saduwa Da Ta'aziyya", subtitle: "a Tsakiyar Abakaliki", tagline: "...ƙauna da sabuntawa", reserve: "Yi Rijistar Dakinka", explore: "Bincika Daki" },
      common: { checkIn: "Shigowa", checkOut: "Fita", adults: "Manya", children: "Yara", rooms: "Daki", checkAvailability: "Duba Samuwa", continue: "Cigaba", back: "Komawa", bookingFor: "Rajista don", bookingType: { self: "Don kaina", family: "Don iyali da abokai", corporate: "Tawagar kamfani" }, numberOfRooms: "Adadin daki" },
    },
  },
  fr: {
    translation: {
      nav: { home: "Accueil", rooms: "Chambres", offers: "Offres", restaurant: "Restaurant", gallery: "Galerie", about: "À propos", policies: "Règlement", contact: "Contact", bookNow: "Réserver", guestPortal: "Portail Invité" },
      hero: { title: "Où l'Élégance Rencontre le Confort", subtitle: "au Cœur d'Abakaliki", tagline: "...amour et rafraîchissement", reserve: "Réservez Votre Suite", explore: "Découvrir les Chambres" },
      common: { checkIn: "Arrivée", checkOut: "Départ", adults: "Adultes", children: "Enfants", rooms: "Chambres", checkAvailability: "Vérifier la Disponibilité", continue: "Continuer", back: "Retour", bookingFor: "Réservation pour", bookingType: { self: "Pour moi-même", family: "Famille et amis", corporate: "Équipe d'entreprise" }, numberOfRooms: "Nombre de chambres" },
    },
  },
  es: {
    translation: {
      nav: { home: "Inicio", rooms: "Habitaciones", offers: "Ofertas", restaurant: "Restaurante", gallery: "Galería", about: "Nosotros", policies: "Políticas", contact: "Contacto", bookNow: "Reservar", guestPortal: "Portal del Huésped" },
      hero: { title: "Donde la Elegancia se Une al Confort", subtitle: "en el Corazón de Abakaliki", tagline: "...amor y frescura", reserve: "Reserva tu Suite", explore: "Explorar Habitaciones" },
      common: { checkIn: "Entrada", checkOut: "Salida", adults: "Adultos", children: "Niños", rooms: "Habitaciones", checkAvailability: "Ver Disponibilidad", continue: "Continuar", back: "Atrás", bookingFor: "Reserva para", bookingType: { self: "Para mí", family: "Familia y amigos", corporate: "Equipo corporativo" }, numberOfRooms: "Número de habitaciones" },
    },
  },
  it: {
    translation: {
      nav: { home: "Home", rooms: "Camere", offers: "Offerte", restaurant: "Ristorante", gallery: "Galleria", about: "Chi siamo", policies: "Politiche", contact: "Contatti", bookNow: "Prenota", guestPortal: "Portale Ospiti" },
      hero: { title: "Dove l'Eleganza Incontra il Comfort", subtitle: "nel Cuore di Abakaliki", tagline: "...amore e freschezza", reserve: "Prenota la tua Suite", explore: "Esplora le Camere" },
      common: { checkIn: "Check-in", checkOut: "Check-out", adults: "Adulti", children: "Bambini", rooms: "Camere", checkAvailability: "Verifica Disponibilità", continue: "Continua", back: "Indietro", bookingFor: "Prenotazione per", bookingType: { self: "Per me stesso", family: "Famiglia e amici", corporate: "Team aziendale" }, numberOfRooms: "Numero di camere" },
    },
  },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: typeof window !== "undefined" ? localStorage.getItem("lang") || "en" : "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ig", label: "Igbo" },
  { code: "yo", label: "Yorùbá" },
  { code: "ha", label: "Hausa" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
];

export default i18n;
