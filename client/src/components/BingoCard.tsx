import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

interface BingoCardProps {
  card: number[][];
  markedNumbers: number[];
  onNumberMark: (numbers: number[]) => void;
  calledNumbers: string[];
  canCallBingo: boolean;
  onCallBingo: () => void;
}

export default function BingoCard({ 
  card, 
  markedNumbers, 
  onNumberMark, 
  calledNumbers,
  canCallBingo,
  onCallBingo 
}: BingoCardProps) {
  const [localMarked, setLocalMarked] = useState<number[]>(markedNumbers);

  useEffect(() => {
    setLocalMarked(markedNumbers);
  }, [markedNumbers]);

  const handleCellClick = (number: number) => {
    if (number === 0) return; // Free space

    const isCurrentlyMarked = localMarked.includes(number);
    let newMarked: number[];

    if (isCurrentlyMarked) {
      newMarked = localMarked.filter(n => n !== number);
    } else {
      newMarked = [...localMarked, number];
    }

    setLocalMarked(newMarked);
    onNumberMark(newMarked);
  };

  const isCellMarked = (number: number) => {
    return number === 0 || localMarked.includes(number);
  };

  const getCellClasses = (number: number) => {
    const baseClasses = "w-12 h-12 rounded-lg font-bold text-sm transition-colors border";
    
    if (number === 0) {
      return `${baseClasses} bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600`;
    }

    if (isCellMarked(number)) {
      return `${baseClasses} bg-orange-100 border-orange-400 text-orange-600`;
    }

    return `${baseClasses} bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100`;
  };

  const letters = ['B', 'I', 'N', 'G', 'O'];

  return (
    <Card className="shadow-lg border border-gray-200">
      <CardContent className="p-4">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-center text-gray-900 mb-2">YOUR CARD</h2>
          <div className="grid grid-cols-5 gap-1 mb-2">
            {letters.map(letter => (
              <div key={letter} className="w-12 h-8 flex items-center justify-center text-lg font-bold text-blue-600 bg-blue-50 rounded border border-blue-200">
                {letter}
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-1 mb-4">
          {card.map((row, rowIndex) =>
            row.map((number, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                className={getCellClasses(number)}
                onClick={() => handleCellClick(number)}
                disabled={number === 0}
              >
                {number === 0 ? (
                  <i className="fas fa-star text-white text-lg"></i>
                ) : (
                  number
                )}
              </button>
            ))
          )}
        </div>

        {/* Called Numbers Section */}
        {calledNumbers.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Called Numbers</h3>
            <div className="flex flex-wrap gap-1">
              {calledNumbers.map(number => (
                <span 
                  key={number}
                  className="inline-block w-8 h-8 text-xs font-bold bg-blue-100 text-blue-800 rounded flex items-center justify-center border border-blue-200"
                >
                  {number}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={onCallBingo}
            disabled={!canCallBingo}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 font-bold text-lg"
          >
            <Trophy className="mr-2" />
            CALL BINGO!
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">Tap numbers as they're called</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
