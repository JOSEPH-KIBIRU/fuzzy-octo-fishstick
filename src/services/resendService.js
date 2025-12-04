import { Resend } from 'resend';

const resend = new Resend('re_your_api_key_here');

export const resendService = {
  async sendEmail(to, subject, html, text) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Office Management <notifications@yourdomain.com>',
        to: [to],
        subject: subject,
        html: html,
        text: text,
      });

      if (error) {
        throw error;
      }

      console.log('✅ Email sent via Resend:', data);
      return data;
    } catch (error) {
      console.error('❌ Resend error:', error);
      throw error;
    }
  }
};