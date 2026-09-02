import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targets = [
    { daysOffset: 3, label: "in 3 days" },
    { daysOffset: 1, label: "tomorrow" },
    { daysOffset: 0, label: "today" },
    { daysOffset: -1, label: "OVERDUE" },
  ];

  for (const { daysOffset, label } of targets) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysOffset);
    const dateStr = targetDate.toISOString().split("T")[0];

    const { data: requests } = await supabase
      .from("issue_requests")
      .select("*")
      .eq("status", "approved")
      .eq("physical_status", "issued")
      .eq("return_deadline", dateStr);

    for (const req of requests ?? []) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("SENDER_EMAIL"),
          to: req.student_email,
          subject: daysOffset < 0
            ? `⚠️ OVERDUE: Please return ${req.item_name} immediately`
            : `📦 Return Reminder: ${req.item_name} due ${label}`,
          html: `
            <h2>IdeaLab Return Reminder</h2>
            <p>Hi ${req.student_name},</p>
            <p>This is a reminder that <strong>${req.item_name}</strong>
            (Qty: ${req.quantity_requested}) is due for return <strong>${label}</strong>.</p>
            <p>Return deadline: <strong>${req.return_deadline}</strong></p>
            ${daysOffset < 0
              ? `<p style="color:red"><strong>Your item is overdue. Please return it to the IdeaLab immediately.</strong></p>`
              : `<p>Please ensure you return it to the IdeaLab on time.</p>`
            }
            <br/>
            <p>— OPJU IdeaLab Team</p>
          `,
        }),
      });
    }
  }

  return new Response("Reminders sent", { status: 200 });
});
