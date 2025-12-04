// components/ScheduledTasks.js
import  { useEffect } from 'react';
import { reminderService } from '../services/reminderService';

const ScheduledTasks = () => {
  useEffect(() => {
    const runReminders = async () => {
      try {
        console.log('⏰ Running scheduled reminders...');
        const results = await reminderService.runAllReminders();
        console.log('✅ Scheduled reminders completed:', results);
      } catch (error) {
        console.error('❌ Scheduled reminders failed:', error);
        // Don't show error to user, just log it
      }
    };

    // Run immediately on component mount
    runReminders();

    // Then run every 30 minutes
    const interval = setInterval(runReminders, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything
};

export default ScheduledTasks;