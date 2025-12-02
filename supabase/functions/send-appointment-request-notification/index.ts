import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppointmentRequestNotificationRequest {
  adminEmail: string;
  clientName: string;
  clientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  clientNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminEmail, clientName, clientEmail, appointmentDate, appointmentTime, clientNotes }: AppointmentRequestNotificationRequest = await req.json();

    console.log("Sending appointment request notification to admin:", adminEmail);

    const emailResponse = await resend.emails.send({
      from: "Samira Nutrition <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `New Appointment Request from ${clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2c5282;">New Appointment Request</h1>
          <p>A client has requested an appointment.</p>
          
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #2d3748; margin-top: 0;">Client Information</h2>
            <p><strong>Name:</strong> ${clientName}</p>
            <p><strong>Email:</strong> ${clientEmail}</p>
            
            <h3 style="color: #2d3748; margin-top: 20px;">Requested Appointment</h3>
            <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            ${clientNotes ? `<p><strong>Client Notes:</strong> ${clientNotes}</p>` : ''}
          </div>

          <p>Please review and confirm this appointment in your admin dashboard.</p>
          
          <a href="${Deno.env.get('VITE_SUPABASE_URL')?.replace('//', '//').split('/')[2] || 'your-app-url'}/admin-dashboard" 
             style="display: inline-block; background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View in Admin Dashboard
          </a>

          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            This is an automated notification from your Samira Nutrition platform.
          </p>
        </div>
      `,
    });

    console.log("Admin notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending admin notification:", error);
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
