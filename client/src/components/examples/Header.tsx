import { useState } from "react";
import Header from "../Header";

export default function HeaderExample() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  return (
    <Header 
      isDarkMode={isDarkMode} 
      toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
    />
  );
}
