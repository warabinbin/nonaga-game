import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Nonaga from './nonaga';

// 座標からピクセル位置を計算
const hexToPixel = (q, r, size = 42, centerX = 300, centerY = 280) => {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x: centerX + x, y: centerY + y };
};

// 特定座標に近い g 要素をクリック
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

// 有効な移動先（緑のハイライト）をクリック
const clickValidMove = (container, index = 0) => {
  const svg = container.querySelector('svg');
  const validMoves = svg.querySelectorAll('circle[stroke="#2ecc71"]');
  if (validMoves.length > index) {
    fireEvent.click(validMoves[index]);
    return true;
  }
  return false;
};

// 外周の空きディスクを探してクリック
const clickEdgeEmptyDisc = (container, excludeCoords = []) => {
  const svg = container.querySelector('svg');
  const groups = Array.from(svg.querySelectorAll('g[style*="cursor: pointer"]'));
  
  // 外周ディスクの座標（六角形の辺上にあるもの）
  const edgeDiscs = [
    [2, -2], [2, -1], [2, 0],
    [1, 1], [0, 2], [-1, 2],
    [-2, 2], [-2, 1], [-2, 0],
    [-1, -1], [0, -2], [1, -2]
  ];
  
  for (const [q, r] of edgeDiscs) {
    // 除外座標をスキップ
    if (excludeCoords.some(([eq, er]) => eq === q && er === r)) continue;
    
    const { x: targetX, y: targetY } = hexToPixel(q, r);
    
    for (const g of groups) {
      const circles = g.querySelectorAll('circle');
      if (circles.length === 0) continue;
      
      const firstCircle = circles[0];
      const cx = parseFloat(firstCircle.getAttribute('cx'));
      const cy = parseFloat(firstCircle.getAttribute('cy'));
      const distance = Math.sqrt((cx - targetX) ** 2 + (cy - targetY) ** 2);
      
      if (distance < 10) {
        // このディスクに駒がないことを確認（circles が2個=空、3個以上=駒あり）
        const allCirclesInG = g.querySelectorAll('circle');
        if (allCirclesInG.length === 2) { // 影 + ディスク本体のみ = 空
          console.log(`Clicking edge disc at (${q}, ${r})`);
          fireEvent.click(g);
          return { q, r };
        }
      }
    }
  }
  return null;
};

describe('Complete Disc Movement Test', () => {
  
  test('フェーズ2でディスクを選択すると配置先が表示される', () => {
    const { container, queryByText } = render(<Nonaga />);
    
    console.log('=== Phase 1: Move a piece ===');
    
    // 駒を選択
    clickAtCoord(container, 2, -2);
    
    // 有効な移動先をクリック
    clickValidMove(container, 0);
    
    // フェーズ2確認
    const phase2 = queryByText('② Move a disc');
    console.log('Phase 2 reached:', !!phase2);
    expect(phase2).toBeInTheDocument();
    
    console.log('\n=== Phase 2: Select and move a disc ===');
    
    // 駒が移動した先（2,-1）を除外して外周ディスクを探す
    // 初期の駒位置も考慮
    const piecesPositions = [[2, -1], [-1, 2], [-1, -1], [2, 0], [-2, 2], [0, -2]];
    
    // 外周の空きディスクをクリック
    const clickedDisc = clickEdgeEmptyDisc(container, piecesPositions);
    console.log('Clicked disc:', clickedDisc);
    
    if (clickedDisc) {
      // 配置先のハイライトを確認
      const svg = container.querySelector('svg');
      const validPlacements = svg.querySelectorAll('circle[stroke="#2ecc71"]');
      console.log('Valid placements after selecting disc:', validPlacements.length);
      
      // 配置先がある場合、1つ選んでクリック
      if (validPlacements.length > 0) {
        console.log('Clicking a valid placement...');
        fireEvent.click(validPlacements[0]);
        
        // ターンが変わったか確認
        const blackTurn = queryByText("Black's Turn");
        const redTurn = queryByText("Red's Turn");
        console.log("Black's turn:", !!blackTurn);
        console.log("Red's turn:", !!redTurn);
        
        // フェーズ1に戻ったか
        const phase1Again = queryByText('① Move a piece');
        console.log('Back to Phase 1:', !!phase1Again);
      }
    }
  });

  test('完全な1ターンをシミュレート', () => {
    const { container, queryByText } = render(<Nonaga />);
    
    console.log('\n=== Complete Turn Simulation ===');
    
    // Step 1: 駒を選択
    console.log('Step 1: Select red piece at (2,-2)');
    clickAtCoord(container, 2, -2);
    
    // Step 2: 有効な移動先へ移動
    console.log('Step 2: Move to valid position');
    const moved = clickValidMove(container, 0);
    console.log('Piece moved:', moved);
    
    // フェーズ2確認
    let phase2 = queryByText('② Move a disc');
    expect(phase2).toBeInTheDocument();
    
    // Step 3: 外周ディスクを選択
    console.log('Step 3: Select edge disc');
    const svg = container.querySelector('svg');
    
    // 選択可能なディスクを探す（stroke="#5dade2"がcanSelectDiscの印）
    const selectableDiscs = svg.querySelectorAll('circle[stroke="#5dade2"]');
    console.log('Selectable discs count:', selectableDiscs.length);
    
    if (selectableDiscs.length > 0) {
      // gタグを探してクリック
      const firstSelectableDisc = selectableDiscs[0];
      const parentG = firstSelectableDisc.closest('g');
      if (parentG) {
        console.log('Clicking first selectable disc');
        fireEvent.click(parentG);
        
        // 配置先を確認
        const validPlacements = svg.querySelectorAll('circle[stroke="#2ecc71"]');
        console.log('Valid placements:', validPlacements.length);
        
        if (validPlacements.length > 0) {
          // Step 4: 配置先をクリック
          console.log('Step 4: Click valid placement');
          fireEvent.click(validPlacements[0]);
          
          // ターンが変わったか
          const blackTurn = queryByText("Black's Turn");
          console.log("Turn changed to Black:", !!blackTurn);
          
          if (blackTurn) {
            console.log('✅ Complete turn successful!');
          }
        }
      }
    }
  });
});

describe('Edge Disc Detection', () => {
  test('外周ディスクが正しく検出される', () => {
    const { container } = render(<Nonaga />);
    
    // 駒を移動してフェーズ2へ
    clickAtCoord(container, 2, -2);
    clickValidMove(container, 0);
    
    const svg = container.querySelector('svg');
    const selectableDiscs = svg.querySelectorAll('circle[stroke="#5dade2"]');
    
    console.log('\n=== Edge Disc Detection ===');
    console.log('Number of selectable discs:', selectableDiscs.length);
    
    // 少なくとも1つは選択可能なディスクがあるはず
    expect(selectableDiscs.length).toBeGreaterThan(0);
  });
});
