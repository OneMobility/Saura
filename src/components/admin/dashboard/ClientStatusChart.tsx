"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ClientStatusData {
  status: string;
  count: number;
}

interface ClientStatusChartProps {
  data: ClientStatusData[];
}

const ClientStatusChart: React.FC<ClientStatusChartProps> = ({ data }) => {
  const formattedData = data.map(item => ({
    ...item,
    status: item.status.charAt(0).toUpperCase() + item.status.slice(1), // Capitalize status
  }));

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Estado de Clientes</CardTitle>
        <CardDescription>Distribución de clientes por estado de contrato.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#E4007C" name="Número de Clientes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientStatusChart;