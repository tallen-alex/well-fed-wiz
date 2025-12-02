import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MealPlanNotificationRequest {
  clientEmail: string;
  clientName: string;
  mealPlanTitle: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientEmail, clientName, mealPlanTitle, startDate, endDate, notes }: MealPlanNotificationRequest = await req.json();

    console.log("Sending meal plan notification to:", clientEmail);

    const emailResponse = await resend.emails.send({
      from: "Samira Nutrition <onboarding@resend.dev>",
      to: [clientEmail],
      subject: "New Meal Plan Assigned - Samira Nutrition",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2c5282;">Hello ${clientName}!</h1>
          <p>Great news! A new meal plan has been assigned to you.</p>
          
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #2d3748; margin-top: 0;">Meal Plan Details</h2>
            <p><strong>Plan:</strong> ${mealPlanTitle}</p>
            <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
            ${endDate ? `<p><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</p>` : ''}
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>

          <p>Log in to your dashboard to view your complete meal plan and start your wellness journey!</p>
          
          <a href="${Deno.env.get('VITE_SUPABASE_URL')?.replace('//', '//').split('/')[2] || 'your-app-url'}/client-dashboard" 
             style="display: inline-block; background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View My Meal Plan
          </a>

          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            Samira Nutrition Team
          </p>
        </div>
      `,
    });

    console.log("Meal plan email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending meal plan notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
