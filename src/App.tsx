import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// 🔗 Supabase config
const supabaseUrl = "https://oznrbczrkrafaddpylrp.supabase.co";
const supabaseAnonKey = "sb_publishable_FJD8YMiqYyMp0fFYvtksRQ_HWEcIKkZ"; // paste sb_publishable key here

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Reading = {
  id: string;
  glucose: number;
  created_at: string;
};

export default function App() {
  const [glucose, setGlucose] = useState<string>("");
  const [readings, setReadings] = useState<Reading[]>([]);

  // 📥 Fetch readings
  useEffect(() => {
    fetchReadings();
  }, []);

  const fetchReadings = async () => {
    const { data, error } = await supabase
      .from("readings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setReadings(data as Reading[]);
    }
  };

  // ➕ Add reading
  const addReading = async () => {
    if (!glucose) return;

    const value = Number(glucose);

    if (value < 40 || value > 500) {
      alert("Enter valid glucose value (40 - 500)");
      return;
    }

    const { error } = await supabase.from("readings").insert([
      { glucose: value },
    ]);

    if (error) {
      console.error("Insert error:", error);
    } else {
      setGlucose("");
      fetchReadings();
    }
  };

  // 🍎 Suggestion logic
  const getSuggestion = (value: number) => {
    if (value < 70) return "⚠️ Low sugar - Take glucose or juice";
    if (value <= 140) return "✅ Normal - Maintain diet";
    return "⚠️ High sugar - Avoid sugar & do light exercise";
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🩺 GlucoTrack</h1>

      <input
        type="number"
        placeholder="Enter glucose level"
        value={glucose}
        onChange={(e) => setGlucose(e.target.value)}
        style={{ padding: "10px", marginRight: "10px" }}
      />

      <button onClick={addReading} style={{ padding: "10px" }}>
        Add Reading
      </button>

      <h2 style={{ marginTop: "20px" }}>📊 Readings</h2>

      {readings.length === 0 && <p>No readings yet</p>}

      {readings.map((r) => (
        <div
          key={r.id}
          style={{
            padding: "10px",
            margin: "10px 0",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        >
          <strong>{r.glucose} mg/dL</strong> <br />
          <small>{new Date(r.created_at).toLocaleString()}</small>
          <p>{getSuggestion(r.glucose)}</p>
        </div>
      ))}
    </div>
  );
}