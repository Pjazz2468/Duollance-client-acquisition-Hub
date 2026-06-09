import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://res.cloudinary.com/dsmqkbssm/image/upload/q_auto/f_auto/v1780919882/Gemini_Generated_Image_ry1yvkry1yvkry1y_h1dvmi.png"
          alt="Professional working remotely"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/75 via-[#0f172a]/55 to-[#1c3cf5]/35" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <img src="/logo-white.png" alt="Duollance" className="h-7" />
          </div>
          <div className="space-y-4">
            <blockquote className="text-white text-3xl font-bold leading-tight tracking-tight drop-shadow-lg">
              The precision instrument<br />
              for <span className="text-blue-300">sales hunters.</span>
            </blockquote>
            <p className="text-white/75 text-base max-w-sm leading-relaxed drop-shadow">
              Discover, qualify, and reach out to potential business clients — powered by AI.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-white/40 text-xs">Internal HR Tool</span>
            <div className="h-px flex-1 bg-white/20" />
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden mb-4 flex justify-center">
            <img src="/logo-blue.png" alt="Duollance" className="h-6" />
          </div>
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
          />
        </div>
      </div>
    </div>
  );
}
