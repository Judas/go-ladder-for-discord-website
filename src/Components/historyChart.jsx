import React from "react";
import {Line} from "react-chartjs-2";

export default function HistoryChart({data}) {
    return (
        <Line data={data}
              options={{
                  elements: {
                      point: {
                          radius: 2
                      }
                  },
                  scales: {
                      x: {
                          grid: {
                              borderColor: 'rgba(255,255,255, 0.87)',
                              color: 'rgba(255,255,255, 0.2)'
                          },
                          ticks: {
                              backdropColor: 'rgba(255,255,255, 0.87)',
                              color: 'rgba(255,255,255, 0.87)'
                          }
                      },
                      y: {
                          min: 500,
                          max: 2500,
                          grid: {
                              borderColor: 'rgba(255,255,255, 0.87)',
                              color: 'rgba(255,255,255, 0.2)'
                          },
                          ticks: {
                              backdropColor: 'rgba(255,255,255, 0.87)',
                              color: 'rgba(255,255,255, 0.87)'
                          }
                      }
                  },
                  plugins: {
                      legend: {
                          display: false
                      },
                      tooltip: {
                          displayColors: false
                      }
                  }
              }}/>
    );
}

export function historyToChartData(history) {
    return {
        labels: history.labels,
        datasets: [
            {
                data: history.values,
                borderColor: 'rgba(252, 163, 17, 1)',
                borderWidth: 3,
                tension: 0.1,
                pointRadius: 2
            },
            {
                data: history.maxValues,
                borderColor: 'rgba(252, 163, 17, 1)',
                borderWidth: 1,
                tension: 0.1,
                pointRadius: 0,
                fill: {
                    target: '+1',
                    above: 'rgba(252, 163, 17, 0.2)'
                }
            },
            {
                data: history.minValues,
                borderColor: 'rgba(252, 163, 17, 1)',
                borderWidth: 1,
                tension: 0.1,
                pointRadius: 0
            }
        ]
    }
}
