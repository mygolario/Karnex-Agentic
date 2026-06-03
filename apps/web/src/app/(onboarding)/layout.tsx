import OnboardingHeader from './OnboardingHeader'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e5] font-sans antialiased overflow-x-hidden relative flex flex-col">
      {/* Background Loop Video */}
      <div 
        className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden"
        dangerouslySetInnerHTML={{
          __html: `
            <video autoplay muted loop playsinline class="w-full h-full object-cover opacity-25">
              <source src="/videos/new-onboarding-bg.mp4" type="video/mp4" />
            </video>
          `
        }}
      />
      {/* Subtle overlays for maximum text legibility & smooth gradients */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/70 via-transparent to-[#050505]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/30 via-transparent to-[#050505]/30" />
      </div>

      {/* Mesh Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0c0c_1px,transparent_1px),linear-gradient(to_bottom,#0c0c0c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Subtle Glowing Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6366f1]/05 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/03 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <OnboardingHeader />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col justify-center items-center py-12 px-6 z-10">
        <div className="w-full max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  )
}
