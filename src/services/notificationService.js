// services/notificationService.js
import { supabase } from '../utils/supabaseClient';

class NotificationService {
  constructor() {
    this.emailEnabled = false;
    this.notificationsEnabled = false;
    this.initServices();
  }

  async initServices() {
    // Check if we have Resend API key
    if (process.env.REACT_APP_RESEND_API_KEY) {
      this.emailEnabled = true;
      console.log('✅ Email service initialized with Resend');
    } else {
      console.warn('⚠️ No Resend API key found. Email notifications disabled.');
    }

    await this.checkNotificationsAccess(); // This line calls the missing method!
  }

  // ADD THIS MISSING METHOD
  async checkNotificationsAccess() {
    try {
      // Check if browser notifications are supported
      if (!('Notification' in window)) {
        console.warn('⚠️ Browser does not support notifications');
        this.notificationsEnabled = false;
        return;
      }

      // Check current permission
      if (Notification.permission === 'granted') {
        this.notificationsEnabled = true;
        console.log('✅ Browser notifications are enabled');
      } else if (Notification.permission === 'denied') {
        this.notificationsEnabled = false;
        console.warn('⚠️ Browser notifications are denied');
      } else {
        // Permission is 'default' - ask for permission
        const permission = await Notification.requestPermission();
        this.notificationsEnabled = permission === 'granted';
        console.log(this.notificationsEnabled ? 
          '✅ Browser notifications enabled' : 
          '⚠️ Browser notifications denied');
      }
    } catch (error) {
      console.error('❌ Error checking notifications access:', error);
      this.notificationsEnabled = false;
    }
  }

  // Also add this missing method that's being called from reminderService.js
async createReminderNotification(reminderData) {
  if (!this.notificationsEnabled) {
    console.log('🔕 Notifications disabled, skipping browser notification');
    return;
  }

  try {
    const options = {
      body: reminderData.message || 'You have a new reminder',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: `reminder-${reminderData.id || Date.now()}`,
      requireInteraction: reminderData.important || false,
      data: {
        url: window.location.href,
        userId: reminderData.userId, // Include userId
        ...reminderData
      }
    };

    const notification = new Notification(
      reminderData.title || 'Reminder', 
      options
    );

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // You could navigate to a specific page based on the reminder type
      if (reminderData.type === 'insurance_expiry' && reminderData.policyId) {
        window.location.href = `/insurance/${reminderData.policyId}`;
      } else if (reminderData.type === 'valuation_overdue' && reminderData.valuationId) {
        window.location.href = `/valuations/${reminderData.valuationId}`;
      } else if (reminderData.type === 'pending_approvals') {
        window.location.href = '/approvals';
      }
    };

    if (!reminderData.important) {
      setTimeout(() => notification.close(), 10000);
    }

    console.log('🔔 Created browser notification:', reminderData.title);
    return notification;

  } catch (error) {
    console.error('❌ Error creating browser notification:', error);
  }
}


  async queueEmail(to, subject, html, text, metadata = {}) {
  try {
    const { data, error } = await supabase
      .from('email_queue')
      .insert([{
        to_email: to,
        subject: subject,
        html_content: html,
        text_content: text,
        metadata: metadata,
        status: 'pending'
      }])
      .select();

    if (error) throw error;
    
    console.log('✅ Email queued successfully');
    return data;
  } catch (error) {
    console.error('❌ Error queueing email:', error);
    throw error;
  }
}

  // Send email via Supabase Edge Function
 async sendEmailViaEdgeFunction(emailData) {
  if (!this.emailEnabled) {
    console.log('📧 Email service disabled');
    return;
  }

  try {
    console.log('📧 Sending email via edge function to:', emailData.to);

    // Use the correct URL format
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          userId: emailData.userId // Optional metadata
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Edge function error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', result);
    return result;

  } catch (error) {
    console.error('❌ Error sending email via edge function:', error);
    
    // Fallback: Queue email for retry
    await this.queueEmail(
      emailData.to,
      emailData.subject,
      emailData.html,
      emailData.text,
      { 
        error: error.message,
        originalData: emailData 
      }
    );
    
    throw error;
  }
}

  // Updated email sending method
  async sendReminderEmail(userId, title, message, metadata = {}) {
    if (!this.emailEnabled) {
      console.log('📧 Email service disabled, skipping email');
      return;
    }

    try {
      // Get user email from profile
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        return;
      }

      if (!userProfile?.email) {
        console.warn('⚠️ No email found for user:', userId);
        return;
      }

      const emailData = {
        to: userProfile.email,
        subject: `Reminder: ${title}`,
        html: this.generateReminderEmailHtml(userProfile.full_name, title, message, metadata),
        text: this.generateReminderEmailText(userProfile.full_name, title, message, metadata),
        userId: userId
      };

      await this.sendEmailViaEdgeFunction(emailData);

    } catch (error) {
      console.error('❌ Error sending reminder email:', error);
      throw error;
    }
  }

  // Your existing methods...
  generateReminderEmailHtml(userName, title, message, metadata) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; }
          .reminder { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #3B82F6; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Office Management System</h1>
          </div>
          <div class="content">
            <p>Hello ${userName || 'there'},</p>
            
            <div class="reminder">
              <h3>${title}</h3>
              <p>${message}</p>
              ${metadata.dueDate ? `<p><strong>Due Date:</strong> ${new Date(metadata.dueDate).toLocaleDateString()}</p>` : ''}
              ${metadata.amount ? `<p><strong>Amount:</strong> KSH ${parseFloat(metadata.amount).toFixed(2)}</p>` : ''}
              ${metadata.daysOverdue ? `<p><strong>Days Overdue:</strong> ${metadata.daysOverdue}</p>` : ''}
            </div>
            
            <p>Please log in to the system to take appropriate action.</p>
            <p>
              <a href="${process.env.REACT_APP_FRONTEND_URL}" 
                 style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to System
              </a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from your Office Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateReminderEmailText(userName, title, message, metadata) {
    return `
REMINDER: ${title}

Hello ${userName || 'there'},

${message}

${metadata.dueDate ? `Due Date: ${new Date(metadata.dueDate).toLocaleDateString()}` : ''}
${metadata.amount ? `Amount: KSH ${parseFloat(metadata.amount).toFixed(2)}` : ''}
${metadata.daysOverdue ? `Days Overdue: ${metadata.daysOverdue}` : ''}

Please log in to the system to take appropriate action: ${process.env.REACT_APP_FRONTEND_URL}

This is an automated notification from your Office Management System.
Please do not reply to this email.
    `.trim();
  }
}

export const notificationService = new NotificationService();