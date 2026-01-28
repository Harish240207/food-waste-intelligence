import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

export default function AnalyticsCharts() {
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/analytics")
      .then(res => {
        setWeekly(res.data.weekly);
        setMonthly(res.data.monthly);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-10 mt-10">

      {/* WEEKLY */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">
          Weekly Revenue
        </h2>

        {weekly.length === 0 ? (
          <p className="text-gray-500">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weekly}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#ff7a00" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* MONTHLY */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">
          Monthly Revenue
        </h2>

        {monthly.length === 0 ? (
          <p className="text-gray-500">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthly}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
