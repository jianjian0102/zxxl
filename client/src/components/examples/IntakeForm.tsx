import IntakeForm from "../IntakeForm";

export default function IntakeFormExample() {
  return (
    <IntakeForm 
      onSubmit={(data) => console.log("Submitted:", data)} 
      onBack={() => console.log("Back clicked")}
    />
  );
}
