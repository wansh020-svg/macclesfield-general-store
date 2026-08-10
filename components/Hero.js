"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Hero() {
  const wrapperRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const wrapperTop = window.scrollY + rect.top;
      const scrollRange = wrapper.offsetHeight - window.innerHeight;
      const scrolled = window.scrollY - wrapperTop;

      const p = scrollRange > 0 ? Math.min(Math.max(scrolled / scrollRange, 0), 1) : 0;
      setProgress(p);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dayOpacity = progress;
  const parallaxOffset = progress * 80;

  return (
    // Tall wrapper gives scroll distance for the effect to play out over —
    // the inner section stays pinned (sticky) for that whole stretch.
    <div ref={wrapperRef} className="relative" style={{ height: "200vh" }}>
      <section className="sticky top-0 h-screen text-canvas-light overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url(/storefront.jpg)",
            transform: `translateY(${parallaxOffset}px) scale(1.15)`,
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url(/storefront-day.jpg)",
            opacity: dayOpacity,
            transform: `translateY(${parallaxOffset}px) scale(1.15)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pine-dark via-pine-dark/70 to-pine-dark/20" />

        <div className="relative max-w-5xl mx-auto px-5 h-full flex flex-col justify-center">
          <span className="price-tag mb-6 w-fit">
            Venables St &middot; Macclesfield SA &middot; Est. 1862
          </span>
          <h1 className="font-display font-900 text-4xl sm:text-6xl leading-[1.05] max-w-3xl">
            The general store at the heart of Macclesfield.
          </h1>
          <p className="mt-6 max-w-xl text-canvas-light/85 text-lg font-body">
            Coffee, groceries, and a warm hello &mdash; under new management since 2024,
            still the first stop and the last word for locals and travellers through
            the Hills.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="price-tag">Open 7 Days</span>
            <span className="price-tag">Dine-in &amp; Takeaway</span>
            <span className="price-tag">Pet Friendly</span>
          </div>
          <div className="mt-10 flex gap-4">
            <Link
              href="/menu"
              className="bg-rust text-canvas-light font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-rust/90 transition-colors"
            >
              See the Menu
            </Link>
            <Link
              href="/contact"
              className="border border-canvas-light/40 font-mono text-xs uppercase tracking-widest px-6 py-3 hover:border-canvas-light transition-colors"
            >
              Find Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
