// components/EmailTest.js
import React from 'react';
import { notificationService } from '../services/notificationService';

const EmailTest = () => {
  const testEmail = async () => {
    try {
      await notificationService.sendEmailNotification(
        '8b8a65af-8d06-4747-ad04-183863131fec', // Use a real user ID from your database
        'approved',
        {
          type: 'test',
          amount: 1000,
          description: 'Test transaction',
          reason: 'Testing email functionality'
        }
      );
      alert('Test email sent! Check the console for details.');
    } catch (error) {
      alert('Test email failed: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Email Test</h2>
      <button onClick={testEmail} className="btn-primary">
        Send Test Email
      </button>
    </div>
  );
};

export default EmailTest;