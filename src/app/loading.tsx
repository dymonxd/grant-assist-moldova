export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="mt-4 text-sm text-muted-foreground">Se incarca...</p>
    </div>
  );
}
