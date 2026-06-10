import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { prediction } = await req.json();

  // Fetch all waitlist emails from Supabase
  const { supabase } = await import("@/lib/supabase");
  const { data: subscribers } = await supabase.from("waitlist").select("email");
  const emails = subscribers?.map((s) => s.email) || [];

  if (emails.length === 0) return NextResponse.json({ success: true, message: "No subscribers" });

  try {
    await resend.emails.send({
      from: "Winora <alerts@yourdomain.com>", // Change to your verified domain
      to: emails,
      subject: `New Prediction: ${prediction.match_name}`,
      html: `
        <h2>New Prediction from Winora</h2>
        <p><strong>Match:</strong> ${prediction.match_name}</p>
        <p><strong>Prediction:</strong> ${prediction.prediction}</p>
        <p><strong>Confidence:</strong> ${prediction.confidence}%</p>
        <p><a href="https://yourdomain.com">View all predictions</a></p>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}