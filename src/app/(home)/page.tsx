import { LandingFlow } from './landing-flow'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Descopera granturile disponibile pentru afacerea ta
          </h1>
          <p className="text-muted-foreground">
            Introdu IDNO-ul companiei sau descrie ideea ta de afacere
          </p>
        </div>

        <LandingFlow />
      </div>
    </div>
  )
}
