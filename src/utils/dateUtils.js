import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (date, formatString = 'yyyy-MM-dd') => {
  try {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) return '';

    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const formatTime = (date, formatString = 'HH:mm:ss') => {
  try {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) return '';

    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

export const formatDateTime = (date, formatString = 'yyyy-MM-dd HH:mm:ss') => {
  try {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) return '';

    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
};

export const getCurrentDate = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getCurrentTime = () => {
  return format(new Date(), 'HH:mm:ss');
};

export const getCurrentDateTime = () => {
  return new Date().toISOString();
};

export const getDayName = (date) => {
  try {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) return '';

    return format(dateObj, 'EEEE');
  } catch (error) {
    console.error('Error getting day name:', error);
    return '';
  }
};

export const calculateWorkingHours = (startTime, endTime) => {
  try {
    if (!startTime || !endTime) return 0;

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);

    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);

    return Math.max(0, diffHours);
  } catch (error) {
    console.error('Error calculating working hours:', error);
    return 0;
  }
};


