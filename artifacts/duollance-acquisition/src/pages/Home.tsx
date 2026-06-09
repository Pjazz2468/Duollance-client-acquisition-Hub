import { Show } from "@clerk/react";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
export default function Home() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <div className="min-h-screen flex flex-col">
          {/* Hero Section with video background */}
          <div className="relative min-h-screen flex flex-col">
            {/* Video Background */}
            <video
              src="https://res.cloudinary.com/dsmqkbssm/video/upload/q_auto/f_auto/v1780920978/Animate_this_for_me_202606081315_pdvirz.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/55" />
            {/* Header */}
            <header className="relative z-10 px-6 py-4 flex items-center justify-between">
              <img src="/logo-white.png" alt="Duollance" className="h-6" />
              <div className="flex items-center space-x-4">
                <Link href="/sign-in" className="text-sm font-medium text-white/80 hover:text-white">
                  Sign In
                </Link>
                <Link href="/sign-up">
                  <Button className="bg-primary text-white hover:bg-primary/90">
                    Get Started
                  </Button>
                </Link>
              </div>
            </header>
            {/* Hero Text */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white max-w-3xl mb-6">
                The precision instrument for <span className="text-blue-300">sales hunters</span>.
              </h1>
              <p className="text-xl text-white/80 max-w-2xl mb-10">
                Discover, qualify, and reach out to potential business clients with AI-powered talent matching.
              </p>
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 text-lg">
                  Start Hunting
                </Button>
              </Link>
            </main>
          </div>
        </div>
      </Show>
    </>
  );
}
