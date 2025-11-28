import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Nonaga from './nonaga';

// 座標からピクセル位置を計算
const hexToPixel = (q, r, size = 42, centerX = 300, centerY = 280) => {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x: centerX + x, y: centerY + y };
};

// 特定座標の g 要素をクリック
const clickAtCoord = (container, q, r) => {
  const { x: targetX, y: targetY } = hexToPixel(q, r);
  const svg = container.querySelector('svg');
  const groups = Array.from(svg.querySelectorAll('g'));
  
  for (const g of groups) {
    const circle = g.querySelector('circle');
    if (!circle) continue;
    
    const cx = parseFloat(circle.getAttribute('cx'));
    const cy = parseFloat(circle.getAttribute('cy'));
    const distance = Math.sqrt((cx - targetX) ** 2 + (cy - targetY) ** 2);
    
    if (distance < 10) {
      fireEvent.click(g);
      return true;
    }
  }
  return false;
};

// 有効な移動先をクリック（座標指定）
const clickValidMoveAtCoord = (container, q, r) => {
  const { x: targetX, y: targetY } = hexToPixel(q, r);
  const svg = container.querySelector('svg');
  const validMoves = svg.querySelectorAll('circle[stroke="#2ecc71"]');
  
  for (const circle of validMoves) {
    const cx = parseFloat(circle.getAttribute('cx'));
    const cy = parseFloat(circle.getAttribute('cy'));
    const distance = Math.sqrt((cx - targetX) ** 2 + (cy - targetY) ** 2);
    
    if (distance < 10) {
      fireEvent.click(circle);
      return true;
    }
  }
  return false;
};

// デフォルトのディスク配置
const DEFAULT_DISCS = [
  { q: 0, r: 0 },
  { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
  { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
  { q: 2, r: -2 }, { q: 2, r: -1 }, { q: 2, r: 0 },
  { q: 1, r: 1 }, { q: 0, r: 2 }, { q: -1, r: 2 },
  { q: -2, r: 2 }, { q: -2, r: 1 }, { q: -2, r: 0 },
  { q: -1, r: -1 }, { q: 0, r: -2 }, { q: 1, r: -2 },
];

describe('Win Condition Logic Tests', () => {
  
  // 隣接チェック関数（テスト用）
  const DIRECTIONS = [
    { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
    { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
  ];
  
  const areNeighbors = (pos1, pos2) => {
    const dq = pos1.q - pos2.q;
    const dr = pos1.r - pos2.r;
    return DIRECTIONS.some(d => d.q === dq && d.r === dr);
  };
  
  const checkWin = (pieces) => {
    if (pieces.length !== 3) return false;
    const [p1, p2, p3] = pieces;
    const n12 = areNeighbors(p1, p2);
    const n23 = areNeighbors(p2, p3);
    const n13 = areNeighbors(p1, p3);
    const adjacentCount = (n12 ? 1 : 0) + (n23 ? 1 : 0) + (n13 ? 1 : 0);
    return adjacentCount >= 2;
  };

  test('三角形配置は勝利（3ペア隣接）', () => {
    const triangle = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
    ];
    expect(checkWin(triangle)).toBe(true);
    console.log('✅ Triangle (3 adjacent pairs): WIN');
  });

  test('一直線配置は勝利（2ペア隣接）', () => {
    // 水平直線
    const horizontalLine = [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ];
    expect(checkWin(horizontalLine)).toBe(true);
    console.log('✅ Horizontal line: WIN');
    
    // 斜め直線
    const diagonalLine = [
      { q: 0, r: -1 },
      { q: 0, r: 0 },
      { q: 0, r: 1 },
    ];
    expect(checkWin(diagonalLine)).toBe(true);
    console.log('✅ Diagonal line: WIN');
    
    // 別の斜め直線
    const diagonalLine2 = [
      { q: -1, r: 1 },
      { q: 0, r: 0 },
      { q: 1, r: -1 },
    ];
    expect(checkWin(diagonalLine2)).toBe(true);
    console.log('✅ Another diagonal line: WIN');
  });

  test('V字配置は勝利（2ペア隣接）', () => {
    // 中央(0,0)から2方向に伸びるV字
    const vShape1 = [
      { q: 1, r: -1 },  // 右上
      { q: 0, r: 0 },   // 中央
      { q: 1, r: 0 },   // 右
    ];
    expect(checkWin(vShape1)).toBe(true);
    console.log('✅ V-shape 1: WIN');
    
    const vShape2 = [
      { q: -1, r: 0 },  // 左
      { q: 0, r: 0 },   // 中央
      { q: 0, r: 1 },   // 下
    ];
    expect(checkWin(vShape2)).toBe(true);
    console.log('✅ V-shape 2: WIN');
  });

  test('離れた配置は敗北（1ペア以下隣接）', () => {
    // 1ペアだけ隣接
    const onePair = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 3, r: 0 },  // 離れている
    ];
    expect(checkWin(onePair)).toBe(false);
    console.log('✅ Only 1 adjacent pair: NO WIN');
    
    // 全く隣接していない
    const scattered = [
      { q: 0, r: 0 },
      { q: 2, r: 0 },
      { q: 0, r: 2 },
    ];
    expect(checkWin(scattered)).toBe(false);
    console.log('✅ No adjacent pairs: NO WIN');
  });
});

describe('Win Detection Integration - Line Victory', () => {
  
  test('一直線で赤が勝利', async () => {
    // 赤: (-1,0), (0,0), (2,0) → (2,0)を(1,0)に移動で直線完成
    const nearWinPieces = {
      red: [
        { q: -1, r: 0 },
        { q: 0, r: 0 },
        { q: 2, r: 0 },
      ],
      black: [
        { q: 2, r: -2 },
        { q: -2, r: 2 },
        { q: 0, r: 2 },
      ],
    };

    const { container, queryByText } = render(
      <Nonaga initialPieces={nearWinPieces} initialDiscs={DEFAULT_DISCS} />
    );

    console.log('\n=== Test: Line victory ===');
    console.log('Red pieces: (-1,0), (0,0), (2,0)');
    console.log('Target: move (2,0) to (1,0) to form line');

    // (2,0) の駒を選択
    clickAtCoord(container, 2, 0);
    
    // (1,0) に移動
    clickValidMoveAtCoord(container, 1, 0);

    // 勝利判定を待つ
    await waitFor(() => {
      expect(queryByText(/Red.*wins/i)).toBeInTheDocument();
    });
    
    console.log('✅ Red wins with line!');
  });
});

describe('Win Detection Integration - V-shape Victory', () => {
  
  test('V字で赤が勝利', async () => {
    // 赤: (0,0), (-1,0), (2,-2) 
    // (2,-2)から方向(-1,0)で移動すると(1,-1)で(0,0)の手前で止まる
    // 結果: (-1,0)-(0,0)-(1,-1) のV字
    // - (-1,0)と(0,0)は隣接 (方向(1,0))
    // - (0,0)と(1,-1)は隣接 (方向(1,-1))
    // - (-1,0)と(1,-1)は隣接していない（差は(2,-1)、方向リストにない）
    const nearWinPieces = {
      red: [
        { q: 0, r: 0 },
        { q: -1, r: 0 },
        { q: 2, r: -2 },
      ],
      black: [
        { q: 2, r: 0 },
        { q: -2, r: 2 },
        { q: 0, r: 2 },
      ],
    };

    const { container, queryByText } = render(
      <Nonaga initialPieces={nearWinPieces} initialDiscs={DEFAULT_DISCS} />
    );

    console.log('\n=== Test: V-shape victory ===');
    console.log('Red pieces: (0,0), (-1,0), (2,-2)');
    console.log('Target: move (2,-2) to (1,-1) to form V-shape');

    // (2,-2) の駒を選択
    clickAtCoord(container, 2, -2);
    
    // (1,-1) に移動 (方向(-1,0)で(0,0)の手前)
    clickValidMoveAtCoord(container, 1, -1);

    // 勝利判定を待つ
    await waitFor(() => {
      expect(queryByText(/Red.*wins/i)).toBeInTheDocument();
    });
    
    console.log('✅ Red wins with V-shape!');
  });
});

describe('Win Detection Integration - Triangle Victory', () => {
  
  test('三角形で赤が勝利', async () => {
    const nearWinPieces = {
      red: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 0, r: 2 },
      ],
      black: [
        { q: 2, r: -2 },
        { q: -2, r: 2 },
        { q: -2, r: 0 },
      ],
    };

    const { container, queryByText } = render(
      <Nonaga initialPieces={nearWinPieces} initialDiscs={DEFAULT_DISCS} />
    );

    console.log('\n=== Test: Triangle victory ===');
    console.log('Red pieces: (0,0), (1,0), (0,2)');
    console.log('Target: move (0,2) to (0,1) to form triangle');

    // (0,2) の駒を選択
    clickAtCoord(container, 0, 2);
    
    // (0,1) に移動で三角形
    clickValidMoveAtCoord(container, 0, 1);

    // 勝利判定を待つ
    await waitFor(() => {
      expect(queryByText(/Red.*wins/i)).toBeInTheDocument();
    });
    
    console.log('✅ Red wins with triangle!');
  });
});
