"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { useRef } from "react";

export default function NotFound() {
  const imageRef = useRef<HTMLImageElement>(null);

  const moveBackdrop = (clientX: number, clientY: number) => {
    const image = imageRef.current;
    if (!image) return;
    const x = Math.max(-100, Math.min(100, window.innerWidth / 2 - clientX));
    const y = Math.max(-100, Math.min(100, window.innerHeight / 2 - clientY));
    image.style.setProperty("--not-found-x", `${(20 * x) / 100}px`);
    image.style.setProperty("--not-found-y", `${(10 * y) / 100}px`);
  };

  return (
    <main
      className="sjs-not-found"
      onPointerMove={(event) => moveBackdrop(event.clientX, event.clientY)}
      onPointerDown={(event) => moveBackdrop(event.clientX, event.clientY)}
    >
      <section className="sjs-not-found-card">
        <img
          ref={imageRef}
          className="sjs-not-found-backdrop"
          src="https://www.supah.it/dribbble/008/008.jpg"
          alt=""
        />
        <div className="sjs-not-found-shade" />

        <header>
          <Menu aria-hidden="true" />
          <Link href="/" aria-label="SJS Super Market home">
            <img src="/app_logo.jpeg" alt="SJS Super Market" />
          </Link>
          <Search aria-hidden="true" />
        </header>

        <div className="sjs-not-found-content">
          <h1>404</h1>
          <h2>Page not found</h2>
          <p>We looked everywhere, but this page has gone missing.</p>
          <Link href="/">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
