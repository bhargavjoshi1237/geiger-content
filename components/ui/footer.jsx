import Link from "next/link";

import Logo from "@/components/ui/logo";

export default function Footer() {
  return (
   <div className="bg-background"> <footer className="w-full border-t border-border/50 bg-background pt-16 pb-8 relative z-30 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 flex items-center justify-center">
                <Logo size={20} className="text-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">Geiger Studios</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm">
              Built to Manage. Designed to Create.
              <br /> Turn your ideas into something real with a single suite that combines solid management tools and easy-to-use creative features.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-foreground mb-4">Products</h4>
            <ul className="space-y-3">
              <li><a href="/flow" className="hover:text-foreground transition-colors text-muted-foreground text-sm">Geiger Flow</a></li>
              <li><Link href="/home" className="hover:text-foreground transition-colors text-muted-foreground text-sm">Geiger Content</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors text-muted-foreground text-sm">Geiger DAM</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors text-muted-foreground text-sm">Geiger Grey</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors text-muted-foreground text-sm">Geiger Enterprise</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Resources</h4>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li><a href="/docs" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Support</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Company</h4>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
              <li><a href="/blog" className="hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Legal</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Geiger Studios. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
    <div className="mt-10 flex justify-center bg-background relative z-0"><h1 className="text-[13vw] font-bold text-foreground/5 leading-none tracking-tighter select-none pointer-events-none">GEIGER STUDIO</h1></div>
    </div>
  );
}
