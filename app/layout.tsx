import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nodos — Lector de micro-dosis",
  description:
    "E-reader de escritorio para estudiar textos teóricos densos mediante micro-dosis conceptuales.",
};

// Evita el flash de tema y de tamaño de letra incorrectos:
// se ejecuta antes del primer paint.
const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem("nodos-theme") || "dark";
    document.documentElement.dataset.theme = t;
    if (t === "dark") document.documentElement.classList.add("dark");
    var f = Number(localStorage.getItem("nodos-font-size"));
    if (f >= 16 && f <= 24) {
      document.documentElement.style.setProperty("--reading-fs", f + "px");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      data-theme="dark"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased theme-anim`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
