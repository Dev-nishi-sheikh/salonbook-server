export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface AppointmentEmailData {
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  timeSlot: string;
  servicePrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export const emailTemplates = {
  appointmentCreated: (data: AppointmentEmailData): { subject: string; html: string } => ({
    subject: `Appointment Request Received - ${data.serviceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ec4899;">Appointment Request Received</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your appointment request for <strong>${data.serviceName}</strong> has been received and is pending confirmation.</p>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date:</strong> ${data.appointmentDate}</p>
          <p><strong>Time:</strong> ${data.timeSlot}</p>
          <p><strong>Price:</strong> $${data.servicePrice.toFixed(2)}</p>
        </div>
        <p>We'll notify you once the appointment is confirmed.</p>
      </div>
    `,
  }),

  appointmentConfirmed: (data: AppointmentEmailData): { subject: string; html: string } => ({
    subject: `Appointment Confirmed - ${data.serviceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #22c55e;">Appointment Confirmed!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your appointment for <strong>${data.serviceName}</strong> has been confirmed.</p>
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <p><strong>Date:</strong> ${data.appointmentDate}</p>
          <p><strong>Time:</strong> ${data.timeSlot}</p>
          <p><strong>Price:</strong> $${data.servicePrice.toFixed(2)}</p>
        </div>
        <p>Please arrive 10 minutes before your appointment time.</p>
      </div>
    `,
  }),

  appointmentCancelled: (data: AppointmentEmailData): { subject: string; html: string } => ({
    subject: `Appointment Cancelled - ${data.serviceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">Appointment Cancelled</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your appointment for <strong>${data.serviceName}</strong> has been cancelled.</p>
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
          <p><strong>Date:</strong> ${data.appointmentDate}</p>
          <p><strong>Time:</strong> ${data.timeSlot}</p>
        </div>
        <p>If you have any questions, please contact us.</p>
      </div>
    `,
  }),

  paymentReceived: (data: AppointmentEmailData): { subject: string; html: string } => ({
    subject: `Payment Received - ${data.serviceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #22c55e;">Payment Received</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your payment for <strong>${data.serviceName}</strong> has been successfully processed.</p>
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <p><strong>Amount:</strong> $${data.servicePrice.toFixed(2)}</p>
          <p><strong>Date:</strong> ${data.appointmentDate}</p>
          <p><strong>Time:</strong> ${data.timeSlot}</p>
        </div>
        <p>Thank you for choosing SalonBook!</p>
      </div>
    `,
  }),
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  console.log('Sending email to:', options.to);
  console.log('Subject:', options.subject);
  return true;
};