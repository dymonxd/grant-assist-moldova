import Link from 'next/link'

export default function SharedResultsNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Link invalid sau expirat</h1>
      <p className="mt-2 text-muted-foreground">
        Linkul de partajare este invalid sau a expirat
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Incepe o cautare noua
      </Link>
    </div>
  )
}
