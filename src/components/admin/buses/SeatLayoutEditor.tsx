"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Armchair, CarFront, Toilet, Square, GripVertical, LogIn } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Definición de tipos para el layout de asientos
type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty' | 'entry';
  number?: number; // Solo para asientos
};
type SeatLayoutRow = SeatLayoutItem[];
type SeatLayout = SeatLayoutRow[];

type ToolType = 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty' | 'entry';

interface SeatLayoutEditorProps {
  initialLayout: SeatLayout | null;
  onLayoutChange: (layout: SeatLayout | null, seatCount: number) => void;
  totalCapacity: number; // Expected total capacity from BusForm
}

const SeatLayoutEditor: React.FC<SeatLayoutEditorProps> = ({ initialLayout, onLayoutChange, totalCapacity }) => {
  const [rows, setRows] = useState(initialLayout?.length || 7);
  const [cols, setCols] = useState(initialLayout?.[0]?.length || 10);
  const [grid, setGrid] = useState<SeatLayout>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('seat');

  const reNumberSeats = useCallback((currentLayout: SeatLayout, currentRows: number, currentCols: number): SeatLayout => {
    let currentSeatNumber = 1;
    const newLayout: SeatLayout = currentLayout.map(row => row.map(item => ({ ...item })));

    for (let colIndex = 0; colIndex < currentCols; colIndex++) {
      for (let rowIndex = 0; rowIndex < currentRows; rowIndex++) {
        if (newLayout[rowIndex] && newLayout[rowIndex][colIndex] && newLayout[rowIndex][colIndex].type === 'seat') {
          newLayout[rowIndex][colIndex].number = currentSeatNumber++;
        }
      }
    }
    return newLayout;
  }, []);

  const prevInitialLayoutRef = useRef<SeatLayout | null>(null);
  const isUpdatingFromProps = useRef(false); // Flag to prevent onLayoutChange from looping

  // Effect para inicializar el grid cuando initialLayout cambia (profundamente)
  useEffect(() => {
    const hasInitialLayoutChanged = JSON.stringify(initialLayout) !== JSON.stringify(prevInitialLayoutRef.current);

    if (hasInitialLayoutChanged) {
      const initialRows = initialLayout?.length || 7;
      const initialCols = initialLayout?.[0]?.length || 10;

      setRows(initialRows);
      setCols(initialCols);

      let newGrid: SeatLayout;
      if (initialLayout && initialLayout.length > 0) {
        newGrid = Array.from({ length: initialRows }, (_, rIdx) =>
          Array.from({ length: initialCols }, (_, cIdx) => {
            return initialLayout[rIdx] && initialLayout[rIdx][cIdx]
              ? { ...initialLayout[rIdx][cIdx] }
              : { type: 'empty' };
          })
        );
      } else {
        newGrid = Array.from({ length: initialRows }, () =>
          Array.from({ length: initialCols }, () => ({ type: 'empty' }))
        );
      }
      const numberedGrid = reNumberSeats(newGrid, initialRows, initialCols);
      isUpdatingFromProps.current = true; // Set flag as this update is prop-driven
      setGrid(numberedGrid);
      prevInitialLayoutRef.current = initialLayout; // Update the ref
    }
  }, [initialLayout, reNumberSeats]);

  // Effect para redimensionar el grid cuando rows o cols cambian (por input del usuario)
  useEffect(() => {
    setGrid(prevGrid => {
      const newGrid: SeatLayout = Array.from({ length: rows }, (_, rIdx) =>
        Array.from({ length: cols }, (_, cIdx) => {
          return prevGrid[rIdx] && prevGrid[rIdx][cIdx]
            ? prevGrid[rIdx][cIdx]
            : { type: 'empty' };
        })
      );
      isUpdatingFromProps.current = true; // Set flag as this update is size-driven
      return reNumberSeats(newGrid, rows, cols);
    });
  }, [rows, cols, reNumberSeats]);

  // Effect para notificar al padre cuando el grid cambia (pero no si es por actualización de props/tamaño)
  useEffect(() => {
    if (isUpdatingFromProps.current) {
      isUpdatingFromProps.current = false; // Reset flag
      return; // Skip calling onLayoutChange if the update was internal/prop-driven
    }
    const seatCount = grid.flat().filter(item => item.type === 'seat').length;
    onLayoutChange(grid, seatCount);
  }, [grid, onLayoutChange]);

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      const currentType = newGrid[rowIndex][colIndex].type;

      if (currentType === activeTool) {
        newGrid[rowIndex][colIndex] = { type: 'empty' };
      } else {
        newGrid[rowIndex][colIndex] = { type: activeTool };
      }
      // This update will trigger the useEffect for `grid`, which then calls onLayoutChange
      return reNumberSeats(newGrid, rows, cols);
    });
  };

  const handleGridSizeChange = (field: 'rows' | 'cols', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue <= 0) {
      // Optionally show a toast or handle invalid input visually
      if (field === 'rows') setRows(1); // Default to 1 or previous valid state
      if (field === 'cols') setCols(1);
      return;
    }
    if (field === 'rows') setRows(numValue);
    if (field === 'cols') setCols(numValue);
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
      case 'entry':
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
      case 'entry':
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
          type="text" // Changed to text
          pattern="[0-9]*" // Pattern for integers
          value={rows}
          onChange={(e) => handleGridSizeChange('rows', e.target.value)}
          className="w-20"
          required
        />
        <Label htmlFor="cols">Columnas:</Label>
        <Input
          id="cols"
          type="text" // Changed to text
          pattern="[0-9]*" // Pattern for integers
          value={cols}
          onChange={(e) => handleGridSizeChange('cols', e.target.value)}
          className="w-20"
          required
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