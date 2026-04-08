import Link from "next/link";
import { cookies } from "next/headers";
import {
  finalizeImageSubscription,
  getSubscriptionCookieName,
} from "@/server/subscription-access";

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: {
    session_id?: string;
  };
}) {
  const sessionId = searchParams.session_id;
  const activation = sessionId
    ? await finalizeImageSubscription(sessionId)
    : null;

  if (activation) {
    cookies().set({
      name: getSubscriptionCookieName(),
      value: activation.cookieValue,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 35,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#10162d] px-6 py-10 text-[#f7eddc]">
      <div className="glass-panel max-w-xl rounded-[2rem] p-8 text-center shadow-[0_32px_80px_rgba(6,10,26,0.42)]">
        <div className="text-xs uppercase tracking-[0.28em] text-[#cad6ff]/82">
          subscription
        </div>
        <h1 className="mt-4 text-3xl font-semibold">
          {activation
            ? "Unlimited story art is now unlocked on this browser."
            : "We could not confirm the subscription yet."}
        </h1>
        <p className="mt-4 text-base leading-8 text-[#e3daf0]/88">
          {activation
            ? "You can head back to Monobedtime and keep illustrating bedtime pages without the free daily cap."
            : "If checkout just finished, try reopening the link from the browser that completed payment or contact support once Stripe is configured."}
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
