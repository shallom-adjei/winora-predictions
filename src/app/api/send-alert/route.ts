import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // If Resend API key is missing, simply return success without sending email
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ success: true, message: "RESEND_API_KEY not configured, email not sent." });
  }

  const { prediction } = await req.json();

  const { supabase } = await import("@/lib/supabase");
  const { data: subscribers } = await supabase.from("waitlist").select("email");
  const emails = subscribers?.map((s) => s.email) || [];

  if (emails.length === 0) return NextResponse.json({ success: true, message: "No subscribers" });

  // Dynamic import Resend only when key exists
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: "Winora <alerts@winora.com>",
      to: emails,
      subject: `New Prediction: ${prediction.match_name}`,
      html: `
        <h2>New Prediction from Winora</h2>
        <p><strong>Match:</strong> ${prediction.match_name}</p>
        <p><strong>Prediction:</strong> ${prediction.prediction}</p>
        <p><strong>Confidence:</strong> ${prediction.confidence}%</p>
        <p><a href="https://winora-predictions.vercel.app">View all predictions</a></p>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}