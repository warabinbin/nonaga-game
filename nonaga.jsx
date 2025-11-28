import React, { useState, useCallback, useMemo } from 'react';

// Axial coordinate system for hexagonal grid
const INITIAL_DISCS = [
  // Center
  { q: 0, r: 0 },
  // Ring 1
  { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
  { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
  // Ring 2
  { q: 2, r: -2 }, { q: 2, r: -1 }, { q: 2, r: 0 },
  { q: 1, r: 1 }, { q: 0, r: 2 }, { q: -1, r: 2 },
  { q: -2, r: 2 }, { q: -2, r: 1 }, { q: -2, r: 0 },
  { q: -1, r: -1 }, { q: 0, r: -2 }, { q: 1, r: -2 },
];

// Initial piece positions (alternating vertices of hexagon)
const INITIAL_PIECES = {
  red: [
    { q: 2, r: -2 },
    { q: -1, r: 2 },
    { q: -1, r: -1 },
  ],
  black: [
    { q: 2, r: 0 },
    { q: -2, r: 2 },
    { q: 0, r: -2 },
  ],
};

// 6 directions in axial coordinates
const DIRECTIONS = [
  { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
  { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
];

const coordKey = (q, r) => `${q},${r}`;
const parseKey = (key) => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

const hexToPixel = (q, r, size) => {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
};

const areNeighbors = (pos1, pos2) => {
  const dq = pos1.q - pos2.q;
  const dr = pos1.r - pos2.r;
  return DIRECTIONS.some(d => d.q === dq && d.r === dr);
};

export default function Nonaga({ 
  initialPieces = INITIAL_PIECES,
  initialDiscs = INITIAL_DISCS,
  initialPlayer = 'red'
}) {
  const [discs, setDiscs] = useState(initialDiscs);
  const [pieces, setPieces] = useState(initialPieces);
  const [currentPlayer, setCurrentPlayer] = useState(initialPlayer);
  const [phase, setPhase] = useState('movePiece'); // 'movePiece' or 'moveDisc'
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [selectedDisc, setSelectedDisc] = useState(null);
  const [lastMovedDisc, setLastMovedDisc] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [winner, setWinner] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);

  const discSet = useMemo(() => {
    return new Set(discs.map(d => coordKey(d.q, d.r)));
  }, [discs]);

  const pieceMap = useMemo(() => {
    const map = {};
    pieces.red.forEach(p => { map[coordKey(p.q, p.r)] = 'red'; });
    pieces.black.forEach(p => { map[coordKey(p.q, p.r)] = 'black'; });
    return map;
  }, [pieces]);

  // Check if all three pieces are connected (line, triangle, or V-shape)
  const checkWin = useCallback((playerPieces) => {
    if (playerPieces.length !== 3) return false;
    const [p1, p2, p3] = playerPieces;
    
    // Count adjacent pairs
    const n12 = areNeighbors(p1, p2);
    const n23 = areNeighbors(p2, p3);
    const n13 = areNeighbors(p1, p3);
    
    // Win if at least 2 pairs are adjacent (forms connected group)
    // - Triangle: all 3 pairs adjacent
    // - V-shape: exactly 2 pairs adjacent  
    // - Line: exactly 2 pairs adjacent (middle piece connects the ends)
    const adjacentCount = (n12 ? 1 : 0) + (n23 ? 1 : 0) + (n13 ? 1 : 0);
    return adjacentCount >= 2;
  }, []);

  // Get valid moves for a piece (slide until hitting edge or another piece)
  const getValidPieceMoves = useCallback((piecePos) => {
    const moves = [];
    
    for (const dir of DIRECTIONS) {
      let current = { q: piecePos.q, r: piecePos.r };
      let lastValid = null;
      
      while (true) {
        const next = { q: current.q + dir.q, r: current.r + dir.r };
        const nextKey = coordKey(next.q, next.r);
        
        // Check if there's a disc at the next position
        if (!discSet.has(nextKey)) {
          break; // Fell off the board
        }
        
        // Check if there's a piece at the next position
        if (pieceMap[nextKey]) {
          break; // Hit another piece
        }
        
        lastValid = next;
        current = next;
      }
      
      if (lastValid && (lastValid.q !== piecePos.q || lastValid.r !== piecePos.r)) {
        moves.push(lastValid);
      }
    }
    
    return moves;
  }, [discSet, pieceMap]);

  // Check if a disc is on the edge (has at least one empty neighbor slot)
  const isEdgeDisc = useCallback((discPos) => {
    for (const dir of DIRECTIONS) {
      const neighbor = { q: discPos.q + dir.q, r: discPos.r + dir.r };
      if (!discSet.has(coordKey(neighbor.q, neighbor.r))) {
        return true;
      }
    }
    return false;
  }, [discSet]);

  // Get valid positions to place a disc (must touch at least 2 existing discs)
  const getValidDiscPlacements = useCallback((excludeDisc) => {
    const placements = [];
    const tempDiscs = discs.filter(d => 
      d.q !== excludeDisc.q || d.r !== excludeDisc.r
    );
    const tempDiscSet = new Set(tempDiscs.map(d => coordKey(d.q, d.r)));
    
    // Find all positions adjacent to current discs
    const candidates = new Set();
    for (const disc of tempDiscs) {
      for (const dir of DIRECTIONS) {
        const neighbor = { q: disc.q + dir.q, r: disc.r + dir.r };
        const key = coordKey(neighbor.q, neighbor.r);
        if (!tempDiscSet.has(key)) {
          candidates.add(key);
        }
      }
    }
    
    // Filter to positions touching at least 2 discs
    for (const key of candidates) {
      const pos = parseKey(key);
      let touchCount = 0;
      for (const dir of DIRECTIONS) {
        const neighbor = { q: pos.q + dir.q, r: pos.r + dir.r };
        if (tempDiscSet.has(coordKey(neighbor.q, neighbor.r))) {
          touchCount++;
        }
      }
      if (touchCount >= 2) {
        placements.push(pos);
      }
    }
    
    return placements;
  }, [discs]);

  // Check if removing a disc would disconnect the board
  const wouldDisconnectBoard = useCallback((discToRemove) => {
    const tempDiscs = discs.filter(d => 
      d.q !== discToRemove.q || d.r !== discToRemove.r
    );
    
    if (tempDiscs.length === 0) return true;
    
    // BFS to check connectivity
    const visited = new Set();
    const queue = [tempDiscs[0]];
    visited.add(coordKey(tempDiscs[0].q, tempDiscs[0].r));
    
    while (queue.length > 0) {
      const current = queue.shift();
      for (const dir of DIRECTIONS) {
        const neighbor = { q: current.q + dir.q, r: current.r + dir.r };
        const key = coordKey(neighbor.q, neighbor.r);
        if (!visited.has(key) && tempDiscs.some(d => d.q === neighbor.q && d.r === neighbor.r)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }
    
    return visited.size !== tempDiscs.length;
  }, [discs]);

  const handleDiscClick = (disc) => {
    if (winner) return;
    
    const key = coordKey(disc.q, disc.r);
    const pieceOnDisc = pieceMap[key];
    const isExistingDisc = discSet.has(key);
    
    if (phase === 'movePiece') {
      // Select own piece
      if (pieceOnDisc === currentPlayer) {
        setSelectedPiece(disc);
        setValidMoves(getValidPieceMoves(disc));
      } else if (selectedPiece && !pieceOnDisc) {
        // Try to move to this disc
        const isValidMove = validMoves.some(m => m.q === disc.q && m.r === disc.r);
        if (isValidMove) {
          // Move the piece
          const newPieces = { ...pieces };
          newPieces[currentPlayer] = newPieces[currentPlayer].map(p => 
            p.q === selectedPiece.q && p.r === selectedPiece.r 
              ? { q: disc.q, r: disc.r } 
              : p
          );
          setPieces(newPieces);
          setSelectedPiece(null);
          setValidMoves([]);
          
          // Check for win
          if (checkWin(newPieces[currentPlayer])) {
            setWinner(currentPlayer);
            return;
          }
          
          setPhase('moveDisc');
        }
      }
    } else if (phase === 'moveDisc') {
      // First check if this is a valid placement for the selected disc
      if (selectedDisc) {
        const isValidPlacement = validMoves.some(m => m.q === disc.q && m.r === disc.r);
        if (isValidPlacement) {
          const newDiscs = discs.filter(d => 
            d.q !== selectedDisc.q || d.r !== selectedDisc.r
          );
          newDiscs.push({ q: disc.q, r: disc.r });
          setDiscs(newDiscs);
          setLastMovedDisc({ q: disc.q, r: disc.r });
          setSelectedDisc(null);
          setValidMoves([]);
          setPhase('movePiece');
          setCurrentPlayer(currentPlayer === 'red' ? 'black' : 'red');
          setMoveHistory([...moveHistory, { player: currentPlayer }]);
          return;
        }
      }
      
      // Select a disc to move (must be existing disc, edge, empty, not the last moved disc)
      if (isExistingDisc && !pieceOnDisc && isEdgeDisc(disc) && 
          (!lastMovedDisc || disc.q !== lastMovedDisc.q || disc.r !== lastMovedDisc.r) &&
          !wouldDisconnectBoard(disc)) {
        setSelectedDisc(disc);
        setValidMoves(getValidDiscPlacements(disc));
      }
    }
  };

  const resetGame = () => {
    setDiscs(INITIAL_DISCS);
    setPieces(INITIAL_PIECES);
    setCurrentPlayer('red');
    setPhase('movePiece');
    setSelectedPiece(null);
    setSelectedDisc(null);
    setLastMovedDisc(null);
    setValidMoves([]);
    setWinner(null);
    setMoveHistory([]);
  };

  const HEX_SIZE = 42;
  const CENTER_X = 300;
  const CENTER_Y = 280;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: '"Playfair Display", Georgia, serif',
      color: '#e8e8e8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '700',
          letterSpacing: '0.3em',
          margin: 0,
          background: 'linear-gradient(135deg, #e8d5b7 0%, #f5e6d3 50%, #d4a574 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 40px rgba(232, 213, 183, 0.3)',
        }}>
          NONAGA
        </h1>
        <p style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '0.75rem',
          letterSpacing: '0.4em',
          color: '#8892b0',
          marginTop: '8px',
        }}>
          ABSTRACT STRATEGY GAME
        </p>
      </div>

      {/* Game Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '20px',
        padding: '16px 32px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {winner ? (
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: winner === 'red' ? '#e74c3c' : '#2c3e50',
          }}>
            🏆 {winner === 'red' ? 'Red' : 'Black'} wins!
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: currentPlayer === 'red' 
                  ? 'radial-gradient(circle at 30% 30%, #ff6b6b, #c0392b)'
                  : 'radial-gradient(circle at 30% 30%, #5a6c7d, #2c3e50)',
                boxShadow: `0 4px 15px ${currentPlayer === 'red' ? 'rgba(231, 76, 60, 0.5)' : 'rgba(44, 62, 80, 0.5)'}`,
              }} />
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '500',
              }}>
                {currentPlayer === 'red' ? 'Red' : 'Black'}'s Turn
              </span>
            </div>
            <div style={{
              height: '24px',
              width: '1px',
              background: 'rgba(255, 255, 255, 0.2)',
            }} />
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '0.85rem',
              color: '#8892b0',
            }}>
              {phase === 'movePiece' ? '① Move a piece' : '② Move a disc'}
            </div>
          </>
        )}
      </div>

      {/* Game Board */}
      <div style={{
        position: 'relative',
        marginBottom: '24px',
      }}>
        <svg width="600" height="560" style={{
          filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4))',
        }}>
          {/* Background glow */}
          <defs>
            <radialGradient id="boardGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(100, 150, 200, 0.1)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx={CENTER_X} cy={CENTER_Y} r="250" fill="url(#boardGlow)" />
          
          {/* Valid move indicators */}
          {validMoves.map((move, idx) => {
            const { x, y } = hexToPixel(move.q, move.r, HEX_SIZE);
            return (
              <circle
                key={`valid-${idx}`}
                cx={CENTER_X + x}
                cy={CENTER_Y + y}
                r={HEX_SIZE - 4}
                fill="rgba(46, 204, 113, 0.2)"
                stroke="#2ecc71"
                strokeWidth="2"
                strokeDasharray="8 4"
                style={{
                  animation: 'pulse 1.5s ease-in-out infinite',
                  cursor: 'pointer',
                }}
                onClick={() => handleDiscClick(move)}
              />
            );
          })}
          
          {/* Discs */}
          {discs.map((disc, idx) => {
            const { x, y } = hexToPixel(disc.q, disc.r, HEX_SIZE);
            const key = coordKey(disc.q, disc.r);
            const piece = pieceMap[key];
            const isSelected = selectedPiece && selectedPiece.q === disc.q && selectedPiece.r === disc.r;
            const isSelectedDisc = selectedDisc && selectedDisc.q === disc.q && selectedDisc.r === disc.r;
            const isLastMoved = lastMovedDisc && lastMovedDisc.q === disc.q && lastMovedDisc.r === disc.r;
            const canSelectDisc = phase === 'moveDisc' && !piece && isEdgeDisc(disc) && 
              (!lastMovedDisc || disc.q !== lastMovedDisc.q || disc.r !== lastMovedDisc.r) &&
              !wouldDisconnectBoard(disc);
            
            return (
              <g key={`disc-${idx}`} 
                 onClick={() => handleDiscClick(disc)}
                 style={{ cursor: winner ? 'default' : 'pointer' }}>
                {/* Disc shadow */}
                <ellipse
                  cx={CENTER_X + x}
                  cy={CENTER_Y + y + 4}
                  rx={HEX_SIZE - 6}
                  ry={HEX_SIZE - 10}
                  fill="rgba(0, 0, 0, 0.3)"
                />
                {/* Disc */}
                <circle
                  cx={CENTER_X + x}
                  cy={CENTER_Y + y}
                  r={HEX_SIZE - 4}
                  fill={isSelectedDisc 
                    ? 'linear-gradient(145deg, #4a6fa5, #3d5a80)'
                    : isLastMoved 
                      ? 'linear-gradient(145deg, #3d5a80, #2c4a6e)'
                      : 'linear-gradient(145deg, #d4c4a8, #c4b498)'}
                  stroke={isSelectedDisc ? '#6ea8fe' : canSelectDisc ? '#5dade2' : 'rgba(0,0,0,0.2)'}
                  strokeWidth={isSelectedDisc || canSelectDisc ? 3 : 1}
                  style={{
                    transition: 'all 0.2s ease',
                  }}
                />
                {/* Wood grain effect */}
                <circle
                  cx={CENTER_X + x}
                  cy={CENTER_Y + y}
                  r={HEX_SIZE - 8}
                  fill="none"
                  stroke={isSelectedDisc || isLastMoved ? 'rgba(255,255,255,0.1)' : 'rgba(139, 119, 101, 0.2)'}
                  strokeWidth="1"
                />
                
                {/* Piece on disc */}
                {piece && (
                  <g>
                    {/* Piece shadow */}
                    <ellipse
                      cx={CENTER_X + x}
                      cy={CENTER_Y + y + 3}
                      rx={22}
                      ry={16}
                      fill="rgba(0, 0, 0, 0.4)"
                    />
                    {/* Piece */}
                    <circle
                      cx={CENTER_X + x}
                      cy={CENTER_Y + y}
                      r={20}
                      fill={piece === 'red' 
                        ? 'url(#redPiece)' 
                        : 'url(#blackPiece)'}
                      stroke={isSelected ? '#f1c40f' : 'rgba(0,0,0,0.3)'}
                      strokeWidth={isSelected ? 4 : 2}
                      filter={isSelected ? 'url(#glow)' : ''}
                      style={{
                        transition: 'all 0.2s ease',
                      }}
                    />
                    {/* Piece highlight */}
                    <ellipse
                      cx={CENTER_X + x - 5}
                      cy={CENTER_Y + y - 6}
                      rx={8}
                      ry={5}
                      fill="rgba(255, 255, 255, 0.3)"
                    />
                  </g>
                )}
              </g>
            );
          })}
          
          {/* Gradients for pieces */}
          <defs>
            <radialGradient id="redPiece" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#ff6b6b" />
              <stop offset="70%" stopColor="#c0392b" />
              <stop offset="100%" stopColor="#922b21" />
            </radialGradient>
            <radialGradient id="blackPiece" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#5a6c7d" />
              <stop offset="70%" stopColor="#2c3e50" />
              <stop offset="100%" stopColor="#1a252f" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Instructions & Controls */}
      <div style={{
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '700px',
      }}>
        {/* Reset Button */}
        <button
          onClick={resetGame}
          style={{
            padding: '14px 36px',
            fontSize: '1rem',
            fontFamily: '"Playfair Display", serif',
            fontWeight: '600',
            letterSpacing: '0.15em',
            color: '#e8e8e8',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(5px)',
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          New Game
        </button>

        {/* Rules */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          maxWidth: '400px',
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '0.9rem',
            letterSpacing: '0.2em',
            color: '#d4a574',
            fontWeight: '600',
          }}>
            遊び方
          </h3>
          <ul style={{
            margin: 0,
            padding: '0 0 0 18px',
            fontSize: '0.85rem',
            lineHeight: '1.7',
            color: '#a8b2c1',
          }}>
            <li>自分の駒3つを隣接させたら勝ち</li>
            <li>① 駒を直線移動（端か他の駒に当たるまで）</li>
            <li>② 外周の空きディスクを別の場所へ移動（2つ以上のディスクに隣接する場所）</li>
            <li>相手が直前に動かしたディスクは動かせない</li>
          </ul>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
        
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
