// ════════════════════════════════════════════════════════════════
// CROSS TRAINING MODULE — 8-week run-strength plan
// Loaded after data.js → extends window.APP_DATA with:
//   APP_DATA.modules.crosstraining  (plan, schedule, exercises)
//   APP_DATA.warmups.crosstraining
//   APP_DATA.cooldowns.crosstraining
//
// SCHEMA (per exercise):
//   { name, sets, reps, desc, demo,
//     upgrade?: { name, equipment, reps, desc, demo } }
// `upgrade` is the optional harder/equipment variant shown directly below
// the bodyweight exercise. Users pick whichever they can do.
//
// PLAN STRUCTURE:
//   8 weeks × 4 sessions/week = 32 sessions total.
//   3 phases share day-type content:
//     Base   (wk 1–3)  → foundation strength, no plyos
//     Build  (wk 4–6)  → intensity + plyo introduction
//     Peak   (wk 7–8)  → power + advanced progressions
//   4 day-types:
//     lower      (Mon)  → squats, lunges, glutes, knees
//     mobility   (Tue)  → hips, ankles, glute activation
//     singleleg  (Thu)  → unilateral strength + plyometrics
//     posterior  (Sat)  → hamstrings, glutes, deep core
// ════════════════════════════════════════════════════════════════
(function () {
  var D = window.APP_DATA;
  if (!D) { console.error('[FitFlow] data.js must load before data-crosstraining.js'); return; }

  // ── WARMUP + COOLDOWN ──────────────────────────────────────────
  D.warmups.crosstraining = [{
    name: "Cross-Training Warm-Up",
    sets: 1,
    reps: "5 min",
    desc: "March in place 1 min → arm circles 30 sec → leg swings 10/side → hip circles 10/side → 10 bodyweight squats → high knees 30 sec. Raises core temperature and primes the muscles you're about to load.",
    image: "",
    demo: "https://www.youtube.com/results?search_query=runner+strength+training+warm+up",
    tag: "warmup",
  }];

  D.cooldowns.crosstraining = [{
    name: "Cross-Training Cool-Down",
    sets: 1,
    reps: "5 min",
    desc: "Slow walk 1 min → standing quad stretch 30 sec each → seated hamstring fold 45 sec each → pigeon stretch 45 sec each → child's pose 60 sec → deep breathing 1 min. Flushes lactate and restores muscle length so tomorrow's run feels good.",
    image: "",
    demo: "https://www.youtube.com/results?search_query=post+strength+training+cool+down+stretches",
    tag: "cooldown",
  }];

  // ── BASE PHASE — Weeks 1–3 ─────────────────────────────────────
  // Foundation strength. Lower volume, no plyometrics. Movement quality first.

  var BASE_LOWER = [
    { name:"Bodyweight Squat", sets:3, reps:"12 reps",
      desc:"Feet shoulder-width. Sit hips back and down like sitting in a chair. Knees track over toes. Drive through mid-foot to stand. 2-second descent.",
      demo:"https://www.youtube.com/results?search_query=bodyweight+squat+proper+form",
      upgrade:{ name:"Goblet Squat", equipment:"🏋️ Dumbbell", reps:"12 reps",
        desc:"Hold a dumbbell vertically at chest height. Same squat pattern. The front load forces upright torso and builds quad + glute strength faster.",
        demo:"https://www.youtube.com/results?search_query=goblet+squat+dumbbell+form" }
    },
    { name:"Reverse Lunge", sets:3, reps:"10 reps/leg",
      desc:"Step one foot back into a lunge. Back knee hovers just above floor. Drive through front heel to stand. Safer on knees than forward lunges.",
      demo:"https://www.youtube.com/results?search_query=reverse+lunge+bodyweight+form",
      upgrade:{ name:"Dumbbell Reverse Lunge", equipment:"🏋️ Dumbbells", reps:"10 reps/leg",
        desc:"Hold a dumbbell in each hand at your sides. Same lunge pattern. Added load = stronger single-leg drive for running.",
        demo:"https://www.youtube.com/results?search_query=dumbbell+reverse+lunge" }
    },
    { name:"Glute Bridge", sets:3, reps:"15 reps",
      desc:"Lie on back, knees bent, feet flat. Drive hips up by squeezing glutes — NOT by arching lower back. Hold 1 sec at top. Critical for runners.",
      demo:"https://www.youtube.com/results?search_query=glute+bridge+exercise+form",
      upgrade:{ name:"Single-Leg Glute Bridge", equipment:"Bodyweight", reps:"10 reps/leg",
        desc:"Same setup but extend one leg straight. Drive up with just the planted leg. Exposes side-to-side strength imbalances common in runners.",
        demo:"https://www.youtube.com/results?search_query=single+leg+glute+bridge" }
    },
    { name:"Standing Calf Raises", sets:3, reps:"20 reps",
      desc:"Rise onto balls of feet, pause 1 sec at top, lower slowly. Calves take huge load in running — train them or they'll get injured.",
      demo:"https://www.youtube.com/results?search_query=standing+calf+raise+form",
      upgrade:{ name:"Single-Leg Calf Raises", equipment:"Wall/Chair", reps:"15 reps/leg",
        desc:"Stand on one foot, hand on wall for balance. Full-range single-leg calf raises. Way harder than it sounds — find each calf's real strength.",
        demo:"https://www.youtube.com/results?search_query=single+leg+calf+raise" }
    },
    { name:"Forearm Plank", sets:3, reps:"30 sec hold",
      desc:"Forearms on floor, body in a straight line head to heels. Squeeze glutes, brace abs. Don't let hips sag or pike. Build to 60 sec by end of Base.",
      demo:"https://www.youtube.com/results?search_query=forearm+plank+proper+form",
      upgrade:{ name:"Plank with Shoulder Taps", equipment:"Bodyweight", reps:"10 taps/side",
        desc:"High plank. Tap opposite shoulder with alternating hands. Keep hips square — don't rock. Builds anti-rotation strength runners need.",
        demo:"https://www.youtube.com/results?search_query=plank+shoulder+taps" }
    },
  ];

  var BASE_MOBILITY = [
    { name:"World's Greatest Stretch", sets:2, reps:"5 reps/side",
      desc:"Step into a deep lunge. Lower opposite elbow to instep. Rotate same-side arm to the sky. Step through and switch. Hits hips, T-spine, ankles in one move.",
      demo:"https://www.youtube.com/results?search_query=worlds+greatest+stretch" },
    { name:"Hip Flexor Lunge Stretch", sets:2, reps:"30 sec/side",
      desc:"Half-kneeling lunge position. Tuck pelvis under and gently shift forward. Should feel a stretch deep in the front of the hip of the kneeling leg. Runners' weak spot.",
      demo:"https://www.youtube.com/results?search_query=hip+flexor+stretch+runners" },
    { name:"Clamshells", sets:2, reps:"15 reps/side",
      desc:"Side-lying, knees bent and stacked. Keep feet together. Lift top knee without rolling backwards. Activates glute medius — the muscle that stabilizes your pelvis when you run.",
      demo:"https://www.youtube.com/results?search_query=clamshell+exercise+glute+medius",
      upgrade:{ name:"Banded Clamshells", equipment:"🎯 Resistance band", reps:"15 reps/side",
        desc:"Same movement with a mini-band around knees. Far more glute medius activation. The band turns this into a serious strengthener.",
        demo:"https://www.youtube.com/results?search_query=banded+clamshells" }
    },
    { name:"Slow Glute Bridge", sets:2, reps:"12 reps",
      desc:"Standard glute bridge but with a 3-second hold at the top while squeezing glutes hard. This is pure activation, not strength — wake up the glutes before single-leg work.",
      demo:"https://www.youtube.com/results?search_query=glute+bridge+activation" },
    { name:"Bird Dog", sets:2, reps:"8 reps/side",
      desc:"On hands and knees. Extend opposite arm + leg slowly. Hold 2 sec at full extension. Don't twist hips. Builds anti-rotation core strength.",
      demo:"https://www.youtube.com/results?search_query=bird+dog+exercise+form",
      upgrade:{ name:"Bird Dog with Dumbbell", equipment:"🏋️ Light dumbbell", reps:"8 reps/side",
        desc:"Same exercise, holding a light dumbbell in the extending hand. Forces serious core stability. Use light weight (1–3 kg).",
        demo:"https://www.youtube.com/results?search_query=bird+dog+dumbbell+variation" }
    },
    { name:"Calf Stretch + Ankle Circles", sets:2, reps:"30 sec each",
      desc:"Lean into a wall, back leg straight with heel down (gastrocnemius), then bent (soleus). 30 sec each. Then 10 ankle circles each direction. Calf flexibility = injury prevention.",
      demo:"https://www.youtube.com/results?search_query=calf+stretch+ankle+mobility+runners" },
    { name:"Dead Bug", sets:2, reps:"10 reps",
      desc:"Lie on back, arms straight up, knees over hips at 90°. Slowly lower opposite arm + leg toward floor. Keep lower back pressed FLAT to floor. Reset and switch.",
      demo:"https://www.youtube.com/results?search_query=dead+bug+core+exercise" },
  ];

  var BASE_SINGLELEG = [
    { name:"Walking Lunge", sets:3, reps:"10 reps/leg",
      desc:"Step forward into a deep lunge. Back knee almost touches floor. Drive through front heel to step into the next lunge. Keep torso tall throughout.",
      demo:"https://www.youtube.com/results?search_query=walking+lunge+form",
      upgrade:{ name:"Dumbbell Walking Lunge", equipment:"🏋️ Dumbbells", reps:"10 reps/leg",
        desc:"Hold dumbbells at sides. Same walking lunge pattern. The load makes this a serious single-leg strength builder.",
        demo:"https://www.youtube.com/results?search_query=dumbbell+walking+lunge" }
    },
    { name:"Step-Up", sets:3, reps:"10 reps/leg",
      desc:"Step onto a sturdy chair or box (knee-height max). Drive through the up-leg's heel — don't push off the back foot. Step down with control.",
      demo:"https://www.youtube.com/results?search_query=step+up+exercise+form",
      upgrade:{ name:"Dumbbell Step-Up", equipment:"🏋️ Dumbbells + chair/box", reps:"10 reps/leg",
        desc:"Hold dumbbells at sides. Same step-up. Closest movement to actually running uphill.",
        demo:"https://www.youtube.com/results?search_query=dumbbell+step+up" }
    },
    { name:"Single-Leg Romanian Deadlift", sets:3, reps:"8 reps/leg",
      desc:"Stand on one leg. Hinge at hips — back stays flat, opposite leg extends behind you for balance. Reach toward floor with both hands. Squeeze glute to return. The #1 hamstring-and-balance move for runners.",
      demo:"https://www.youtube.com/results?search_query=single+leg+romanian+deadlift+bodyweight",
      upgrade:{ name:"Dumbbell Single-Leg RDL", equipment:"🏋️ Dumbbell", reps:"8 reps/leg",
        desc:"Hold one dumbbell in the hand opposite the planted leg. Same hinge pattern. Loaded version is gold for runners.",
        demo:"https://www.youtube.com/results?search_query=single+leg+rdl+dumbbell" }
    },
    { name:"Lateral Lunge", sets:3, reps:"10 reps/leg",
      desc:"Step wide to the side, sit hips back, push knee out over toes. Opposite leg stays straight. Push off to return. Works frontal-plane stability runners rarely train.",
      demo:"https://www.youtube.com/results?search_query=lateral+lunge+bodyweight",
      upgrade:{ name:"Goblet Lateral Lunge", equipment:"🏋️ Dumbbell", reps:"10 reps/leg",
        desc:"Hold a dumbbell at chest. Same lateral lunge. The load deepens the squat and lights up the glute medius.",
        demo:"https://www.youtube.com/results?search_query=goblet+lateral+lunge" }
    },
    { name:"Single-Leg Calf Raise", sets:3, reps:"12 reps/leg",
      desc:"Stand on one foot, opposite hand on wall for balance. Full range — heel below the step if possible. The single biggest predictor of calf injury risk in runners.",
      demo:"https://www.youtube.com/results?search_query=single+leg+calf+raise+runners" },
    { name:"Side Plank", sets:2, reps:"30 sec/side",
      desc:"Forearm on floor, body in straight line, hips lifted. Don't sag at the waist. Builds the lateral chain that keeps your pelvis level when you run.",
      demo:"https://www.youtube.com/results?search_query=side+plank+proper+form" },
  ];

  var BASE_POSTERIOR = [
    { name:"Glute Bridge", sets:3, reps:"15 reps",
      desc:"Lie on back, feet flat, knees bent. Drive hips up by squeezing glutes (not pushing through lower back). Hold 2 sec at top.",
      demo:"https://www.youtube.com/results?search_query=glute+bridge+exercise+form",
      upgrade:{ name:"Single-Leg Glute Bridge", equipment:"Bodyweight", reps:"10 reps/leg",
        desc:"Same setup but extend one leg straight out. Drive up with just the planted leg. Exposes left-right imbalances.",
        demo:"https://www.youtube.com/results?search_query=single+leg+glute+bridge" }
    },
    { name:"Superman Hold", sets:3, reps:"10 reps (2-sec hold)",
      desc:"Lie face-down, arms extended overhead. Lift arms, chest, and legs off floor simultaneously. Hold 2 sec at top. Strengthens lower back + glutes.",
      demo:"https://www.youtube.com/results?search_query=superman+exercise+back" },
    { name:"Bird Dog", sets:3, reps:"8 reps/side",
      desc:"Hands and knees. Extend opposite arm + leg slowly. Hold 2 sec at full extension. No hip twisting. Builds anti-rotation core.",
      demo:"https://www.youtube.com/results?search_query=bird+dog+exercise+form",
      upgrade:{ name:"Bird Dog with Dumbbell", equipment:"🏋️ Light dumbbell", reps:"8 reps/side",
        desc:"Hold a light dumbbell in the extending hand. Forces serious core stability.",
        demo:"https://www.youtube.com/results?search_query=bird+dog+dumbbell" }
    },
    { name:"Dead Bug", sets:3, reps:"10 reps",
      desc:"Lie on back, arms up, knees at 90°. Lower opposite arm + leg toward floor slowly. Lower back stays glued to floor — that's the whole drill.",
      demo:"https://www.youtube.com/results?search_query=dead+bug+core" },
    { name:"Hollow Body Hold", sets:3, reps:"20 sec",
      desc:"Lie on back, lower back pressed FLAT to floor. Lift shoulders and legs slightly. Arms by ears (or crossed if too hard). The foundation of every advanced core skill.",
      demo:"https://www.youtube.com/results?search_query=hollow+body+hold+form",
      upgrade:{ name:"Hollow Rocks", equipment:"Bodyweight", reps:"15 rocks",
        desc:"Same hollow position, rock front to back. Lower back never leaves floor. Way harder than the hold.",
        demo:"https://www.youtube.com/results?search_query=hollow+rocks+exercise" }
    },
    { name:"Russian Twist", sets:3, reps:"20 reps total",
      desc:"Sit with knees bent, lean back to ~45°, feet off floor or down. Rotate torso, touching floor on each side. Slow controlled rotation, not flailing.",
      demo:"https://www.youtube.com/results?search_query=russian+twist+exercise",
      upgrade:{ name:"Weighted Russian Twist", equipment:"🏋️ Dumbbell", reps:"20 reps total",
        desc:"Hold a light dumbbell with both hands. Same twist. The added load multiplies oblique work.",
        demo:"https://www.youtube.com/results?search_query=weighted+russian+twist" }
    },
  ];

  // ── BUILD PHASE — Weeks 4–6 ────────────────────────────────────
  // Intensity ramps up. Plyometrics introduced. Single-leg work emphasized.

  var BUILD_LOWER = [
    { name:"Bodyweight Squat", sets:3, reps:"15 reps",
      desc:"Deeper, slower than Base. 3-sec descent, 1-sec pause at bottom. Quality counts more than speed.",
      demo:"https://www.youtube.com/results?search_query=bodyweight+squat+form",
      upgrade:{ name:"Goblet Squat", equipment:"🏋️ Dumbbell", reps:"15 reps",
        desc:"Hold dumbbell at chest. Deeper depth, slower tempo than Base phase.",
        demo:"https://www.youtube.com/results?search_query=goblet+squat" }
    },
    { name:"Bulgarian Split Squat", sets:3, reps:"8 reps/leg",
      desc:"Rear foot on a chair behind you. Front foot far enough forward that the knee tracks over the ankle at the bottom. The single most run-specific strength exercise there is.",
      demo:"https://www.youtube.com/results?search_query=bulgarian+split+squat+form",
      upgrade:{ name:"Dumbbell Bulgarian Split Squat", equipment:"🏋️ Dumbbells", reps:"8 reps/leg",
        desc:"Same setup, holding dumbbells at sides. Brutal but exactly what runners need.",
        demo:"https://www.youtube.com/results?search_query=dumbbell+bulgarian+split+squat" }
    },
    { name:"Single-Leg Glute Bridge", sets:3, reps:"10 reps/leg",
      desc:"Lie on back, one foot flat, other leg extended. Drive hip up with the planted leg's glute. Don't let hips sag toward the working side.",
      demo:"https://www.youtube.com/results?search_query=single+leg+glute+bridge",
      upgrade:{ name:"Foot-Elevated Single-Leg Bridge", equipment:"Chair/Couch", reps:"10 reps/leg",
        desc:"Same setup but planted foot is on a chair. Increased range of motion makes this 2× harder.",
        demo:"https://www.youtube.com/results?search_query=elevated+single+leg+glute+bridge" }
    },
    { name:"Calf Raises (Slow Tempo)", sets:3, reps:"20 reps (3-sec down)",
      desc:"3-sec descent on every rep. Pause at the bottom. The eccentric (lowering) phase is where calf-injury prevention happens.",
      demo:"https://www.youtube.com/results?search_query=eccentric+calf+raise",
      upgrade:{ name:"Single-Leg Calf Raise from Step", equipment:"Step/edge", reps:"15 reps/leg",
        desc:"Ball of foot on edge of step, heel drops below step level for full ROM. Most runners can't do 20 of these — that's a problem to fix.",
        demo:"https://www.youtube.com/results?search_query=single+leg+calf+raise+step" }
    },
    { name:"Bird Dog", sets:3, reps:"10 reps/side",
      desc:"Slower than Base. 3-sec hold at full extension. Eyes down, neck neutral. No hip rotation.",
      demo:"https://www.youtube.com/results?search_query=bird+dog+core",
      upgrade:{ name:"Bird Dog with Dumbbell", equipment:"🏋️ Light dumbbell", reps:"10 reps/side",
        desc:"Hold a light dumbbell in the extending hand. Way harder than it looks.",
        demo:"https://www.youtube.com/results?search_query=bird+dog+dumbbell+variation" }
    },
    { name:"Forearm Plank", sets:3, reps:"45 sec hold",
      desc:"Build to 60 sec by end of Build phase. Strict form throughout — no hip sag, no piking.",
      demo:"https://www.youtube.com/results?search_query=forearm+plank+form",
      upgrade:{ name:"Plank with Alternating Reach", equipment:"Bodyweight", reps:"8 reaches/side",
        desc:"From a high plank, slowly reach one hand forward 6 inches and tap floor. Return. Switch. Anti-rotation under load.",
        demo:"https://www.youtube.com/results?search_query=plank+with+reach" }
    },
  ];

  var BUILD_MOBILITY = [
    { name:"World's Greatest Stretch", sets:2, reps:"5 reps/side",
      desc:"Same move from Base — quality over volume here. The full sequence: deep lunge, elbow to instep, T-spine rotation.",
      demo:"https://www.youtube.com/results?search_query=worlds+greatest+stretch" },
    { name:"Hip Flexor Stretch with Reach", sets:2, reps:"45 sec/side",
      desc:"Half-kneeling lunge. Tuck pelvis. Reach overhead with the arm on the kneeling side, leaning slightly away. Deepest hip-flexor stretch most runners ever feel.",
      demo:"https://www.youtube.com/results?search_query=hip+flexor+stretch+reach+overhead" },
    { name:"Clamshells", sets:3, reps:"15 reps/side",
      desc:"Side-lying. Knees bent. Lift top knee without rolling backwards. Fire glute medius — the key runner stabilizer.",
      demo:"https://www.youtube.com/results?search_query=clamshell+exercise",
      upgrade:{ name:"Banded Clamshells", equipment:"🎯 Resistance band", reps:"15 reps/side",
        desc:"Mini-band around knees. The band makes this a real strengthener, not just an activation drill.",
        demo:"https://www.youtube.com/results?search_query=banded+clamshells" }
    },
    { name:"Glute Bridge (5-sec hold)", sets:3, reps:"12 reps",
      desc:"Drive up, then hold 5 full seconds at the top while squeezing glutes hard. Activation work — wake them up before single-leg day Thursday.",
      demo:"https://www.youtube.com/results?search_query=glute+bridge+hold+activation" },
    { name:"Bird Dog", sets:3, reps:"10 reps/side",
      desc:"Opposite arm + leg extension. 2-sec pause at full extension. The cleaner this gets, the more your running form holds up at the end of long runs.",
      demo:"https://www.youtube.com/results?search_query=bird+dog+exercise" },
    { name:"Calf Stretch + Ankle Mobility", sets:2, reps:"45 sec each",
      desc:"Wall calf stretch — straight leg + bent leg, 45 sec each. Then 10 ankle rolls each direction. Stiff ankles → bad calf mechanics → injury.",
      demo:"https://www.youtube.com/results?search_query=calf+stretch+ankle+mobility" },
    { name:"Dead Bug (Slow Tempo)", sets:3, reps:"10 reps",
      desc:"3-sec lower, 1-sec at bottom, 2-sec return. Lower back stays glued to the floor. Brutal when slow.",
      demo:"https://www.youtube.com/results?search_query=dead+bug+slow+tempo",
      upgrade:{ name:"Weighted Dead Bug", equipment:"🏋️ Light dumbbell", reps:"10 reps",
        desc:"Hold a light dumbbell in both hands overhead. Same slow tempo. Loads the anti-extension pattern.",
        demo:"https://www.youtube.com/results?search_query=weighted+dead+bug" }
    },
  ];

  var BUILD_SINGLELEG = [
    { name:"Squat Jumps", sets:3, reps:"6 reps (soft landings)",
      desc:"Squat down, explode up as high as you can, land softly back into the squat. The landing is more important than the jump — absorb force with bent knees and hips.",
      demo:"https://www.youtube.com/results?search_query=squat+jump+plyometric",
      upgrade:{ name:"Pause Squat Jump", equipment:"Bodyweight", reps:"6 reps",
        desc:"Same jump but pause 1 full second at the bottom of each squat before exploding up. Removes the stretch-shortening cycle — pure leg power.",
        demo:"https://www.youtube.com/results?search_query=pause+squat+jump" }
    },
    { name:"Walking Lunge", sets:3, reps:"12 reps/leg",
      desc:"Deep lunges, slightly faster pace than Base. Stay tall, drive through the front heel.",
      demo:"https://www.youtube.com/results?search_query=walking+lunge",
      upgrade:{ name:"Dumbbell Walking Lunge", equipment:"🏋️ Dumbbells", reps:"12 reps/leg",
        desc:"Dumbbells at sides. The single best strength move for running performance, full stop.",
        demo:"https://www.youtube.com/results?search_query=dumbbell+walking+lunge" }
    },
    { name:"Lateral Bounds", sets:3, reps:"8 reps (4/side)",
      desc:"Stand on one leg. Push off sideways, land on the opposite leg, stick the landing for 1 sec. Trains the lateral stability that prevents IT-band issues.",
      demo:"https://www.youtube.com/results?search_query=lateral+bound+plyometric",
      upgrade:{ name:"Continuous Lateral Bounds", equipment:"Bodyweight", reps:"10 reps (5/side)",
        desc:"Same bounds but without the 1-sec stick — flow side to side continuously, focus on covering more distance with each bound.",
        demo:"https://www.youtube.com/results?search_query=continuous+lateral+bounds" }
    },
    { name:"Single-Leg Romanian Deadlift", sets:3, reps:"10 reps/leg",
      desc:"Hinge at hips, opposite leg straight behind you. Back stays flat. Slowest possible tempo.",
      demo:"https://www.youtube.com/results?search_query=single+leg+rdl+bodyweight",
      upgrade:{ name:"Dumbbell Single-Leg RDL", equipment:"🏋️ Dumbbell", reps:"10 reps/leg",
        desc:"Dumbbell in opposite hand to the planted leg. Hamstring strength + balance + control in one move.",
        demo:"https://www.youtube.com/results?search_query=single+leg+rdl+dumbbell" }
    },
    { name:"Step-Up with Knee Drive", sets:3, reps:"10 reps/leg",
      desc:"Step onto chair/box, drive the opposite knee high up (like a sprinter). Pause 1 sec at top. Trains the exact movement pattern of running.",
      demo:"https://www.youtube.com/results?search_query=step+up+knee+drive",
      upgrade:{ name:"Loaded Step-Up + Knee Drive", equipment:"🏋️ Dumbbells", reps:"10 reps/leg",
        desc:"Hold dumbbells at sides. Same knee drive at top. Best simulator for uphill running.",
        demo:"https://www.youtube.com/results?search_query=weighted+step+up+knee+drive" }
    },
    { name:"Side Plank", sets:2, reps:"45 sec/side",
      desc:"Body straight, hips lifted, don't sag at the waist. The lateral chain is where runners' form breaks down first under fatigue.",
      demo:"https://www.youtube.com/results?search_query=side+plank+form" },
  ];

  var BUILD_POSTERIOR = [
    { name:"Single-Leg Glute Bridge", sets:3, reps:"10 reps/leg",
      desc:"One foot flat, other leg extended. Drive up with planted leg. Pause 2 sec at top, squeezing glute.",
      demo:"https://www.youtube.com/results?search_query=single+leg+glute+bridge",
      upgrade:{ name:"Foot-Elevated Single-Leg Bridge", equipment:"Chair/Couch", reps:"10 reps/leg",
        desc:"Foot on a chair. Larger range of motion, much harder.",
        demo:"https://www.youtube.com/results?search_query=elevated+single+leg+glute+bridge" }
    },
    { name:"Bodyweight Romanian Deadlift", sets:3, reps:"12 reps",
      desc:"Feet hip-width. Hinge at hips, push butt back, slight bend in knees. Back stays flat. Reach hands toward shins. Squeeze glutes to stand.",
      demo:"https://www.youtube.com/results?search_query=bodyweight+romanian+deadlift",
      upgrade:{ name:"Dumbbell Romanian Deadlift", equipment:"🏋️ Dumbbells", reps:"12 reps",
        desc:"Hold dumbbells in front. Same hinge pattern. Brutal hamstring work.",
        demo:"https://www.youtube.com/results?search_query=dumbbell+romanian+deadlift" }
    },
    { name:"Reverse Plank", sets:3, reps:"30 sec",
      desc:"Sit on floor, hands behind hips, push hips up so body is in a straight line facing the ceiling. Squeeze glutes to hold position.",
      demo:"https://www.youtube.com/results?search_query=reverse+plank+exercise",
      upgrade:{ name:"Single-Leg Reverse Plank", equipment:"Bodyweight", reps:"20 sec/leg",
        desc:"Lift one leg off the floor while holding the reverse plank. Switch midway.",
        demo:"https://www.youtube.com/results?search_query=single+leg+reverse+plank" }
    },
    { name:"Bird Dog (Slow Tempo)", sets:3, reps:"10 reps/side",
      desc:"3-sec extension, 2-sec hold at full extension, 2-sec return. Zero rotation through the spine.",
      demo:"https://www.youtube.com/results?search_query=bird+dog+slow",
      upgrade:{ name:"Bird Dog with Dumbbell", equipment:"🏋️ Light dumbbell", reps:"10 reps/side",
        desc:"Dumbbell in the extending hand. Forces real core stability under load.",
        demo:"https://www.youtube.com/results?search_query=bird+dog+dumbbell" }
    },
    { name:"Hollow Body Hold", sets:3, reps:"30 sec",
      desc:"Lower back flat, shoulders and legs up. Build to a full minute by end of Build phase.",
      demo:"https://www.youtube.com/results?search_query=hollow+body+hold",
      upgrade:{ name:"Hollow Rocks", equipment:"Bodyweight", reps:"20 rocks",
        desc:"Rock front-to-back in hollow position. Lower back never leaves the floor.",
        demo:"https://www.youtube.com/results?search_query=hollow+rocks" }
    },
    { name:"Bicycle Crunches", sets:3, reps:"20 reps total",
      desc:"Lie on back, knees up. Opposite elbow to opposite knee, alternating. SLOW — not flailing speed. Rotation comes from the core, not the arms.",
      demo:"https://www.youtube.com/results?search_query=bicycle+crunches+form" },
  ];

  // ── PEAK PHASE — Weeks 7–8 ─────────────────────────────────────
  // Power + advanced progressions. Full plyometrics. Hardest variations.

  var PEAK_LOWER = [
    { name:"Jump Squats", sets:3, reps:"8 reps",
      desc:"Squat down, explode up. Land softly back into a squat. Reset stance and repeat. Power production exercise — peak phase only.",
      demo:"https://www.youtube.com/results?search_query=jump+squat+plyometric",
      upgrade:{ name:"Box Jump", equipment:"Sturdy chair/box", reps:"8 reps (step down)",
        desc:"Jump onto sturdy chair or box, stand tall. STEP down (don't jump down). Best raw power exercise for runners.",
        demo:"https://www.youtube.com/results?search_query=box+jump+plyometric" }
    },
    { name:"Bulgarian Split Squat", sets:4, reps:"10 reps/leg",
      desc:"Rear foot elevated. Deep lunge. The 4 sets of 10/leg is your hardest set of the phase. It's supposed to suck.",
      demo:"https://www.youtube.com/results?search_query=bulgarian+split+squat",
      upgrade:{ name:"Dumbbell Bulgarian Split Squat", equipment:"🏋️ Dumbbells", reps:"10 reps/leg",
        desc:"Dumbbells at sides. 4 sets of 10/leg. This is the king of single-leg strength exercises.",
        demo:"https://www.youtube.com/results?search_query=dumbbell+bulgarian+split+squat" }
    },
    { name:"Single-Leg Hip Thrust", sets:3, reps:"10 reps/leg",
      desc:"Upper back on a couch/bench/chair. One foot flat on floor, other leg extended. Drive the planted-side hip up. The most direct way to build glute power.",
      demo:"https://www.youtube.com/results?search_query=single+leg+hip+thrust+couch",
      upgrade:{ name:"Weighted Single-Leg Hip Thrust", equipment:"🏋️ Dumbbell", reps:"10 reps/leg",
        desc:"Dumbbell across hip crease. Drive hips up. The single best glute exercise on earth — research-backed.",
        demo:"https://www.youtube.com/results?search_query=weighted+single+leg+hip+thrust" }
    },
    { name:"Single-Leg Calf Raise", sets:3, reps:"15 reps/leg",
      desc:"One foot, full range, slow descent. Hand on wall for balance only — don't push through it.",
      demo:"https://www.youtube.com/results?search_query=single+leg+calf+raise",
      upgrade:{ name:"Deficit Single-Leg Calf Raise", equipment:"Step/edge", reps:"15 reps/leg",
        desc:"Ball of foot on edge of step, heel drops below for full stretch. The gold-standard calf exercise for runners.",
        demo:"https://www.youtube.com/results?search_query=deficit+calf+raise" }
    },
    { name:"Plank with Alternating Reach", sets:3, reps:"8 reps/side",
      desc:"High plank. Reach one hand forward, tap floor, return. Switch. Hips stay square — zero rotation. Pure anti-rotation strength.",
      demo:"https://www.youtube.com/results?search_query=plank+with+reach",
      upgrade:{ name:"Weighted Plank Reach", equipment:"🏋️ Light dumbbell", reps:"8 reps/side",
        desc:"Light dumbbell on the floor in front. Reach forward and tap the dumbbell. Heavier reach = more anti-rotation challenge.",
        demo:"https://www.youtube.com/results?search_query=plank+reach+dumbbell" }
    },
  ];

  var PEAK_MOBILITY = [
    { name:"World's Greatest Stretch", sets:2, reps:"6 reps/side",
      desc:"Add a hold at the deepest position. Hips, T-spine, ankles all in one. Mobility maintenance for race-ready runners.",
      demo:"https://www.youtube.com/results?search_query=worlds+greatest+stretch" },
    { name:"Hip Flexor Stretch with Overhead Reach", sets:2, reps:"45 sec/side",
      desc:"Half-kneeling. Tuck pelvis. Reach overhead and slightly toward the opposite side. Open the entire front of the body.",
      demo:"https://www.youtube.com/results?search_query=hip+flexor+stretch+overhead" },
    { name:"Clamshells", sets:3, reps:"20 reps/side",
      desc:"Higher reps for activation endurance. Don't let the top hip roll backwards.",
      demo:"https://www.youtube.com/results?search_query=clamshell+exercise",
      upgrade:{ name:"Banded Clamshells", equipment:"🎯 Resistance band", reps:"20 reps/side",
        desc:"Mini-band around knees. Glute medius endurance under tension.",
        demo:"https://www.youtube.com/results?search_query=banded+clamshells" }
    },
    { name:"Glute Bridge with 5-sec Hold", sets:3, reps:"12 reps",
      desc:"5-sec hold at top of every rep. Squeeze glutes HARD — should feel them burning by rep 8.",
      demo:"https://www.youtube.com/results?search_query=glute+bridge+hold" },
    { name:"Bird Dog", sets:3, reps:"12 reps/side",
      desc:"Eyes down, neck neutral, hips square. Highest rep count of the program — by now this should feel easy.",
      demo:"https://www.youtube.com/results?search_query=bird+dog",
      upgrade:{ name:"Bird Dog with Dumbbell", equipment:"🏋️ Light dumbbell", reps:"12 reps/side",
        desc:"Dumbbell in extending hand. Real core stability test.",
        demo:"https://www.youtube.com/results?search_query=bird+dog+dumbbell" }
    },
    { name:"Calf Stretch + Ankle Mobility", sets:2, reps:"60 sec each",
      desc:"Wall calf stretch (straight + bent leg), then 15 ankle rolls each direction. The longer holds matter for tissue change.",
      demo:"https://www.youtube.com/results?search_query=calf+stretch+ankle+mobility" },
    { name:"Dead Bug (Slow)", sets:3, reps:"12 reps",
      desc:"3-sec lower, 1-sec hold, 2-sec return. Lower back never lifts. Highest dose of the program.",
      demo:"https://www.youtube.com/results?search_query=dead+bug+slow",
      upgrade:{ name:"Weighted Dead Bug", equipment:"🏋️ Light dumbbell", reps:"12 reps",
        desc:"Dumbbell held overhead. The added load makes it a serious anti-extension challenge.",
        demo:"https://www.youtube.com/results?search_query=weighted+dead+bug" }
    },
  ];

  var PEAK_SINGLELEG = [
    { name:"Broad Jumps", sets:3, reps:"5 reps (stick the landing)",
      desc:"Squat down, explode forward as far as possible. STICK the landing — bent knees, hold 1 sec. Then walk back, reset, repeat. Horizontal power = running power.",
      demo:"https://www.youtube.com/results?search_query=broad+jump+plyometric",
      upgrade:{ name:"Broad Jump + 2-sec Hold", equipment:"Bodyweight", reps:"5 reps",
        desc:"Same jump but hold the landing position for 2 full seconds. Builds insane landing mechanics.",
        demo:"https://www.youtube.com/results?search_query=broad+jump+stick+landing" }
    },
    { name:"Continuous Squat Jumps", sets:3, reps:"8 reps",
      desc:"Jump, land, immediately re-jump. No pause. Trains the reactive strength of the calves and quads — pure speed work.",
      demo:"https://www.youtube.com/results?search_query=continuous+squat+jumps",
      upgrade:{ name:"Tuck Jumps", equipment:"Bodyweight", reps:"8 reps",
        desc:"Jump up and pull knees toward chest at the peak. Land soft, immediately re-jump. Hardest bodyweight plyo there is.",
        demo:"https://www.youtube.com/results?search_query=tuck+jumps" }
    },
    { name:"Continuous Lateral Bounds", sets:3, reps:"10 reps (5/side)",
      desc:"Push off one leg, land on the other, immediately bound back. Cover ground side to side. Pure lateral power and stability.",
      demo:"https://www.youtube.com/results?search_query=lateral+bound",
      upgrade:{ name:"Long Lateral Bounds", equipment:"Bodyweight", reps:"10 reps (5/side)",
        desc:"Same bounds but jump as FAR sideways as you can each time. Land stable. Build glute medius power.",
        demo:"https://www.youtube.com/results?search_query=long+lateral+bound" }
    },
    { name:"Single-Leg Hops Forward", sets:3, reps:"10 hops/leg",
      desc:"Stand on one leg. Hop forward 10 times in a row on the same leg. Soft landings, stay tall. Reactive single-leg strength = injury prevention.",
      demo:"https://www.youtube.com/results?search_query=single+leg+hop+plyometric",
      upgrade:{ name:"Long Single-Leg Hops", equipment:"Bodyweight", reps:"8 hops/leg",
        desc:"Same hops but as far forward as possible each one. Land stable for 1 sec, then hop again.",
        demo:"https://www.youtube.com/results?search_query=long+single+leg+hops" }
    },
    { name:"Pistol Squat (Assisted)", sets:3, reps:"5 reps/leg",
      desc:"Hold a doorframe or chair for assistance. Sit back on one leg, opposite leg extended forward. Lower to a deep squat, stand back up. Most people fall over their first time — use plenty of assistance.",
      demo:"https://www.youtube.com/results?search_query=assisted+pistol+squat",
      upgrade:{ name:"Box Pistol Squat", equipment:"Sturdy chair/box", reps:"5 reps/leg",
        desc:"Sit on a chair, stand up using only one leg. Reverse pistol pattern. Easier than free-standing pistols but builds the same strength.",
        demo:"https://www.youtube.com/results?search_query=box+pistol+squat" }
    },
    { name:"Side Plank with Hip Dip", sets:3, reps:"45 sec/side",
      desc:"Side plank position. Slowly dip hip toward floor, then lift back up. Continuous reps. Brutal obliques and glute medius work.",
      demo:"https://www.youtube.com/results?search_query=side+plank+hip+dip" },
  ];

  var PEAK_POSTERIOR = [
    { name:"Single-Leg Hip Thrust", sets:3, reps:"10 reps/leg",
      desc:"Upper back on chair/couch. One foot flat, opposite leg extended. Drive planted-side hip up. Pause 2 sec at top.",
      demo:"https://www.youtube.com/results?search_query=single+leg+hip+thrust",
      upgrade:{ name:"Weighted Single-Leg Hip Thrust", equipment:"🏋️ Dumbbell", reps:"10 reps/leg",
        desc:"Dumbbell across hip crease. Best glute power exercise on earth, no exaggeration.",
        demo:"https://www.youtube.com/results?search_query=weighted+single+leg+hip+thrust" }
    },
    { name:"Single-Leg Romanian Deadlift", sets:4, reps:"10 reps/leg",
      desc:"4 sets is no joke. Slow tempo. Back flat. Opposite leg straight behind you. Reach toward the floor.",
      demo:"https://www.youtube.com/results?search_query=single+leg+rdl",
      upgrade:{ name:"Dumbbell Single-Leg RDL", equipment:"🏋️ Dumbbells", reps:"10 reps/leg",
        desc:"Dumbbells in both hands or one in opposite hand. Hardest variation in the program.",
        demo:"https://www.youtube.com/results?search_query=dumbbell+single+leg+rdl" }
    },
    { name:"Nordic Curl Negatives", sets:3, reps:"5 slow reps",
      desc:"Anchor feet under a sturdy couch or have a partner hold them. Kneel up tall. Lower SLOWLY (5-8 sec) toward the floor with hamstrings only. Catch with hands. Best hamstring exercise on earth — also the hardest.",
      demo:"https://www.youtube.com/results?search_query=nordic+curl+negative",
      upgrade:{ name:"Slow Nordic Curl Negatives", equipment:"Anchor for feet", reps:"5 reps (8-sec descent)",
        desc:"Same exercise but stretch the descent to 8 full seconds. Eccentric overload is where hamstrings grow fastest.",
        demo:"https://www.youtube.com/results?search_query=slow+nordic+curl" }
    },
    { name:"Hollow Rocks", sets:3, reps:"15 reps",
      desc:"Hollow body position, rock front to back like a banana. Lower back stays glued to the floor throughout. Real test of core strength.",
      demo:"https://www.youtube.com/results?search_query=hollow+rocks",
      upgrade:{ name:"Weighted Hollow Rocks", equipment:"🏋️ Light dumbbell", reps:"15 reps",
        desc:"Hold a light dumbbell at chest. Rocking with added load takes this to gymnastics-level core work.",
        demo:"https://www.youtube.com/results?search_query=weighted+hollow+rocks" }
    },
    { name:"V-Ups", sets:3, reps:"12 reps",
      desc:"Lie flat, arms overhead. Simultaneously lift legs and torso to meet in the middle, hands toward feet. Lower with control. Full core engagement.",
      demo:"https://www.youtube.com/results?search_query=v+ups+exercise",
      upgrade:{ name:"Weighted V-Ups", equipment:"🏋️ Light dumbbell", reps:"12 reps",
        desc:"Hold a light dumbbell in both hands. Same V-up motion. Adds serious load to the abs.",
        demo:"https://www.youtube.com/results?search_query=weighted+v+ups" }
    },
    { name:"Plank with Alternating Arm Reach", sets:3, reps:"8 reps/side",
      desc:"High plank. Lift one arm forward, hold 1 sec, return. Switch. Hips stay square — zero rotation. Anti-rotation under fatigue.",
      demo:"https://www.youtube.com/results?search_query=plank+arm+reach" },
  ];

  // ── MODULE DEFINITION ──────────────────────────────────────────
  D.modules.crosstraining = {
    name:  "Cross Training",
    emoji: "💪",
    color: "grad-crosstrain",
    desc:  "8-week run-strength plan · 4 sessions/week · ~25 min per session",

    // Plan structure
    weeks: 8,

    // Day-of-week → day-type. null = rest day.
    schedule: {
      Monday:    "lower",
      Tuesday:   "mobility",
      Wednesday: null,
      Thursday:  "singleleg",
      Friday:    null,
      Saturday:  "posterior",
      Sunday:    null,
    },

    // 3 phases share day-type content. Render code looks up
    // phase from week-number, then exercises from phase × day-type.
    phases: [
      { id:"base",  name:"Base",  label:"Phase 1 · Base",  weeks:[1,2,3],
        focus:"Build foundation strength + movement quality. No plyometrics yet — the body needs to learn the patterns first." },
      { id:"build", name:"Build", label:"Phase 2 · Build", weeks:[4,5,6],
        focus:"Increase intensity. Plyometrics introduced. Emphasize single-leg work — the #1 strength quality for running performance." },
      { id:"peak",  name:"Peak",  label:"Phase 3 · Peak",  weeks:[7,8],
        focus:"Power + advanced progressions. Full plyometrics. Hardest variations. By now your body is ready — go after it." },
    ],

    // Phase × day-type → exercise list
    days: {
      base:  { lower:BASE_LOWER,  mobility:BASE_MOBILITY,  singleleg:BASE_SINGLELEG,  posterior:BASE_POSTERIOR  },
      build: { lower:BUILD_LOWER, mobility:BUILD_MOBILITY, singleleg:BUILD_SINGLELEG, posterior:BUILD_POSTERIOR },
      peak:  { lower:PEAK_LOWER,  mobility:PEAK_MOBILITY,  singleleg:PEAK_SINGLELEG,  posterior:PEAK_POSTERIOR  },
    },

    // Day-type labels for UI rendering
    dayTypeLabels: {
      lower:     { emoji:"🦵", name:"Lower Body Strength" },
      mobility:  { emoji:"🧘", name:"Mobility & Activation" },
      singleleg: { emoji:"⚡", name:"Single-Leg & Plyometrics" },
      posterior: { emoji:"🔥", name:"Posterior Chain & Core" },
    },
  };
})();
