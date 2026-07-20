"use client";

import { useEffect, useRef } from "react";
import { LANDING_HTML } from "./landingHtml";
import "@/app/geom-site.css";

/**
 * GEOM marketing landing, ported verbatim from the static geom.org site.
 * The markup is rendered inside a scoped `.geom-site` wrapper (styles in
 * geom-site.css never leak onto the app) and the original vanilla scripts
 * run as a single cleaned-up effect. Kept as one unit deliberately so it
 * stays pixel-identical to the signed-off design; can be componentised later.
 */
export default function GeomLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ── reveals + background-video fade-loop ── */
    const revIO = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revIO.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    root.querySelectorAll(".reveal").forEach((el) => revIO.observe(el));
    cleanups.push(() => revIO.disconnect());

    const vids = Array.from(root.querySelectorAll<HTMLVideoElement>(".bg-vid"));
    vids.forEach((v) => {
      v.loop = false;
      if (reduce) {
        v.removeAttribute("autoplay");
        return;
      }
      const FADE = 0.7;
      let fading = false;
      const onPlaying = () => v.classList.add("playing");
      const onTime = () => {
        if (
          !fading &&
          v.duration &&
          v.duration - v.currentTime <= FADE &&
          v.duration - v.currentTime > 0
        ) {
          fading = true;
          v.classList.remove("playing");
        }
      };
      const onEnded = () => {
        try {
          v.currentTime = 0;
        } catch {}
        const pp = v.play();
        if (pp && pp.catch) pp.catch(() => {});
        fading = false;
        setTimeout(() => v.classList.add("playing"), 60);
      };
      v.addEventListener("playing", onPlaying);
      v.addEventListener("timeupdate", onTime);
      v.addEventListener("ended", onEnded);
      cleanups.push(() => {
        v.removeEventListener("playing", onPlaying);
        v.removeEventListener("timeupdate", onTime);
        v.removeEventListener("ended", onEnded);
      });
    });
    if (!reduce && vids.length) {
      const vIO = new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            const v = e.target as HTMLVideoElement;
            if (e.isIntersecting) {
              const p = v.play && v.play();
              if (p && p.catch) p.catch(() => {});
            } else {
              try {
                v.pause();
              } catch {}
            }
          }),
        { threshold: 0.12 },
      );
      vids.forEach((v) => vIO.observe(v));
      cleanups.push(() => vIO.disconnect());
    }

    /* ── photoreal pump scroll-scrub (120-frame WebP sequence) ── */
    (() => {
      const N = 120;
      const DIR = "/seq/";
      const EXT = ".webp";
      const canvas = root.querySelector<HTMLCanvasElement>("#rig-canvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const section = root.querySelector<HTMLElement>("#rig");
      if (!section) return;
      const frames: HTMLImageElement[] = new Array(N);
      let loaded = 0;
      let cur = -1;
      let target = 0;
      let curF = 0;
      let raf: number | null = null;
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        window.matchMedia("(max-width:760px)").matches ? 1.5 : 2,
      );
      const pad = (i: number) => {
        let s = "" + i;
        while (s.length < 3) s = "0" + s;
        return s;
      };
      const drawCover = (img: HTMLImageElement) => {
        const cw = canvas.width,
          ch = canvas.height,
          iw = img.naturalWidth,
          ih = img.naturalHeight;
        if (!iw || !ih) return;
        const s = Math.max(cw / iw, ch / ih),
          w = iw * s,
          h = ih * s,
          x = (cw - w) / 2,
          y = (ch - h) / 2;
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, x, y, w, h);
      };
      const drawIndex = (i: number, force?: boolean) => {
        i = i < 0 ? 0 : i > N - 1 ? N - 1 : i;
        if (i === cur && !force) return;
        const img = frames[i];
        if (img && img.complete && img.naturalWidth) {
          cur = i;
          drawCover(img);
        }
      };
      const resize = () => {
        const r = canvas.getBoundingClientRect();
        let w = Math.round((r.width || window.innerWidth) * dpr);
        let h = Math.round((r.height || window.innerHeight) * dpr);
        if (w < 2) w = 1280;
        if (h < 2) h = 720;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          drawIndex(cur < 0 ? 0 : cur, true);
        }
      };
      const progress = () => {
        const total = section.offsetHeight - window.innerHeight;
        const y = -section.getBoundingClientRect().top;
        return total > 0 ? Math.max(0, Math.min(1, y / total)) : 0;
      };
      const loop = () => {
        const d = target - curF;
        if (Math.abs(d) < 0.06) {
          curF = target;
          drawIndex(Math.round(curF));
          raf = null;
          return;
        }
        curF += d * 0.16;
        drawIndex(Math.round(curF));
        raf = requestAnimationFrame(loop);
      };
      const onScroll = () => {
        target = (reduce ? 0.5 : progress()) * (N - 1);
        if (raf === null) raf = requestAnimationFrame(loop);
      };
      let started = false;
      const startPreload = () => {
        if (started) return;
        started = true;
        for (let i = 0; i < N; i++) {
          ((idx: number) => {
            const img = new Image();
            img.onload = () => {
              loaded++;
              if (idx === 0) {
                resize();
                drawIndex(0, true);
              }
              if (loaded === N) onScroll();
            };
            img.onerror = () => {
              loaded++;
            };
            img.src = DIR + "f_" + pad(idx) + EXT;
            frames[idx] = img;
          })(i);
        }
      };
      let pio: IntersectionObserver | null = null;
      if ("IntersectionObserver" in window) {
        pio = new IntersectionObserver(
          (es) => {
            if (es[0].isIntersecting) {
              startPreload();
              pio?.disconnect();
            }
          },
          { rootMargin: "900px 0px" },
        );
        pio.observe(section);
      } else {
        startPreload();
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", resize);
      resize();
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", resize);
        if (raf !== null) cancelAnimationFrame(raf);
        pio?.disconnect();
      });
    })();

    /* ── nav reveals once scrolled past the hero ── */
    (() => {
      const nav = root.querySelector<HTMLElement>(".nav");
      const hero = root.querySelector<HTMLElement>("#top");
      if (!nav || !hero) return;
      const upd = () => {
        const h = hero.offsetHeight || window.innerHeight;
        const y = window.pageYOffset || document.documentElement.scrollTop || 0;
        nav.classList.toggle("show", y > h * 0.66);
      };
      window.addEventListener("scroll", upd, { passive: true });
      window.addEventListener("resize", upd);
      upd();
      cleanups.push(() => {
        window.removeEventListener("scroll", upd);
        window.removeEventListener("resize", upd);
      });
    })();

    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div
      ref={rootRef}
      className="geom-site anim"
      dangerouslySetInnerHTML={{ __html: LANDING_HTML }}
    />
  );
}
