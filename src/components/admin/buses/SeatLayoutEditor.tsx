"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Armchair, CarFront, Toilet, Square, GripVertical, LogIn } from 'lucide-react'; // Added LogIn
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Definición de tipos para el layout de asientos
type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty' | 'entry'; // Added 'entry'
  number?: number; // Solo para asientos
};
type SeatLayoutRow = SeatLayoutItem[];
type SeatLayout = SeatLayoutRow[];

type ToolType = 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty' | 'entry'; // Added 'entry'

interface SeatLayoutEditorProps {
  initialLayout: SeatLayout | null;
  onLayoutChange: (layout: SeatLayout | null, seatCount: number) => void;
  totalCapacity: number; // Expected total capacity from BusForm
}

const SeatLayoutEditor: React.FC<SeatLayoutEditorProps> = ({ initialLayout, onLayoutChange, totalCapacity }) => {
  // Initialize rows and cols from initialLayout if available, otherwise defaults
  const [rows, setRows] = useState(initialLayout?.length || 7);
  const [cols, setCols] = useState(initialLayout?.[0]?.length || 10);
  const [grid, setGrid] = useState<SeatLayout>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('seat');

  // Memoize reNumberSeats to ensure its reference is stable
  const reNumberSeats = useCallback((currentLayout: SeatLayout, currentRows: number, currentCols: number): SeatLayout => {
    let currentSeatNumber = 1;
    const newLayout: SeatLayout = currentLayout.map(row => row.map(item => ({ ...item })));

    // Iterate column by column, then row by row within each column
    for (let colIndex = 0; colIndex < currentCols; colIndex++) {
      for (let rowIndex = 0; rowIndex < currentRows; rowIndex++) {
        // Ensure we don't go out of bounds if grid size changed
        if (newLayout[rowIndex] && newLayout[rowIndex][colIndex] && newLayout[rowIndex][colIndex].type === 'seat') {
          newLayout[rowIndex][colIndex].number = currentSeatNumber++;
        }
      }
    }
    return newLayout;
  }, []); // No dependencies here, as rows/cols are passed as arguments

  // Effect to initialize grid or update when initialLayout, rows, or cols change
  useEffect(() => {
    let newGrid: SeatLayout;
    if (initialLayout && initialLayout.length > 0) {
      // If initialLayout is provided, use it and adjust to new rows/cols if size changed
      newGrid = Array.from({ length: rows }, (_, rIdx) =>
        Array.from({ length: cols }, (_, cIdx) => {
          return initialLayout[rIdx] && initialLayout[rIdx][cIdx]
            ? { ...initialLayout[rIdx][cIdx] } // Deep copy item
            : { type: 'empty' };
        })
      );
    } else {
      // Create an empty grid
      newGrid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ type: 'empty' }))
      );
    }
    setGrid(reNumberSeats(newGrid, rows, cols)); // Set and re-number the grid
  }, [initialLayout, rows, cols, reNumberSeats]); // Added rows and cols to dependencies

  // Effect to notify parent when grid changes (after re-numbering)
  useEffect(() => {
    const seatCount = grid.flat().filter(item => item.type === 'seat').length;
    onLayoutChange(grid, seatCount);
  }, [grid, onLayoutChange]); // Only depends on grid and onLayoutChange

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]); // Deep copy
      // Toggle logic: if activeTool is the same as current type, set to 'empty'
      const currentType = newGrid[rowIndex][colIndex].type;
      if (currentType === activeTool) {
        newGrid[rowIndex][colIndex] = { type: 'empty' };
      } else {
        newGrid[rowIndex][colIndex] = { type: activeTool };
      }
      return reNumberSeats(newGrid, rows, cols); // Pass current rows/cols
    });
  };

  const handleGridSizeChange = (newRows: number, newCols: number) => {
    if (newRows <= 0 || newCols <= 0) {
      toast.error('Las filas y columnas deben ser mayores que 0.');
      return;
    }
    setRows(newRows);
    setCols(newCols);
    // The useEffect with [initialLayout, rows, cols, reNumberSeats] will handle updating the grid.
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
      case 'entry': // New entry type
        return <LogIn className="h-4 w-4" />;
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
      case 'entry': // New entry type styling
        return cn(base, "bg-green-600 text-white hover:bg-green-700 cursor-pointer");
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

      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
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
          variant={activeTool === 'entry' ? 'default' : 'outline'}
          onClick={() => setActiveTool('entry')}
          className={activeTool === 'entry' ? 'bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white' : ''}
        >
          <LogIn className="h-4 w-4 mr-2" /> Ascenso
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