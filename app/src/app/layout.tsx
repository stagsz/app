import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SimpleSign - E-signaturer för småföretag",
  description:
    "Enkel och transparent e-signaturlösning för nordiska småföretag. Inga dolda avgifter. Inget pris per användare. Avsluta när du vill.",
  keywords: [
    "e-signatur",
    "digital signatur",
    "elektronisk signatur",
    "docusign alternativ",
    "signera dokument online",
    "avtal signera",
  ],
  openGraph: {
    title: "SimpleSign - E-signaturer för småföretag",
    description: "Inga dolda avgifter. Inga krångel. Bara enkla e-signaturer.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
