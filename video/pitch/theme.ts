import { loadFont } from "@remotion/google-fonts/Geist";
import { Easing } from "remotion";

/*
 * Look of the WikiAI pitch film: near-black stage, white type, one cobalt
 * light that belongs to WikiAI, red only where the client is lost.
 */

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin", "cyrillic"],
});

export const C = {
  bg: "#05060A",
  ink: "#F3F5F9",
  soft: "#8E95A4",
  dim: "#5B6271",
  rule: "rgba(255,255,255,0.10)",
  cobalt: "#5B84FF",
  cobaltDeep: "#2448E0",
  alarm: "#FF5D50",
  ok: "#43D79A",
  glass: "rgba(16,19,26,0.94)",
  glassEdge: "rgba(255,255,255,0.09)",
} as const;

export const LIGHT = {
  cobalt: "rgba(76,118,255,0.30)",
  red: "rgba(255,80,66,0.17)",
  soft: "rgba(120,140,200,0.14)",
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Fast out, long settle: the easing for everything that arrives. */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
