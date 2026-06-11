export const metadata = {
  title: "Pantalla del recinto",
  robots: "noindex",
};

export default function PantallaLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden bg-black">{children}</div>;
}
