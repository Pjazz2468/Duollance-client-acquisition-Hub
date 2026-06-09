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
        <div className="min-h-screen flex flex-col bg-background">
          <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-white">
            <div className="flex items-center space-x-2">
              <img src="/logo-blue.png" alt="Duollance" className="h-6" />
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Sign In
              </Link>
              <Link href="/sign-up">
                <Button>Get Started</Button>
              </Link>
            </div>
          </header>
          <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mb-6">
              The precision instrument for <span className="text-primary">sales hunters</span>.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mb-10">
              Discover, qualify, and reach out to potential business clients with AI-powered talent matching.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 text-lg">
                  Start Hunting
                </Button>
              </Link>
            </div>
            <div className="mt-16 w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl">
              <video
                src="https://res.cloudinary.com/dsmqkbssm/video/upload/q_auto/f_auto/v1780920978/Animate_this_for_me_202606081315_pdvirz.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto"
              />
            </div>
          </main>
        </div>
      </Show>
    </>
  );
}
