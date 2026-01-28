import { useEffect, useState } from "react";
import api from "../api";

export default function Analytics() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/analytics/weekly")
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Weekly / Monthly Analytics</h2>

      {data.length === 0 ? (
        <p className="text-gray-500">No analytics data yet</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.map((d, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-xl shadow hover:shadow-lg"
            >
              <p className="text-gray-500">{d.period}</p>
              <p className="text-lg font-semibold">
                Demand: {d.demand}
              </p>
              <p className="text-red-500">
                Waste Cost: ₹ {d.waste_cost}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
