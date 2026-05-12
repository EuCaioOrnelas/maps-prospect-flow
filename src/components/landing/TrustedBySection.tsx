import googleLogo from "@/assets/logos/google.svg";
import metaLogo from "@/assets/logos/meta.svg";
import instagramLogo from "@/assets/logos/instagram.svg";
import stripeLogo from "@/assets/logos/stripe.svg";
import asaasLogo from "@/assets/logos/asaas.svg";
import vercelLogo from "@/assets/logos/vercel.svg";
import openaiLogo from "@/assets/logos/openai.svg";
import whatsappLogo from "@/assets/logos/whatsapp.svg";
import notionLogo from "@/assets/logos/notion.svg";

const brands = [
  { name: "Google", logo: googleLogo, className: "" },
  { name: "Meta", logo: metaLogo, className: "" },
  { name: "Instagram", logo: instagramLogo, className: "" },
  { name: "Stripe", logo: stripeLogo, className: "" },
  { name: "Asaas", logo: asaasLogo, className: "" },
  { name: "Vercel", logo: vercelLogo, className: "!h-20 sm:!h-28" },
  { name: "OpenAI", logo: openaiLogo, className: "" },
  { name: "WhatsApp", logo: whatsappLogo, className: "" },
  { name: "Notion", logo: notionLogo, className: "" },
];

export const TrustedBySection = () => {
  return (
    <section className="relative border-y border-muted-foreground/15 overflow-hidden">
      <div className="relative py-4 overflow-hidden marquee-mask">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee-content" aria-hidden={copy === 1}>
              {brands.map((brand) => (
                <div
                  key={brand.name}
                  className="inline-flex items-center justify-center px-8 sm:px-12 shrink-0 opacity-70 hover:opacity-100 transition-opacity duration-500"
                  title={brand.name}
                >
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    loading="lazy"
                    className={`h-7 sm:h-9 w-auto max-w-[140px] sm:max-w-[180px] object-contain ${brand.className}`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
