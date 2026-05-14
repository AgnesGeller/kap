import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv, getSupabaseEnv } from "@/lib/supabase/config";

const staffAllowedAppPath = "/app/mukodes";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (!hasSupabaseEnv()) {
    return response;
  }

  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !pathname.startsWith("/app")) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isStaff = profile?.role === "staff";
  const isAllowedStaffPath =
    pathname === staffAllowedAppPath || pathname.startsWith(`${staffAllowedAppPath}/`);

  if (isStaff && !isAllowedStaffPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = staffAllowedAppPath;
    redirectUrl.search = `?message=${encodeURIComponent("Munkavállalói belépéssel csak a munkalap érhető el.")}`;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
