"use client";

import React from "react";

/**
 * Decorative full-screen ambient layer (blobs, grid, stars). No pointer events.
 */

const LIFE_STARS: [number, number][] = [
  [8, 12],
  [22, 8],
  [45, 15],
  [78, 10],
  [92, 22],
  [15, 35],
  [88, 38],
  [55, 28],
  [33, 48],
  [70, 52],
  [12, 62],
  [95, 58],
  [40, 72],
  [65, 78],
  [25, 88],
  [82, 85],
  [50, 92],
  [6, 55],
  [58, 8],
  [90, 45],
];

const WELCOME_STARS: [number, number][] = [
  [12, 18],
  [35, 12],
  [68, 20],
  [88, 35],
  [20, 45],
  [75, 55],
  [48, 70],
  [15, 82],
  [92, 78],
];

function StarField({
  positions,
  className,
}: {
  positions: [number, number][];
  className?: string;
}) {
  return (
    <div className={`game-ambient__stars ${className ?? ""}`}>
      {positions.map(([x, y], i) => (
        <span
          key={i}
          className="game-ambient__star"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            animationDelay: `${(i % 7) * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}

export function GameAmbientBg({
  variant,
}: {
  variant: "life" | "welcome";
}) {
  const stars = variant === "welcome" ? WELCOME_STARS : LIFE_STARS;
  return (
    <div
      className={`game-ambient game-ambient--${variant}`}
      aria-hidden="true"
    >
      <div className="game-ambient__blob game-ambient__blob--a" />
      <div className="game-ambient__blob game-ambient__blob--b" />
      <div className="game-ambient__blob game-ambient__blob--c" />
      <div className="game-ambient__grid" />
      <StarField positions={stars} />
      <div className="game-ambient__vignette" />
    </div>
  );
}
