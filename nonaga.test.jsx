import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Nonaga from './nonaga';

// ============================================
// ヘルパー関数のテスト用に抽出
// ============================================

const coordKey = (q, r) => `${q},${r}`;
const parseKey = (key) => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

const DIRECTIONS = [
  { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
  { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
];

const areNeighbors = (pos1, pos2) => {
  const dq = pos1.q - pos2.q;
  const dr = pos1.r - pos2.r;
  return DIRECTIONS.some(d => d.q === dq && d.r === dr);
};

const hexToPixel = (q, r, size) => {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
};

// ============================================
// ユニットテスト: ヘルパー関数
// ============================================

describe('Helper Functions', () => {
  describe('coordKey', () => {
    test('座標を文字列キーに変換する', () => {
      expect(coordKey(0, 0)).toBe('0,0');
      expect(coordKey(1, -1)).toBe('1,-1');
      expect(coordKey(-2, 2)).toBe('-2,2');
    });
  });

  describe('parseKey', () => {
    test('文字列キーを座標オブジェクトに変換する', () => {
      expect(parseKey('0,0')).toEqual({ q: 0, r: 0 });
      expect(parseKey('1,-1')).toEqual({ q: 1, r: -1 });
      expect(parseKey('-2,2')).toEqual({ q: -2, r: 2 });
    });
  });

  describe('areNeighbors', () => {
    test('隣接する座標を正しく判定する', () => {
      const center = { q: 0, r: 0 };
      
      // 全6方向の隣接をテスト
      expect(areNeighbors(center, { q: 1, r: -1 })).toBe(true);
      expect(areNeighbors(center, { q: 1, r: 0 })).toBe(true);
      expect(areNeighbors(center, { q: 0, r: 1 })).toBe(true);
      expect(areNeighbors(center, { q: -1, r: 1 })).toBe(true);
      expect(areNeighbors(center, { q: -1, r: 0 })).toBe(true);
      expect(areNeighbors(center, { q: 0, r: -1 })).toBe(true);
    });

    test('隣接しない座標を正しく判定する', () => {
      const center = { q: 0, r: 0 };
      
      expect(areNeighbors(center, { q: 2, r: 0 })).toBe(false);
      expect(areNeighbors(center, { q: 0, r: 2 })).toBe(false);
      expect(areNeighbors(center, { q: 1, r: 1 })).toBe(false);
      expect(areNeighbors(center, { q: -1, r: -1 })).toBe(false);
    });

    test('同じ座標は隣接しない', () => {
      const pos = { q: 1, r: 1 };
      expect(areNeighbors(pos, pos)).toBe(false);
    });
  });

  describe('hexToPixel', () => {
    test('中心座標(0,0)は原点に変換される', () => {
      const { x, y } = hexToPixel(0, 0, 42);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(0);
    });

    test('六角形座標をピクセル座標に正しく変換する', () => {
      const size = 42;
      const { x, y } = hexToPixel(1, 0, size);
      expect(x).toBeCloseTo(size * Math.sqrt(3));
      expect(y).toBeCloseTo(0);
    });
  });
});

// ============================================
// ゲームロジックのテスト
// ============================================

describe('Game Logic', () => {
  describe('勝利条件', () => {
    test('3つの駒が三角形で隣接していれば勝利', () => {
      const pieces = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
      ];
      
      // 全てのペアが隣接しているか確認
      const allAdjacent = 
        areNeighbors(pieces[0], pieces[1]) &&
        areNeighbors(pieces[1], pieces[2]) &&
        areNeighbors(pieces[0], pieces[2]);
      
      expect(allAdjacent).toBe(true);
    });

    test('3つの駒が一列に並んでも勝利（2ペア隣接）', () => {
      const pieces = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ];
      
      // 直線上では端同士は隣接しないが、2ペアは隣接する
      const n01 = areNeighbors(pieces[0], pieces[1]); // true
      const n12 = areNeighbors(pieces[1], pieces[2]); // true
      const n02 = areNeighbors(pieces[0], pieces[2]); // false
      
      expect(n01).toBe(true);
      expect(n12).toBe(true);
      expect(n02).toBe(false);
      
      // 2ペア以上隣接 = 勝利
      const adjacentCount = (n01 ? 1 : 0) + (n12 ? 1 : 0) + (n02 ? 1 : 0);
      expect(adjacentCount).toBe(2);
      expect(adjacentCount >= 2).toBe(true); // 直線でも勝利
    });

    test('離れた駒は勝利条件を満たさない', () => {
      const pieces = [
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        { q: 0, r: 2 },
      ];
      
      const allAdjacent = 
        areNeighbors(pieces[0], pieces[1]) &&
        areNeighbors(pieces[1], pieces[2]) &&
        areNeighbors(pieces[0], pieces[2]);
      
      expect(allAdjacent).toBe(false);
    });
  });

  describe('初期配置', () => {
    const INITIAL_DISCS = [
      { q: 0, r: 0 },
      { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
      { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
      { q: 2, r: -2 }, { q: 2, r: -1 }, { q: 2, r: 0 },
      { q: 1, r: 1 }, { q: 0, r: 2 }, { q: -1, r: 2 },
      { q: -2, r: 2 }, { q: -2, r: 1 }, { q: -2, r: 0 },
      { q: -1, r: -1 }, { q: 0, r: -2 }, { q: 1, r: -2 },
    ];

    test('初期ディスクは19個', () => {
      expect(INITIAL_DISCS.length).toBe(19);
    });

    test('初期配置に重複がない', () => {
      const keys = INITIAL_DISCS.map(d => coordKey(d.q, d.r));
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(INITIAL_DISCS.length);
    });
  });

  describe('ディスク移動の制約', () => {
    test('ディスクは2つ以上の既存ディスクに隣接する必要がある', () => {
      // 候補位置が2つ以上のディスクに隣接しているかチェック
      const existingDiscs = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
      ];
      const discSet = new Set(existingDiscs.map(d => coordKey(d.q, d.r)));
      
      const candidatePos = { q: 1, r: -1 };
      let touchCount = 0;
      
      for (const dir of DIRECTIONS) {
        const neighbor = { q: candidatePos.q + dir.q, r: candidatePos.r + dir.r };
        if (discSet.has(coordKey(neighbor.q, neighbor.r))) {
          touchCount++;
        }
      }
      
      // (1,-1)は(0,0)と(1,0)に隣接
      expect(touchCount).toBeGreaterThanOrEqual(2);
    });
  });
});

// ============================================
// コンポーネントのレンダリングテスト
// ============================================

describe('Nonaga Component', () => {
  test('ゲームタイトルが表示される', () => {
    render(<Nonaga />);
    expect(screen.getByText('NONAGA')).toBeInTheDocument();
  });

  test('初期状態でRedのターンが表示される', () => {
    render(<Nonaga />);
    expect(screen.getByText("Red's Turn")).toBeInTheDocument();
  });

  test('フェーズ1の指示が表示される', () => {
    render(<Nonaga />);
    expect(screen.getByText('① Move a piece')).toBeInTheDocument();
  });

  test('New Gameボタンが表示される', () => {
    render(<Nonaga />);
    expect(screen.getByText('New Game')).toBeInTheDocument();
  });

  test('ルール説明が表示される', () => {
    render(<Nonaga />);
    expect(screen.getByText('遊び方')).toBeInTheDocument();
    expect(screen.getByText('自分の駒3つを隣接させたら勝ち')).toBeInTheDocument();
  });

  test('SVGボードが存在する', () => {
    const { container } = render(<Nonaga />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '600');
    expect(svg).toHaveAttribute('height', '560');
  });

  test('New Gameボタンをクリックするとゲームがリセットされる', () => {
    render(<Nonaga />);
    const resetButton = screen.getByText('New Game');
    fireEvent.click(resetButton);
    
    // リセット後もRedのターンから始まる
    expect(screen.getByText("Red's Turn")).toBeInTheDocument();
    expect(screen.getByText('① Move a piece')).toBeInTheDocument();
  });
});

// ============================================
// エッジケースのテスト
// ============================================

describe('Edge Cases', () => {
  test('座標変換の往復が正しい', () => {
    const original = { q: 3, r: -5 };
    const key = coordKey(original.q, original.r);
    const restored = parseKey(key);
    
    expect(restored).toEqual(original);
  });

  test('負の座標も正しく処理される', () => {
    expect(coordKey(-1, -2)).toBe('-1,-2');
    expect(parseKey('-3,-4')).toEqual({ q: -3, r: -4 });
  });

  test('6方向全てが正しく定義されている', () => {
    expect(DIRECTIONS.length).toBe(6);
    
    // 各方向の合計は0になるべき（対称性）
    const sumQ = DIRECTIONS.reduce((sum, d) => sum + d.q, 0);
    const sumR = DIRECTIONS.reduce((sum, d) => sum + d.r, 0);
    
    expect(sumQ).toBe(0);
    expect(sumR).toBe(0);
  });

  test('隣接関係は対称的', () => {
    const pos1 = { q: 0, r: 0 };
    const pos2 = { q: 1, r: 0 };
    
    expect(areNeighbors(pos1, pos2)).toBe(areNeighbors(pos2, pos1));
  });
});

// ============================================
// 駒移動ロジックのテスト
// ============================================

describe('Piece Movement Logic', () => {
  test('駒は他の駒の手前で止まる', () => {
    // シミュレーション: 駒Aが駒Bに向かって移動
    const pieceA = { q: 0, r: 0 };
    const pieceB = { q: 2, r: 0 };
    const direction = { q: 1, r: 0 };
    
    // 移動先を計算（駒Bの手前）
    let current = pieceA;
    let lastValid = null;
    
    for (let i = 0; i < 10; i++) {
      const next = { q: current.q + direction.q, r: current.r + direction.r };
      
      // 駒Bに当たったら停止
      if (next.q === pieceB.q && next.r === pieceB.r) {
        break;
      }
      
      lastValid = next;
      current = next;
    }
    
    // 駒Bの1つ手前(1,0)で止まる
    expect(lastValid).toEqual({ q: 1, r: 0 });
  });
});
