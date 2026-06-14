import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { currentPassword, newPassword } = await req.json();

  // Fetch current password from Supabase
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "admin_password")
    .single();

  if (!data || currentPassword !== data.value) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  // Update the password
  const { error } = await supabase
    .from("admin_settings")
    .update({ value: newPassword })
    .eq("key", "admin_password");

  if (error) {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}