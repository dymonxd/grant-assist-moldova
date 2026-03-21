import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <h2 className="text-6xl font-bold text-muted-foreground">404</h2>
        <h3 className="text-2xl font-bold">Pagina nu a fost gasita</h3>
        <p className="text-sm text-muted-foreground">
          Pagina pe care o cautati nu exista sau a fost mutata.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Inapoi la pagina principala
        </Link>
      </div>
    </div>
  );
}
