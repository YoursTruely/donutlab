import "./globals.css";
import { ReactNode } from "react";
import { QueryProvider } from "@/components/query-provider";

export const metadata = {
  title: "Doughnut Impact App",
  description: "Map company impacts to the Doughnut model and track trends over time"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
