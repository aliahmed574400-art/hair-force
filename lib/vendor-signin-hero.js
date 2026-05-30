const FALLBACK_VENDOR_SIGNIN_SLIDES = [
  {
    id: "fallback-1",
    src: "/featured-stylists/fresha-01.jpg",
    alt: "Hair stylist portrait in a modern studio.",
    photographer: "Hair Force showcase",
    photographerUrl: "https://www.pexels.com",
    pexelsUrl: "https://www.pexels.com"
  },
  {
    id: "fallback-2",
    src: "/featured-stylists/fresha-02.jpg",
    alt: "Beauty stylist in a bright salon interior.",
    photographer: "Hair Force showcase",
    photographerUrl: "https://www.pexels.com",
    pexelsUrl: "https://www.pexels.com"
  },
  {
    id: "fallback-3",
    src: "/featured-stylists/fresha-03.jpg",
    alt: "Salon professional ready for appointments.",
    photographer: "Hair Force showcase",
    photographerUrl: "https://www.pexels.com",
    pexelsUrl: "https://www.pexels.com"
  },
  {
    id: "fallback-4",
    src: "/featured-stylists/fresha-04.jpg",
    alt: "Stylist workspace with polished beauty branding.",
    photographer: "Hair Force showcase",
    photographerUrl: "https://www.pexels.com",
    pexelsUrl: "https://www.pexels.com"
  },
  {
    id: "fallback-5",
    src: "/featured-stylists/fresha-05.jpg",
    alt: "Independent stylist portrait with salon lighting.",
    photographer: "Hair Force showcase",
    photographerUrl: "https://www.pexels.com",
    pexelsUrl: "https://www.pexels.com"
  },
  {
    id: "fallback-6",
    src: "/featured-stylists/fresha-06.jpg",
    alt: "Professional beautician preparing for a session.",
    photographer: "Hair Force showcase",
    photographerUrl: "https://www.pexels.com",
    pexelsUrl: "https://www.pexels.com"
  },
  {
    id: "fallback-7",
    src: "/featured-stylists/fresha-07.jpg",
    alt: "Barber and stylist profile in a premium salon.",
    photographer: "Hair Force showcase",
    photographerUrl: "https://www.pexels.com",
    pexelsUrl: "https://www.pexels.com"
  },
  {
    id: "fallback-8",
    src: "/featured-stylists/fresha-08.jpg",
    alt: "Stylist portrait beside a polished service setup.",
    photographer: "Hair Force showcase",
    photographerUrl: "https://www.pexels.com",
    pexelsUrl: "https://www.pexels.com"
  },
  {
    id: "fallback-9",
    src: "/featured-stylists/fresha-09.jpg",
    alt: "Beauty professional in a welcoming studio.",
    photographer: "Hair Force showcase",
    photographerUrl: "https://www.pexels.com",
    pexelsUrl: "https://www.pexels.com"
  }
];

function mapPexelsSlide(photo) {
  if (!photo?.id || !photo?.src) {
    return null;
  }

  return {
    id: String(photo.id),
    src: photo.src.portrait || photo.src.large2x || photo.src.large || photo.src.medium,
    alt: photo.alt?.trim() || `${photo.photographer || "Stylist"} in a salon workspace`,
    photographer: photo.photographer || "Pexels photographer",
    photographerUrl: photo.photographer_url || "https://www.pexels.com",
    pexelsUrl: photo.url || "https://www.pexels.com"
  };
}

export async function getVendorSigninHeroSlides() {
  const apiKey = process.env.PEXELS_API_KEY?.trim();

  if (!apiKey) {
    return FALLBACK_VENDOR_SIGNIN_SLIDES;
  }

  try {
    const params = new URLSearchParams({
      query: "hair stylist salon portrait",
      orientation: "portrait",
      size: "large",
      per_page: "9"
    });

    const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
      headers: {
        Authorization: apiKey
      },
      next: {
        revalidate: 60 * 60 * 6
      }
    });

    if (!response.ok) {
      throw new Error(`Pexels request failed with status ${response.status}`);
    }

    const data = await response.json();
    const slides = Array.isArray(data?.photos) ? data.photos.map(mapPexelsSlide).filter(Boolean) : [];

    return slides.length >= 6 ? slides : FALLBACK_VENDOR_SIGNIN_SLIDES;
  } catch (error) {
    console.error("Unable to load vendor sign-in hero slides from Pexels.", error);
    return FALLBACK_VENDOR_SIGNIN_SLIDES;
  }
}

