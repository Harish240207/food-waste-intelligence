import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale);

function DemandChart({ data }) {
  return (
    <Bar
      data={{
        labels: Object.keys(data),
        datasets: [
          {
            label: "Food Demand",
            data: Object.values(data),
            backgroundColor: "#22c55e",
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
        },
      }}
    />
  );
}

export default DemandChart;
