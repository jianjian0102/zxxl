import BookingConfirmation from "../BookingConfirmation";

export default function BookingConfirmationExample() {
  return (
    <BookingConfirmation
      bookingDetails={{
        date: new Date(),
        time: "14:00",
        consultationType: "regular",
        name: "张三",
        consultationMode: "online",
        contactPhone: "138****1234",
      }}
    />
  );
}
