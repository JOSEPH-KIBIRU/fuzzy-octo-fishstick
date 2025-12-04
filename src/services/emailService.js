// services/emailService.js
import { supabase } from '../utils/supabaseClient';

class EmailService {
  constructor() {
    this.fromEmail = 'Office Management System <onboarding@resend.dev>';
  }

  // Generic email sending method
  async sendEmail(to, subject, html, text) {
    try {
      console.log('📧 Sending email to:', to);

      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: to,
            subject: subject,
            html: html,
            text: text,
            from: this.fromEmail
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Email failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully');
      return result;

    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  // Get admin emails
  async getAdminEmails() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .in('role', ['admin', 'super_admin']);

      if (error) throw error;
      return data?.map(admin => admin.email) || [];
    } catch (error) {
      console.error('Error fetching admin emails:', error);
      return [];
    }
  }

  // Notify admins about new leave application
  async notifyNewLeaveApplication(leaveData) {
    try {
      const adminEmails = await this.getAdminEmails();
      
      if (adminEmails.length === 0) {
        console.warn('No admin emails found');
        return;
      }

      const subject = `New Leave Application - ${leaveData.employee_name}`;
      const html = this.generateLeaveApplicationEmail(leaveData);
      const text = this.generateLeaveApplicationText(leaveData);

      // Send to all admins
      for (const adminEmail of adminEmails) {
        await this.sendEmail(adminEmail, subject, html, text);
      }

      console.log(`✅ Leave application notifications sent to ${adminEmails.length} admins`);

    } catch (error) {
      console.error('Error notifying admins about leave application:', error);
    }
  }

  // Notify admins about new petty cash request
  async notifyNewPettyCashRequest(transactionData) {
    try {
      const adminEmails = await this.getAdminEmails();
      
      if (adminEmails.length === 0) return;

      const subject = `New Petty Cash Request - ${transactionData.description}`;
      const html = this.generatePettyCashEmail(transactionData);
      const text = this.generatePettyCashText(transactionData);

      for (const adminEmail of adminEmails) {
        await this.sendEmail(adminEmail, subject, html, text);
      }

      console.log(`✅ Petty cash notifications sent to ${adminEmails.length} admins`);

    } catch (error) {
      console.error('Error notifying admins about petty cash:', error);
    }
  }

  // Notify admins about new employee transaction
  async notifyNewEmployeeTransaction(transactionData) {
    try {
      const adminEmails = await this.getAdminEmails();
      
      if (adminEmails.length === 0) return;

      const subject = `New Employee Transaction - ${transactionData.employee_name}`;
      const html = this.generateEmployeeTransactionEmail(transactionData);
      const text = this.generateEmployeeTransactionText(transactionData);

      for (const adminEmail of adminEmails) {
        await this.sendEmail(adminEmail, subject, html, text);
      }

      console.log(`✅ Employee transaction notifications sent to ${adminEmails.length} admins`);

    } catch (error) {
      console.error('Error notifying admins about employee transaction:', error);
    }
  }

  // Notify user about approval/rejection
  async notifyUserAboutStatus(userEmail, itemType, status, details) {
    try {
      const subject = `Your ${itemType} has been ${status}`;
      const html = this.generateStatusUpdateEmail(itemType, status, details);
      const text = this.generateStatusUpdateText(itemType, status, details);

      await this.sendEmail(userEmail, subject, html, text);
      console.log(`✅ Status update sent to user: ${userEmail}`);

    } catch (error) {
      console.error('Error notifying user about status:', error);
    }
  }

  // Email templates
  generateLeaveApplicationEmail(leaveData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #3B82F6; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .action-btn { background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Leave Application</h1>
          </div>
          <div class="content">
            <p>Hello Admin,</p>
            <p>A new leave application requires your approval.</p>
            
            <div class="details">
              <h3>Application Details:</h3>
              <p><strong>Employee:</strong> ${leaveData.employee_name}</p>
              <p><strong>Leave Type:</strong> ${leaveData.leave_type}</p>
              <p><strong>Duration:</strong> ${new Date(leaveData.start_date).toLocaleDateString()} to ${new Date(leaveData.end_date).toLocaleDateString()}</p>
              <p><strong>Reason:</strong> ${leaveData.reason || 'Not specified'}</p>
              ${leaveData.contact_info ? `<p><strong>Contact:</strong> ${leaveData.contact_info}</p>` : ''}
            </div>
            
            <p>
              <a href="${process.env.REACT_APP_FRONTEND_URL}/leave-requests" class="action-btn">
                Review Application
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Office Management System</p>
            <p>This is an automated notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePettyCashEmail(transactionData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>/* Same styles as above */</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Petty Cash Request</h1>
          </div>
          <div class="content">
            <p>Hello Admin,</p>
            <p>A new petty cash request requires your approval.</p>
            
            <div class="details">
              <h3>Request Details:</h3>
              <p><strong>Amount:</strong> KSH ${parseFloat(transactionData.amount).toFixed(2)}</p>
              <p><strong>Category:</strong> ${transactionData.category}</p>
              <p><strong>Description:</strong> ${transactionData.description}</p>
              <p><strong>Date:</strong> ${new Date(transactionData.transaction_date).toLocaleDateString()}</p>
            </div>
            
            <p>
              <a href="${process.env.REACT_APP_FRONTEND_URL}/petty-cash" class="action-btn">
                Review Request
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Office Management System</p>
            <p>This is an automated notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateEmployeeTransactionEmail(transactionData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>/* Same styles as above */</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Employee Transaction</h1>
          </div>
          <div class="content">
            <p>Hello Admin,</p>
            <p>A new employee transaction requires your approval.</p>
            
            <div class="details">
              <h3>Transaction Details:</h3>
              <p><strong>Employee:</strong> ${transactionData.employee_name}</p>
              <p><strong>Type:</strong> ${transactionData.transaction_type}</p>
              <p><strong>Amount:</strong> KSH ${parseFloat(transactionData.amount).toFixed(2)}</p>
              <p><strong>Date:</strong> ${new Date(transactionData.transaction_date).toLocaleDateString()}</p>
              ${transactionData.description ? `<p><strong>Description:</strong> ${transactionData.description}</p>` : ''}
            </div>
            
            <p>
              <a href="${process.env.REACT_APP_FRONTEND_URL}/employee-transactions" class="action-btn">
                Review Transaction
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Office Management System</p>
            <p>This is an automated notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateStatusUpdateEmail(itemType, status, details) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>/* Same styles as above */</style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: ${status === 'approved' ? '#10B981' : '#EF4444'};">
            <h1>${itemType} ${status.charAt(0).toUpperCase() + status.slice(1)}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your ${itemType} has been <strong>${status}</strong>.</p>
            
            <div class="details">
              <h3>Details:</h3>
              ${details.amount ? `<p><strong>Amount:</strong> KSH ${parseFloat(details.amount).toFixed(2)}</p>` : ''}
              ${details.description ? `<p><strong>Description:</strong> ${details.description}</p>` : ''}
              ${details.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ''}
              ${details.approved_by ? `<p><strong>Approved By:</strong> ${details.approved_by}</p>` : ''}
            </div>
            
            <p>Thank you for using our system.</p>
          </div>
          <div class="footer">
            <p>Office Management System</p>
            <p>This is an automated notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Text versions for fallback
  generateLeaveApplicationText(leaveData) {
    return `New Leave Application

Employee: ${leaveData.employee_name}
Leave Type: ${leaveData.leave_type}
Duration: ${new Date(leaveData.start_date).toLocaleDateString()} to ${new Date(leaveData.end_date).toLocaleDateString()}
Reason: ${leaveData.reason || 'Not specified'}
${leaveData.contact_info ? `Contact: ${leaveData.contact_info}` : ''}

Please review the application at: ${process.env.REACT_APP_FRONTEND_URL}/leave-requests`;
  }

  generatePettyCashText(transactionData) {
    return `New Petty Cash Request

Amount: KSH ${parseFloat(transactionData.amount).toFixed(2)}
Category: ${transactionData.category}
Description: ${transactionData.description}
Date: ${new Date(transactionData.transaction_date).toLocaleDateString()}

Please review at: ${process.env.REACT_APP_FRONTEND_URL}/petty-cash`;
  }

  generateEmployeeTransactionText(transactionData) {
    return `New Employee Transaction

Employee: ${transactionData.employee_name}
Type: ${transactionData.transaction_type}
Amount: KSH ${parseFloat(transactionData.amount).toFixed(2)}
Date: ${new Date(transactionData.transaction_date).toLocaleDateString()}
${transactionData.description ? `Description: ${transactionData.description}` : ''}

Please review at: ${process.env.REACT_APP_FRONTEND_URL}/employee-transactions`;
  }

  generateStatusUpdateText(itemType, status, details) {
    return `${itemType} ${status.charAt(0).toUpperCase() + status.slice(1)}

Your ${itemType} has been ${status}.

${details.amount ? `Amount: KSH ${parseFloat(details.amount).toFixed(2)}` : ''}
${details.description ? `Description: ${details.description}` : ''}
${details.reason ? `Reason: ${details.reason}` : ''}
${details.approved_by ? `Approved By: ${details.approved_by}` : ''}

Thank you for using our system.`;
  }
}

export const emailService = new EmailService();