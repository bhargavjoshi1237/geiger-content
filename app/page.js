import Link from "next/link";
import {
  ArrowRight,
  LayoutGrid,
  FileText,
  Library,
  Search,
  Smartphone,
  Workflow,
} from "lucide-react";
import Footer from "@/components/ui/footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Header } from "@/components/header";

export const metadata = {
  title: "Content - Geiger Studio",
  description:
    "Create, organize, and manage content with your team in Geiger Content.",
};

const utilityCards = [
  {
    title: "Works with your tools",
    description:
      "Bring documents, media, and references from the tools your team already uses.",
    icon: LayoutGrid,
  },
  {
    title: "Find anything quickly",
    description:
      "Search across your workspace and move from a broad collection to the exact item you need.",
    icon: Search,
  },
  {
    title: "Access from any device",
    description:
      "Open boards and documents from desktop or mobile without losing context.",
    icon: Smartphone,
  },
  {
    title: "Flexible content",
    description:
      "Create reusable content blocks for documents, campaigns, and product workflows.",
    icon: FileText,
  },
  {
    title: "Structured library",
    description:
      "Organize content into clear libraries and collections without losing context.",
    icon: Library,
  },
  {
    title: "Connected workflows",
    description:
      "Move content through review, approval, and publishing workflows with your team.",
    icon: Workflow,
  },
];

const faqs = [
  {
    value: "item-1",
    question: "How does Geiger Content keep my content secure?",
    answer:
      "Geiger Content uses secure authentication, controlled access paths, and workspace-based visibility to keep work private.",
  },
  {
    value: "item-2",
    question: "Do you use my content for ads?",
    answer: "No. Your workspace content is not used for ad personalization.",
  },
  {
    value: "item-3",
    question: "Can I collaborate with my team?",
    answer:
      "Yes. Teams can review, organize, and move content through shared workflows.",
  },
  {
    value: "item-4",
    question: "Can Geiger Content be used for client or business workflows?",
    answer:
      "Yes. Teams can use it for documentation, campaigns, knowledge libraries, and client-facing review flows.",
  },
];

export default function ContentLandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground selection:bg-indigo-500/30 font-sans">
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808030_1px,transparent_1px),linear-gradient(to_bottom,#80808030_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <Header />

      <main className="relative z-10 flex flex-1 flex-col pt-16 sm:pt-20">
        <section className="mx-auto mb-10 mt-10 flex w-full max-w-6xl items-start justify-start px-4 sm:mt-16 sm:px-6">
          <div className="max-w-3xl">
            <h1 className="mb-4 text-2xl font-semibold text-foreground sm:text-3xl">
              Create, organize, and move content through one connected workspace.
            </h1>
            <p className="mb-6 max-w-xl text-sm text-muted-foreground sm:text-base">
              Geiger Content brings libraries, reusable content, and practical team
              workflows together so work stays easy to find and ready to use.
            </p>
            <Link
              href="/home"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 sm:text-base"
            >
              Open Content
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-10 grid w-full max-w-6xl gap-4 px-4 sm:mt-20 sm:px-6 md:grid-cols-3">
          {utilityCards.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-sm border border-border bg-card p-5"
            >
              <Icon className="mb-3 h-5 w-5 text-foreground" />
              <h2 className="font-medium text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 md:mt-16 md:flex-row">
          <div className="md:w-[35%]">
            <h2 className="text-3xl font-semibold text-foreground">Questions & Answers</h2>
          </div>
          <div className="md:w-[65%]">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.value}
                  value={faq.value}
                  className="border-border"
                >
                  <AccordionTrigger className="text-foreground hover:text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

     <section className="relative z-20 overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          <div className="container mx-auto relative z-10 flex flex-col items-center text-center">
            <h3 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase sm:text-sm">
              Open source from day one
            </h3>
            <h2 className="mb-8 bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-3xl font-black tracking-tighter text-transparent drop-shadow-lg sm:mb-10 sm:text-5xl lg:text-6xl">
              TRY GEIGER NOW
            </h2>
            <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/home"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 sm:w-auto"
              > Open Content
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:sales@geiger.studio"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 sm:w-auto"
              >
                Contact Sales
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
