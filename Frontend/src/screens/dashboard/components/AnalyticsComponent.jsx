import { useState, useEffect, useRef } from "react";
import { Pie, Bar } from "react-chartjs-2";
import axios from "axios";

import "chart.js/auto";
import { SERVER_URL } from "../../../router";
import { io } from "socket.io-client";

export const AnalyticsComponent = () => {
  const [loading, setLoading] = useState(true);

  const [analyticsData, setAnalyticsData] = useState(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/api/v1/analytics/`);
        setAnalyticsData(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();

    // Establish WebSocket connection for real-time updates
    const socket = io(SERVER_URL, {
      withCredentials: true,
    });

    socket.on("inventory_updated", (data) => {
      console.log("Real-time inventory update received:", data);
      fetchData(); // Silently re-fetch analytics data to update charts
    });

    return () => {
      ref1.current = null;
      ref2.current = null;
      ref3.current = null;
      socket.disconnect(); // Cleanup on unmount
    };
  }, []);
  
  const handleChartClick = (elements, dataset, title) => {
    console.log("Chart clicked:", title);
  };
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 grid-cols-1">
      {loading ? (
        <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-center items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="col-span-1 bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-4">
              {analyticsData.useby.title}
            </h2>
            <Pie
              data={{
                
                labels: analyticsData.useby.labels,
                datasets: [
                  {
                    data: analyticsData.useby.data,
                    // backgroundColor: ["#4CAF50", "#FFC107"],
                  },
                ],
              }}
              onClick={(event, elements) =>
                handleChartClick(elements, analyticsData.useby, "Use By")
              }
            />
          </div>
          <div className="col-span-2 bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-4">
              {analyticsData.expiry.title}
            </h2>
            <Bar
              data={{
                labels: analyticsData.expiry.labels,
                datasets: [
                  {
                    label: analyticsData.expiry.title,
                    data: analyticsData.expiry.data,
                    backgroundColor: ["#2196F3", "#F44336"],
                  },
                ],
              }}
              onClick={(event, elements) =>
                handleChartClick(elements, analyticsData.expiry, "Expiry")
              }
            />
          </div>
          <div className="col-span-2 bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-4">
              {analyticsData.status.title}
            </h2>
            <Bar
              data={{
                labels: analyticsData.status.labels,
                datasets: [
                  {
                    label: analyticsData.status.title,
                    data: analyticsData.status.data,
                    backgroundColor: ["#FF5722", "#FFC107", "#2196F3"],
                  },
                ],
              }}
              onClick={(event, elements) =>
                handleChartClick(
                  elements,
                  analyticsData.status,
                  "Product Status"
                )
              }
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsComponent;
