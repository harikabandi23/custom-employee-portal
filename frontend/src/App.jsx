import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/test")
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message);
      })
      .catch((error) => {
        console.error("Error connecting to backend:", error);
      });
  }, []);

  return (
    <div>
      <h1>Custom Employee Portal</h1>

      <p>Backend Response:</p>

      <h2>{message}</h2>
    </div>
  );
}

export default App;