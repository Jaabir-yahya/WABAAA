import type { ReactNode } from "react";

export const metadata = {
  title: "ElixoSense WhatsApp MVP",
  description: "WhatsApp-first conversational commerce + support MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, Arial, sans-serif" }}>{children}</body>
    </html>
  );
}

