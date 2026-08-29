import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

const hasClerk =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

// Clerk 未設定(ローカルのドライラン)時は認証をスキップしてデモテナントで動作させる
const proxy = hasClerk
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) await auth.protect();
    })
  : () => NextResponse.next();

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
