import { useState } from "react";
import BookingCalendar from "../BookingCalendar";

export default function BookingCalendarExample() {
  const handleSelectSlot = (date: Date, time: string) => {
    console.log("Selected:", date, time);
  };

  return (
    <BookingCalendar 
      consultationType="regular" 
      onSelectSlot={handleSelectSlot} 
    />
  );
}
