import "./globals.css";

export const metadata = {
  title: "3CX AI Voice Agent POC",
  description: "AI Voice Agent POC workflow dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
