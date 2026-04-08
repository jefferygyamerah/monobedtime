import Link from "next/link";

export default function SubscriptionCancelPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#10162d] px-6 py-10 text-[#f7eddc]">
      <div className="glass-panel max-w-xl rounded-[2rem] p-8 text-center shadow-[0_32px_80px_rgba(6,10,26,0.42)]">
        <div className="text-xs uppercase tracking-[0.28em] text-[#cad6ff]/82">
          subscription
        </div>
        <h1 className="mt-4 text-3xl font-semibold">
          The subscription checkout was canceled.
        </h1>
        <p className="mt-4 text-base leading-8 text-[#e3daf0]/88">
          Your free image credits are still available for today. You can always come back to subscribe later when you want unlimited story art.
        </p>
        <Link
          href="/"
          className="glass-button mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-[#f7eddc]"
        >
          Return to bedtime story
        </Link>
      </div>
    </main>
  );
}
