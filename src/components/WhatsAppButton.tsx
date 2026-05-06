import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/2349122999845?text=Hello%2C%20I%27d%20like%20to%20make%20a%20reservation%20at%20Re%20Meritona%20Hotel"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 grid place-items-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-110 transition-transform animate-pulse-slow"
    >
      <MessageCircle size={28} fill="white" />
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping -z-10" />
    </a>
  );
}
