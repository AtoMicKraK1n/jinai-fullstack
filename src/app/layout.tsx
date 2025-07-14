import "./globals.css";
import "./app.css";
import { Providers } from "./providers";
import ParticleBackground from "./components/ParticleBackground";

export const metadata = {
  title: "JinAI",
  description: "AI-powered quiz game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
