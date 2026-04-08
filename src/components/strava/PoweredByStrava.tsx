import Image from "next/image";

/**
 * Strava-required attribution mark. Must be shown wherever Strava-derived
 * data is displayed. Do NOT modify the artwork at /public/strava/.
 */
export function PoweredByStrava({
  className = "",
  width = 110,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <Image
      src="/strava/api_logo_pwrdBy_strava_horiz_light.svg"
      alt="Powered by Strava"
      width={width}
      height={Math.round((width * 32) / 180)}
      className={className}
      unoptimized
    />
  );
}
