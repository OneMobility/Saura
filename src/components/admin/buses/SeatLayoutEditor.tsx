"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Armchair, CarFront, Toilet, Minus, Square, GripVertical, Grid3X3 } from 'lucide-react'; // Changed Chair to Armchair
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Definición de tipos para el layout de asientos
type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty';
  number?: number; // Solo para asientos
};
type SeatLayoutRow = SeatLayoutItem[];
type SeatLayout = SeatLayoutRow[];

type ToolType = 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty';

interface SeatLayoutEditorProps {
  initialLayout: SeatLayout | null;
  onLayoutChange: (layout: SeatLayout | null, seatCount: number) => void;
  totalCapacity: number; // Expected total capacity from BusForm
}

const SeatLayoutEditor: React.FC<SeatLayoutEditorProps> = ({ initialLayout, onLayoutChange, totalCapacity }) => {
  const [rows, setRows] = useState(7); // Default rows
  const [cols, setCols] = useState(10); // Default columns
  const [grid, setGrid] = useState<SeatLayout>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('seat');

  // Helper function to re-number seats column-first
  const reNumberSeats = useCallback((currentLayout: SeatLayout): SeatLayout => {
    let currentSeatNumber = 1;
    // Create a deep copy to avoid direct mutation
    const newLayout: SeatLayout = currentLayout.map(row => row.map(item => ({ ...item })));

    // Iterate column by column, then row by row within each column
    for (let colIndex = 0; colIndex < cols; colIndex++) {
      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        // Ensure we don't go out of bounds if grid size changed
        if (newLayout[rowIndex] && newLayout[rowIndex][colIndex] && newLayout[rowIndex][colIndex].type === 'seat') {
          newLayout[rowIndex][colIndex].number = currentSeatNumber++;
        }
      }
    }
    return newLayout;
  }, [rows, cols]); // Dependencies for useCallback

  // Initialize grid from initialLayout or create an empty one
  useEffect(() => {
    if (initialLayout && initialLayout.length > 0) {
      setRows(initialLayout.length);
      setCols(initialLayout[0].length); // Assuming all rows have same length
      setGrid(reNumberSeats(initialLayout)); // Re-number initial layout
    } else {
      // Create an empty grid if no initial layout
      const emptyGrid: SeatLayout = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ type: 'empty' }))
      );
      setGrid(reNumberSeats(emptyGrid)); // Re-number empty grid
    }
  }, [initialLayout, rows, cols, reNumberSeats]); // Added reNumberSeats to dependencies

  // Notify parent on grid change (after re-numbering)
  useEffect(() => {
    const seatCount = grid.flat().filter(item => item.type === 'seat').length;
    onLayoutChange(grid, seatCount);
  }, [grid, onLayoutChange]);

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]); // Deep copy
      newGrid[rowIndex][colIndex] = { type: activeTool };
      return reNumberSeats(newGrid); // Re-number after change
    });
  };

  const handleGridSizeChange = (newRows: number, newCols: number) => {
    if (newRows <= 0 || newCols <= 0) {
      toast.error('Las filas y columnas deben ser mayores que 0.');
      return;
    }
    setRows(newRows);
    setCols(newCols);

    setGrid(prevGrid => {
      const newGrid: SeatLayout = Array.from({ length: newRows }, (_, rIdx) =>
        Array.from({ length: newCols }, (_, cIdx) => {
          // Preserve existing items if within bounds, otherwise default to empty
          return prevGrid[rIdx] && prevGrid[rIdx][cIdx]
            ? prevGrid[rIdx][cIdx]
            : { type: 'empty' };
        })
      );
      return reNumberSeats(newGrid); // Re-number after size change
    });
  };

  const renderCellContent = (item: SeatLayoutItem) => {
    switch (item.type) {
      case 'seat':
        return item.number;
      case 'driver':
        return <CarFront className="h-4 w-4" />;
      case 'bathroom':
        return <Toilet className="h-4 w-4" />;
      case 'aisle':
        return <GripVertical className="h-4 w-4 text-gray-400" />;
      case 'empty':
      default:
        return null;
    }
  };

  const getCellClasses = (item: SeatLayoutItem) => {
    const base = "w-8 h-8 flex items-center justify-center border border-gray-200 text-xs font-medium";
    switch (item.type) {
      case 'seat':
        return cn(base, "bg-gray-300 hover:bg-gray-400 cursor-pointer");
      case 'driver':
        return cn(base, "bg-blue-600 text-white cursor-default");
      case 'bathroom':
        return cn(base, "bg-purple-600 text-white cursor-default");
      case 'aisle':
        return cn(base, "bg-gray-100 cursor-pointer");
      case 'empty':
        return cn(base, "bg-white hover:bg-gray-50 cursor-pointer");
      default:
        return base;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Label htmlFor="rows">Filas:</Label>
        <Input
          id="rows"
          type="number"
          value={rows}
          onChange={(e) => handleGridSizeChange(parseInt(e.target.value) || 1, cols)}
          className="w-20"
          min={1}
        />
        <Label htmlFor="cols">Columnas:</Label>
        <Input
          id="cols"
          type="number"
          value={cols}
          onChange={(e) => handleGridSizeChange(rows, parseInt(e.target.value) || 1)}
          className="w-20"
          min={1}
        />
      </div>

      <div className="flex space-x-2 p-2 border rounded-md bg-gray-50">
        <Button
          type="button"
          variant={activeTool === 'seat' ? 'default' : 'outline'}
          onClick={() => setActiveTool('seat')}
          className={activeTool === 'seat' ? 'bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white' : ''}
        >
          <Armchair className="h-4 w-4 mr-2" /> Asiento
        </Button>
        <Button
          type="button"
          variant={activeTool === 'aisle' ? 'default' : 'outline'}
          onClick={() => setActiveTool('aisle')}
          className={activeTool === 'aisle' ? 'bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white' : ''}
        >
          <GripVertical className="h-4 w-4 mr-2" /> Pasillo
        </Button>
        <Button
          type="button"
          variant={activeTool === 'bathroom' ? 'default' : 'outline'}
          onClick={() => setActiveTool('bathroom')}
          className={activeTool === 'bathroom' ? 'bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white' : ''}
        >
          <Toilet className="h-4 w-4 mr-2" /> Baño
        </Button>
        <Button
          type="button"
          variant={activeTool === 'driver' ? 'default' : 'outline'}
          onClick={() => setActiveTool('driver')}
          className={activeTool === 'driver' ? 'bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white' : ''}
        >
          <CarFront className="h-4 w-4 mr-2" /> Conductor
        </Button>
        <Button
          type="button"
          variant={activeTool === 'empty' ? 'default' : 'outline'}
          onClick={() => setActiveTool('empty')}
          className={activeTool === 'empty' ? 'bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white' : ''}
        >
          <Square className="h-4 w-4 mr-2" /> Vacío
        </Button>
      </div>

      <div className="overflow-x-auto p-2 border rounded-md bg-white">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {grid.map((row, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {row.map((item, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={getCellClasses(item)}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {renderCellContent(item)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-600">
        Número de asientos definidos: {grid.flat().filter(item => item.type === 'seat').length} / Capacidad esperada: {totalCapacity}
      </p>
    </div>
  );
};

export default SeatLayoutEditor;