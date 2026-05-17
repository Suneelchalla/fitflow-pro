// ════════════════════════════════════════════════════════════════════
// PER-SPORT BACKGROUND ART for the shareable activity card
//
// Each sport has its own SVG scene built from reusable elements
// (motion lines, scattered balls, court lines, equipment silhouettes,
// etc.). The viewBox is 360×640 — the same 9:16 ratio as the on-screen
// card — so the art scales pixel-perfect to the 1080×1920 PNG export.
//
// Exposed as window.FF.getActivityBackground(activityId) returning an
// SVG-as-string ready to inject into the card's innerHTML. Sport id
// missing → falls back to a generic motion-line + scatter scene.
// ════════════════════════════════════════════════════════════════════

(function () {
  var W = 360, H = 640;

  // ── Reusable scene elements ─────────────────────────────────────
  function svgOpen() {
    return '<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" ' +
      'viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice">';
  }

  function motionLines() {
    return '<g opacity="0.08" stroke="white" fill="none" stroke-linecap="round">' +
      '<line x1="-30" y1="180" x2="400" y2="60"  stroke-width="1.4"/>' +
      '<line x1="-30" y1="240" x2="400" y2="120" stroke-width="1"/>' +
      '<line x1="-30" y1="320" x2="400" y2="200" stroke-width="1.4"/>' +
      '<line x1="-30" y1="420" x2="400" y2="300" stroke-width="1"/>' +
      '<line x1="-30" y1="500" x2="400" y2="380" stroke-width="1.4"/>' +
    '</g>';
  }

  function textureDots(opacity) {
    opacity = opacity || 0.12;
    var dots = '<g opacity="' + opacity + '" fill="white">';
    var coords = [[320,100],[335,130],[305,140],[345,160],[315,175],[330,200],[300,210],[340,230],
                  [325,250],[310,275],[345,290],[320,310]];
    for (var i = 0; i < coords.length; i++) {
      dots += '<circle cx="' + coords[i][0] + '" cy="' + coords[i][1] + '" r="1.2"/>';
    }
    return dots + '</g>';
  }

  // Scattered circles, configurable color/positions
  function scatteredBalls(color, sizes) {
    // sizes default: a mix of large+medium+small
    var defaults = [
      { x:45,  y:280, r:10, op:0.65 },
      { x:280, y:345, r:6,  op:0.55 },
      { x:55,  y:470, r:11, op:0.65 },
      { x:115, y:540, r:7,  op:0.60 },
      { x:290, y:515, r:8,  op:0.55 },
    ];
    sizes = sizes || defaults;
    var s = '';
    for (var i = 0; i < sizes.length; i++) {
      s += '<circle cx="' + sizes[i].x + '" cy="' + sizes[i].y + '" r="' + sizes[i].r +
        '" fill="' + color + '" opacity="' + sizes[i].op + '"/>';
    }
    return s;
  }

  // ── PER-SPORT SCENE FUNCTIONS ───────────────────────────────────

  // 1. Badminton — shuttlecocks scattered + court lines
  function badminton() {
    function shuttle(x, y, scale, rot) {
      // Cone + feather strokes + base ring
      return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ') scale(' + scale + ')" ' +
             'opacity="0.55">' +
        '<path d="M 0 -12 L 8 8 L -8 8 Z" fill="white" opacity="0.85"/>' +
        '<path d="M -8 8 L -10 18 M -3 8 L -3 20 M 3 8 L 3 20 M 8 8 L 10 18" ' +
              'stroke="white" stroke-width="1.2" fill="none" opacity="0.7"/>' +
        '<circle cx="0" cy="-12" r="3" fill="rgba(255,255,255,0.35)"/>' +
      '</g>';
    }
    return svgOpen() + motionLines() + textureDots(0.08) +
      // Court boundary (top-down view, perspective tilt)
      '<g opacity="0.18" stroke="white" stroke-width="1" fill="none">' +
        '<polygon points="60,420 300,420 320,580 40,580"/>' +
        '<line x1="180" y1="420" x2="180" y2="580"/>' +
      '</g>' +
      shuttle(60, 220, 1.6, -25) +
      shuttle(290, 320, 1.2, 18) +
      shuttle(80, 470, 1.4, -10) +
      shuttle(280, 510, 1.0, 22) +
    '</svg>';
  }

  // 2. Table Tennis — table in perspective + net + scattered white balls
  function table_tennis() {
    return svgOpen() + motionLines() + textureDots() +
      scatteredBalls('white') +
      // Table in lower-right perspective
      '<g transform="translate(170,455)">' +
        '<polygon points="0,40 170,20 215,80 30,100" ' +
                'fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>' +
        // Center net
        '<line x1="92" y1="30" x2="108" y2="65" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>' +
        // Legs
        '<line x1="30"  y1="100" x2="36"  y2="140" stroke="rgba(255,255,255,0.20)" stroke-width="1"/>' +
        '<line x1="215" y1="80"  x2="222" y2="120" stroke="rgba(255,255,255,0.20)" stroke-width="1"/>' +
      '</g>' +
    '</svg>';
  }

  // 3. Tennis — court lines + tennis balls + racquet outline
  function tennis() {
    return svgOpen() + motionLines() + textureDots() +
      // Court lines (perspective tilt)
      '<g opacity="0.18" stroke="white" stroke-width="1" fill="none">' +
        '<polygon points="50,400 310,400 335,600 25,600"/>' +
        '<line x1="180" y1="400" x2="180" y2="600"/>' +
        '<line x1="50"  y1="500" x2="310" y2="500"/>' +
      '</g>' +
      // Tennis balls (yellow-green)
      '<g fill="#dbeb4a">' +
        '<circle cx="55"  cy="260" r="9"  opacity="0.55"/>' +
        '<circle cx="295" cy="320" r="7"  opacity="0.50"/>' +
        '<circle cx="80"  cy="540" r="10" opacity="0.55"/>' +
        '<circle cx="275" cy="555" r="8"  opacity="0.50"/>' +
        // ball "seam"
        '<path d="M 47 254 Q 55 264 63 256" stroke="white" stroke-width="0.6" fill="none" opacity="0.4"/>' +
        '<path d="M 72 538 Q 80 548 88 540" stroke="white" stroke-width="0.6" fill="none" opacity="0.4"/>' +
      '</g>' +
      // Racquet silhouette (top-left)
      '<g transform="translate(35,180) rotate(-25)" opacity="0.16" stroke="white" fill="none">' +
        '<ellipse cx="0" cy="0" rx="22" ry="28" stroke-width="2"/>' +
        // Strings grid
        '<line x1="-22" y1="-8"  x2="22" y2="-8"  stroke-width="0.5"/>' +
        '<line x1="-22" y1="0"   x2="22" y2="0"   stroke-width="0.5"/>' +
        '<line x1="-22" y1="8"   x2="22" y2="8"   stroke-width="0.5"/>' +
        '<line x1="-10" y1="-25" x2="-10" y2="25" stroke-width="0.5"/>' +
        '<line x1="0"   y1="-28" x2="0"   y2="28" stroke-width="0.5"/>' +
        '<line x1="10"  y1="-25" x2="10"  y2="25" stroke-width="0.5"/>' +
        // Handle
        '<line x1="0" y1="28" x2="0" y2="52" stroke-width="3"/>' +
      '</g>' +
    '</svg>';
  }

  // 4. Pickleball — paddle silhouettes + balls + court grid
  function pickleball() {
    function paddle(x, y, rot, opacity) {
      return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ')" ' +
             'opacity="' + opacity + '" fill="none" stroke="white" stroke-width="1.5">' +
        '<rect x="-18" y="-22" width="36" height="44" rx="6"/>' +
        // Perforation dots
        '<g fill="white" opacity="0.5">' +
          '<circle cx="-8" cy="-10" r="1"/><circle cx="0" cy="-10" r="1"/><circle cx="8" cy="-10" r="1"/>' +
          '<circle cx="-8" cy="0" r="1"/><circle cx="0" cy="0" r="1"/><circle cx="8" cy="0" r="1"/>' +
          '<circle cx="-8" cy="10" r="1"/><circle cx="0" cy="10" r="1"/><circle cx="8" cy="10" r="1"/>' +
        '</g>' +
        // Handle
        '<line x1="0" y1="22" x2="0" y2="40" stroke-width="3"/>' +
      '</g>';
    }
    return svgOpen() + motionLines() + textureDots(0.08) +
      // Court boundary
      '<g opacity="0.16" stroke="white" stroke-width="1" fill="none">' +
        '<polygon points="55,430 305,430 325,590 35,590"/>' +
        '<line x1="180" y1="430" x2="180" y2="590"/>' +
      '</g>' +
      paddle(70, 240, -22, 0.22) +
      paddle(295, 320, 18, 0.20) +
      // Ball
      '<circle cx="180" cy="500" r="8" fill="#f5d340" opacity="0.55"/>' +
      '<g opacity="0.4" fill="white">' +
        '<circle cx="176" cy="497" r="0.8"/><circle cx="184" cy="498" r="0.8"/>' +
        '<circle cx="178" cy="503" r="0.8"/>' +
      '</g>' +
    '</svg>';
  }

  // 5. Squash — back wall service box lines + ball
  function squash() {
    return svgOpen() + motionLines() + textureDots() +
      // Back wall with service box & tin
      '<g opacity="0.20" stroke="white" stroke-width="1.5" fill="none">' +
        '<rect x="40" y="180" width="280" height="380"/>' +
        // Service line
        '<line x1="40" y1="320" x2="320" y2="320"/>' +
        // Service boxes
        '<rect x="40"  y="430" width="80" height="80"/>' +
        '<rect x="240" y="430" width="80" height="80"/>' +
        // Tin (bottom red line)
        '<line x1="40" y1="540" x2="320" y2="540" stroke="rgba(255,200,200,0.5)" stroke-width="3"/>' +
      '</g>' +
      // Small black squash ball
      '<circle cx="180" cy="380" r="7" fill="rgba(0,0,0,0.45)"/>' +
      '<circle cx="178" cy="378" r="2" fill="white" opacity="0.3"/>' +
      // Motion trail
      '<path d="M 280 280 Q 230 320 185 375" stroke="white" stroke-width="1" fill="none" opacity="0.20" stroke-dasharray="3,3"/>' +
    '</svg>';
  }

  // 6. Cricket — stumps + ball + bat outline
  function cricket() {
    return svgOpen() + motionLines() + textureDots() +
      // Pitch (perspective rectangle)
      '<g opacity="0.16" stroke="white" stroke-width="1" fill="none">' +
        '<polygon points="140,400 220,400 240,600 120,600"/>' +
        '<line x1="180" y1="420" x2="180" y2="580" stroke-dasharray="4,4"/>' +
      '</g>' +
      // Stumps (top area)
      '<g opacity="0.85">' +
        '<line x1="160" y1="220" x2="160" y2="280" stroke="white" stroke-width="2.5" opacity="0.40"/>' +
        '<line x1="170" y1="220" x2="170" y2="280" stroke="white" stroke-width="2.5" opacity="0.40"/>' +
        '<line x1="180" y1="220" x2="180" y2="280" stroke="white" stroke-width="2.5" opacity="0.40"/>' +
        // Bails
        '<rect x="158" y="218" width="14" height="2" fill="white" opacity="0.35"/>' +
        '<rect x="168" y="218" width="14" height="2" fill="white" opacity="0.35"/>' +
      '</g>' +
      // Cricket ball
      '<circle cx="80" cy="450" r="14" fill="#a83a2a" opacity="0.6"/>' +
      '<path d="M 66 450 Q 80 462 94 450" stroke="white" stroke-width="0.8" fill="none" opacity="0.5"/>' +
      '<path d="M 66 450 Q 80 438 94 450" stroke="white" stroke-width="0.8" fill="none" opacity="0.5"/>' +
      // Bat (right side)
      '<g transform="translate(290,500) rotate(-30)" opacity="0.30">' +
        '<rect x="-12" y="-40" width="24" height="65" rx="3" fill="rgba(220,180,120,0.45)"/>' +
        '<rect x="-3" y="-60" width="6" height="22" fill="rgba(120,80,40,0.55)"/>' +
      '</g>' +
    '</svg>';
  }

  // 7. Football (soccer) — goal silhouette + balls + grass
  function football() {
    function soccerBall(x, y, r, opacity) {
      return '<g transform="translate(' + x + ',' + y + ')" opacity="' + opacity + '">' +
        '<circle cx="0" cy="0" r="' + r + '" fill="white"/>' +
        '<polygon points="0,-' + (r*0.5) + ' ' + (r*0.45) + ',-' + (r*0.15) + ' ' + (r*0.28) + ',' + (r*0.4) + ' -' + (r*0.28) + ',' + (r*0.4) + ' -' + (r*0.45) + ',-' + (r*0.15) + '" fill="rgba(0,0,0,0.55)"/>' +
      '</g>';
    }
    return svgOpen() + motionLines() + textureDots(0.08) +
      // Grass texture (horizontal stripes alt opacity)
      '<g opacity="0.06" fill="white">' +
        '<rect x="0" y="460" width="360" height="40"/>' +
        '<rect x="0" y="540" width="360" height="40"/>' +
      '</g>' +
      // Goal silhouette
      '<g opacity="0.22" stroke="white" stroke-width="2" fill="none">' +
        '<rect x="80" y="200" width="200" height="100"/>' +
        // Net pattern
        '<line x1="100" y1="200" x2="100" y2="300" stroke-width="0.5"/>' +
        '<line x1="140" y1="200" x2="140" y2="300" stroke-width="0.5"/>' +
        '<line x1="180" y1="200" x2="180" y2="300" stroke-width="0.5"/>' +
        '<line x1="220" y1="200" x2="220" y2="300" stroke-width="0.5"/>' +
        '<line x1="260" y1="200" x2="260" y2="300" stroke-width="0.5"/>' +
        '<line x1="80" y1="230" x2="280" y2="230" stroke-width="0.5"/>' +
        '<line x1="80" y1="265" x2="280" y2="265" stroke-width="0.5"/>' +
      '</g>' +
      // Penalty arc
      '<path d="M 90 380 Q 180 340 270 380" stroke="white" stroke-width="1" fill="none" opacity="0.18"/>' +
      soccerBall(60, 480, 14, 0.55) +
      soccerBall(290, 540, 10, 0.50) +
      soccerBall(150, 580, 8, 0.45) +
    '</svg>';
  }

  // 8. Volleyball — net + volleyballs
  function volleyball() {
    function vball(x, y, r, opacity) {
      return '<g transform="translate(' + x + ',' + y + ')" opacity="' + opacity + '">' +
        '<circle cx="0" cy="0" r="' + r + '" fill="white"/>' +
        // Curved seams
        '<path d="M -' + r + ' 0 Q 0 -' + (r*0.6) + ' ' + r + ' 0" stroke="rgba(0,0,0,0.4)" stroke-width="1" fill="none"/>' +
        '<path d="M -' + (r*0.7) + ' -' + (r*0.7) + ' Q 0 ' + (r*0.2) + ' ' + (r*0.7) + ' -' + (r*0.7) + '" stroke="rgba(0,0,0,0.4)" stroke-width="1" fill="none"/>' +
        '<path d="M 0 -' + r + ' Q ' + (r*0.6) + ' 0 0 ' + r + '" stroke="rgba(0,0,0,0.4)" stroke-width="1" fill="none"/>' +
      '</g>';
    }
    return svgOpen() + motionLines() + textureDots() +
      // Net (horizontal band with vertical lines)
      '<g opacity="0.25" stroke="white" stroke-width="1" fill="none">' +
        '<line x1="20" y1="290" x2="340" y2="290" stroke-width="2"/>' +
        '<line x1="20" y1="330" x2="340" y2="330" stroke-width="2"/>' +
        '<line x1="40"  y1="290" x2="40"  y2="330" stroke-width="0.5"/>' +
        '<line x1="80"  y1="290" x2="80"  y2="330" stroke-width="0.5"/>' +
        '<line x1="120" y1="290" x2="120" y2="330" stroke-width="0.5"/>' +
        '<line x1="160" y1="290" x2="160" y2="330" stroke-width="0.5"/>' +
        '<line x1="200" y1="290" x2="200" y2="330" stroke-width="0.5"/>' +
        '<line x1="240" y1="290" x2="240" y2="330" stroke-width="0.5"/>' +
        '<line x1="280" y1="290" x2="280" y2="330" stroke-width="0.5"/>' +
        '<line x1="320" y1="290" x2="320" y2="330" stroke-width="0.5"/>' +
        // Net pole
        '<line x1="30" y1="270" x2="30" y2="450" stroke-width="2"/>' +
        '<line x1="330" y1="270" x2="330" y2="450" stroke-width="2"/>' +
      '</g>' +
      vball(80, 200, 16, 0.55) +
      vball(280, 240, 12, 0.50) +
      vball(120, 500, 14, 0.50) +
    '</svg>';
  }

  // 9. Basketball — hoop + 3-point arc + ball
  function basketball() {
    return svgOpen() + motionLines() + textureDots() +
      // 3-point arc
      '<path d="M 30 580 Q 180 380 330 580" stroke="white" stroke-width="1.5" fill="none" opacity="0.20"/>' +
      // Free throw line
      '<line x1="100" y1="460" x2="260" y2="460" stroke="white" stroke-width="1" opacity="0.18"/>' +
      // Hoop (top center)
      '<g opacity="0.30">' +
        '<rect x="140" y="180" width="80" height="50" stroke="white" stroke-width="1.5" fill="none"/>' +
        '<rect x="160" y="200" width="40" height="22" stroke="white" stroke-width="1" fill="none"/>' +
        // Rim
        '<ellipse cx="180" cy="245" rx="22" ry="4" stroke="#ff6020" stroke-width="2" fill="none" opacity="0.7"/>' +
        // Net hint
        '<line x1="160" y1="246" x2="170" y2="275" stroke="white" stroke-width="0.7"/>' +
        '<line x1="170" y1="246" x2="175" y2="278" stroke="white" stroke-width="0.7"/>' +
        '<line x1="180" y1="246" x2="180" y2="280" stroke="white" stroke-width="0.7"/>' +
        '<line x1="190" y1="246" x2="185" y2="278" stroke="white" stroke-width="0.7"/>' +
        '<line x1="200" y1="246" x2="190" y2="275" stroke="white" stroke-width="0.7"/>' +
      '</g>' +
      // Basketball
      '<g transform="translate(80, 400)" opacity="0.6">' +
        '<circle cx="0" cy="0" r="22" fill="#d4691e"/>' +
        '<line x1="-22" y1="0" x2="22" y2="0" stroke="rgba(0,0,0,0.4)" stroke-width="1.2"/>' +
        '<line x1="0" y1="-22" x2="0" y2="22" stroke="rgba(0,0,0,0.4)" stroke-width="1.2"/>' +
        '<path d="M -15 -16 Q 0 0 -15 16" stroke="rgba(0,0,0,0.4)" stroke-width="1.2" fill="none"/>' +
        '<path d="M 15 -16 Q 0 0 15 16" stroke="rgba(0,0,0,0.4)" stroke-width="1.2" fill="none"/>' +
      '</g>' +
      '<g transform="translate(290, 510)" opacity="0.45">' +
        '<circle cx="0" cy="0" r="14" fill="#d4691e"/>' +
        '<line x1="-14" y1="0" x2="14" y2="0" stroke="rgba(0,0,0,0.4)" stroke-width="0.8"/>' +
        '<line x1="0" y1="-14" x2="0" y2="14" stroke="rgba(0,0,0,0.4)" stroke-width="0.8"/>' +
      '</g>' +
    '</svg>';
  }

  // 10. Yoga — mandala + lotus petals
  function yoga() {
    return svgOpen() +
      // Concentric mandala circles
      '<g fill="none" stroke="white" opacity="0.12">' +
        '<circle cx="180" cy="380" r="140" stroke-width="0.8"/>' +
        '<circle cx="180" cy="380" r="110" stroke-width="0.8"/>' +
        '<circle cx="180" cy="380" r="80"  stroke-width="0.8"/>' +
        '<circle cx="180" cy="380" r="50"  stroke-width="0.8"/>' +
      '</g>' +
      // 8 petals (lotus)
      '<g fill="white" opacity="0.10" transform="translate(180,380)">' +
        '<ellipse cx="0" cy="-80" rx="14" ry="38"/>' +
        '<ellipse cx="0" cy="80" rx="14" ry="38"/>' +
        '<ellipse cx="-80" cy="0" rx="38" ry="14"/>' +
        '<ellipse cx="80" cy="0" rx="38" ry="14"/>' +
        '<ellipse cx="-56" cy="-56" rx="14" ry="38" transform="rotate(45 -56 -56)"/>' +
        '<ellipse cx="56" cy="-56" rx="14" ry="38" transform="rotate(-45 56 -56)"/>' +
        '<ellipse cx="-56" cy="56" rx="14" ry="38" transform="rotate(-45 -56 56)"/>' +
        '<ellipse cx="56" cy="56" rx="14" ry="38" transform="rotate(45 56 56)"/>' +
      '</g>' +
      // Center dot
      '<circle cx="180" cy="380" r="8" fill="white" opacity="0.20"/>' +
      // Soft glow particles
      '<g fill="white" opacity="0.40">' +
        '<circle cx="60"  cy="180" r="2"/>' +
        '<circle cx="300" cy="220" r="1.5"/>' +
        '<circle cx="40"  cy="540" r="2"/>' +
        '<circle cx="320" cy="560" r="1.5"/>' +
      '</g>' +
    '</svg>';
  }

  // 11. Dance — music notes + flowing curves
  function dance() {
    return svgOpen() +
      // Flowing curves
      '<g fill="none" stroke="white" opacity="0.14" stroke-linecap="round">' +
        '<path d="M -20 200 Q 90 150 180 200 T 380 200" stroke-width="1.2"/>' +
        '<path d="M -20 350 Q 90 300 180 350 T 380 350" stroke-width="1.2"/>' +
        '<path d="M -20 500 Q 90 450 180 500 T 380 500" stroke-width="1.2"/>' +
      '</g>' +
      // Music notes
      function() {
        var notes = [
          { x:60, y:240, scale:1.2 }, { x:290, y:300, scale:0.9 },
          { x:80, y:460, scale:1.0 }, { x:280, y:500, scale:0.8 },
          { x:160, y:540, scale:1.1 }
        ];
        var s = '';
        for (var i = 0; i < notes.length; i++) {
          var n = notes[i];
          s += '<g transform="translate(' + n.x + ',' + n.y + ') scale(' + n.scale + ')" ' +
               'fill="white" opacity="0.50">' +
            '<ellipse cx="0" cy="0" rx="6" ry="4.5" transform="rotate(-25)"/>' +
            '<rect x="4" y="-22" width="1.5" height="22"/>' +
            '<path d="M 5.5 -22 Q 14 -18 12 -8" stroke="white" stroke-width="1.5" fill="none"/>' +
          '</g>';
        }
        return s;
      }() +
      // Sparkles
      '<g fill="white" opacity="0.55">' +
        '<circle cx="120" cy="180" r="1.5"/>' +
        '<circle cx="240" cy="220" r="1.5"/>' +
        '<circle cx="40" cy="380" r="1.5"/>' +
        '<circle cx="320" cy="400" r="1.5"/>' +
      '</g>' +
    '</svg>';
  }

  // 12. Weight Training — dumbbell + plates
  function weight_train() {
    function dumbbell(x, y, scale, rot, opacity) {
      return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ') scale(' + scale + ')" ' +
             'opacity="' + opacity + '">' +
        // Bar
        '<rect x="-20" y="-3" width="40" height="6" rx="2" fill="rgba(200,200,210,0.6)"/>' +
        // Plates
        '<rect x="-32" y="-12" width="10" height="24" rx="2" fill="rgba(40,40,50,0.75)"/>' +
        '<rect x="22" y="-12" width="10" height="24" rx="2" fill="rgba(40,40,50,0.75)"/>' +
        // Highlights
        '<rect x="-30" y="-10" width="2" height="20" fill="rgba(255,255,255,0.25)"/>' +
        '<rect x="28" y="-10" width="2" height="20" fill="rgba(255,255,255,0.25)"/>' +
      '</g>';
    }
    return svgOpen() + motionLines() + textureDots() +
      // Floor line
      '<line x1="0" y1="530" x2="360" y2="530" stroke="white" stroke-width="1" opacity="0.18"/>' +
      // Big dumbbell at angle
      dumbbell(70, 250, 1.8, -15, 0.55) +
      dumbbell(290, 360, 1.3, 20, 0.45) +
      dumbbell(180, 480, 1.5, 0, 0.50) +
      // Loose plates
      '<circle cx="40"  cy="420" r="10" fill="rgba(40,40,50,0.55)"/>' +
      '<circle cx="40"  cy="420" r="3"  fill="rgba(200,200,210,0.6)"/>' +
      '<circle cx="310" cy="470" r="8"  fill="rgba(40,40,50,0.55)"/>' +
      '<circle cx="310" cy="470" r="2.5" fill="rgba(200,200,210,0.6)"/>' +
    '</svg>';
  }

  // 13. General Workout — mixed strength icons
  function workout() {
    return svgOpen() + motionLines() + textureDots() +
      // Small dumbbells
      '<g opacity="0.45">' +
        '<g transform="translate(60,250) rotate(-15)">' +
          '<rect x="-14" y="-2" width="28" height="4" fill="white"/>' +
          '<rect x="-22" y="-8" width="6" height="16" rx="1" fill="white"/>' +
          '<rect x="16" y="-8" width="6" height="16" rx="1" fill="white"/>' +
        '</g>' +
        '<g transform="translate(295,370) rotate(20)">' +
          '<rect x="-12" y="-2" width="24" height="4" fill="white"/>' +
          '<rect x="-18" y="-7" width="5" height="14" rx="1" fill="white"/>' +
          '<rect x="13" y="-7" width="5" height="14" rx="1" fill="white"/>' +
        '</g>' +
      '</g>' +
      // Lightning bolt icons (energy)
      '<g fill="white" opacity="0.30">' +
        '<path d="M 280 240 L 270 268 L 282 268 L 272 296 L 296 264 L 284 264 Z" transform="scale(0.7)"/>' +
        '<path d="M 90 480 L 80 508 L 92 508 L 82 536 L 106 504 L 94 504 Z" transform="scale(0.6)"/>' +
      '</g>' +
      // Scattered dots
      '<g fill="white" opacity="0.30">' +
        '<circle cx="50" cy="380" r="1.5"/><circle cx="160" cy="480" r="1.5"/>' +
        '<circle cx="240" cy="540" r="1.5"/><circle cx="320" cy="510" r="1.5"/>' +
      '</g>' +
    '</svg>';
  }

  // 14. HIIT — flames + zigzag energy
  function hiit() {
    function flame(x, y, scale, opacity) {
      return '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')" opacity="' + opacity + '">' +
        '<path d="M 0 -20 Q -8 -10 -10 0 Q -12 12 0 18 Q 12 12 10 0 Q 8 -10 0 -20 Z" ' +
              'fill="#ffb030"/>' +
        '<path d="M 0 -10 Q -4 -4 -5 4 Q -3 12 0 14 Q 3 12 5 4 Q 4 -4 0 -10 Z" fill="#ffe070"/>' +
      '</g>';
    }
    return svgOpen() + motionLines() + textureDots() +
      // Zigzag energy lines
      '<g fill="none" stroke="white" opacity="0.20" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="20,240 60,220 80,260 120,235 160,275" stroke-width="2"/>' +
        '<polyline points="200,300 240,280 260,320 300,295 340,335" stroke-width="2"/>' +
        '<polyline points="40,460 80,440 100,480 140,455 180,495" stroke-width="2"/>' +
      '</g>' +
      flame(80, 280, 1.8, 0.7) +
      flame(280, 360, 1.4, 0.65) +
      flame(120, 510, 1.2, 0.6) +
      flame(290, 540, 1.0, 0.55) +
      // Spark particles
      '<g fill="#ffe070" opacity="0.7">' +
        '<circle cx="60"  cy="200" r="1.5"/>' +
        '<circle cx="320" cy="240" r="1.5"/>' +
        '<circle cx="40"  cy="380" r="1.5"/>' +
        '<circle cx="200" cy="420" r="1.5"/>' +
      '</g>' +
    '</svg>';
  }

  // 15. CrossFit — kettlebell + lightning
  function crossfit() {
    function kettlebell(x, y, scale, opacity) {
      return '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')" opacity="' + opacity + '">' +
        // Handle
        '<path d="M -12 -20 Q -12 -30 0 -30 Q 12 -30 12 -20" stroke="white" stroke-width="3" fill="none"/>' +
        // Body
        '<circle cx="0" cy="-2" r="20" fill="rgba(40,40,50,0.75)"/>' +
        // Highlight
        '<ellipse cx="-7" cy="-8" rx="5" ry="3" fill="rgba(255,255,255,0.20)"/>' +
      '</g>';
    }
    return svgOpen() + motionLines() + textureDots() +
      // Lightning bolt
      '<g fill="white" opacity="0.18">' +
        '<path d="M 240 200 L 220 270 L 244 270 L 224 340 L 264 250 L 240 250 Z"/>' +
      '</g>' +
      kettlebell(80, 280, 1.6, 0.6) +
      kettlebell(290, 380, 1.2, 0.55) +
      kettlebell(150, 510, 1.4, 0.55) +
      // Rope segments
      '<g stroke="rgba(200,180,140,0.45)" stroke-width="3" fill="none" stroke-linecap="round">' +
        '<path d="M 30 450 Q 60 440 80 460"/>' +
        '<path d="M 280 540 Q 300 530 330 545"/>' +
      '</g>' +
    '</svg>';
  }

  // 16. Boxing — gloves + heavy bag
  function boxing() {
    function glove(x, y, rot, scale, opacity) {
      return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ') scale(' + scale + ')" ' +
             'opacity="' + opacity + '">' +
        // Main body
        '<ellipse cx="0" cy="0" rx="22" ry="20" fill="#c8202a"/>' +
        // Thumb
        '<ellipse cx="18" cy="-8" rx="9" ry="8" fill="#c8202a"/>' +
        // Cuff
        '<rect x="-18" y="14" width="30" height="10" rx="2" fill="rgba(160,30,40,0.95)"/>' +
        // Highlight
        '<ellipse cx="-6" cy="-8" rx="6" ry="3" fill="rgba(255,255,255,0.20)"/>' +
      '</g>';
    }
    return svgOpen() + motionLines() + textureDots() +
      // Heavy bag silhouette (right)
      '<g opacity="0.25">' +
        '<rect x="250" y="200" width="60" height="180" rx="6" fill="rgba(60,40,30,0.6)"/>' +
        '<line x1="280" y1="170" x2="280" y2="200" stroke="white" stroke-width="1.5"/>' +
        '<rect x="265" y="210" width="30" height="2" fill="rgba(255,255,255,0.3)"/>' +
        '<rect x="265" y="260" width="30" height="2" fill="rgba(255,255,255,0.3)"/>' +
        '<rect x="265" y="320" width="30" height="2" fill="rgba(255,255,255,0.3)"/>' +
      '</g>' +
      glove(80, 280, -10, 1.5, 0.6) +
      glove(140, 480, 25, 1.2, 0.55) +
    '</svg>';
  }

  // 17. Swimming — waves + bubbles
  function swimming() {
    return svgOpen() +
      // Wave layers (sine curves)
      '<g fill="none" stroke="white" opacity="0.20" stroke-linecap="round">' +
        '<path d="M -20 220 Q 40 200 90 220 T 200 220 T 380 220" stroke-width="1.5"/>' +
        '<path d="M -20 280 Q 40 260 90 280 T 200 280 T 380 280" stroke-width="1.2"/>' +
        '<path d="M -20 340 Q 40 320 90 340 T 200 340 T 380 340" stroke-width="1.5"/>' +
        '<path d="M -20 420 Q 40 400 90 420 T 200 420 T 380 420" stroke-width="1.2"/>' +
        '<path d="M -20 490 Q 40 470 90 490 T 200 490 T 380 490" stroke-width="1.5"/>' +
        '<path d="M -20 560 Q 40 540 90 560 T 200 560 T 380 560" stroke-width="1.2"/>' +
      '</g>' +
      // Pool lane lines (subtle vertical)
      '<g stroke="white" opacity="0.06" stroke-width="1">' +
        '<line x1="80" y1="200" x2="80" y2="600"/>' +
        '<line x1="180" y1="200" x2="180" y2="600"/>' +
        '<line x1="280" y1="200" x2="280" y2="600"/>' +
      '</g>' +
      // Bubbles
      '<g fill="white">' +
        '<circle cx="60"  cy="260" r="4" opacity="0.50"/>' +
        '<circle cx="290" cy="320" r="6" opacity="0.45"/>' +
        '<circle cx="100" cy="400" r="5" opacity="0.55"/>' +
        '<circle cx="250" cy="450" r="3.5" opacity="0.50"/>' +
        '<circle cx="50"  cy="510" r="4.5" opacity="0.55"/>' +
        '<circle cx="310" cy="540" r="3" opacity="0.50"/>' +
        '<circle cx="170" cy="380" r="2.5" opacity="0.60"/>' +
        '<circle cx="200" cy="540" r="3.5" opacity="0.50"/>' +
      '</g>' +
    '</svg>';
  }

  // 18. Hiking — mountains + trail + sun
  function hiking() {
    return svgOpen() +
      // Background sky dots
      '<g fill="white" opacity="0.25">' +
        '<circle cx="60" cy="180" r="1"/>' +
        '<circle cx="300" cy="200" r="1"/>' +
        '<circle cx="120" cy="160" r="0.8"/>' +
      '</g>' +
      // Sun
      '<circle cx="290" cy="190" r="14" fill="white" opacity="0.30"/>' +
      '<circle cx="290" cy="190" r="22" fill="white" opacity="0.10"/>' +
      // Far mountains
      '<polygon points="0,400 60,300 120,360 200,280 280,340 360,300 360,640 0,640" ' +
               'fill="rgba(0,0,0,0.18)"/>' +
      // Mid mountains
      '<polygon points="0,460 80,360 150,420 240,330 320,400 360,360 360,640 0,640" ' +
               'fill="rgba(0,0,0,0.28)"/>' +
      // Trail (winding path)
      '<path d="M 60 580 Q 120 540 160 520 Q 200 500 240 510 Q 280 520 320 480" ' +
            'stroke="rgba(255,255,255,0.40)" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="6,5"/>' +
      // Trees (small triangles in foreground)
      '<g fill="rgba(0,0,0,0.40)">' +
        '<polygon points="40,540 30,580 50,580"/>' +
        '<polygon points="320,510 312,548 328,548"/>' +
        '<polygon points="120,560 112,595 128,595"/>' +
      '</g>' +
    '</svg>';
  }

  // 19. Rock Climbing — rock face + carabiner
  function climbing() {
    return svgOpen() + textureDots() +
      // Rock face (jagged polygons)
      '<polygon points="0,200 50,260 30,340 80,400 60,480 110,540 90,640 0,640" ' +
               'fill="rgba(0,0,0,0.30)"/>' +
      '<polygon points="360,180 320,240 340,320 290,380 320,460 270,520 290,600 360,640" ' +
               'fill="rgba(0,0,0,0.30)"/>' +
      // Climbing handholds (dots on rock)
      '<g fill="white" opacity="0.35">' +
        '<circle cx="40" cy="280" r="4"/>' +
        '<circle cx="55" cy="380" r="3"/>' +
        '<circle cx="90" cy="450" r="4"/>' +
        '<circle cx="310" cy="280" r="4"/>' +
        '<circle cx="295" cy="380" r="3"/>' +
        '<circle cx="280" cy="450" r="4"/>' +
      '</g>' +
      // Carabiner
      '<g transform="translate(180,420) rotate(15)" opacity="0.55">' +
        '<rect x="-12" y="-30" width="24" height="60" rx="12" fill="none" stroke="#c8c8d0" stroke-width="3.5"/>' +
        // Gate
        '<line x1="-12" y1="-20" x2="-12" y2="20" stroke="rgba(0,0,0,0.5)" stroke-width="2"/>' +
      '</g>' +
      // Rope curve hanging
      '<path d="M 180 450 Q 170 480 160 520 Q 150 560 165 600" ' +
            'stroke="rgba(220,180,140,0.55)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '</svg>';
  }

  // 20. Golf — flag + ball + green curve
  function golf() {
    return svgOpen() + motionLines() + textureDots() +
      // Green (rolling hill curve)
      '<path d="M 0 480 Q 90 460 180 470 Q 270 480 360 460 L 360 640 L 0 640 Z" ' +
            'fill="rgba(255,255,255,0.05)"/>' +
      '<path d="M 0 480 Q 90 460 180 470 Q 270 480 360 460" ' +
            'stroke="rgba(255,255,255,0.20)" stroke-width="1" fill="none"/>' +
      // Flag pole + flag
      '<g transform="translate(240,270)">' +
        '<line x1="0" y1="0" x2="0" y2="200" stroke="white" stroke-width="2" opacity="0.45"/>' +
        // Flag
        '<polygon points="0,5 50,15 30,30 50,45 0,35" fill="#ff5040" opacity="0.65"/>' +
        // Hole at base
        '<ellipse cx="0" cy="200" rx="8" ry="3" fill="rgba(0,0,0,0.5)"/>' +
      '</g>' +
      // Golf ball
      '<circle cx="100" cy="440" r="9" fill="white" opacity="0.75"/>' +
      // Dimples (tiny circles)
      '<g fill="rgba(0,0,0,0.20)">' +
        '<circle cx="97" cy="437" r="0.8"/><circle cx="103" cy="437" r="0.8"/>' +
        '<circle cx="100" cy="442" r="0.8"/><circle cx="105" cy="441" r="0.8"/>' +
        '<circle cx="95" cy="442" r="0.8"/>' +
      '</g>' +
      // Tee marker
      '<g transform="translate(96, 449)" fill="white" opacity="0.5">' +
        '<polygon points="0,0 4,0 2,4"/>' +
      '</g>' +
    '</svg>';
  }

  // 21. Skipping Rope — rope loops
  function skipping() {
    return svgOpen() + motionLines() + textureDots() +
      // Rope loops (figure-8 style curves)
      '<g fill="none" stroke="rgba(220,180,140,0.65)" stroke-width="3" stroke-linecap="round">' +
        '<path d="M 60 240 Q 120 200 180 240 Q 240 280 300 240"/>' +
        '<path d="M 60 240 Q 30 280 60 320 Q 90 360 60 400"/>' +
        '<path d="M 300 240 Q 330 280 300 320 Q 270 360 300 400"/>' +
        '<path d="M 60 400 Q 120 440 180 400 Q 240 360 300 400"/>' +
      '</g>' +
      // Handles
      '<g fill="rgba(80,60,40,0.7)">' +
        '<rect x="50" y="232" width="20" height="12" rx="3"/>' +
        '<rect x="290" y="232" width="20" height="12" rx="3"/>' +
      '</g>' +
      // Speed marks
      '<g stroke="white" opacity="0.30" stroke-width="1.5" stroke-linecap="round" fill="none">' +
        '<line x1="40" y1="500" x2="100" y2="500"/>' +
        '<line x1="50" y1="520" x2="110" y2="520"/>' +
        '<line x1="260" y1="500" x2="320" y2="500"/>' +
        '<line x1="250" y1="520" x2="310" y2="520"/>' +
      '</g>' +
    '</svg>';
  }

  // 22. Other / fallback — generic motion + scatter
  function other(emoji) {
    return svgOpen() + motionLines() + textureDots() +
      // Soft glow circles
      '<g fill="white">' +
        '<circle cx="60"  cy="240" r="40" opacity="0.04"/>' +
        '<circle cx="290" cy="380" r="50" opacity="0.04"/>' +
        '<circle cx="80"  cy="500" r="35" opacity="0.04"/>' +
      '</g>' +
    '</svg>';
  }

  // ── Registry & exposed API ──────────────────────────────────────
  var scenes = {
    badminton: badminton, table_tennis: table_tennis, tennis: tennis,
    pickleball: pickleball, squash: squash, cricket: cricket,
    football: football, volleyball: volleyball, basketball: basketball,
    yoga: yoga, dance: dance, weight_train: weight_train, workout: workout,
    hiit: hiit, crossfit: crossfit, boxing: boxing, swimming: swimming,
    hiking: hiking, climbing: climbing, golf: golf, skipping: skipping,
    other: other,
  };

  window.FF = window.FF || {};
  window.FF.getActivityBackground = function (activityId) {
    var fn = scenes[activityId] || scenes.other;
    try { return fn(); } catch (e) {
      console.warn('[FF] background render failed for', activityId, e);
      return scenes.other();
    }
  };
})();
