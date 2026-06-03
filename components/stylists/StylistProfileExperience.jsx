"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CompactHeader from "@/components/stylists/CompactHeader";
import PortfolioGalleryHero from "@/components/stylists/PortfolioGalleryHero";
import PortfolioLightbox from "@/components/stylists/PortfolioLightbox";
import StylistTabs from "@/components/stylists/StylistTabs";
import StylistSidebar from "@/components/stylists/StylistSidebar";
import ServiceList from "@/components/stylists/ServiceList";
import ReviewsList from "@/components/stylists/ReviewsList";
import PortfolioGrid from "@/components/stylists/PortfolioGrid";
import AboutSection from "@/components/stylists/AboutSection";
import StylistTimesModal from "@/components/stylists/StylistTimesModal";
import MessengerWidget from "@/components/ui/MessengerWidget";

function buildPortfolioMedia(stylist, services) {
  const serviceImages = services
    .map((service) => service.imageUrl)
    .filter(Boolean)
    .map((url, index) => ({
      id: `service-image-${index + 1}`,
      url,
      type: "image",
      caption: ""
    }));

  const itemUrls = new Set(
    (stylist.portfolioItems || []).map((item) => item.url).filter(Boolean)
  );

  const fallbackImages = (stylist.portfolioImages || [])
    .filter((url) => !itemUrls.has(url))
    .map((url, index) => ({
      id: `portfolio-image-${index + 1}`,
      url,
      type: "image",
      caption: ""
    }));

  return [
    ...(stylist.portfolioItems || []),
    ...fallbackImages,
    ...serviceImages
  ].filter((item) => item.url);
}

export default function StylistProfileExperience({ stylist, user, isLiked = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("services");
  const [selectedService, setSelectedService] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [liked, setLiked] = useState(isLiked);
  const [likeLoading, setLikeLoading] = useState(false);
  const [messengerState, setMessengerState] = useState({
    open: false,
    conversationId: null,
    loading: false
  });

  const services = stylist.services || [];
  const addOns = stylist.addons || [];
  const reviews = stylist.reviews || [];
  const portfolioMedia = useMemo(
    () => buildPortfolioMedia(stylist, services),
    [services, stylist]
  );

  const tabs = [
    { id: "services", label: "Services", count: services.length },
    { id: "reviews", label: "Reviews", count: reviews.length },
    { id: "portfolio", label: "Portfolio", count: portfolioMedia.length },
    { id: "about", label: "About" }
  ];

  const isClient = user?.role === "client";

  useEffect(() => {
    const saveParam = searchParams.get("saveStylist");
    if (saveParam && isClient && !liked) {
      handleLikeToggle(true);
      router.replace(`/stylists/${stylist.slug}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isClient, liked, stylist.slug]);

  const handleBook = (service) => {
    setSelectedService(service || services[0] || null);
  };

  async function handleLikeToggle(forceSave = false) {
    if (!user) {
      router.push(`/signin?redirect=/stylists/${stylist.slug}&saveStylist=true`);
      return;
    }

    if (!isClient) {
      alert("Only clients can save stylists.");
      return;
    }

    const nextLiked = forceSave ? true : !liked;
    if (nextLiked === liked && !forceSave) return;

    setLikeLoading(true);

    try {
      if (nextLiked) {
        const response = await fetch("/api/dashboard/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorSlug: stylist.slug })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not save stylist.");
        }
      } else {
        const response = await fetch(`/api/dashboard/favorites/${stylist.slug}`, {
          method: "DELETE"
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not unsave stylist.");
        }
      }
      setLiked(nextLiked);
    } catch (error) {
      alert(error.message);
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleMessage() {
    if (!user) {
      router.push(`/signin?redirect=/stylists/${stylist.slug}`);
      return;
    }

    if (!isClient) {
      alert("Only clients can message stylists.");
      return;
    }

    if (messengerState.conversationId) {
      setMessengerState((current) => ({ ...current, open: true }));
      return;
    }

    setMessengerState((current) => ({ ...current, loading: true }));

    try {
      const response = await fetch("/api/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorSlug: stylist.slug })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to start conversation.");
      }

      setMessengerState({
        open: true,
        conversationId: data.conversation?.id || null,
        loading: false
      });
    } catch (error) {
      alert(error.message);
      setMessengerState((current) => ({ ...current, loading: false }));
    }
  }

  const openLightboxAt = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const handleSeeTimesFromLightbox = (service) => {
    setSelectedService(service);
    setLightboxIndex(null);
  };

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4">
        <CompactHeader
          stylist={stylist}
          onMessage={handleMessage}
          onLike={handleLikeToggle}
          liked={liked}
          likeLoading={likeLoading}
          showMessage={true}
        />

        <PortfolioGalleryHero
          items={portfolioMedia}
          onShowAll={() => openLightboxAt(0)}
          onSelect={(index) => openLightboxAt(index)}
        />

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="min-w-0 flex-1">
            <StylistTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div className="mt-4 pb-12">
              {activeTab === "services" ? (
                <ServiceList
                  stylist={stylist}
                  services={services}
                  addOns={addOns}
                  onBook={handleBook}
                />
              ) : null}

              {activeTab === "reviews" ? <ReviewsList stylist={stylist} /> : null}

              {activeTab === "portfolio" ? (
                <PortfolioGrid
                  items={portfolioMedia}
                  stylistName={stylist.name}
                  onSelect={(index) => openLightboxAt(index)}
                />
              ) : null}

              {activeTab === "about" ? <AboutSection stylist={stylist} /> : null}
            </div>
          </div>

          <aside className="hidden w-80 shrink-0 lg:block">
            <StylistSidebar stylist={stylist} />
          </aside>
        </div>
      </div>

      {lightboxIndex !== null ? (
        <PortfolioLightbox
          items={portfolioMedia}
          initialIndex={lightboxIndex}
          stylist={stylist}
          services={services}
          onClose={closeLightbox}
          onSeeTimes={handleSeeTimesFromLightbox}
        />
      ) : null}

      {selectedService ? (
        <StylistTimesModal
          stylist={stylist}
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      ) : null}

      {messengerState.conversationId ? (
        <MessengerWidget
          conversationId={messengerState.conversationId}
          recipientName={stylist.name}
          recipientAvatar={stylist.avatar}
          userRole="client"
          initialOpen={messengerState.open}
          onClose={() => setMessengerState((current) => ({ ...current, open: false }))}
        />
      ) : null}
    </main>
  );
}
