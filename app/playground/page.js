import ClientContentPlayground from "@/components/ClientContentPlayground";

// The landing-page playground on its own route so the showcase can iframe it: the workspace's dialogs,
// sheets, menus and toasts (portalled to <body>) stay inside the showcase card.
export const metadata = {
  title: "Content Playground - Geiger Studio",
  robots: { index: false, follow: false },
};

export default function ContentPlaygroundPage() {
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background">
      <ClientContentPlayground />
    </div>
  );
}
