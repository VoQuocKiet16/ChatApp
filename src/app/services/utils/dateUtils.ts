export const formatTimestamp = (ts: number): string => {
    const eventDate = new Date(ts);
    const today = new Date();
    const isToday = eventDate.toDateString() === today.toDateString();
    return isToday
      ? eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
  };