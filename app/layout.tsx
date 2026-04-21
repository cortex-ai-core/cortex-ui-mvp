import "./globals.css";

export const metadata = {
  title: "Cortéx",
  description: "Sovereign AI Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-green-500">
        {children}
      </body>
    </html>
  );
}


