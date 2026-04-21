import ChatWrapper from "./ChatWrapper";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function Page() {
  return (
    <div
      className="w-full h-screen flex bg-[#f7f7f8] overflow-hidden"
      suppressHydrationWarning
    >
      <ChatWrapper />
    </div>
  );
}
