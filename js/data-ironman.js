// ════════════════════════════════════════════════════════════════════
// HALF IRONMAN 70.3 — data-ironman.js
//
// Extends window.APP_DATA with the full 6-month (24-week) Half Ironman
// training plan:
//   • 2 km Swim  ·  90 km Bike  ·  21.1 km Run
//
// Structure mirrors data-crosstraining.js — same extension pattern.
// Loaded AFTER data.js.
//
// LocalStorage keys (managed by ironman.js):
//   ff_im_plan_<uid>                      → { startDate, startedAt }
//   ff_imday_<uid>_w<week>_<DayName>      → { date, timestamp, week, day, … }
//   sess_<uid>_ironman_w<w>_<day>         → { exIdx:[setIdx,…] }
// ════════════════════════════════════════════════════════════════════

(function () {
  var D = window.APP_DATA;
  if (!D) { console.error('[FitFlow] data.js must load before data-ironman.js'); return; }

  // ── WEEK SCHEDULE (fixed 7-day split, repeats every week) ─────────
  // Each day maps to a session type. 'rest' days have no exercises.
  D.modules.ironman = {
    name:  'Half Iron Man',
    emoji: '🏅',
    color: 'grad-ironman',
    sub:   '24-week · Swim · Bike · Run',

    // Which session type falls on which day of the week
    schedule: {
      Monday:    'strength_a',   // Upper body + core strength
      Tuesday:   'swim_run',     // Swim technique + easy run
      Wednesday: 'bike',         // Endurance cycling
      Thursday:  'strength_b',   // Lower body + posterior + intervals
      Friday:    'swim',         // Swim focus (technique / race-pace)
      Saturday:  'brick',        // Long bike → brick run (key session)
      Sunday:    'long_run',     // Long run + full mobility
    },

    // Display labels for each session type
    sessionLabels: {
      strength_a: { emoji: '🏋️', name: 'Strength A',       desc: 'Upper body · Core · Pull' },
      swim_run:   { emoji: '🏊', name: 'Swim + Easy Run',   desc: 'Technique sets + aerobic run' },
      bike:       { emoji: '🚴', name: 'Endurance Bike',    desc: 'Long ride · Cadence · Tempo' },
      strength_b: { emoji: '🦵', name: 'Strength B',        desc: 'Lower body · Posterior · Intervals' },
      swim:       { emoji: '🌊', name: 'Swim Focus',        desc: 'Race-pace · Open-water sim' },
      brick:      { emoji: '🔥', name: 'Brick Workout',     desc: 'Long bike → transition → run' },
      long_run:   { emoji: '🏃', name: 'Long Run',          desc: 'Endurance pace + full mobility' },
      rest:       { emoji: '😴', name: 'Rest',              desc: 'Full rest or light walk' },
    },

    // ── 4 PHASES ────────────────────────────────────────────────────
    phases: [
      {
        id:     'base',
        name:   'Base Build',
        label:  '🌱 Phase 1 — Base Build',
        weeks:  [1,2,3,4,5,6],
        focus:  'Foundation aerobic fitness. Low intensity, high frequency. Getting the body used to multi-sport training. Keep heart rate in Zone 2.',
        swimTarget:  '800–1,200 m/session',
        bikeTarget:  '30–50 km/ride',
        runTarget:   '5–9 km/long run',
        brickBike:   '25–35 km',
        brickRun:    '3–5 km',
        strengthNote:'Full 2×/week strength. Focus on form, not load.',
      },
      {
        id:     'build',
        name:   'Build',
        label:  '💪 Phase 2 — Build',
        weeks:  [7,8,9,10,11,12,13,14],
        focus:  'Increase volume and introduce brick workouts. Race-pace swim sets begin. Strength stays 2×/week but load increases.',
        swimTarget:  '1,600–2,400 m/session',
        bikeTarget:  '65–90 km/ride',
        runTarget:   '13–19 km/long run',
        brickBike:   '60–80 km',
        brickRun:    '8–14 km',
        strengthNote:'Strength 2×/week, increasing load. Add single-leg work for running economy.',
      },
      {
        id:     'peak',
        name:   'Peak',
        label:  '🔥 Phase 3 — Peak',
        weeks:  [15,16,17,18,19,20],
        focus:  'Highest training volume. Race-pace sessions across all three disciplines. Back-to-back long sessions on Saturday–Sunday.',
        swimTarget:  '2,400–2,800 m/session',
        bikeTarget:  '90–100 km/ride',
        runTarget:   '19–21 km/long run',
        brickBike:   '80–90 km',
        brickRun:    '14–18 km',
        strengthNote:'Strength reduces to 1×/week (Monday only). Prioritise recovery.',
      },
      {
        id:     'taper',
        name:   'Taper',
        label:  '🎯 Phase 4 — Taper',
        weeks:  [21,22,23,24],
        focus:  'Volume drops 40–60%. Sharpen speed, rest legs, arrive at race day fresh. No new workouts. Trust the training.',
        swimTarget:  '1,200–1,500 m/session',
        bikeTarget:  '40–60 km/ride',
        runTarget:   '8–12 km/long run',
        brickBike:   '45–60 km',
        brickRun:    '5–8 km',
        strengthNote:'Strength stops from Week 22. Light activation only.',
      },
    ],

    // ── WEEK-BY-WEEK SWIM / BIKE / RUN / BRICK TARGETS ─────────────
    // Used by the day-detail page to show exact session targets per week.
    weekTargets: {
       1: { swim: 800,  swimPace:'easy',      bike: 30,  bikeType:'easy',      run: 5,  runType:'easy',      brickBike: 25, brickRun: 3  },
       2: { swim: 900,  swimPace:'easy',      bike: 35,  bikeType:'easy',      run: 6,  runType:'easy',      brickBike: 28, brickRun: 4  },
       3: { swim: 1000, swimPace:'easy',      bike: 40,  bikeType:'easy',      run: 7,  runType:'easy',      brickBike: 30, brickRun: 4  },
       4: { swim: 1100, swimPace:'easy',      bike: 45,  bikeType:'steady',    run: 8,  runType:'easy',      brickBike: 32, brickRun: 5  },
       5: { swim: 1200, swimPace:'steady',    bike: 48,  bikeType:'steady',    run: 8,  runType:'steady',    brickBike: 35, brickRun: 5  },
       6: { swim: 1400, swimPace:'steady',    bike: 50,  bikeType:'steady',    run: 9,  runType:'steady',    brickBike: 38, brickRun: 6  },
       7: { swim: 1600, swimPace:'steady',    bike: 55,  bikeType:'endurance', run: 11, runType:'steady',    brickBike: 45, brickRun: 7  },
       8: { swim: 1800, swimPace:'steady',    bike: 60,  bikeType:'endurance', run: 12, runType:'steady',    brickBike: 50, brickRun: 8  },
       9: { swim: 1800, swimPace:'tempo',     bike: 65,  bikeType:'endurance', run: 13, runType:'steady',    brickBike: 55, brickRun: 9  },
      10: { swim: 2000, swimPace:'tempo',     bike: 70,  bikeType:'tempo',     run: 14, runType:'tempo',     brickBike: 60, brickRun: 10 },
      11: { swim: 2000, swimPace:'tempo',     bike: 75,  bikeType:'tempo',     run: 15, runType:'tempo',     brickBike: 65, brickRun: 11 },
      12: { swim: 2200, swimPace:'race',      bike: 80,  bikeType:'tempo',     run: 16, runType:'tempo',     brickBike: 70, brickRun: 12 },
      13: { swim: 2200, swimPace:'race',      bike: 82,  bikeType:'race',      run: 17, runType:'race',      brickBike: 72, brickRun: 13 },
      14: { swim: 2400, swimPace:'race',      bike: 85,  bikeType:'race',      run: 18, runType:'race',      brickBike: 75, brickRun: 14 },
      15: { swim: 2400, swimPace:'race',      bike: 88,  bikeType:'race',      run: 19, runType:'race',      brickBike: 78, brickRun: 15 },
      16: { swim: 2500, swimPace:'race',      bike: 90,  bikeType:'race',      run: 20, runType:'race',      brickBike: 80, brickRun: 16 },
      17: { swim: 2600, swimPace:'race',      bike: 92,  bikeType:'race',      run: 20, runType:'race',      brickBike: 82, brickRun: 16 },
      18: { swim: 2600, swimPace:'race',      bike: 95,  bikeType:'race',      run: 21, runType:'race',      brickBike: 85, brickRun: 17 },
      19: { swim: 2800, swimPace:'race',      bike: 100, bikeType:'race',      run: 21, runType:'race',      brickBike: 90, brickRun: 18 },
      20: { swim: 2400, swimPace:'race',      bike: 90,  bikeType:'race',      run: 20, runType:'race',      brickBike: 80, brickRun: 15 },
      21: { swim: 1800, swimPace:'steady',    bike: 60,  bikeType:'easy',      run: 14, runType:'steady',    brickBike: 55, brickRun: 10 },
      22: { swim: 1500, swimPace:'race',      bike: 50,  bikeType:'sharpener', run: 12, runType:'sharpener', brickBike: 45, brickRun: 8  },
      23: { swim: 1200, swimPace:'race',      bike: 40,  bikeType:'sharpener', run: 8,  runType:'sharpener', brickBike: 30, brickRun: 5  },
      24: { swim: 1000, swimPace:'race',      bike: 25,  bikeType:'easy',      run: 5,  runType:'easy',      brickBike: 20, brickRun: 3  },
    },

    // ── STRENGTH TRAINING — SESSION A (Mon) ─────────────────────────
    strength_a: [
      {
        name: 'Pull-Ups / Lat Pulldown',
        sets: 3, reps: '8–10 reps',
        desc: 'Full range pull-ups with dead hang. If bodyweight pull-ups are easy, add a weight belt. Develops the lats critical for swim catch phase. Keep elbows driving to hips.',
        demo: 'https://www.youtube.com/results?search_query=pull+ups+lat+pulldown+form',
        upgrade: { name: 'Weighted Pull-Ups', equipment: '🏋️ Weight belt', reps: '6–8 reps', desc: 'Same movement with 5–10 kg added. Dramatically improves swim power when done consistently.', demo: 'https://www.youtube.com/results?search_query=weighted+pull+ups+technique' },
      },
      {
        name: 'Single-Arm Dumbbell Row',
        sets: 3, reps: '10 each side',
        desc: 'Brace on a bench. Row dumbbell from full extension to hip. Squeeze shoulder blade at top. One-arm rows correct swim stroke asymmetry and build pulling endurance.',
        demo: 'https://www.youtube.com/results?search_query=single+arm+dumbbell+row+form',
      },
      {
        name: 'Push-Ups / Bench Press',
        sets: 3, reps: '12 reps',
        desc: 'Full-range push-ups with body straight. Trains the press phase of the freestyle stroke. Progress to ring push-ups for greater range.',
        demo: 'https://www.youtube.com/results?search_query=push+ups+proper+form+triathlon',
        upgrade: { name: 'Dumbbell Bench Press', equipment: '🏋️ Dumbbells + bench', reps: '10 reps', desc: 'Greater range than barbell. Keep wrists neutral — prevents the wrist issues common in swimmers.', demo: 'https://www.youtube.com/results?search_query=dumbbell+bench+press+form' },
      },
      {
        name: 'Dumbbell Shoulder Press',
        sets: 3, reps: '10 reps',
        desc: 'Seated or standing. Press dumbbells overhead without arching the lower back. Shoulder strength is the #1 injury prevention tool for swimmers. Keep core braced throughout.',
        demo: 'https://www.youtube.com/results?search_query=dumbbell+shoulder+press+form',
      },
      {
        name: 'Face Pulls',
        sets: 3, reps: '15 reps',
        desc: 'With resistance band or cable. Pull to face with external rotation at end. Counteracts the internal rotation overuse from swimming. Critical for long-term shoulder health.',
        demo: 'https://www.youtube.com/results?search_query=face+pulls+resistance+band+form',
      },
      {
        name: 'Plank Hold',
        sets: 3, reps: '45–60 sec',
        desc: 'Forearm plank with posterior pelvic tilt (tuck the hips slightly). A strong core is the "chassis" that transfers power between your swim stroke arms — weak core = energy leak.',
        demo: 'https://www.youtube.com/results?search_query=plank+hold+proper+form+core',
      },
      {
        name: 'Dead Bug',
        sets: 3, reps: '10 each side',
        desc: 'Lie on back, arms up, knees at 90°. Lower opposite arm and leg while pressing lower back flat to floor. Best anti-extension core exercise for triathletes — protects the lumbar on the bike.',
        demo: 'https://www.youtube.com/results?search_query=dead+bug+exercise+triathlon',
      },
      {
        name: 'Pallof Press (Band)',
        sets: 3, reps: '12 each side',
        desc: 'Stand sideways to a fixed band. Press band straight out and hold 2 seconds. Anti-rotation core strength — prevents the hip sway that wastes energy on long runs.',
        demo: 'https://www.youtube.com/results?search_query=pallof+press+band+anti+rotation',
      },
    ],

    // ── STRENGTH TRAINING — SESSION B (Thu) ─────────────────────────
    strength_b: [
      {
        name: 'Goblet Squat',
        sets: 3, reps: '12 reps',
        desc: 'Hold a dumbbell at chest height. Squat deep, keeping chest upright. The front load corrects forward lean — a common issue that destroys run form at km 15+ of a half marathon.',
        demo: 'https://www.youtube.com/results?search_query=goblet+squat+form+running',
        upgrade: { name: 'Back Squat / Front Squat', equipment: '🏋️ Barbell + rack', reps: '8–10 reps', desc: 'For those with gym access. Front squat especially mimics the quad demands of the 90 km bike.', demo: 'https://www.youtube.com/results?search_query=front+squat+technique' },
      },
      {
        name: 'Romanian Deadlift (RDL)',
        sets: 3, reps: '10 reps',
        desc: 'Hinge at hips, soft knees, weight close to legs. Feel the hamstring stretch at the bottom, drive through glutes to top. Hamstring strength is the #1 predictor of running economy.',
        demo: 'https://www.youtube.com/results?search_query=romanian+deadlift+form+hamstrings',
        upgrade: { name: 'Single-Leg RDL', equipment: '🏋️ Dumbbell (optional)', reps: '8 each leg', desc: 'Exposes left–right strength imbalances. Every runner has one — fix it before race day.', demo: 'https://www.youtube.com/results?search_query=single+leg+romanian+deadlift' },
      },
      {
        name: 'Single-Leg Glute Bridge',
        sets: 3, reps: '12 each side',
        desc: 'On back, one leg extended, drive hips up through planted foot. Squeeze glute hard at top. Glutes are the engine of both cycling and running — if they fatigue, the knees and lower back compensate.',
        demo: 'https://www.youtube.com/results?search_query=single+leg+glute+bridge+form',
        upgrade: { name: 'Hip Thrust (Barbell)', equipment: '🏋️ Barbell + bench', reps: '10–12 reps', desc: 'The most effective glute builder known. A strong hip thrust directly translates to more watts on the bike.', demo: 'https://www.youtube.com/results?search_query=barbell+hip+thrust+form' },
      },
      {
        name: 'Reverse Lunge',
        sets: 3, reps: '10 each leg',
        desc: 'Step backward, lower back knee toward floor. Drive through the front heel to stand. Lower knee stress than forward lunges — safer for triathletes training high weekly volumes.',
        demo: 'https://www.youtube.com/results?search_query=reverse+lunge+form+running',
        upgrade: { name: 'Dumbbell Reverse Lunge', equipment: '🏋️ Dumbbells', reps: '10 each leg', desc: 'Add load once form is solid. Same motion — the front heel drive trains the cycling push-through position.', demo: 'https://www.youtube.com/results?search_query=dumbbell+reverse+lunge' },
      },
      {
        name: 'Step-Ups',
        sets: 3, reps: '10 each leg',
        desc: 'Step onto a box or sturdy chair (40–50 cm), drive through the heel, bring the other foot up. Mimics the single-leg loading of stair climbing and running uphill.',
        demo: 'https://www.youtube.com/results?search_query=step+ups+box+exercise+form',
      },
      {
        name: 'Single-Leg Calf Raises',
        sets: 3, reps: '15 each side',
        desc: 'Hand on wall. Full range — all the way up and all the way down (let heel drop below step level). Calves absorb 6–8× body weight per stride in running. They WILL break if undertrained.',
        demo: 'https://www.youtube.com/results?search_query=single+leg+calf+raises+running',
      },
      {
        name: 'Copenhagen Plank',
        sets: 3, reps: '20 sec each side',
        desc: 'Side plank with top foot on a bench. Adductor and hip stability. Critical for the lateral stability needed during 21 km of running after 90 km of cycling.',
        demo: 'https://www.youtube.com/results?search_query=copenhagen+plank+adductor+form',
      },
      {
        name: 'Run Intervals (post-strength)',
        sets: 1, reps: '6–8 × 400 m @ race pace with 90 sec recovery',
        desc: 'These are the weekly track repeats. Do them 20–30 min after completing the strength session. Short enough not to add fatigue but enough to build run economy. In Phase 3 extend to 800 m repeats.',
        demo: 'https://www.youtube.com/results?search_query=400m+intervals+running+form',
      },
    ],

    // ── SWIM SESSIONS ────────────────────────────────────────────────
    // swim_run day (Tuesday) and swim day (Friday) share these drills
    swim_drills: [
      {
        name: 'Warm-Up Swim',
        sets: 1, reps: '200 m easy',
        desc: 'Easy freestyle — focus only on smooth breathing rhythm. Not about speed. Let the body transition from land to water.',
        demo: 'https://www.youtube.com/results?search_query=swim+warm+up+freestyle+technique',
      },
      {
        name: 'Catch-Up Drill',
        sets: 4, reps: '50 m each',
        desc: 'One arm fully extended forward before the other begins pulling. Slows down the stroke to exaggerate the catch phase. The most important drill for open-water efficiency.',
        demo: 'https://www.youtube.com/results?search_query=catch+up+drill+swimming+technique',
      },
      {
        name: 'Pull Buoy Sets',
        sets: 3, reps: '100 m each',
        desc: 'Buoy between thighs eliminates kick. Forces the arms to do all the work. Reveals arm weaknesses. Great for building swim-specific upper body endurance.',
        demo: 'https://www.youtube.com/results?search_query=pull+buoy+freestyle+swimming',
      },
      {
        name: 'Bilateral Breathing',
        sets: 3, reps: '100 m — breathe every 3 strokes',
        desc: 'Breathe to alternate sides every 3 strokes. Essential for open water — you need to breathe away from chop regardless of which side the waves come from.',
        demo: 'https://www.youtube.com/results?search_query=bilateral+breathing+freestyle+swimming',
      },
      {
        name: 'Sighting Drill',
        sets: 4, reps: '50 m',
        desc: 'Lift eyes just above the waterline every 6–8 strokes (crocodile eyes). Practice spotting a buoy. Open-water swimming without good sighting adds 10–15% distance.',
        demo: 'https://www.youtube.com/results?search_query=sighting+drill+open+water+swimming',
      },
      {
        name: 'Main Set (distance per phase)',
        sets: 1, reps: 'See phase target',
        desc: 'Steady continuous swim at conversational pace (Zone 2). In Phase 2+, include 4×100 m at race pace with 20 sec rest. In Phase 3, do 3×400 m at race pace.',
        demo: 'https://www.youtube.com/results?search_query=triathlon+swim+training+sets',
      },
      {
        name: 'Cool-Down Swim',
        sets: 1, reps: '100 m easy',
        desc: 'Easy backstroke or slow freestyle. Flush lactate. Slow the breathing. Never stop abruptly after a hard main set.',
        demo: 'https://www.youtube.com/results?search_query=swim+cool+down+technique',
      },
    ],

    // ── BRICK WORKOUT STRUCTURE ──────────────────────────────────────
    brick_structure: [
      {
        type: 'bike',
        name: 'Long Bike Segment',
        sets: 1, reps: 'See phase target (km)',
        desc: 'Ride at steady endurance pace (Zone 2–3). In the last 15 min, drop to an easier gear and spin at 90+ rpm (high cadence) to flush the legs for the run transition. Eat/drink every 20–25 min.',
        demo: 'https://www.youtube.com/results?search_query=triathlon+bike+pacing+strategy',
      },
      {
        type: 'transition',
        name: '⚡ T2 — Bike to Run Transition',
        sets: 1, reps: 'Target: under 3 min',
        desc: 'Rack bike, remove helmet, switch shoes, grab run number. Practice this transition every Saturday. In a race, 30 saved seconds here costs zero energy. Your legs will feel like bricks — that is normal, it passes at ~1 km.',
        demo: 'https://www.youtube.com/results?search_query=triathlon+T2+transition+tips',
      },
      {
        type: 'run',
        name: 'Brick Run Segment',
        sets: 1, reps: 'See phase target (km)',
        desc: 'Start SLOWER than you think you need to. The first 1–2 km always feel terrible — your legs are adapting from cycling position to running. By km 3 you will find your stride. Negative split if possible.',
        demo: 'https://www.youtube.com/results?search_query=brick+run+triathlon+pacing',
      },
    ],

    // ── LONG RUN STRUCTURE (Sunday) ──────────────────────────────────
    long_run_structure: [
      {
        name: 'Warm-Up Walk / Easy Jog',
        sets: 1, reps: '5 min',
        desc: 'Start every long run with 5 min of walking or very easy jogging. Let the body find its rhythm before committing to pace.',
        demo: 'https://www.youtube.com/results?search_query=running+warm+up+walk+jog',
      },
      {
        name: 'Main Long Run',
        sets: 1, reps: 'See week target (km)',
        desc: 'Zone 2 pace — you should be able to hold a full conversation. This pace feels embarrassingly slow early on. Do it anyway. Long slow runs build the mitochondrial density that makes race pace feel manageable.',
        demo: 'https://www.youtube.com/results?search_query=zone+2+running+long+run+training',
      },
      {
        name: 'Last 2 km at Race Pace',
        sets: 1, reps: '2 km',
        desc: 'Once per week practice finishing strong. This trains the neuromuscular pattern of racing tired. Only add this from Week 8 onward when your long run exceeds 12 km.',
        demo: 'https://www.youtube.com/results?search_query=negative+split+running+race+pace',
      },
      {
        name: 'Sunday Full Mobility (post-run)',
        sets: 1, reps: '15–20 min',
        desc: 'Non-negotiable after every long run. See the Mobility tab for the full Sunday sequence.',
        demo: 'https://www.youtube.com/results?search_query=post+run+mobility+stretching+routine',
      },
    ],

    // ── MOBILITY ────────────────────────────────────────────────────
    mobility: {
      swim: [
        { name: 'Thoracic Spine Rotation', sets: 1, reps: '10 each side', desc: 'On all fours, thread one arm under the body and rotate until shoulder touches the floor. Hold 2 sec. Thoracic mobility = better body rotation in the water = more distance per stroke.' , demo: 'https://www.youtube.com/results?search_query=thoracic+spine+rotation+mobility' },
        { name: 'Doorway Chest Opener', sets: 2, reps: '30 sec each', desc: 'Arms at 90° in doorframe, lean forward gently. Counteracts the internal rotation pattern that swimming reinforces. Without this, shoulder impingement is a matter of time.' , demo: 'https://www.youtube.com/results?search_query=doorway+chest+stretch+shoulder+mobility' },
        { name: 'Shoulder Cross-Body Stretch', sets: 2, reps: '30 sec each', desc: 'Pull one arm across the chest with the opposite hand. Stretches the posterior shoulder capsule — the first thing to tighten after high-volume swim training.', demo: 'https://www.youtube.com/results?search_query=cross+body+shoulder+stretch' },
        { name: 'Lat Stretch (overhead)', sets: 2, reps: '30 sec each side', desc: 'Grab a doorframe or post overhead. Lean away and sink into the stretch. Tight lats = short swim stroke = more strokes per length = wasted energy.', demo: 'https://www.youtube.com/results?search_query=lat+stretch+overhead+band' },
        { name: 'Wrist Circles & Finger Extensions', sets: 1, reps: '2 min', desc: 'Full wrist circles both directions, then spread fingers and close. The repetitive catch motion in swimming puts enormous stress on wrists. This 2-minute routine prevents pain.', demo: 'https://www.youtube.com/results?search_query=wrist+mobility+exercises+swimming' },
        { name: 'Neck Side Tilts', sets: 1, reps: '30 sec each side', desc: 'Ear toward shoulder. Relax and let gravity do the work. Neck tightness after swimming is almost universal — this prevents the headaches and restricted breathing rotation.', demo: 'https://www.youtube.com/results?search_query=neck+side+tilt+stretch' },
      ],
      bike: [
        { name: 'Hip Flexor Lunge Stretch', sets: 2, reps: '60 sec each', desc: 'Low lunge, front foot flat. Push hips forward gently. After 90 km of cycling, hip flexors are shortened and screaming. This is the single most important stretch for cyclists.', demo: 'https://www.youtube.com/results?search_query=hip+flexor+lunge+stretch+cyclist' },
        { name: 'Pigeon Pose', sets: 2, reps: '60 sec each side', desc: 'From all fours, bring one shin forward parallel to the top of your mat. Sink the hips. Stretches the piriformis and deep hip rotators — the ones that cause "cyclist\'s butt" pain.', demo: 'https://www.youtube.com/results?search_query=pigeon+pose+yoga+cycling+recovery' },
        { name: 'Figure-4 Glute Stretch', sets: 2, reps: '45 sec each', desc: 'On back, cross ankle over opposite knee. Pull the bottom leg toward chest. Glutes tighten dramatically during cycling — this prevents the IT band issues that sabotage the run.', demo: 'https://www.youtube.com/results?search_query=figure+4+glute+stretch+piriformis' },
        { name: 'Quad Stretch', sets: 2, reps: '45 sec each', desc: 'Standing, pull foot to glute. Tuck the pelvis to deepen. Quads are the primary movers in cycling — if they stay shortened, they pull the pelvis forward and compress the lumbar spine.', demo: 'https://www.youtube.com/results?search_query=standing+quad+stretch+cyclist' },
        { name: 'Lower Back Cat-Cow', sets: 1, reps: '15 reps slow', desc: 'On all fours, arch and round the spine slowly. After hours on the bike in an aggressive position, the lumbar discs need this decompression before they can absorb the impact of running.', demo: 'https://www.youtube.com/results?search_query=cat+cow+stretch+lower+back' },
        { name: 'IT Band Foam Roll', sets: 1, reps: '60 sec each side', desc: 'Foam roll the outer thigh from hip to just above the knee. Go slowly and pause on tender spots (10 sec). IT band syndrome is the most common cycling overuse injury — prevent it here.', demo: 'https://www.youtube.com/results?search_query=it+band+foam+roll+technique' },
        { name: 'Thoracic Extension on Foam Roll', sets: 1, reps: '10 reps', desc: 'Roller under mid-back. Support head with hands. Extend over the roller one vertebra at a time. Counteracts the hunched-forward cycling posture.', demo: 'https://www.youtube.com/results?search_query=thoracic+extension+foam+roller' },
      ],
      run: [
        { name: 'Calf / Achilles Stretch', sets: 2, reps: '45 sec each (straight + bent knee)', desc: 'Straight knee targets the gastrocnemius; bent knee hits the soleus and Achilles. Both must be done. Achilles tendinopathy is the most common run injury — this prevents it.', demo: 'https://www.youtube.com/results?search_query=calf+achilles+stretch+runner' },
        { name: 'Hamstring Fold', sets: 2, reps: '45 sec each', desc: 'Seated or standing, hinge forward at the hips (NOT rounding the spine). Stretch the hamstrings, not the lower back. Tight hamstrings = reduced stride length = more effort at the same pace.', demo: 'https://www.youtube.com/results?search_query=hamstring+stretch+seated+runner' },
        { name: 'Ankle Circles', sets: 1, reps: '15 each direction', desc: 'Full range circles at the ankle. The ankle is the first thing to stiffen after long run + bike combos. Good ankle mobility protects the knee and hip up the chain.', demo: 'https://www.youtube.com/results?search_query=ankle+mobility+circles+runner' },
        { name: 'Hip 90/90 Stretch', sets: 2, reps: '60 sec each side', desc: 'Sit with both legs at 90° — one in front, one to the side. Upright spine. This position targets the internal AND external hip rotators simultaneously. The most efficient single hip stretch for runners.', demo: 'https://www.youtube.com/results?search_query=hip+90+90+stretch+runners' },
        { name: 'Glute / Piriformis Stretch', sets: 2, reps: '45 sec each', desc: 'Figure-4 or seated cross-leg. Tight piriformis causes the classic "dead leg" feeling at km 15+ of a long run. Stretch it three times per week minimum.', demo: 'https://www.youtube.com/results?search_query=piriformis+stretch+running' },
        { name: 'Shin / Toe Raises (Tibialis Anterior)', sets: 2, reps: '20 reps', desc: 'Stand flat, lift toes toward shins, lower slowly. Prevents shin splints. Most people train calves but ignore the opposing shin muscle — the imbalance causes pain by Week 10 of run training.', demo: 'https://www.youtube.com/results?search_query=tibialis+anterior+toe+raises+shin+splints' },
      ],
      full: [
        // All of the above combined — used on Sundays as the full reset
        { name: 'Full-Body Foam Roll', sets: 1, reps: '8–10 min', desc: 'Systematically roll: calves → hamstrings → glutes → IT band → quads → upper back → lats. Go slowly. This is not a warm-up — it is recovery therapy. Spend 30–60 sec on each region.', demo: 'https://www.youtube.com/results?search_query=full+body+foam+rolling+routine+recovery' },
        { name: 'Hip Flexor Lunge', sets: 2, reps: '60 sec each', desc: 'The king of triathlete stretches. Cycling destroys hip flexor length. Running with shortened hip flexors reduces stride length and overloads the lumbar. Do this every single Sunday.', demo: 'https://www.youtube.com/results?search_query=hip+flexor+lunge+deep+stretch' },
        { name: 'Pigeon Pose (Yin hold)', sets: 2, reps: '90 sec each side', desc: 'Long holds in pigeon release the connective tissue around the hip socket, not just the muscles. This is the stretch that prevents hip labrum issues in long-course racing.', demo: 'https://www.youtube.com/results?search_query=yin+pigeon+pose+deep+hold' },
        { name: 'Doorway Chest Opener', sets: 2, reps: '30 sec', desc: 'Swim posture + bike posture = both pull the chest closed. Sunday is when you undo a week of that accumulated tightness.', demo: 'https://www.youtube.com/results?search_query=doorway+chest+stretch' },
        { name: 'Thoracic Rotation', sets: 1, reps: '10 each side', desc: 'Thread the needle on all fours. Gets mobility back into the mid-spine after a week of forward-facing disciplines.', demo: 'https://www.youtube.com/results?search_query=thoracic+rotation+thread+needle' },
        { name: 'Hamstring Fold + Twist', sets: 2, reps: '45 sec each side', desc: 'Seated fold, then reach opposite arm toward the extended foot. Combines hamstring and spinal rotation — covers both in one stretch.', demo: 'https://www.youtube.com/results?search_query=seated+hamstring+spinal+twist+stretch' },
        { name: 'Calf + Achilles (bent knee)', sets: 2, reps: '45 sec each', desc: 'After a long run, the soleus (deep calf) and Achilles are the tissues most likely to develop tendinopathy. The bent-knee position is the only way to reach them.', demo: 'https://www.youtube.com/results?search_query=bent+knee+calf+soleus+stretch' },
        { name: 'Child\'s Pose', sets: 1, reps: '90 sec', desc: 'Wide knees, arms extended, forehead to floor. The final decompression of the week. Lets the spine breathe, the hips open, and the nervous system downregulate before the new training week begins.', demo: 'https://www.youtube.com/results?search_query=child+pose+yoga+recovery' },
      ],
    },

    // ── NUTRITION GUIDELINES ─────────────────────────────────────────
    nutrition: {
      daily: {
        title: 'Daily Macro Split (Training Days)',
        carbs:   { pct: 55, desc: 'Primary fuel for all 3 disciplines. Rice, oats, banana, sweet potato, bread.' },
        protein: { pct: 22, desc: '~1.6–1.8 g/kg body weight. Eggs, chicken, fish, dal, paneer, curd, protein shake.' },
        fat:     { pct: 18, desc: 'Hormonal health + long-duration fuel. Nuts, ghee, olive oil, avocado, coconut.' },
        note:    'Rest day macros: drop carbs to 45%, keep protein the same, fat can rise slightly.',
      },
      timing: [
        { label: '90 min before session',  icon: '🍛', desc: 'Complex carbs + small protein. Oats + banana, rice + curd, idli + sambar. Avoid fat or fibre — they slow digestion and cause cramping.' },
        { label: 'During sessions > 60 min', icon: '🍌', desc: '30–60 g carbs per hour. Dates (4–5), banana (1), rice balls, or sports drink. Eat earlier than you think you need to.' },
        { label: 'During sessions > 90 min', icon: '🧂', desc: 'Add electrolytes (salt + lemon water or ORS) every 45 min. Sweat sodium loss causes cramping and performance collapse.' },
        { label: '30 min after session',   icon: '🥚', desc: 'Fast carb + protein within 30 min. Eggs + toast, banana + protein shake, curd rice, or buttermilk + dates. This window is the most important meal of the day.' },
        { label: 'Race morning',           icon: '🏅', desc: '2.5–3 hrs before: large carb meal (rice, idli, banana). 1 hr before: small carb snack (banana, date, sports gel). Nothing new on race day — only foods you have trained with.' },
      ],
      phases: {
        base:  'Eat for health and recovery. No need for aggressive calorie counting. Focus on whole foods, regular meals, and adequate hydration (3–4 litres/day).',
        build: 'Increase total calories by 10–15% to match rising training volume. Add one extra carb serving post-session. Pre-hydrate aggressively before Saturday brick sessions.',
        peak:  'Highest calorie intake of the plan. Prioritise carb loading 24 hrs before the Saturday brick. Practise race-day nutrition during every Saturday and Sunday session.',
        taper: 'Reduce calories proportionally with reduced volume — do not eat at peak-week levels. Carb-load Wednesday–Friday of race week. Reduce fibre 48 hrs before race. No new foods.',
      },
      hydration: [
        '500 ml water 2 hours before every session',
        'Sip 150–200 ml every 15–20 min during training',
        'Electrolytes (ORS, coconut water, or 1/4 tsp salt + lemon) on sessions > 60 min',
        'Post-swim: drink immediately — you sweat in water without realising it',
        'Urine colour target: pale yellow (not clear, not dark amber)',
        'Race day: drink 750 ml in the 90 min before the swim start',
      ],
    },

    // ── PEAK WEEK OVERVIEW (Weeks 18–19) ────────────────────────────
    peakWeek: {
      week: 18,
      note: 'This is the hardest week of the 6-month plan. Total training volume: ~14–16 hours. Recover aggressively — sleep 8+ hrs, eat every 3–4 hrs, limit non-training activity.',
      sessions: [
        { day: 'Monday',    desc: 'Strength A (last heavy session) + Swim Mobility',           volume: '~75 min' },
        { day: 'Tuesday',   desc: 'Swim 2,600 m (race pace sets) + Easy run 6 km',             volume: '~90 min' },
        { day: 'Wednesday', desc: 'Bike 95 km (race pace last 30 km) + Bike Mobility',          volume: '~4 hrs' },
        { day: 'Thursday',  desc: '6 × 800 m run intervals @ race pace + Strength B (light)',   volume: '~90 min' },
        { day: 'Friday',    desc: 'Swim 2,400 m — all race-pace sets with sighting drills',     volume: '~70 min' },
        { day: 'Saturday',  desc: 'Brick: Bike 85 km → T2 transition → Run 17 km',             volume: '~5.5 hrs' },
        { day: 'Sunday',    desc: 'Long run 21 km (first full half-marathon distance!) + Full Mobility 20 min', volume: '~2.5 hrs' },
      ],
    },

    // ── TAPER GUIDE ──────────────────────────────────────────────────
    taperGuide: [
      { week: 21, title: 'Week 21 — Begin Taper',    desc: 'Volume −25%. Keep intensity. You should feel like you could do more — resist the urge. Trust the plan.' },
      { week: 22, title: 'Week 22 — Deep Taper',     desc: 'Volume −40%. Strength stops. Keep short bricks (45 km bike → 5 km run). Feel restless — that is race fitness accumulating.' },
      { week: 23, title: 'Week 23 — Sharpen',        desc: 'Volume −55%. Short race-pace sharpeners: 4 × 200 m swim fast, 20 km bike at race pace, 5 km run at goal pace. Legs should feel great.' },
      { week: 24, title: 'Week 24 — Race Week',      desc: 'Mon–Wed: one very easy 20-min session per day (swim, bike, run). Thu–Fri: rest. Sat/Sun: RACE. Eat well, sleep 8+ hrs, no new gear.' },
    ],
  };

  // ── WARMUPS (shared) ────────────────────────────────────────────
  if (!D.warmups) D.warmups = {};
  D.warmups.ironman_strength = [{
    name: 'Strength Warm-Up',
    sets: 1, reps: '8 min',
    desc: 'Arm circles 30 sec each → band pull-aparts 15 reps → bodyweight squats 15 reps → leg swings 10 each → hip circles 10 each. Primes the joints before loading.',
    image: '', demo: 'https://www.youtube.com/results?search_query=triathlete+strength+training+warm+up', tag: 'warmup',
  }];
  D.warmups.ironman_swim = [{
    name: 'Swim Warm-Up',
    sets: 1, reps: '200 m easy',
    desc: 'Easy freestyle × 200 m. Focus on breathing rhythm only. Let the body adapt to the water temperature and horizontal position.',
    image: '', demo: 'https://www.youtube.com/results?search_query=swim+warm+up+routine', tag: 'warmup',
  }];
  D.warmups.ironman_bike = [{
    name: 'Bike Warm-Up',
    sets: 1, reps: '10–15 min easy',
    desc: 'Start at your easiest gear, spin at 90 rpm for 10–15 min before any intensity. Gets the cardiovascular system up and lubricates the knee joints before loading.',
    image: '', demo: 'https://www.youtube.com/results?search_query=cycling+warm+up+triathlon', tag: 'warmup',
  }];
  D.warmups.ironman_run = [{
    name: 'Run Warm-Up',
    sets: 1, reps: '5 min brisk walk + 1 km easy jog',
    desc: 'Walk 5 min → slow jog 1 km. Do NOT skip this on the brick run day — your legs will be in cycling mode and need the transition time.',
    image: '', demo: 'https://www.youtube.com/results?search_query=running+warm+up+jog', tag: 'warmup',
  }];

  // ── COOLDOWNS (shared) ──────────────────────────────────────────
  if (!D.cooldowns) D.cooldowns = {};
  D.cooldowns.ironman_strength = [{
    name: 'Strength Cool-Down',
    sets: 1, reps: '5 min',
    desc: 'Slow walk 2 min → shoulder cross-body 30 sec each → standing hip flexor lunge 45 sec each → seated hamstring stretch 45 sec each.',
    image: '', demo: 'https://www.youtube.com/results?search_query=strength+training+cool+down+triathlon', tag: 'cooldown',
  }];
  D.cooldowns.ironman_bike = [{
    name: 'Bike Cool-Down + Mobility',
    sets: 1, reps: '10 min',
    desc: 'Spin easy 10 min at the end of every ride. Then: hip flexor lunge 60 sec each → pigeon pose 60 sec each → lower back cat-cow 10 reps → IT band foam roll 60 sec each.',
    image: '', demo: 'https://www.youtube.com/results?search_query=cycling+cool+down+stretching', tag: 'cooldown',
  }];
  D.cooldowns.ironman_run = [{
    name: 'Run Cool-Down',
    sets: 1, reps: '5 min',
    desc: 'Slow walk 3 min → calf stretch 45 sec each → hamstring fold 45 sec → hip 90/90 60 sec each. Never stop running and sit down — the legs need the walk to flush lactate.',
    image: '', demo: 'https://www.youtube.com/results?search_query=post+run+cool+down+triathlon', tag: 'cooldown',
  }];

})();
