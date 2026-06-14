import type { Metadata } from "next";
import { Outfit, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/shared/AppSidebar"
const inter = Inter({subsets:['latin'],variable:'--font-sans'});
import { ThemeProvider } from "@/components/theme-provider"

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Attendance System",
  description: "Employee Attendance Management System",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="en" 
      className={cn(
        "h-full antialiased", 
        outfit.variable, 
        geistMono.variable, 
        inter.variable, 
        "font-sans"
      )}
    >
      <body className="min-h-full h-screen overflow-x-hidden">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
        <AuthProvider>
          <Toaster />
          {/* Your custom AppSidebar component handles the entire layout */}
          <AppSidebar>
            {children}
          </AppSidebar>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}