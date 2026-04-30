import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          MPH VIP
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Handwritten document transcription and export
        </p>

        <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/billing"
            className="flex min-h-32 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-8 text-xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100"
          >
            Billing
          </Link>
          <Link
            href="/book"
            className="flex min-h-32 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-8 text-xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100"
          >
            Book Chapter
          </Link>
        </div>
      </div>
    </main>
  );
}
