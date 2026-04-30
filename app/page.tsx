"use client";

import ChatWrapper from "./ChatWrapper";

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
