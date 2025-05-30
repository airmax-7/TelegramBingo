export function generateBingoCard(): number[][] {
  const card: number[][] = [];
  
  // B column: 1-15
  // I column: 16-30
  // N column: 31-45 (with free space at center)
  // G column: 46-60
  // O column: 61-75
  
  const ranges = [
    { min: 1, max: 15 },   // B
    { min: 16, max: 30 },  // I
    { min: 31, max: 45 },  // N
    { min: 46, max: 60 },  // G
    { min: 61, max: 75 }   // O
  ];

  for (let col = 0; col < 5; col++) {
    const column: number[] = [];
    const usedNumbers = new Set<number>();
    const range = ranges[col];
    
    for (let row = 0; row < 5; row++) {
      if (col === 2 && row === 2) {
        // Free space
        column.push(0);
      } else {
        let number: number;
        do {
          number = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        } while (usedNumbers.has(number));
        
        usedNumbers.add(number);
        column.push(number);
      }
    }
    
    // Transpose: add column to each row
    for (let row = 0; row < 5; row++) {
      if (!card[row]) card[row] = [];
      card[row][col] = column[row];
    }
  }
  
  return card;
}

export function checkWinCondition(card: number[][], markedNumbers: number[]): boolean {
  const isMarked = (num: number) => num === 0 || markedNumbers.includes(num);
  
  // Check rows
  for (let row = 0; row < 5; row++) {
    if (card[row].every(num => isMarked(num))) {
      return true;
    }
  }
  
  // Check columns
  for (let col = 0; col < 5; col++) {
    if (card.every(row => isMarked(row[col]))) {
      return true;
    }
  }
  
  // Check diagonals
  const diagonal1 = [0, 1, 2, 3, 4].every(i => isMarked(card[i][i]));
  const diagonal2 = [0, 1, 2, 3, 4].every(i => isMarked(card[i][4 - i]));
  
  return diagonal1 || diagonal2;
}

export function formatBingoNumber(num: number): string {
  if (num === 0) return 'FREE';
  
  let letter: string;
  if (num <= 15) letter = 'B';
  else if (num <= 30) letter = 'I';
  else if (num <= 45) letter = 'N';
  else if (num <= 60) letter = 'G';
  else letter = 'O';
  
  return `${letter}-${num}`;
}
