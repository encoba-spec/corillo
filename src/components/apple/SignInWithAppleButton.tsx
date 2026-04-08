/**
 * Sign in with Apple button per Apple Human Interface Guidelines.
 * Black pill-shaped button with white Apple logo + "Sign in with Apple" text.
 * Do not modify the artwork or color per HIG.
 */
export function SignInWithAppleButton() {
  return (
    <button
      type="submit"
      className="w-full h-12 flex items-center justify-center gap-2 bg-black hover:bg-zinc-900 text-white rounded-lg font-medium text-base transition-colors"
      aria-label="Sign in with Apple"
    >
      <svg
        className="w-5 h-5"
        viewBox="0 0 170 170"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.2-2.12-9.98-3.17-14.35-3.17-4.58 0-9.5 1.05-14.76 3.17-5.27 2.13-9.52 3.24-12.77 3.35-4.93.21-9.84-1.96-14.76-6.52-3.13-2.73-7.04-7.41-11.72-14.04-5.02-7.08-9.15-15.29-12.38-24.65-3.46-10.11-5.2-19.9-5.2-29.38 0-10.86 2.35-20.22 7.04-28.07 3.69-6.31 8.6-11.28 14.76-14.93 6.16-3.65 12.81-5.51 19.96-5.63 3.91 0 9.04 1.21 15.42 3.58 6.36 2.38 10.44 3.59 12.22 3.59 1.33 0 5.87-1.42 13.57-4.24 7.29-2.62 13.45-3.7 18.49-3.27 13.66 1.1 23.94 6.48 30.81 16.18-12.22 7.42-18.27 17.8-18.15 31.11.11 10.37 3.86 19 11.22 25.86 3.34 3.17 7.07 5.62 11.23 7.36-.9 2.62-1.85 5.14-2.86 7.55zM119.72 3.38c0 8.1-2.96 15.67-8.86 22.68-7.12 8.34-15.73 13.16-25.07 12.4-.12-.97-.19-1.99-.19-3.06 0-7.78 3.39-16.12 9.4-22.93 3-3.45 6.82-6.31 11.45-8.6 4.62-2.25 8.99-3.5 13.1-3.71.12 1.08.17 2.15.17 3.22z" />
      </svg>
      Sign in with Apple
    </button>
  );
}
