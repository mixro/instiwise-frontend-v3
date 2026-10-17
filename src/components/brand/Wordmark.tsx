import { useId } from "react";

/**
 * The INSTIWISE lettering as SVG shapes, so it needs no font and its letters
 * follow the theme (currentColor) while the dot on the "i" always stays green.
 *
 * Coordinates are in the supplied logo's own units (the Illustrator file
 * `source/logo-without-background.svg`, viewBox 1013.99 x 335.67): cap height
 * runs from y=115 to y=217.11 and the dot sits at (671.77, 125.16), r 17.07.
 *
 * KNOWN GAP: these letters are a hand-drawn approximation of Tw Cen MT Bold.
 * For an exact match, outline the text in Illustrator (Type > Create Outlines),
 * export the wordmark, and replace the shapes below. Keep the viewBox.
 */
const VIEWBOX = { x: 340, y: 100, width: 670, height: 130 };

const S_PATH =
  "M545 142C545 130 536 125 521 125C506 125 497 132 497 144C497 158 508 162 521 166C535 170 545 175 545 189C545 201 536 207 521 207C505 207 497 200 497 190";

interface WordmarkProps {
  /** Rendered height in px. Width follows the aspect ratio. */
  height?: number;
  className?: string;
}

export function Wordmark({ height = 40, className }: WordmarkProps) {
  const clipId = `wordmark-cap-${useId().replace(/:/g, "")}`;
  const width = (height * VIEWBOX.width) / VIEWBOX.height;

  return (
    <svg
      role="img"
      aria-label="INSTIWISE"
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
      width={width}
      height={height}
      className={className}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="330" y="115" width="690" height="102.11" />
        </clipPath>
      </defs>
      <g fill="currentColor">
        {/* I */}
        <rect x="347.07" y="115" width="22" height="102.11" />
        {/* N */}
        <g clipPath={`url(#${clipId})`}>
          <path
            d="M394 217.11V115L462 217.11V115"
            fill="none"
            stroke="currentColor"
            strokeWidth="22"
            strokeMiterlimit="10"
          />
        </g>
        {/* S */}
        <path d={S_PATH} fill="none" stroke="currentColor" strokeWidth="20" />
        {/* T */}
        <rect x="569" y="115" width="76" height="22" />
        <rect x="596" y="115" width="22" height="102.11" />
        {/* i stem (the dot is drawn separately, in brand green) */}
        <rect x="660.9" y="148" width="21.74" height="69.11" />
        {/* W */}
        <g clipPath={`url(#${clipId})`}>
          <path
            d="M705 115L726 217.11L748 150L770 217.11L791 115"
            fill="none"
            stroke="currentColor"
            strokeWidth="22"
            strokeMiterlimit="10"
          />
        </g>
        {/* I */}
        <rect x="816" y="115" width="22" height="102.11" />
        {/* S */}
        <path
          transform="translate(365 0)"
          d={S_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth="20"
        />
        {/* E */}
        <rect x="934" y="115" width="22" height="102.11" />
        <rect x="934" y="115" width="66" height="21" />
        <rect x="934" y="155.5" width="58" height="21" />
        <rect x="934" y="196.11" width="66" height="21" />
      </g>
      <circle cx="671.77" cy="125.16" r="17.07" fill="var(--brand)" />
    </svg>
  );
}
