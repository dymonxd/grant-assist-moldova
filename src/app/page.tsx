export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="w-full max-w-lg text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Descopera granturile disponibile pentru afacerea ta
        </h1>
        <p className="text-muted-foreground">
          Introdu IDNO-ul companiei sau descrie ideea ta de afacere
        </p>

        <div className="space-y-3">
          <input
            type="text"
            disabled
            placeholder="IDNO sau descrierea afacerii"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            disabled
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Cauta granturi
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Platforma va fi disponibila in curand
        </p>
      </div>
    </div>
  );
}
