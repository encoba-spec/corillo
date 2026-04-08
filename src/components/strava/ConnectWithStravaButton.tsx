import Image from "next/image";

/**
 * Official "Connect with Strava" button. Do not alter the artwork,
 * color, or wording per Strava brand guidelines.
 */
export function ConnectWithStravaButton({
  width = 232,
}: {
  width?: number;
}) {
  return (
    <Image
      src="/strava/btn_strava_connect_orange.svg"
      alt="Connect with Strava"
      width={width}
      height={Math.round((width * 48) / 232)}
      priority
      unoptimized
    />
  );
}
