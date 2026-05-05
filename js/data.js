// ── DEFAULT DATA ─────────────────────────────────────────────────
// Bump this number when exercise data changes — triggers auto-seed to Sheets
const DATA_VERSION = 17;

window.APP_DATA = {

  quotes: [
    { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { text: "Success is usually the culmination of controlling failure.", author: "Sylvester Stallone" },
    { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
    { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { text: "Fitness is not about being better than someone else. It's about being better than you used to be.", author: "Unknown" },
    { text: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
    { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" },
    { text: "Don't wish for it. Work for it.", author: "Unknown" },
    { text: "The difference between try and triumph is a little umph.", author: "Marvin Phillips" },
    { text: "Sweat is just fat crying.", author: "Unknown" },
    { text: "No matter how slow you go, you are still lapping everybody on the couch.", author: "Unknown" },
    { text: "Be stronger than your strongest excuse.", author: "Unknown" },
  ],

  // ── WARMUP (shared structure, used by cardio, gym, yoga, running) ─
  warmups: {
    cardio: [
      { name:"Dynamic Warm-Up", sets:1, reps:"5 min", desc:"March in place 1 min → arm circles 1 min → hip circles 1 min → leg swings 1 min → neck rolls 1 min. Raise heart rate gradually before the workout.", image:"", demo:"https://www.youtube.com/results?search_query=cardio+warm+up+routine+5+minutes", tag:"warmup" },
    ],
    gym: [
      { name:"Gym Warm-Up", sets:1, reps:"5 min", desc:"5 min light cardio (treadmill/bike) → dynamic chest opener 10 reps → world's greatest stretch 5 each side → glute bridges 15 reps. Prepares muscles and joints for heavy lifting.", image:"", demo:"https://www.youtube.com/results?search_query=gym+warm+up+before+workout", tag:"warmup" },
    ],
    yoga: [
      { name:"Yoga Warm-Up", sets:1, reps:"5 min", desc:"Seated breathing 2 min → neck & shoulder rolls 1 min → cat-cow 8 rounds → child's pose 1 min. Calms the mind and prepares the spine for practice.", image:"", demo:"https://www.youtube.com/results?search_query=yoga+warm+up+routine", tag:"warmup" },
    ],
    running: [
      { name:"Pre-Run Warm-Up", sets:1, reps:"5 min", desc:"Brisk walk 2 min → slow high knees 30 sec → ankle circles 10 each → hip flexor lunge 30 sec each → leg swings 10 each. Essential before every run to prevent injury.", image:"", demo:"https://www.youtube.com/results?search_query=running+warm+up+routine", tag:"warmup" },
    ],
    core: [
      { name:"Core Activation Warm-Up", sets:1, reps:"5 min", desc:"Diaphragmatic breathing 1 min → pelvic tilts 15 reps → cat-cow 10 rounds → dead bug 5 each side → bird dog 5 each side. Activates deep core stabilisers before loading the abs.", image:"", demo:"https://www.youtube.com/results?search_query=core+warm+up+activation", tag:"warmup" },
    ],
  },

    cooldowns: {
    cardio: [
      { name:"Cool-Down & Stretch", sets:1, reps:"5 min", desc:"Slow walk 2 min → standing quad stretch 30 sec each → standing hamstring stretch 30 sec each → hip flexor stretch 30 sec each → chest opener 45 sec. Essential for recovery and flexibility.", image:"", demo:"https://www.youtube.com/results?search_query=cardio+cool+down+stretch+routine", tag:"cooldown" },
    ],
    gym: [
      { name:"Post-Workout Cool-Down", sets:1, reps:"5 min", desc:"5 min easy walk → doorway chest stretch 45 sec → lat stretch 30 sec each → seated hamstring stretch 45 sec each → child's pose 2 min. Flush lactic acid and restore muscle length.", image:"", demo:"https://www.youtube.com/results?search_query=gym+cool+down+stretching+routine", tag:"cooldown" },
    ],
    yoga: [
      { name:"Yoga Cool-Down", sets:1, reps:"5 min", desc:"Supine twist 60 sec each → legs up the wall 3 min → happy baby 90 sec → Savasana 5 min. Never skip Savasana — the body needs time to absorb the practice.", image:"", demo:"https://www.youtube.com/results?search_query=yoga+cool+down+savasana", tag:"cooldown" },
    ],
    running: [
      { name:"Post-Run Cool-Down", sets:1, reps:"5 min", desc:"Easy walk 3 min → standing calf stretch 45 sec each → quad stretch 30 sec each → IT band stretch 45 sec each → seated hamstring & glute stretch 60 sec each. Critical for runner recovery.", image:"", demo:"https://www.youtube.com/results?search_query=post+run+cool+down+stretches", tag:"cooldown" },
    ],
    core: [
      { name:"Core Cool-Down Stretch", sets:1, reps:"5 min", desc:"Child's pose 60 sec → supine knees-to-chest 60 sec → lying spinal twist 45 sec each side → cobra stretch 30 sec × 3 → diaphragmatic breathing 2 min. Releases lower back and hip flexors after intense core work.", image:"", demo:"https://www.youtube.com/results?search_query=ab+workout+cool+down+stretch", tag:"cooldown" },
    ],
  },

    modules: {
    cardio: {
      name: "Home Cardio",
      emoji: "🏠",
      color: "grad-cardio",
      days: {
        Monday: [
          { name:"Jumping Jacks", sets:3, reps:"45 sec", desc:"Stand upright, jump feet apart while raising arms overhead. Return to start. High-energy full-body warm-up.", image:"", demo:"https://www.youtube.com/results?search_query=jumping+jacks+exercise" },
          { name:"High Knees", sets:3, reps:"40 sec", desc:"Run in place driving knees up to waist height. Pump arms. Great cardio and core activator.", image:"", demo:"https://www.youtube.com/results?search_query=high+knees+exercise" },
          { name:"Burpees", sets:3, reps:"10 reps", desc:"From standing, drop to push-up position, perform push-up, jump feet to hands, explode upward.", image:"", demo:"https://www.youtube.com/results?search_query=burpees+exercise" },
          { name:"Mountain Climbers", sets:3, reps:"40 sec", desc:"In push-up position, alternate driving knees toward chest rapidly. Keep hips level.", image:"", demo:"https://www.youtube.com/results?search_query=mountain+climbers+exercise" },
          { name:"Jump Squats", sets:3, reps:"15 reps", desc:"Perform squat, then explode upward into a jump. Land softly with bent knees.", image:"", demo:"https://www.youtube.com/results?search_query=jump+squats+exercise" },
          { name:"Plank Hold", sets:3, reps:"45 sec", desc:"Forearms on floor, body straight from head to heels. Squeeze glutes and core.", image:"", demo:"https://www.youtube.com/results?search_query=plank+hold+exercise" },
        ],
        Tuesday: [
          { name:"Skipping (Shadow)", sets:3, reps:"60 sec", desc:"Mimic skipping rope motion with arms and alternating foot hops. Light, rhythmic cardio.", image:"", demo:"https://www.youtube.com/results?search_query=shadow+skipping+exercise" },
          { name:"Star Jumps", sets:3, reps:"20 reps", desc:"Jump with arms and legs spread wide (star shape) then return. High-impact, full-body cardio.", image:"", demo:"https://www.youtube.com/results?search_query=star+jumps+exercise" },
          { name:"Push-Ups", sets:3, reps:"12 reps", desc:"Hands shoulder-width, body straight. Lower chest to floor, push up.", image:"", demo:"https://www.youtube.com/results?search_query=pushups+exercise" },
          { name:"Squat Pulses", sets:3, reps:"30 sec", desc:"Hold squat position and pulse up and down 3-4 inches.", image:"", demo:"https://www.youtube.com/results?search_query=squat+pulses+exercise" },
          { name:"Flutter Kicks", sets:3, reps:"40 sec", desc:"Lie on back, lift legs 6 inches, alternate small up-down kicks. Targets lower abs.", image:"", demo:"https://www.youtube.com/results?search_query=flutter+kicks+exercise" },
          { name:"Shadow Boxing", sets:3, reps:"60 sec", desc:"Alternate jabs, crosses, and hooks in the air. Full upper-body cardio.", image:"", demo:"https://www.youtube.com/results?search_query=shadow+boxing+cardio" },
        ],
        Wednesday: [
          { name:"Bear Crawls", sets:3, reps:"30 sec", desc:"On hands and feet (knees off floor), crawl forward and back. Full-body stabiliser.", image:"", demo:"https://www.youtube.com/results?search_query=bear+crawl+exercise" },
          { name:"Lateral Shuffles", sets:3, reps:"40 sec", desc:"Shuffle side to side quickly, staying in athletic stance.", image:"", demo:"https://www.youtube.com/results?search_query=lateral+shuffle+exercise" },
          { name:"Tricep Dips", sets:3, reps:"15 reps", desc:"Use a chair or floor. Hands behind you, lower body by bending elbows to 90°.", image:"", demo:"https://www.youtube.com/results?search_query=tricep+dips+exercise" },
          { name:"Bicycle Crunches", sets:3, reps:"20 reps", desc:"Alternate touching elbow to opposite knee while extending other leg.", image:"", demo:"https://www.youtube.com/results?search_query=bicycle+crunches+exercise" },
          { name:"Reverse Lunges", sets:3, reps:"12 each", desc:"Step backward into a lunge. Knee tracks over ankle.", image:"", demo:"https://www.youtube.com/results?search_query=reverse+lunges+exercise" },
          { name:"Inchworms", sets:3, reps:"10 reps", desc:"Bend at hips, walk hands out to push-up position and back.", image:"", demo:"https://www.youtube.com/results?search_query=inchworm+exercise" },
        ],
        Thursday: [
          { name:"Speed Skaters", sets:3, reps:"40 sec", desc:"Leap side to side mimicking a speed skater. Builds lateral power and cardio.", image:"", demo:"https://www.youtube.com/results?search_query=speed+skater+exercise" },
          { name:"Knee Push-Ups", sets:3, reps:"15 reps", desc:"Modified push-up from knees.", image:"", demo:"https://www.youtube.com/results?search_query=knee+pushups+exercise" },
          { name:"Sumo Squat", sets:3, reps:"15 reps", desc:"Wide stance, toes out. Squat deeply keeping chest up.", image:"", demo:"https://www.youtube.com/results?search_query=sumo+squat+exercise" },
          { name:"Superman Hold", sets:3, reps:"30 sec", desc:"Lie face down, lift arms and legs simultaneously.", image:"", demo:"https://www.youtube.com/results?search_query=superman+hold+exercise" },
          { name:"Box Step-Ups", sets:3, reps:"12 each", desc:"Step up and down on a chair or step.", image:"", demo:"https://www.youtube.com/results?search_query=step+ups+exercise" },
          { name:"Hollow Hold", sets:3, reps:"30 sec", desc:"Lie on back, press lower back to floor, raise legs and shoulders.", image:"", demo:"https://www.youtube.com/results?search_query=hollow+hold+exercise" },
        ],
        Friday: [
          { name:"Tabata Burpees", sets:3, reps:"20 sec on/10 off", desc:"Maximum effort burpees for 20 seconds, rest 10 seconds.", image:"", demo:"https://www.youtube.com/results?search_query=tabata+burpees" },
          { name:"Wall Sit", sets:3, reps:"45 sec", desc:"Back against wall, thighs parallel to floor.", image:"", demo:"https://www.youtube.com/results?search_query=wall+sit+exercise" },
          { name:"Diamond Push-Ups", sets:3, reps:"10 reps", desc:"Hands form a diamond shape under chest. Targets triceps.", image:"", demo:"https://www.youtube.com/results?search_query=diamond+pushups+exercise" },
          { name:"Donkey Kicks", sets:3, reps:"15 each", desc:"On all fours, kick one leg back and up, squeezing glute at top.", image:"", demo:"https://www.youtube.com/results?search_query=donkey+kicks+exercise" },
          { name:"Crab Walks", sets:3, reps:"30 sec", desc:"Seated position, lift hips and walk on hands and feet.", image:"", demo:"https://www.youtube.com/results?search_query=crab+walk+exercise" },
          { name:"Dead Bug", sets:3, reps:"10 each side", desc:"On back, extend opposite arm and leg while keeping lower back pressed down.", image:"", demo:"https://www.youtube.com/results?search_query=dead+bug+exercise" },
        ],
        Saturday: [
          { name:"AMRAP Circuits", sets:3, reps:"5 min", desc:"As Many Rounds As Possible: 5 push-ups + 10 squats + 15 jumping jacks.", image:"", demo:"https://www.youtube.com/results?search_query=AMRAP+workout+cardio" },
          { name:"Long Plank", sets:3, reps:"60 sec", desc:"Extended plank challenge.", image:"", demo:"https://www.youtube.com/results?search_query=long+plank+challenge" },
          { name:"Squat to Press", sets:3, reps:"12 reps", desc:"Hold light weights or water bottles. Squat down, press overhead as you stand.", image:"", demo:"https://www.youtube.com/results?search_query=squat+to+press+exercise" },
          { name:"Plank Shoulder Taps", sets:3, reps:"20 taps", desc:"In high plank, alternate touching opposite shoulder.", image:"", demo:"https://www.youtube.com/results?search_query=plank+shoulder+taps" },
          { name:"Standing Oblique Crunches", sets:3, reps:"15 each", desc:"Standing, bring elbow down to meet rising knee on same side.", image:"", demo:"https://www.youtube.com/results?search_query=standing+oblique+crunches" },
          { name:"Cool Down Walk", sets:1, reps:"5 min", desc:"Walk in place at slow pace. Deep breaths. Gradual heart rate reduction.", image:"", demo:"" },
        ],
      }
    },

    gym: {
      name: "Gym Workouts",
      emoji: "🏋️",
      color: "grad-gym",
      dayLabels: {
        Monday:    "Monday — Chest 🫁",
        Tuesday:   "Tuesday — Shoulders 🏋️",
        Wednesday: "Wednesday — Lats / Back 🦾",
        Thursday:  "Thursday — Biceps 💪",
        Friday:    "Friday — Triceps 🔱",
        Saturday:  "Saturday — Legs / Squats 🦵",
      },
      days: {

        // ── MONDAY — CHEST ───────────────────────────────────────────
        Monday: [
          { name:"Flat Barbell Bench Press",  sets:4, reps:"10 reps",   _section:"main", desc:"Lie flat on bench. Grip bar slightly wider than shoulder-width. Lower bar to mid-chest with control, press up to full extension. Keep feet flat, back slightly arched. The primary chest mass builder.", image:"", demo:"https://www.youtube.com/results?search_query=flat+barbell+bench+press+form" },
          { name:"Incline Dumbbell Press",     sets:4, reps:"12 reps",   _section:"main", desc:"Bench at 30-45°. Press dumbbells from chest level upward. Incline targets upper chest specifically. Control the descent — 3 seconds down, 1 second up.", image:"", demo:"https://www.youtube.com/results?search_query=incline+dumbbell+press+form" },
          { name:"Decline Bench Press",        sets:3, reps:"12 reps",   _section:"main", desc:"Feet locked at top of decline bench. Lower bar to lower chest. Targets lower pecs and sternal head. Keep elbows at 75° — not flared wide.", image:"", demo:"https://www.youtube.com/results?search_query=decline+bench+press+form" },
          { name:"Dumbbell Chest Fly",         sets:3, reps:"12 reps",   _section:"main", desc:"Lie flat, dumbbells above chest with slight elbow bend. Open arms wide in arc until chest fully stretched. Squeeze at top. Pure chest isolation — no tricep involvement.", image:"", demo:"https://www.youtube.com/results?search_query=dumbbell+chest+fly+form" },
          { name:"Cable Crossover",            sets:3, reps:"15 reps",   _section:"main", desc:"Cables at shoulder height. Step forward, bring handles together in front of chest in hugging arc. Squeeze chest hard at the bottom. Excellent finishing exercise for chest pump.", image:"", demo:"https://www.youtube.com/results?search_query=cable+crossover+chest+form" },
          { name:"Chest Dips",                 sets:3, reps:"12 reps",   _section:"main", desc:"Parallel bars — lean torso forward 30°. Lower until elbows reach 90°. Forward lean shifts stress from triceps to lower chest. Add weight with dip belt if bodyweight is too easy.", image:"", demo:"https://www.youtube.com/results?search_query=chest+dips+form+technique" },
          { name:"Push-Ups — Burnout",         sets:3, reps:"Max reps",  _section:"main", desc:"Standard push-up, hands slightly wider than shoulders. Go to failure each set. Finisher after pressing. Keep body rigid — no sagging hips. Squeeze chest at top of each rep.", image:"", demo:"https://www.youtube.com/results?search_query=push+ups+proper+form" },
        ],

        // ── TUESDAY — SHOULDERS ──────────────────────────────────────
        Tuesday: [
          { name:"Barbell Overhead Press",     sets:4, reps:"10 reps",   _section:"main", desc:"Standing or seated. Press barbell from front of shoulders to full overhead lockout. Keep core braced, don't hyperextend lower back. The most compound shoulder movement.", image:"", demo:"https://www.youtube.com/results?search_query=barbell+overhead+press+form" },
          { name:"Dumbbell Shoulder Press",    sets:4, reps:"12 reps",   _section:"main", desc:"Seated or standing. Start dumbbells at ear height, press overhead. Greater range of motion than barbell. Neutral spine throughout. Controls both deltoid heads simultaneously.", image:"", demo:"https://www.youtube.com/results?search_query=dumbbell+shoulder+press+form" },
          { name:"Dumbbell Lateral Raise",     sets:4, reps:"15 reps",   _section:"main", desc:"Stand with dumbbells at sides, slight elbow bend. Raise arms to shoulder height — no higher. Pause 1 sec at top. Lower in 3 seconds. Targets medial deltoid — creates shoulder width.", image:"", demo:"https://www.youtube.com/results?search_query=lateral+raise+proper+form" },
          { name:"Front Raise",                sets:3, reps:"12 reps",   _section:"main", desc:"Dumbbells at thighs, raise one or both straight to shoulder height. Slight elbow bend. Don't swing body. Targets anterior deltoid — front of shoulder.", image:"", demo:"https://www.youtube.com/results?search_query=dumbbell+front+raise+form" },
          { name:"Rear Delt Fly",              sets:3, reps:"15 reps",   _section:"main", desc:"Hinge forward at hips 45°, dumbbells hanging. Raise arms out like wings, elbows slightly bent. Squeeze rear delts. Targets posterior deltoid — prevents rounded shoulders.", image:"", demo:"https://www.youtube.com/results?search_query=rear+delt+fly+form" },
          { name:"Face Pulls",                 sets:3, reps:"15 reps",   _section:"main", desc:"Cable at face height with rope. Pull rope toward face, elbows high and flared. Targets rear delts and external rotators. Essential for shoulder health, posture, and rotator cuff.", image:"", demo:"https://www.youtube.com/results?search_query=face+pulls+proper+form" },
          { name:"Arnold Press",               sets:3, reps:"12 reps",   _section:"main", desc:"Start dumbbells at chin level, palms facing you. Press up while rotating palms outward — at top palms face forward. Works all three deltoid heads in one movement. Arnold Schwarzenegger's invention.", image:"", demo:"https://www.youtube.com/results?search_query=arnold+press+form" },
        ],

        // ── WEDNESDAY — LATS / BACK ──────────────────────────────────
        Wednesday: [
          { name:"Deadlift",                   sets:4, reps:"8 reps",    _section:"main", desc:"Feet hip-width, bar over mid-foot. Grip just outside legs. Push floor away, keep bar close to body all the way up. Lock out hips and knees at top. King of all back exercises — works entire posterior chain.", image:"", demo:"https://www.youtube.com/results?search_query=deadlift+form+tutorial" },
          { name:"Pull-Ups / Lat Pulldown",    sets:4, reps:"10 reps",   _section:"main", desc:"Wide overhand grip. Pull until chin clears bar or bar reaches upper chest. Full dead hang between reps. Targets lats, teres major, rhomboids, and biceps. Use lat pulldown machine as regression.", image:"", demo:"https://www.youtube.com/results?search_query=pull+ups+lat+pulldown+form" },
          { name:"Barbell Bent-Over Row",      sets:4, reps:"10 reps",   _section:"main", desc:"Hinge until torso nearly parallel to floor. Pull bar to lower chest or upper abs. Squeeze shoulder blades together hard at top. Keep flat back throughout. Builds upper back thickness.", image:"", demo:"https://www.youtube.com/results?search_query=barbell+bent+over+row+form" },
          { name:"Seated Cable Row",           sets:3, reps:"12 reps",   _section:"main", desc:"Sit upright, feet on platform. Pull handle to navel — elbows close to body. Fully stretch forward between reps. Targets mid-back, rhomboids, and lats equally.", image:"", demo:"https://www.youtube.com/results?search_query=seated+cable+row+form" },
          { name:"Single-Arm Dumbbell Row",    sets:3, reps:"12 each",   _section:"main", desc:"Knee and hand on bench. Pull dumbbell to hip — elbow past torso. Full stretch at bottom. Unilateral movement corrects left-right imbalances. Excellent lat and mid-back builder.", image:"", demo:"https://www.youtube.com/results?search_query=single+arm+dumbbell+row+form" },
          { name:"T-Bar Row",                  sets:3, reps:"10 reps",   _section:"main", desc:"Straddle bar with V-grip. Hinge forward, row bar toward chest. Elbows close to body. One of the best mid-back thickness builders. Keep lower back neutral throughout.", image:"", demo:"https://www.youtube.com/results?search_query=t+bar+row+form" },
          { name:"Straight-Arm Pulldown",      sets:3, reps:"15 reps",   _section:"main", desc:"Stand at cable, straight bar attachment. Arms straight — pull bar from overhead down to thighs. Pure lat isolation with zero bicep involvement. Best for lat mind-muscle connection.", image:"", demo:"https://www.youtube.com/results?search_query=straight+arm+pulldown+form" },
        ],

        // ── THURSDAY — BICEPS ────────────────────────────────────────
        Thursday: [
          { name:"Barbell Bicep Curl",         sets:4, reps:"10 reps",   _section:"main", desc:"Stand with barbell, hands shoulder-width, underhand grip. Curl to shoulder height. Squeeze at top. Lower in 3 seconds. Keep elbows pinned to sides — don't swing. Classic bicep mass builder.", image:"", demo:"https://www.youtube.com/results?search_query=barbell+bicep+curl+form" },
          { name:"Dumbbell Alternating Curl",  sets:4, reps:"12 each",   _section:"main", desc:"Curl one dumbbell at a time, supinating wrist as you lift — palm faces up at top. Full range. Alternate arms. Greater peak contraction than barbell due to supination.", image:"", demo:"https://www.youtube.com/results?search_query=dumbbell+alternating+bicep+curl+form" },
          { name:"Hammer Curl",                sets:3, reps:"12 each",   _section:"main", desc:"Neutral grip throughout — thumbs pointing up. Curl without wrist rotation. Targets brachialis and brachioradialis for thick arm appearance. Also works long head of bicep.", image:"", demo:"https://www.youtube.com/results?search_query=hammer+curl+proper+form" },
          { name:"Incline Dumbbell Curl",      sets:3, reps:"12 each",   _section:"main", desc:"Sit on incline bench (45-60°), arms hang straight. Curl without swinging. Incline gives greater stretch at bottom — intense long head stimulus not possible with standard curl.", image:"", demo:"https://www.youtube.com/results?search_query=incline+dumbbell+curl+form" },
          { name:"Preacher Curl",              sets:3, reps:"10 reps",   _section:"main", desc:"Arm rests flat on preacher pad. Curl bar or dumbbell. Eliminates all body english — pure bicep isolation. Excellent for peak contraction and targeting the lower bicep insertion.", image:"", demo:"https://www.youtube.com/results?search_query=preacher+curl+form" },
          { name:"Concentration Curl",         sets:3, reps:"12 each",   _section:"main", desc:"Seated, elbow on inner thigh. Curl with full supination. Squeeze hard at top for 2 seconds. Best exercise for bicep peak according to EMG studies. Zero swing possible.", image:"", demo:"https://www.youtube.com/results?search_query=concentration+curl+form" },
          { name:"Cable Curl",                 sets:3, reps:"15 reps",   _section:"main", desc:"Stand at low cable pulley. Curl bar or rope to shoulder. Constant tension through full range — unlike dumbbells which lose tension at top. Excellent pump finisher for biceps.", image:"", demo:"https://www.youtube.com/results?search_query=cable+bicep+curl+form" },
        ],

        // ── FRIDAY — TRICEPS ─────────────────────────────────────────
        Friday: [
          { name:"Close-Grip Bench Press",     sets:4, reps:"10 reps",   _section:"main", desc:"Flat bench, hands 10-12 inches apart. Lower to lower chest, elbows tracking backward close to ribs. Press up. Heavy compound tricep exercise — the bench press for triceps.", image:"", demo:"https://www.youtube.com/results?search_query=close+grip+bench+press+form" },
          { name:"Tricep Pushdown",            sets:4, reps:"15 reps",   _section:"main", desc:"Cable at shoulder height, straight bar or rope. Push to full lockout, elbows pinned to sides. Squeeze triceps hard at bottom. Rope allows wrists to rotate for better contraction.", image:"", demo:"https://www.youtube.com/results?search_query=tricep+pushdown+cable+form" },
          { name:"Overhead Tricep Extension", sets:3, reps:"12 reps",   _section:"main", desc:"Standing or seated, single dumbbell or EZ bar overhead. Lower behind head to 90°. Extend fully. Stretches long head of tricep — highest EMG activation of all tricep exercises.", image:"", demo:"https://www.youtube.com/results?search_query=overhead+tricep+extension+form" },
          { name:"EZ Bar Skull Crusher",       sets:3, reps:"12 reps",   _section:"main", desc:"Lying on bench with EZ bar. Lower bar toward forehead bending elbows. Extend back up. Keep upper arms perpendicular to floor. Targets all three tricep heads especially the long head.", image:"", demo:"https://www.youtube.com/results?search_query=skull+crushers+ez+bar+form" },
          { name:"Tricep Dips",                sets:3, reps:"12 reps",   _section:"main", desc:"Parallel bars — keep torso UPRIGHT (not leaning forward like chest dips). Lower until elbows 90°. Press back up. Upright posture shifts all load from chest to triceps. Add weight if needed.", image:"", demo:"https://www.youtube.com/results?search_query=tricep+dips+proper+form" },
          { name:"Tricep Kickback",            sets:3, reps:"15 each",   _section:"main", desc:"Hinge forward at hips. Upper arm pinned at hip height. Extend forearm straight back until fully locked out. Squeeze hard at lockout. Isolation movement — keep upper arm completely still.", image:"", demo:"https://www.youtube.com/results?search_query=tricep+kickback+form" },
          { name:"Diamond Push-Ups — Burnout", sets:3, reps:"Max reps",  _section:"main", desc:"Hands in diamond shape under chest. Elbows track backward along ribs. Full extension at top. Best bodyweight tricep finisher. Go to failure each set — no partial reps.", image:"", demo:"https://www.youtube.com/results?search_query=diamond+push+ups+form" },
        ],

        // ── SATURDAY — LEGS / SQUATS ─────────────────────────────────
        Saturday: [
          { name:"Barbell Back Squat",         sets:4, reps:"10 reps",   _section:"main", desc:"Bar on upper traps, feet shoulder-width, toes slightly out. Squat until thighs parallel or below. Drive knees out over toes, chest up, neutral spine. King of all leg exercises — full quad, glute, hamstring activation.", image:"", demo:"https://www.youtube.com/results?search_query=barbell+back+squat+form" },
          { name:"Front Squat",                sets:3, reps:"10 reps",   _section:"main", desc:"Bar resting on front delts, elbows high. More upright torso than back squat. Greater quad emphasis and core demand. More technically demanding — start lighter than back squat.", image:"", demo:"https://www.youtube.com/results?search_query=front+squat+form+tutorial" },
          { name:"Leg Press",                  sets:4, reps:"15 reps",   _section:"main", desc:"Feet shoulder-width on platform. Lower until knees reach 90°. Press back without locking knees. High feet targets more glutes, low feet targets more quads. Never round lower back.", image:"", demo:"https://www.youtube.com/results?search_query=leg+press+form" },
          { name:"Romanian Deadlift",          sets:3, reps:"12 reps",   _section:"main", desc:"Slight knee bend throughout. Hinge at hips pushing them back, bar slides down legs. Lower until hamstring stretch. Drive hips forward to stand. Pure hamstring and glute isolation.", image:"", demo:"https://www.youtube.com/results?search_query=romanian+deadlift+form" },
          { name:"Bulgarian Split Squat",      sets:3, reps:"10 each",   _section:"main", desc:"Rear foot elevated on bench. Lower front leg until knee nearly touches floor. Front knee tracks over toes. Brutal unilateral leg exercise — corrects strength imbalances between legs.", image:"", demo:"https://www.youtube.com/results?search_query=bulgarian+split+squat+form" },
          { name:"Leg Curl",                   sets:3, reps:"12 reps",   _section:"main", desc:"Lying or seated curl machine. Curl heels toward glutes through full range. Pause at peak contraction 1 second. Lower in 3 seconds. Pure hamstring isolation — essential for balanced leg development.", image:"", demo:"https://www.youtube.com/results?search_query=leg+curl+machine+form" },
          { name:"Calf Raise",                 sets:4, reps:"20 reps",   _section:"main", desc:"Standing or seated calf raise. Rise onto toes as high as possible. Hold 2 seconds at top. Full stretch at bottom — calves won't grow without full range. They need high volume to respond.", image:"", demo:"https://www.youtube.com/results?search_query=calf+raise+proper+form" },
        ],

      }
    },
    yoga: {
      name: "Yoga",
      emoji: "🧘",
      color: "grad-yoga",
      // Progressive Day-based schedule — Day 1 to Day 90
      // Phase 1: Days 1-20  — Foundation (Beginner)
      // Phase 2: Days 21-45 — Building (Intermediate)
      // Phase 3: Days 46-65 — Deepening (Advanced Beginner)
      // Phase 4: Days 66-80 — Strength & Inversion (Intermediate-Advanced)
      // Phase 5: Days 81-90 — Professional Flow (Advanced)
      useProgressive: true,
      phases: [
        { from:1,  to:20, label:"Phase 1 — Foundation",          color:"#2e7d46" },
        { from:21, to:45, label:"Phase 2 — Building",            color:"#1565c0" },
        { from:46, to:65, label:"Phase 3 — Deepening",           color:"#6a1b9a" },
        { from:66, to:80, label:"Phase 4 — Strength & Inversions", color:"#bf360c" },
        { from:81, to:90, label:"Phase 5 — Professional Flow",   color:"#ad1457" },
      ],
      schedule: {

        // ══════════════════════════════════════════════════════
        // PHASE 1 — FOUNDATION (Days 1–20) — Beginner
        // ══════════════════════════════════════════════════════
        "Day 1": {
          focus: "Breath & Body Awareness",
          poses: [
            { name:"Diaphragmatic Breathing", hold:"5 min", desc:"Lie on back, hands on belly. Breathe deep into abdomen, feel belly rise. Exhale fully. Foundation of all yoga practice.", demo:"https://www.youtube.com/results?search_query=diaphragmatic+breathing+yoga" },
            { name:"Cat-Cow Stretch", hold:"10 rounds", desc:"On all fours. Inhale — arch back, lift head (cow). Exhale — round spine, tuck chin (cat). Sync breath with movement.", demo:"https://www.youtube.com/results?search_query=cat+cow+yoga+beginners" },
            { name:"Child's Pose", hold:"2 min", desc:"Kneel, sit back on heels, extend arms forward, rest forehead on mat. Complete surrender. Rest here whenever needed.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga+beginners" },
            { name:"Corpse Pose (Savasana)", hold:"5 min", desc:"Lie flat on back, arms at sides, palms up. Close eyes. Let the body completely relax. Absorb the practice.", demo:"https://www.youtube.com/results?search_query=savasana+yoga+beginner" },
          ]
        },
        "Day 2": {
          focus: "Spine Mobility",
          poses: [
            { name:"Cat-Cow (warmup)", hold:"8 rounds", desc:"Gentle spine warm-up. Focus on moving one vertebra at a time.", demo:"https://www.youtube.com/results?search_query=cat+cow+spine+mobility" },
            { name:"Seated Forward Fold", hold:"90 sec", desc:"Sit with legs extended. Inhale lengthen spine, exhale fold forward. Hold shins, ankles or feet. Don't round upper back — hinge from hips.", demo:"https://www.youtube.com/results?search_query=seated+forward+fold+beginner+yoga" },
            { name:"Supine Spinal Twist", hold:"60 sec each side", desc:"Lie on back, bring right knee to chest then across body to the left. Arms wide. Turn head right. Hold, breathe, switch sides.", demo:"https://www.youtube.com/results?search_query=supine+spinal+twist+yoga" },
            { name:"Legs Up The Wall", hold:"3 min", desc:"Lie on back, legs vertical against wall. Passive inversion. Relieves tired legs and calms nervous system.", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
          ]
        },
        "Day 3": {
          focus: "Standing Foundation",
          poses: [
            { name:"Mountain Pose (Tadasana)", hold:"2 min", desc:"Stand feet hip-width, arms at sides. Root through feet, lift through crown. Feel the alignment. This is the base of all standing poses.", demo:"https://www.youtube.com/results?search_query=mountain+pose+tadasana+yoga" },
            { name:"Forward Fold (Uttanasana)", hold:"60 sec", desc:"From standing, hinge at hips, let upper body hang. Bend knees generously. Gravity does the work — don't force.", demo:"https://www.youtube.com/results?search_query=standing+forward+fold+yoga+beginner" },
            { name:"Low Lunge (Anjaneyasana)", hold:"60 sec each", desc:"Step right foot forward, lower left knee to mat. Hips sink forward and down. Arms overhead or on front thigh. Deep hip flexor opener.", demo:"https://www.youtube.com/results?search_query=low+lunge+yoga+beginner" },
            { name:"Child's Pose", hold:"2 min", desc:"Rest and recover after standing work.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          ]
        },
        "Day 4": {
          focus: "Hip Opening — Beginner",
          poses: [
            { name:"Butterfly Pose", hold:"2 min", desc:"Soles of feet together, knees wide. Hold feet or ankles. Fold forward gently. Gentle inner thigh and groin opener.", demo:"https://www.youtube.com/results?search_query=butterfly+pose+yoga" },
            { name:"Figure 4 Stretch", hold:"90 sec each", desc:"Lie on back, cross ankle over opposite thigh (figure 4). Pull both legs toward chest. Excellent glute and piriformis opener.", demo:"https://www.youtube.com/results?search_query=figure+4+hip+stretch+yoga" },
            { name:"Pigeon Pose Prep", hold:"90 sec each", desc:"From downward dog, bring right knee behind right wrist. Lower to mat. Support with hands. Focus on the breath — this will be intense.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+beginner+yoga" },
            { name:"Happy Baby", hold:"2 min", desc:"Lie on back, hold outer edges of feet. Knees wide toward armpits. Rock side to side to massage lower back.", demo:"https://www.youtube.com/results?search_query=happy+baby+pose+yoga" },
          ]
        },
        "Day 5": {
          focus: "Sun Salutation Introduction",
          poses: [
            { name:"Sun Salutation A — Step by step", hold:"5 slow rounds", desc:"Mountain → Arms up → Forward fold → Halfway lift → Plank → Lower down → Cobra → Downward dog → Forward fold → Arms up → Mountain. Learn each transition slowly.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+step+by+step+beginner" },
            { name:"Downward Facing Dog", hold:"90 sec", desc:"Inverted V shape. Hands shoulder-width, feet hip-width. Press through palms, lift hips high. Pedal feet to stretch calves.", demo:"https://www.youtube.com/results?search_query=downward+dog+alignment+yoga" },
            { name:"Child's Pose", hold:"2 min", desc:"Rest after first Surya Namaskar practice.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          ]
        },
        "Day 6": {
          focus: "Balance Introduction",
          poses: [
            { name:"Tree Pose (Vrksasana)", hold:"45 sec each", desc:"Stand on right leg. Place left foot on inner calf or inner thigh (never on knee). Hands at heart or overhead. Find a fixed gaze point (drishti).", demo:"https://www.youtube.com/results?search_query=tree+pose+yoga+beginner" },
            { name:"Warrior I (Virabhadrasana I)", hold:"45 sec each", desc:"Step right foot forward 4 feet. Front knee over ankle. Back foot at 45°. Hips square forward. Arms reach overhead. Strong and grounded.", demo:"https://www.youtube.com/results?search_query=warrior+1+yoga+beginners" },
            { name:"Warrior II (Virabhadrasana II)", hold:"45 sec each", desc:"Wide stance. Front knee over ankle. Arms parallel to floor. Gaze over front fingers. Hips open to the side. Hold like a warrior.", demo:"https://www.youtube.com/results?search_query=warrior+2+yoga+beginners" },
            { name:"Savasana", hold:"4 min", desc:"Complete rest. Allow all effort to dissolve.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 7": {
          focus: "Rest & Restore",
          poses: [
            { name:"Yin Forward Fold", hold:"3 min", desc:"Seated, legs extended. Completely relax — no effort. Let gravity slowly open the hamstrings. Yin principle: passive hold.", demo:"https://www.youtube.com/results?search_query=yin+yoga+forward+fold" },
            { name:"Yin Butterfly", hold:"3 min", desc:"Soles together, fully relax forward. No forcing. Breathe into the hips.", demo:"https://www.youtube.com/results?search_query=yin+yoga+butterfly" },
            { name:"Legs Up Wall", hold:"5 min", desc:"Complete inversion rest. Close eyes, breathe naturally.", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yin+yoga" },
            { name:"Savasana with Body Scan", hold:"7 min", desc:"Systematically relax every body part from feet to crown. Week 1 complete — celebrate your consistency.", demo:"https://www.youtube.com/results?search_query=savasana+body+scan+yoga" },
          ]
        },
        "Day 8": {
          focus: "Core Awakening",
          poses: [
            { name:"Boat Pose (Navasana)", hold:"30 sec × 3", desc:"Sit, lean back, lift feet. Legs straight or bent. Arms parallel to floor. Core braces hard. Build core strength essential for advanced poses.", demo:"https://www.youtube.com/results?search_query=boat+pose+yoga+beginner" },
            { name:"Plank Hold", hold:"30 sec × 3", desc:"Wrists under shoulders, body straight. Engage belly in and up. Build foundational arm and core strength for inversions later.", demo:"https://www.youtube.com/results?search_query=plank+pose+yoga" },
            { name:"Bridge Pose (Setu Bandha)", hold:"60 sec × 3", desc:"Lie on back, feet flat near glutes. Press feet down, lift hips high. Clasp hands under back. Opens chest and strengthens back.", demo:"https://www.youtube.com/results?search_query=bridge+pose+yoga" },
            { name:"Supine Twist", hold:"90 sec each", desc:"Release lower back after core work.", demo:"https://www.youtube.com/results?search_query=supine+twist+yoga" },
          ]
        },
        "Day 9": {
          focus: "Chest & Shoulder Opening",
          poses: [
            { name:"Cobra Pose (Bhujangasana)", hold:"45 sec × 3", desc:"Lie prone, hands under shoulders. Inhale, press into hands, lift chest. Elbows soft. Shoulders away from ears. Gentle backbend.", demo:"https://www.youtube.com/results?search_query=cobra+pose+yoga" },
            { name:"Camel Pose (Ustrasana)", hold:"30 sec × 3", desc:"Kneel, hands on lower back. Lift chest to ceiling. Option to reach for heels. Intense chest and throat opener.", demo:"https://www.youtube.com/results?search_query=camel+pose+yoga+beginner" },
            { name:"Thread the Needle", hold:"90 sec each", desc:"On all fours. Slide right arm under body along floor. Shoulder and cheek rest on mat. Deep shoulder opener and spinal twist.", demo:"https://www.youtube.com/results?search_query=thread+the+needle+yoga" },
            { name:"Child's Pose", hold:"2 min", desc:"Counter pose after backbends.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          ]
        },
        "Day 10": {
          focus: "Flow — Sun Salutation Practice",
          poses: [
            { name:"Sun Salutation A × 5", hold:"5 rounds", desc:"Each round smoother than the last. Focus on breath linking movement — inhale up, exhale fold. Build heat gradually.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+flow+yoga" },
            { name:"Sun Salutation B × 3", hold:"3 rounds", desc:"Adds Chair Pose and Warrior I. More challenging. Take your time learning the sequence.", demo:"https://www.youtube.com/results?search_query=sun+salutation+B+beginner+yoga" },
            { name:"Seated Forward Fold", hold:"2 min", desc:"Cool down the body after the flow.", demo:"https://www.youtube.com/results?search_query=seated+forward+fold+yoga" },
            { name:"Savasana", hold:"5 min", desc:"Day 10 milestone — you've built a real foundation.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 11": {
          focus: "Twists & Detox",
          poses: [
            { name:"Seated Spinal Twist (Ardha Matsyendrasana)", hold:"90 sec each", desc:"Sit with legs extended. Bend right knee, place foot outside left thigh. Right hand on floor behind, left elbow on right knee. Twist and breathe.", demo:"https://www.youtube.com/results?search_query=seated+spinal+twist+yoga" },
            { name:"Revolved Chair Pose", hold:"30 sec each", desc:"Chair pose, bring hands to heart, twist right elbow to left knee. Challenges balance and deepens the twist.", demo:"https://www.youtube.com/results?search_query=revolved+chair+pose+yoga" },
            { name:"Supine Twist", hold:"2 min each", desc:"Lying down deep spinal twist to release after standing work.", demo:"https://www.youtube.com/results?search_query=supine+twist+yoga" },
            { name:"Legs Up Wall", hold:"4 min", desc:"Passive recovery — great after twisting sequence.", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
          ]
        },
        "Day 12": {
          focus: "Triangle & Extended Poses",
          poses: [
            { name:"Triangle Pose (Trikonasana)", hold:"60 sec each", desc:"Feet 4 feet apart, front foot forward. Reach front arm to shin/floor, back arm to ceiling. Both legs straight. Side body fully opens.", demo:"https://www.youtube.com/results?search_query=triangle+pose+yoga" },
            { name:"Extended Side Angle", hold:"60 sec each", desc:"Warrior II shape. Lower arm to front thigh or floor. Top arm reaches overhead beside ear. Full lateral body stretch.", demo:"https://www.youtube.com/results?search_query=extended+side+angle+pose+yoga" },
            { name:"Wide-Leg Forward Fold (Prasarita Padottanasana)", hold:"90 sec", desc:"Feet wide (4-5 feet). Fold forward, hands to floor. Head may reach floor in time. Excellent inner leg and hamstring opener.", demo:"https://www.youtube.com/results?search_query=wide+leg+forward+fold+yoga" },
            { name:"Child's Pose", hold:"2 min", desc:"Rest after intense standing sequence.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          ]
        },
        "Day 13": {
          focus: "Hip Flexors & Lunges",
          poses: [
            { name:"Crescent Lunge", hold:"60 sec each", desc:"High lunge — back knee lifted. Arms reach overhead. Sink hips forward. Powerful hip flexor and quad stretch.", demo:"https://www.youtube.com/results?search_query=crescent+lunge+yoga" },
            { name:"Lizard Pose", hold:"90 sec each", desc:"Low lunge, front foot outside hand. Lower forearms for deeper opening. Most effective hip flexor and groin stretch.", demo:"https://www.youtube.com/results?search_query=lizard+pose+yoga" },
            { name:"Pigeon Pose", hold:"2 min each", desc:"From downward dog, bring right shin parallel to front of mat. Square hips. Lower down. Go deeper with every exhale. This pose changes everything.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga" },
            { name:"Reclined Hero (Supta Virasana)", hold:"60 sec", desc:"Sit between heels. Lean back on elbows or full recline. Intense quad and hip flexor stretch. Use bolster under back if needed.", demo:"https://www.youtube.com/results?search_query=reclined+hero+pose+yoga" },
          ]
        },
        "Day 14": {
          focus: "Week 2 Integration",
          poses: [
            { name:"Sun Salutation A × 5", hold:"5 rounds", desc:"Full flow — smooth transitions, breath-linked movement.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+flow" },
            { name:"Warrior I + II + Triangle", hold:"45 sec each", desc:"Standing sequence: right side then left. Flow between poses with breath.", demo:"https://www.youtube.com/results?search_query=warrior+1+2+triangle+yoga+flow" },
            { name:"Pigeon Pose", hold:"2 min each", desc:"Hold deeply and breathe.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga" },
            { name:"Savasana", hold:"6 min", desc:"Two weeks of yoga — you are building something real.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 15": {
          focus: "Backbends Introduction",
          poses: [
            { name:"Sphinx Pose", hold:"2 min", desc:"Forearms on floor, elbows under shoulders. Gentle supported backbend. Excellent for lower back health.", demo:"https://www.youtube.com/results?search_query=sphinx+pose+yoga" },
            { name:"Locust Pose (Shalabhasana)", hold:"30 sec × 3", desc:"Lie prone, arms at sides. Inhale, lift chest, arms and legs simultaneously. Strengthens entire back body.", demo:"https://www.youtube.com/results?search_query=locust+pose+yoga" },
            { name:"Bow Pose (Dhanurasana)", hold:"20 sec × 3", desc:"Lie prone. Reach back and hold ankles. Inhale, kick feet into hands to lift chest and thighs. Full backbend.", demo:"https://www.youtube.com/results?search_query=bow+pose+yoga+beginner" },
            { name:"Child's Pose", hold:"3 min", desc:"Counter pose — essential after backbends. Let the spine decompress.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          ]
        },
        "Day 16": {
          focus: "Balance — Intermediate",
          poses: [
            { name:"Warrior III (Virabhadrasana III)", hold:"30 sec each", desc:"From Warrior I, hinge forward, lift back leg parallel to floor. Arms forward or at sides. One-leg balance with full body parallel to ground.", demo:"https://www.youtube.com/results?search_query=warrior+3+yoga+beginner" },
            { name:"Eagle Pose (Garudasana)", hold:"45 sec each", desc:"Cross right leg over left, hook foot behind calf if possible. Cross right arm under left, bind at forearms or hands. Hips sink. Focus gaze.", demo:"https://www.youtube.com/results?search_query=eagle+pose+yoga" },
            { name:"Standing Split", hold:"30 sec each", desc:"Forward fold, lift one leg as high as possible. Hands to floor. Excellent hamstring and balance work.", demo:"https://www.youtube.com/results?search_query=standing+split+yoga" },
            { name:"Savasana", hold:"4 min", desc:"Balance requires full concentration — rest after this work.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 17": {
          focus: "Shoulder & Neck Release",
          poses: [
            { name:"Cow Face Arms (Gomukhasana arms)", hold:"90 sec each", desc:"Reach right arm up, bend at elbow to touch upper back. Left arm reaches behind from below. Clasp fingers or hold strap. Intense shoulder opener.", demo:"https://www.youtube.com/results?search_query=cow+face+arms+yoga" },
            { name:"Puppy Pose (Uttana Shishosana)", hold:"2 min", desc:"On all fours, walk hands forward while hips stay over knees. Chest melts toward floor. Powerful shoulder and thoracic spine opener.", demo:"https://www.youtube.com/results?search_query=puppy+pose+yoga" },
            { name:"Dolphin Pose", hold:"60 sec × 3", desc:"Forearms on mat, hips lift high like downward dog on forearms. Builds shoulder stability for headstand later.", demo:"https://www.youtube.com/results?search_query=dolphin+pose+yoga" },
            { name:"Neck Rolls + Thread the Needle", hold:"90 sec each", desc:"Gentle neck circles then deep shoulder thread. Neck and shoulder release.", demo:"https://www.youtube.com/results?search_query=thread+the+needle+yoga" },
          ]
        },
        "Day 18": {
          focus: "Grounding Flow",
          poses: [
            { name:"Sun Salutation × 6", hold:"6 rounds", desc:"Build heat. Go faster rounds 3-4, slower rounds 5-6. Feel the flow becoming natural.", demo:"https://www.youtube.com/results?search_query=sun+salutation+yoga+flow" },
            { name:"Chair Pose (Utkatasana)", hold:"60 sec × 3", desc:"Feet together, sit back deeply. Arms overhead. Quads burn. Builds leg strength crucial for advanced poses.", demo:"https://www.youtube.com/results?search_query=chair+pose+yoga" },
            { name:"Goddess Pose", hold:"60 sec × 2", desc:"Wide squat, toes out, arms wide or at heart. Builds inner thigh strength and hip opening simultaneously.", demo:"https://www.youtube.com/results?search_query=goddess+pose+yoga" },
            { name:"Savasana", hold:"5 min", desc:"Ground the body after strong practice.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 19": {
          focus: "Yin Deep Release",
          poses: [
            { name:"Dragon Pose (Low Lunge Yin)", hold:"3 min each", desc:"Low lunge, hold still and breathe. Don't adjust. Let tissues slowly open over time. This is yin — passive, long holds.", demo:"https://www.youtube.com/results?search_query=dragon+pose+yin+yoga" },
            { name:"Sleeping Swan (Yin Pigeon)", hold:"4 min each", desc:"Pigeon shape but fully relaxed. Forehead on mat or block. Deepest hip release in yoga.", demo:"https://www.youtube.com/results?search_query=sleeping+swan+yin+yoga" },
            { name:"Shoelace Pose", hold:"3 min each", desc:"Stack knees on top of each other, fold forward. Deep outer hip and IT band release.", demo:"https://www.youtube.com/results?search_query=shoelace+pose+yin+yoga" },
            { name:"Savasana", hold:"7 min", desc:"Yin sessions need longer integration time. Lie still.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 20": {
          focus: "Phase 1 Completion — Full Practice",
          poses: [
            { name:"Sun Salutation A × 5 + B × 3", hold:"8 rounds total", desc:"Complete Surya Namaskar practice — both sequences back to back. You've earned this.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+B+yoga" },
            { name:"Standing Sequence", hold:"45 sec each", desc:"Warrior I → Warrior II → Triangle → Extended Side Angle. Both sides. Strong and confident.", demo:"https://www.youtube.com/results?search_query=standing+yoga+sequence+beginner" },
            { name:"Pigeon Pose", hold:"2 min each", desc:"Your hips have opened significantly since Day 1. Notice the difference.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga" },
            { name:"Bridge Pose", hold:"60 sec × 3", desc:"Strong and controlled. You've built real foundation.", demo:"https://www.youtube.com/results?search_query=bridge+pose+yoga" },
            { name:"Savasana", hold:"8 min", desc:"Phase 1 complete. You are no longer a beginner. Rest deeply.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },

        // ══════════════════════════════════════════════════════
        // PHASE 2 — BUILDING (Days 21–45) — Intermediate
        // ══════════════════════════════════════════════════════
        "Day 21": {
          focus: "Phase 2 Begins — Pranayama",
          poses: [
            { name:"Nadi Shodhana (Alternate Nostril Breathing)", hold:"10 min", desc:"Close right nostril, inhale left. Close left, exhale right. Inhale right. Close right, exhale left. One round. Balances nervous system and prepares for deeper practice.", demo:"https://www.youtube.com/results?search_query=alternate+nostril+breathing+yoga" },
            { name:"Ujjayi Breath Practice", hold:"5 min", desc:"Ocean breath — constrict the back of the throat slightly. Creates audible breath. Used throughout Ashtanga and Vinyasa practice. Master this now.", demo:"https://www.youtube.com/results?search_query=ujjayi+breath+yoga" },
            { name:"Extended Puppy Pose", hold:"3 min", desc:"Deepening the shoulder opener from Phase 1.", demo:"https://www.youtube.com/results?search_query=extended+puppy+pose+yoga" },
            { name:"Legs Up Wall", hold:"5 min", desc:"Calm and integrate the pranayama practice.", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
          ]
        },
        "Day 22": {
          focus: "Half Moon & Advanced Balance",
          poses: [
            { name:"Half Moon Pose (Ardha Chandrasana)", hold:"45 sec each", desc:"From Triangle, shift weight to front foot and bottom hand. Lift back leg parallel to floor. Top arm reaches to ceiling. Challenging balance requiring strength and focus.", demo:"https://www.youtube.com/results?search_query=half+moon+pose+yoga" },
            { name:"Dancer's Pose (Natarajasana) Prep", hold:"30 sec each", desc:"Stand on right foot, hold left ankle behind. Kick foot into hand, lift leg. Lean forward slightly. Balance and backbend combined.", demo:"https://www.youtube.com/results?search_query=dancer+pose+yoga+beginner" },
            { name:"Revolved Triangle (Parivrtta Trikonasana)", hold:"45 sec each", desc:"Triangle but with a twist. Front leg straight, opposite hand to shin or floor. Back arm to ceiling. Challenging balance and twist.", demo:"https://www.youtube.com/results?search_query=revolved+triangle+pose+yoga" },
            { name:"Savasana", hold:"5 min", desc:"Rest after complex balance work.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 23": {
          focus: "Wheel Pose Preparation",
          poses: [
            { name:"Bridge Pose × 5", hold:"60 sec × 5", desc:"Build the back strength and chest opening needed for wheel. Press actively. Increase duration each round.", demo:"https://www.youtube.com/results?search_query=bridge+pose+yoga" },
            { name:"Supported Wheel (Urdhva Dhanurasana prep)", hold:"30 sec × 3", desc:"Lie on back, hands by ears, feet flat. Press up to the top of the head first. Pause. Assess. Then attempt to straighten arms. Biggest backbend yet.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga+beginner" },
            { name:"Fish Pose (Matsyasana)", hold:"60 sec × 2", desc:"On back, arch thoracic spine, crown of head on mat. Chest lifts high. Counter pose for forward folds and excellent for wheel prep.", demo:"https://www.youtube.com/results?search_query=fish+pose+yoga" },
            { name:"Child's Pose", hold:"3 min", desc:"Essential counter pose after intensive backbend work.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          ]
        },
        "Day 24": {
          focus: "Crow Pose (First Arm Balance)",
          poses: [
            { name:"Wrist Warm-Up", hold:"3 min", desc:"Circles, extensions, flexions. Critical before any arm balance. Don't skip this.", demo:"https://www.youtube.com/results?search_query=wrist+warm+up+yoga+arm+balance" },
            { name:"Crow Pose (Bakasana)", hold:"5-10 attempts", desc:"Squat, place hands shoulder-width. Put knees on backs of upper arms. Lean forward and shift weight until feet lift. First arm balance. May take weeks to get — that's normal.", demo:"https://www.youtube.com/results?search_query=crow+pose+yoga+step+by+step" },
            { name:"Chaturanga Push-Ups", hold:"10 reps × 3", desc:"High plank → lower to low plank with elbows hugging ribs. Builds tricep and core strength for all arm balances.", demo:"https://www.youtube.com/results?search_query=chaturanga+yoga+tutorial" },
            { name:"Child's Pose", hold:"2 min", desc:"Rest wrists and reset.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          ]
        },
        "Day 25": {
          focus: "Standing Splits & Hip Flexors",
          poses: [
            { name:"Standing Split (Urdhva Prasarita Eka Padasana)", hold:"60 sec each", desc:"Forward fold on one leg, lift other leg as high as possible. Hands to blocks or floor. Hamstring and hip flexor deep work.", demo:"https://www.youtube.com/results?search_query=standing+split+yoga" },
            { name:"Splits Prep — Hanumanasana", hold:"2 min each", desc:"From low lunge, slowly slide front foot forward and back foot back. Use blocks under hands. This is the long journey to full splits.", demo:"https://www.youtube.com/results?search_query=splits+preparation+yoga+beginner" },
            { name:"Lizard Pose Deep", hold:"2 min each", desc:"Forearms on floor in lizard. Deepest hip flexor variation.", demo:"https://www.youtube.com/results?search_query=lizard+pose+yoga+forearms" },
            { name:"Reclined Hamstring Stretch", hold:"2 min each", desc:"On back, strap or towel around foot, leg to ceiling. Gentle hamstring lengthening.", demo:"https://www.youtube.com/results?search_query=reclined+hamstring+stretch+yoga" },
          ]
        },
        "Day 26": {
          focus: "Vinyasa Flow Building",
          poses: [
            { name:"Vinyasa Flow × 8 rounds", hold:"8 rounds", desc:"Sun Sal A with added Warrior I, Warrior II, Triangle per side. This is now your standard flow. Move with Ujjayi breath. Build internal heat (tapas).", demo:"https://www.youtube.com/results?search_query=vinyasa+yoga+flow+intermediate" },
            { name:"Pigeon Pose", hold:"3 min each", desc:"Settle deeply. You've been practicing 25 days — feel the difference in your hips.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga" },
            { name:"Savasana", hold:"6 min", desc:"Rest after strong flow practice.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 27": {
          focus: "Twists — Intermediate",
          poses: [
            { name:"Revolved Side Angle (Parivrtta Parsvakonasana)", hold:"45 sec each", desc:"Warrior I, bring opposite elbow to front knee. Prayer or bind with arms. Deep twist with strength. Challenging — use blocks if needed.", demo:"https://www.youtube.com/results?search_query=revolved+side+angle+pose+yoga" },
            { name:"Seated Twist — Marichyasana C", hold:"90 sec each", desc:"One leg extended, other bent. Wrap opposite arm around bent knee. Deep compression twist. Detoxifying for organs.", demo:"https://www.youtube.com/results?search_query=marichyasana+C+yoga" },
            { name:"Supine Twist — Deep", hold:"3 min each", desc:"Deeper version — both knees stacked to one side. Let gravity do the work.", demo:"https://www.youtube.com/results?search_query=supine+spinal+twist+yoga+deep" },
            { name:"Savasana", hold:"5 min", desc:"Integrate the detoxifying effects of twisting.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 28": {
          focus: "Four Weeks Complete — Milestone Practice",
          poses: [
            { name:"Full Vinyasa Flow with All Poses Learned", hold:"30 min", desc:"String together everything from the past 28 days. Sun Sals, Warriors, Triangle, Twists, Balance poses. Your own practice. This is yoga.", demo:"https://www.youtube.com/results?search_query=30+minute+intermediate+yoga+flow" },
            { name:"Crow Pose Practice", hold:"10 attempts", desc:"Keep working at Bakasana. Consistency is the key.", demo:"https://www.youtube.com/results?search_query=crow+pose+yoga" },
            { name:"Wheel Pose Attempt", hold:"3 attempts", desc:"Try your wheel. Use the strength you've built.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga" },
            { name:"Long Savasana", hold:"10 min", desc:"One month of yoga. You've changed your body and mind. Rest deeply.", demo:"https://www.youtube.com/results?search_query=savasana+yoga+long" },
          ]
        },
        "Day 29": {
          focus: "Shoulder Stands Intro",
          poses: [
            { name:"Legs Up Wall Variation", hold:"5 min", desc:"Preparatory inversion. Get comfortable with legs overhead.", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
            { name:"Plow Pose (Halasana)", hold:"60 sec × 3", desc:"From lying, lift hips and swing legs overhead, toes to floor. Hands support lower back. Intense neck and shoulder stretch. Contraindicated for neck issues.", demo:"https://www.youtube.com/results?search_query=plow+pose+yoga" },
            { name:"Supported Shoulder Stand (Sarvangasana)", hold:"2 min × 2", desc:"From plow, lift legs to ceiling. Hands on lower back, elbows on mat. Queen of all poses — builds tremendous strength and reverses fatigue.", demo:"https://www.youtube.com/results?search_query=shoulder+stand+yoga+beginners" },
            { name:"Fish Pose", hold:"60 sec", desc:"Counter pose after shoulder stand. Must do.", demo:"https://www.youtube.com/results?search_query=fish+pose+yoga" },
          ]
        },
        "Day 30": {
          focus: "Full Wheel & Heart Opening",
          poses: [
            { name:"Wheel Pose (Urdhva Dhanurasana) × 5", hold:"30 sec × 5", desc:"Full wheel. Press strongly through hands and feet. Head hangs. Chest opens. This pose energises the entire nervous system.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga+full" },
            { name:"Wild Thing (Camatkarasana)", hold:"30 sec each", desc:"From downward dog, flip to side, let back leg sweep. Backbend with open chest. Joyful heart opener.", demo:"https://www.youtube.com/results?search_query=wild+thing+pose+yoga" },
            { name:"Supported Fish", hold:"3 min", desc:"Block under thoracic spine. Chest opens passively. Full surrender into heart opening.", demo:"https://www.youtube.com/results?search_query=supported+fish+pose+yoga" },
            { name:"Child's Pose", hold:"3 min", desc:"Rest after intense backbend session. 30 days in — incredible progress.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          ]
        },

        // ══════════════════════════════════════════════════════
        // PHASE 3 — DEEPENING (Days 46–65)
        // ══════════════════════════════════════════════════════
        "Day 46": {
          focus: "Phase 3 — Headstand Introduction",
          poses: [
            { name:"Dolphin Pose × 10 holds", hold:"45 sec × 5", desc:"Build the shoulder and upper back strength for headstand. Push strongly through forearms.", demo:"https://www.youtube.com/results?search_query=dolphin+pose+yoga" },
            { name:"Headstand Prep (Sirsasana prep)", hold:"5 attempts", desc:"Forearms on mat in triangle shape with head. Lift hips high. Walk feet toward face. Practice tucking knees. Use wall for safety.", demo:"https://www.youtube.com/results?search_query=headstand+preparation+yoga" },
            { name:"Dolphin Push-Ups", hold:"10 reps × 3", desc:"Lower from dolphin to forearms on floor and back up. Direct headstand strength builder.", demo:"https://www.youtube.com/results?search_query=dolphin+push+ups+yoga" },
            { name:"Savasana", hold:"8 min", desc:"Inversions are intense for the nervous system. Rest fully.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 47": {
          focus: "Splits Progress",
          poses: [
            { name:"Hanumanasana (Splits) — both sides", hold:"3 min each", desc:"Full splits or as far as your body allows. Blocks under hands and front thigh. Your hamstrings and hip flexors have been preparing for weeks.", demo:"https://www.youtube.com/results?search_query=hanumanasana+splits+yoga" },
            { name:"Pigeon Pose", hold:"3 min each", desc:"Preparation for the splits requires open hips.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga" },
            { name:"Reclining Hero", hold:"2 min", desc:"Quad and hip flexor counter stretch.", demo:"https://www.youtube.com/results?search_query=reclining+hero+pose+yoga" },
            { name:"Savasana", hold:"6 min", desc:"Major hip work — rest is essential.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 48": {
          focus: "Side Crow & Arm Balances",
          poses: [
            { name:"Crow Pose (Bakasana) — 5 min practice", hold:"5 min", desc:"By now you should be holding crow. Work on extending hold time and lifting with control.", demo:"https://www.youtube.com/results?search_query=crow+pose+yoga" },
            { name:"Side Crow (Parsva Bakasana)", hold:"5 attempts each side", desc:"From squat, twist, stack knees on one upper arm. Lean forward to take flight. Requires rotation strength and concentration.", demo:"https://www.youtube.com/results?search_query=side+crow+pose+yoga" },
            { name:"Scale Pose (Tolasana)", hold:"10 sec × 5", desc:"In lotus or cross-legged, press hands down, lift entire body off ground. Extreme core and arm strength.", demo:"https://www.youtube.com/results?search_query=scale+pose+yoga+tolasana" },
            { name:"Child's Pose", hold:"3 min", desc:"Wrist and shoulder rest after arm balance work.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          ]
        },
        "Day 50": {
          focus: "Full Primary Series Intro",
          poses: [
            { name:"Ashtanga Primary Series — Standing Sequence", hold:"Full sequence", desc:"Surya Namaskar A × 5 + B × 3, then all standing poses of Primary series. Padangusthasana, Padahastasana, Utthita Trikonasana, Parivrtta Trikonasana, Utthita Parsvakonasana, and more.", demo:"https://www.youtube.com/results?search_query=ashtanga+primary+series+standing+sequence" },
            { name:"Seated sequence — first 5 poses", hold:"Full sequence", desc:"Dandasana, Paschimottanasana, Purvottanasana, Ardha Baddha Padma Paschimottanasana, Triang Mukhaikapada Paschimottanasana.", demo:"https://www.youtube.com/results?search_query=ashtanga+primary+series+seated+sequence+beginner" },
            { name:"Savasana", hold:"10 min", desc:"Day 50 — Halfway to professional. Celebrate.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 55": {
          focus: "Forearm Stand Preparation",
          poses: [
            { name:"Dolphin Pose — Extended holds", hold:"90 sec × 5", desc:"Building the base strength for Pincha Mayurasana.", demo:"https://www.youtube.com/results?search_query=dolphin+pose+yoga" },
            { name:"Forearm Stand Prep (Pincha Mayurasana prep)", hold:"10 attempts", desc:"Forearms on mat parallel, kick one leg up then bring other. Use wall for support. Upper back and shoulder endurance required.", demo:"https://www.youtube.com/results?search_query=forearm+stand+yoga+preparation" },
            { name:"Wheel Pose × 5", hold:"45 sec × 5", desc:"Strengthening for full backbend inversions.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga" },
            { name:"Savasana", hold:"8 min", desc:"Inversions and backbends together — deep rest needed.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 60": {
          focus: "Headstand (Sirsasana) — Full",
          poses: [
            { name:"Headstand (Sirsasana) — Full practice", hold:"3 min", desc:"The king of all poses. Forearms on mat, head lightly placed. Lift both legs to ceiling. Use wall if needed. Build duration slowly. Transforms the practice.", demo:"https://www.youtube.com/results?search_query=headstand+yoga+full+tutorial" },
            { name:"Shoulder Stand Sequence", hold:"5 min", desc:"Shoulder stand → plow → ear pressure pose. Classic finishing sequence.", demo:"https://www.youtube.com/results?search_query=shoulder+stand+plow+pose+yoga" },
            { name:"Fish Pose", hold:"2 min", desc:"Mandatory counter pose.", demo:"https://www.youtube.com/results?search_query=fish+pose+yoga" },
            { name:"Savasana", hold:"10 min", desc:"60 days. You've reached a level most people never achieve.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 65": {
          focus: "Phase 3 Complete — Advanced Assessment",
          poses: [
            { name:"Full Vinyasa Practice — 45 min", hold:"45 min", desc:"Complete practice: Sun Sals, standing sequence, backbends, inversions, seated sequence. This is now your level.", demo:"https://www.youtube.com/results?search_query=45+minute+advanced+yoga+flow" },
            { name:"Crow → Headstand transition", hold:"5 attempts", desc:"Advanced transition — from crow, extend into headstand tripod.", demo:"https://www.youtube.com/results?search_query=crow+to+headstand+yoga" },
            { name:"Splits (Hanumanasana)", hold:"3 min each", desc:"Your flexibility has transformed completely.", demo:"https://www.youtube.com/results?search_query=hanumanasana+splits+yoga" },
            { name:"Savasana", hold:"12 min", desc:"Three phases complete. Advanced practitioner level achieved.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },

        // ══════════════════════════════════════════════════════
        // PHASE 4 — STRENGTH & INVERSIONS (Days 66–80)
        // ══════════════════════════════════════════════════════
        "Day 66": {
          focus: "Phase 4 — Handstand Foundation",
          poses: [
            { name:"Handstand Kick-ups at Wall", hold:"10 attempts", desc:"Place hands 6 inches from wall. Kick one leg, then other, to wall. Hold. Build confidence being inverted on hands. The ultimate goal of Phase 4.", demo:"https://www.youtube.com/results?search_query=handstand+yoga+against+wall+beginner" },
            { name:"Plank Hold — Extended", hold:"90 sec × 5", desc:"Build the wrist and shoulder endurance handstand demands.", demo:"https://www.youtube.com/results?search_query=plank+hold+yoga" },
            { name:"Handstand Shape Practice", hold:"10 reps", desc:"Stand facing wall, place hands, jump both feet up simultaneously. Don't kick — jump. Find the balance.", demo:"https://www.youtube.com/results?search_query=handstand+practice+yoga" },
            { name:"Wrist Recovery + Child's Pose", hold:"4 min", desc:"Always recover wrists after handstand practice.", demo:"https://www.youtube.com/results?search_query=wrist+recovery+yoga" },
          ]
        },
        "Day 70": {
          focus: "Eight-Angle Pose (Astavakrasana)",
          poses: [
            { name:"Preparation — Leg Threading", hold:"5 min", desc:"Learn to thread leg behind upper arm. The setup for this complex arm balance.", demo:"https://www.youtube.com/results?search_query=eight+angle+pose+preparation+yoga" },
            { name:"Eight-Angle Pose (Astavakrasana)", hold:"10 attempts each", desc:"Thread right leg over right arm. Hook left ankle over right. Extend legs to the right. Lean forward, lower to chaturanga. Advanced arm balance requiring full arm and core integration.", demo:"https://www.youtube.com/results?search_query=eight+angle+pose+yoga+astavakrasana" },
            { name:"Crow → Chaturanga transition", hold:"10 reps", desc:"Flow arm balances together. Jump back to plank from crow.", demo:"https://www.youtube.com/results?search_query=crow+to+chaturanga+yoga" },
            { name:"Savasana", hold:"8 min", desc:"Advanced arm balance day — full rest.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 75": {
          focus: "Forearm Stand (Pincha Mayurasana)",
          poses: [
            { name:"Forearm Stand (Pincha Mayurasana) — Full", hold:"2 min", desc:"Forearms parallel on mat. Kick both legs up. Hold at wall or freestanding. More shoulder flexibility than handstand. Elegant inversion.", demo:"https://www.youtube.com/results?search_query=forearm+stand+yoga+pincha+mayurasana" },
            { name:"Scorpion Pose Prep (Vrschikasana)", hold:"5 attempts", desc:"From forearm stand, bend knees and try to reach feet toward head. Ultimate backbend-inversion combination.", demo:"https://www.youtube.com/results?search_query=scorpion+pose+yoga+preparation" },
            { name:"Wheel × 5 deep holds", hold:"60 sec × 5", desc:"Building the backbend flexibility scorpion demands.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga" },
            { name:"Savasana", hold:"10 min", desc:"Phase 4 is intense. Rest completely.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 80": {
          focus: "Phase 4 Complete — Handstand Freestanding",
          poses: [
            { name:"Freestanding Handstand Practice", hold:"20 min dedicated practice", desc:"Away from wall. Kick up, find balance, work the hollow body position. This takes months — be patient but persistent. Even 1 second freestanding is a major victory.", demo:"https://www.youtube.com/results?search_query=freestanding+handstand+yoga+tips" },
            { name:"Full Inversion Sequence", hold:"Full sequence", desc:"Headstand 3 min → Shoulder Stand 3 min → Plow 2 min → Fish 2 min. Complete inversion sequence of a professional practitioner.", demo:"https://www.youtube.com/results?search_query=yoga+inversion+sequence" },
            { name:"Splits both sides", hold:"3 min each", desc:"Flexibility maintenance — essential alongside strength work.", demo:"https://www.youtube.com/results?search_query=splits+yoga" },
            { name:"Long Savasana", hold:"12 min", desc:"Phase 4 complete. You are an advanced yogi. 10 days remain to professional.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },

        // ══════════════════════════════════════════════════════
        // PHASE 5 — PROFESSIONAL FLOW (Days 81–90)
        // ══════════════════════════════════════════════════════
        "Day 81": {
          focus: "Phase 5 — Professional Practice Begins",
          poses: [
            { name:"Ashtanga Primary Series — Full", hold:"75 min", desc:"Complete Ashtanga Primary Series: Surya Namaskar A+B, full standing sequence, full seated sequence with all vinyasas, finishing sequence. This is the benchmark of a professional yoga practitioner.", demo:"https://www.youtube.com/results?search_query=ashtanga+yoga+primary+series+full+led+class" },
            { name:"Savasana", hold:"15 min", desc:"Full primary series demands complete rest. Allow 15 minutes minimum.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 82": {
          focus: "Advanced Backbends",
          poses: [
            { name:"Kapotasana (King Pigeon)", hold:"60 sec × 3", desc:"From kneeling, backbend deeply, hands reach for feet. Deepest backbend in primary series. Requires wheel as prerequisite.", demo:"https://www.youtube.com/results?search_query=kapotasana+yoga+king+pigeon" },
            { name:"Eka Pada Raja Kapotasana", hold:"60 sec each", desc:"One-legged king pigeon. Front leg in pigeon, back leg bends, same-side hand holds foot. Combines hip opening and backbend.", demo:"https://www.youtube.com/results?search_query=eka+pada+raja+kapotasana+yoga" },
            { name:"Wheel → Drop Back practice", hold:"5 attempts", desc:"Stand and drop back to wheel from standing. The professional transition. Requires courage and strength.", demo:"https://www.youtube.com/results?search_query=wheel+pose+drop+back+yoga" },
            { name:"Child's Pose + Savasana", hold:"10 min", desc:"Full rest after intense backbend session.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 84": {
          focus: "Lotus & Seated Mastery",
          poses: [
            { name:"Full Lotus (Padmasana)", hold:"10 min meditation", desc:"Both feet on opposite thighs. The seat of the Buddha. Requires months of hip opening. If not accessible, use half lotus. Meditate in this pose.", demo:"https://www.youtube.com/results?search_query=full+lotus+pose+yoga+padmasana" },
            { name:"Tolasana — Scale Pose", hold:"20 sec × 5", desc:"In lotus, press hands down and lift entirely off ground. Extreme abdominal and arm strength.", demo:"https://www.youtube.com/results?search_query=tolasana+scale+pose+yoga" },
            { name:"Bound Lotus (Baddha Padmasana)", hold:"2 min", desc:"In full lotus, reach arms behind back to hold opposite feet. Deep shoulder opening combined with lotus.", demo:"https://www.youtube.com/results?search_query=bound+lotus+yoga+baddha+padmasana" },
            { name:"Savasana", hold:"10 min", desc:"Lotus practice is meditative. Close eyes in savasana and observe the stillness.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 86": {
          focus: "Teaching-Level Flow",
          poses: [
            { name:"Create Your Own 60-Minute Flow", hold:"60 min", desc:"Design and practice your own sequence using all poses learned over 86 days. Include: warm-up, standing, balancing, backbends, twists, inversions, and savasana. This is what it means to have your own practice.", demo:"https://www.youtube.com/results?search_query=yoga+sequence+design+advanced" },
            { name:"Headstand — Extended", hold:"5 min", desc:"Hold headstand for 5 continuous minutes. Breathe naturally. The mind becomes still in inversions.", demo:"https://www.youtube.com/results?search_query=headstand+yoga+5+minutes" },
            { name:"Savasana", hold:"15 min", desc:"You are nearly professional. This rest is earned.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 88": {
          focus: "Nadi Shodhana + Advanced Pranayama",
          poses: [
            { name:"Kapalabhati (Skull Shining Breath)", hold:"10 min", desc:"Short sharp exhales through nose, passive inhale. 120 rounds/minute. Clears sinuses, energises mind, heats the core. Advanced pranayama technique.", demo:"https://www.youtube.com/results?search_query=kapalabhati+pranayama+yoga" },
            { name:"Bhramari (Humming Bee Breath)", hold:"10 min", desc:"Inhale deeply, exhale with long humming sound. Index fingers on ears. Profoundly calming. Used before meditation.", demo:"https://www.youtube.com/results?search_query=bhramari+pranayama+yoga" },
            { name:"Silent Meditation in Lotus", hold:"20 min", desc:"No guidance. Sit in full or half lotus. Breathe naturally. Observe thoughts without following them. This is the ultimate purpose of all yoga.", demo:"https://www.youtube.com/results?search_query=silent+meditation+yoga" },
          ]
        },
        "Day 89": {
          focus: "Full Advanced Practice",
          poses: [
            { name:"Full Advanced Yoga Practice", hold:"90 min", desc:"Sun Sals × 10 → Full standing → Arm balances (Crow, Side Crow, Eight-Angle) → Backbends (Wheel, Kapotasana) → Inversions (Headstand, Forearm Stand, Shoulder Stand) → Splits → Lotus → Savasana. The complete journey.", demo:"https://www.youtube.com/results?search_query=advanced+yoga+practice+90+minutes" },
            { name:"Savasana", hold:"20 min", desc:"You have one day left. Absorb everything you've built.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          ]
        },
        "Day 90": {
          focus: "🏆 Professional Yoga — Journey Complete",
          poses: [
            { name:"Morning Pranayama", hold:"15 min", desc:"Nadi Shodhana 5 min → Kapalabhati 5 min → Meditation 5 min. Begin your final day as a professional practitioner begins their day — with breath.", demo:"https://www.youtube.com/results?search_query=morning+pranayama+yoga" },
            { name:"Your Full Yoga Practice", hold:"60-90 min", desc:"No guidance needed today. You know your practice. Flow through poses that feel right. This is your body, your breath, your practice. You've earned this.", demo:"https://www.youtube.com/results?search_query=advanced+yoga+practice" },
            { name:"Final Savasana", hold:"20 min", desc:"90 days. You began as a beginner and end as a professional. The practice never ends — but you have the tools now. Namaste. 🙏", demo:"https://www.youtube.com/results?search_query=savasana+yoga+final+relaxation" },
          ]
        },

      }
    },

    stretching: {
      name: "Stretching",
      emoji: "🤸",
      color: "grad-stretch",
      days: {
        Monday: [
          { name:"Neck Rolls", hold:"5 each dir", rounds:3, desc:"Slowly roll head in full circles. Never force the movement.", image:"", demo:"https://www.youtube.com/results?search_query=neck+rolls+stretch" },
          { name:"Chest Opener Stretch", hold:"45 sec", rounds:3, desc:"Clasp hands behind back, open chest, lift chin.", image:"", demo:"https://www.youtube.com/results?search_query=chest+opener+stretch" },
          { name:"Hip Flexor Lunge", hold:"45 sec each", rounds:3, desc:"Low lunge, front knee 90°. Push hips forward and down.", image:"", demo:"https://www.youtube.com/results?search_query=hip+flexor+lunge+stretch" },
          { name:"Standing Hamstring Stretch", hold:"40 sec each", rounds:3, desc:"Foot on ledge, hinge forward from hips.", image:"", demo:"https://www.youtube.com/results?search_query=standing+hamstring+stretch" },
          { name:"Quad Stretch", hold:"30 sec each", rounds:3, desc:"Standing, pull foot to glute.", image:"", demo:"https://www.youtube.com/results?search_query=standing+quad+stretch" },
          { name:"Calf Stretch", hold:"30 sec each", rounds:3, desc:"Heel on floor, lean forward.", image:"", demo:"https://www.youtube.com/results?search_query=calf+stretch+wall" },
        ],
        Tuesday: [
          { name:"Doorway Chest Stretch", hold:"45 sec", rounds:3, desc:"Hands on doorframe, lean forward.", image:"", demo:"https://www.youtube.com/results?search_query=doorway+chest+stretch" },
          { name:"Thoracic Rotation", hold:"10 each", rounds:3, desc:"Seated, rotate upper body left and right.", image:"", demo:"https://www.youtube.com/results?search_query=thoracic+rotation+stretch" },
          { name:"Seated Pigeon", hold:"60 sec each", rounds:3, desc:"Ankle on opposite knee (figure 4). Lean forward.", image:"", demo:"https://www.youtube.com/results?search_query=seated+pigeon+pose+stretch" },
          { name:"IT Band Stretch", hold:"45 sec each", rounds:3, desc:"Cross one leg behind other, lean sideways.", image:"", demo:"https://www.youtube.com/results?search_query=IT+band+stretch" },
          { name:"Wrist and Forearm Stretch", hold:"30 sec each", rounds:3, desc:"Extend arm, bend wrist down and up.", image:"", demo:"https://www.youtube.com/results?search_query=wrist+forearm+stretch" },
          { name:"Ankle Circles", hold:"10 each dir", rounds:3, desc:"Slow ankle rotations in both directions.", image:"", demo:"https://www.youtube.com/results?search_query=ankle+circles+mobility" },
        ],
        Wednesday: [
          { name:"Butterfly Stretch", hold:"60 sec", rounds:3, desc:"Soles of feet together, lean forward gently.", image:"", demo:"https://www.youtube.com/results?search_query=butterfly+stretch" },
          { name:"Figure 4 Glute Stretch", hold:"60 sec each", rounds:3, desc:"Lying on back, figure-4 with legs.", image:"", demo:"https://www.youtube.com/results?search_query=figure+4+glute+stretch" },
          { name:"Child's Pose with Reach", hold:"45 sec each", rounds:3, desc:"Child's pose, walk hands to each side.", image:"", demo:"https://www.youtube.com/results?search_query=child's+pose+side+stretch" },
          { name:"Standing Side Stretch", hold:"30 sec each", rounds:3, desc:"Arm overhead, reach and lean to opposite side.", image:"", demo:"https://www.youtube.com/results?search_query=standing+side+stretch" },
          { name:"Spinal Twist Seated", hold:"45 sec each", rounds:3, desc:"Seated, one leg extended. Cross other foot over. Rotate toward bent knee.", image:"", demo:"https://www.youtube.com/results?search_query=seated+spinal+twist" },
          { name:"90-90 Hip Stretch", hold:"60 sec each", rounds:3, desc:"Both legs at 90° angles on floor.", image:"", demo:"https://www.youtube.com/results?search_query=90+90+hip+stretch" },
        ],
        Thursday: [
          { name:"Shoulder Cross-Body Stretch", hold:"30 sec each", rounds:3, desc:"Pull arm across chest.", image:"", demo:"https://www.youtube.com/results?search_query=cross+body+shoulder+stretch" },
          { name:"Bicep Wall Stretch", hold:"30 sec each", rounds:3, desc:"Hand flat on wall at shoulder height, rotate away.", image:"", demo:"https://www.youtube.com/results?search_query=bicep+wall+stretch" },
          { name:"Lying Hamstring Stretch", hold:"45 sec each", rounds:3, desc:"On back, loop band/towel around foot, extend leg.", image:"", demo:"https://www.youtube.com/results?search_query=lying+hamstring+stretch+band" },
          { name:"Frog Stretch", hold:"60 sec", rounds:3, desc:"On all fours, knees wide, rock back.", image:"", demo:"https://www.youtube.com/results?search_query=frog+stretch" },
          { name:"Upper Trap Stretch", hold:"30 sec each", rounds:3, desc:"Tilt head to one side, hold with hand.", image:"", demo:"https://www.youtube.com/results?search_query=upper+trap+stretch" },
          { name:"Thoracic Extension on Foam Roll", hold:"60 sec", rounds:3, desc:"Foam roller perpendicular to spine. Extend over roller at different segments.", image:"", demo:"https://www.youtube.com/results?search_query=thoracic+extension+foam+roller" },
        ],
        Friday: [
          { name:"Full Body Stretch Sequence", hold:"15 min", rounds:1, desc:"Guided head-to-toe stretch.", image:"", demo:"https://www.youtube.com/results?search_query=full+body+stretch+sequence" },
          { name:"Couch Stretch", hold:"60 sec each", rounds:3, desc:"Rear foot elevated, front foot forward. Deepest hip flexor stretch.", image:"", demo:"https://www.youtube.com/results?search_query=couch+stretch+hip+flexor" },
          { name:"Pancake Stretch", hold:"60 sec", rounds:3, desc:"Straddle position, fold forward.", image:"", demo:"https://www.youtube.com/results?search_query=pancake+stretch" },
          { name:"Shoulder Capsule Stretch", hold:"30 sec each", rounds:3, desc:"Arm across chest in horizontal position.", image:"", demo:"https://www.youtube.com/results?search_query=posterior+shoulder+capsule+stretch" },
          { name:"Active Lunge Stretch", hold:"10 each", rounds:3, desc:"Dynamic lunge with rotation.", image:"", demo:"https://www.youtube.com/results?search_query=lunge+with+twist+stretch" },
          { name:"Box Breathing Cooldown", hold:"5 min", rounds:1, desc:"Inhale 4 sec, hold 4 sec, exhale 4 sec, hold 4 sec.", image:"", demo:"https://www.youtube.com/results?search_query=box+breathing+technique" },
        ],
        Saturday: [
          { name:"Yin Style Full Body", hold:"20 min", rounds:1, desc:"Hold each stretch 2-3 minutes.", image:"", demo:"https://www.youtube.com/results?search_query=yin+yoga+full+body+20+minutes" },
          { name:"PNF Hamstring", hold:"3 cycles each", rounds:3, desc:"Stretch, contract 6 sec, stretch further.", image:"", demo:"https://www.youtube.com/results?search_query=PNF+hamstring+stretch" },
          { name:"Hip Circle Mobility", hold:"10 each dir", rounds:3, desc:"Wide stance, rotate hips in large circles.", image:"", demo:"https://www.youtube.com/results?search_query=hip+circle+mobility" },
          { name:"Overhead Tricep Stretch", hold:"30 sec each", rounds:3, desc:"Arm overhead, elbow bent. Push elbow back with other hand.", image:"", demo:"https://www.youtube.com/results?search_query=overhead+tricep+stretch" },
          { name:"Anterior Tib Stretch", hold:"30 sec each", rounds:3, desc:"Kneel, top of foot on floor. Sit back on heels.", image:"", demo:"https://www.youtube.com/results?search_query=anterior+tibialis+stretch" },
          { name:"Total Body Relax", hold:"5 min", rounds:1, desc:"Lie still, progressive muscle relaxation.", image:"", demo:"https://www.youtube.com/results?search_query=progressive+muscle+relaxation" },
        ],
      }
    },

    core: {
      name: "Core & Abs",
      emoji: "🔥",
      color: "grad-core",
      days: {
        Monday: [
          { name:"Plank Hold", sets:4, reps:"45 sec", desc:"Forearms flat, body in straight line from head to heels. Squeeze glutes, brace abs hard. Don't let hips sag or pike up. Build to 60 sec per set.", image:"", demo:"https://www.youtube.com/results?search_query=plank+hold+proper+form" },
          { name:"Crunches", sets:3, reps:"20 reps", desc:"Lie on back, knees bent. Hands behind ears — don't pull neck. Curl shoulders up, exhale at top. Slow and controlled. Feel the upper abs contract.", image:"", demo:"https://www.youtube.com/results?search_query=crunches+proper+form" },
          { name:"Leg Raises", sets:3, reps:"15 reps", desc:"Lie on back, hands under lower back. Raise straight legs to 90°, lower slowly without touching floor. Targets lower abs intensely.", image:"", demo:"https://www.youtube.com/results?search_query=leg+raises+exercise+core" },
          { name:"Russian Twists", sets:3, reps:"20 reps (10 each side)", desc:"Sit at 45°, feet off floor. Rotate torso side to side touching hands to the floor. Hold a weight for more intensity.", image:"", demo:"https://www.youtube.com/results?search_query=russian+twists+exercise" },
          { name:"Mountain Climbers", sets:3, reps:"40 sec", desc:"High plank position. Drive alternating knees to chest rapidly. Keep hips level. Great cardio-core combo.", image:"", demo:"https://www.youtube.com/results?search_query=mountain+climbers+exercise+core" },
          { name:"Dead Bug", sets:3, reps:"10 reps (each side)", desc:"On back, arms to ceiling, knees at 90°. Lower opposite arm and leg simultaneously while pressing lower back to floor. Best deep core stability exercise.", image:"", demo:"https://www.youtube.com/results?search_query=dead+bug+exercise+core" },
        ],
        Tuesday: [
          { name:"Side Plank (Left)", sets:3, reps:"30 sec", desc:"Left forearm down, stack feet or stagger for balance. Body forms a straight diagonal line. Obliques do the work — don't let hips drop.", image:"", demo:"https://www.youtube.com/results?search_query=side+plank+form" },
          { name:"Side Plank (Right)", sets:3, reps:"30 sec", desc:"Right forearm down, same as left. Keep core braced, breathe normally. Elevate top arm for extra challenge.", image:"", demo:"https://www.youtube.com/results?search_query=side+plank+form" },
          { name:"Bicycle Crunches", sets:3, reps:"30 reps (15 each side)", desc:"Lie on back, hands behind head. Alternate bringing elbow to opposite knee while extending other leg. Best exercise for obliques per EMG studies.", image:"", demo:"https://www.youtube.com/results?search_query=bicycle+crunches+proper+form" },
          { name:"Reverse Crunches", sets:3, reps:"15 reps", desc:"Lie on back, hands at sides. Bring knees to chest, then lift hips off floor. Lower slowly. Targets lower abs effectively.", image:"", demo:"https://www.youtube.com/results?search_query=reverse+crunch+exercise" },
          { name:"Flutter Kicks", sets:3, reps:"40 sec", desc:"Lie on back, lift legs 6 inches off floor. Alternate small up-down kicks like swimming. Keep lower back pressed to ground.", image:"", demo:"https://www.youtube.com/results?search_query=flutter+kicks+exercise+abs" },
          { name:"Hollow Body Hold", sets:3, reps:"20 sec", desc:"Lie on back, arms overhead. Lift shoulder blades and legs off floor, pressing lower back down. Advanced isometric core exercise.", image:"", demo:"https://www.youtube.com/results?search_query=hollow+body+hold+exercise" },
        ],
        Wednesday: [
          { name:"Ab Wheel Rollout", sets:3, reps:"10 reps", desc:"Kneel behind wheel, roll forward keeping core rigid. Go as far as you can without hips dropping. Roll back using abs, not arms. Extremely demanding.", image:"", demo:"https://www.youtube.com/results?search_query=ab+wheel+rollout+form" },
          { name:"V-Ups", sets:3, reps:"12 reps", desc:"Lie flat, arms overhead. Simultaneously lift upper body and straight legs to form a V shape. Reach hands toward feet at top. Control the descent.", image:"", demo:"https://www.youtube.com/results?search_query=v+ups+exercise" },
          { name:"Heel Taps", sets:3, reps:"30 reps (15 each side)", desc:"Lie on back, knees bent at 90°. Crunch to the side to tap each heel alternately. Targets obliques with low joint stress.", image:"", demo:"https://www.youtube.com/results?search_query=heel+taps+exercise+obliques" },
          { name:"Plank Hip Dips", sets:3, reps:"20 reps (10 each side)", desc:"Forearm plank. Rotate hips to dip toward the floor alternately. Targets obliques while maintaining core bracing.", image:"", demo:"https://www.youtube.com/results?search_query=plank+hip+dips+obliques" },
          { name:"Scissor Kicks", sets:3, reps:"30 sec", desc:"On back, hands under hips. Raise both legs to 45°. Alternate crossing legs over each other like scissors. Strong lower abs burn.", image:"", demo:"https://www.youtube.com/results?search_query=scissor+kicks+exercise+abs" },
          { name:"Bird Dog", sets:3, reps:"10 reps (each side)", desc:"On all fours, extend opposite arm and leg simultaneously. Hold 2 sec. Return and switch. Builds core stability and spinal control.", image:"", demo:"https://www.youtube.com/results?search_query=bird+dog+exercise+core" },
        ],
        Thursday: [
          { name:"Long Lever Plank", sets:3, reps:"30 sec", desc:"Standard plank but with hands further forward. Far harder than regular plank. Demand on core dramatically increases.", image:"", demo:"https://www.youtube.com/results?search_query=long+lever+plank+advanced" },
          { name:"Tuck Crunches", sets:3, reps:"20 reps", desc:"Lie on back, lift legs and crunch simultaneously bringing elbows to knees. Engages full rectus abdominis from top to bottom.", image:"", demo:"https://www.youtube.com/results?search_query=tuck+crunch+exercise" },
          { name:"Windshield Wipers", sets:3, reps:"10 reps (each side)", desc:"Lie on back, arms wide for support. Raise legs to 90°. Rotate legs to one side, stop before touching floor, return. Extreme oblique work.", image:"", demo:"https://www.youtube.com/results?search_query=windshield+wipers+exercise+abs" },
          { name:"Boat Pose Hold", sets:3, reps:"30 sec", desc:"Sit with knees bent, lean back slightly, lift feet off floor. Extend arms forward parallel to ground. Yoga-based core hold.", image:"", demo:"https://www.youtube.com/results?search_query=boat+pose+core+exercise" },
          { name:"Cross-Body Mountain Climbers", sets:3, reps:"30 sec", desc:"High plank. Drive right knee toward left elbow and alternate. Slower than standard mountain climbers — rotational focus.", image:"", demo:"https://www.youtube.com/results?search_query=cross+body+mountain+climbers" },
          { name:"Toe Touches", sets:3, reps:"15 reps", desc:"Lie on back, legs straight to ceiling. Crunch up and try to touch toes. Full contraction of upper abs at end range.", image:"", demo:"https://www.youtube.com/results?search_query=toe+touches+exercise+abs" },
        ],
        Friday: [
          { name:"Hanging Knee Raises", sets:3, reps:"15 reps", desc:"Hang from bar, bring knees to chest using abs (not hip flexors). Pause at top. Lower slowly. Add leg straightening for more intensity.", image:"", demo:"https://www.youtube.com/results?search_query=hanging+knee+raises+exercise" },
          { name:"Dragon Flag Negative", sets:3, reps:"5 reps", desc:"Lie on bench, grip behind head. Lift body to vertical, then lower slowly as one rigid unit. Bruce Lee's signature move. Extreme core strength.", image:"", demo:"https://www.youtube.com/results?search_query=dragon+flag+exercise" },
          { name:"Oblique Crunches", sets:3, reps:"15 reps each side", desc:"Lie on side, top hand behind ear. Crunch upward laterally. Squeeze oblique at top. Rotate to other side.", image:"", demo:"https://www.youtube.com/results?search_query=oblique+crunches+side" },
          { name:"Plank Shoulder Taps", sets:3, reps:"20 taps (10 each)", desc:"High plank. Alternate lifting each hand to tap opposite shoulder. Minimise hip rotation — challenge anti-rotation stability.", image:"", demo:"https://www.youtube.com/results?search_query=plank+shoulder+taps" },
          { name:"Seated Ab Circles", sets:3, reps:"10 each direction", desc:"Sit on floor, lean back at 45°, feet off floor. Make large circles with torso. Targets entire core in continuous motion.", image:"", demo:"https://www.youtube.com/results?search_query=seated+ab+circles+exercise" },
          { name:"Superman Hold", sets:3, reps:"30 sec", desc:"Lie face down, arms extended overhead. Lift arms, chest and legs simultaneously. Targets lower back — critical balance to strong abs.", image:"", demo:"https://www.youtube.com/results?search_query=superman+hold+exercise+back" },
        ],
        Saturday: [
          { name:"6-Minute Ab Circuit", sets:1, reps:"6 min non-stop", desc:"Rotate through: 45 sec plank → 15 sec rest → 45 sec crunches → 15 sec rest → 45 sec leg raises → 15 sec rest → 45 sec Russian twists → 15 sec rest → 45 sec bicycle crunches → 15 sec rest. One circuit = 6 min.", image:"", demo:"https://www.youtube.com/results?search_query=6+minute+ab+workout+circuit" },
          { name:"Plank Progression Ladder", sets:1, reps:"4 levels", desc:"Level 1: Standard plank 30 sec → Level 2: Plank to push-up 10 reps → Level 3: Side plank 20 sec each → Level 4: Single-leg plank 20 sec each. Go through all 4.", image:"", demo:"https://www.youtube.com/results?search_query=plank+progression+workout" },
          { name:"100 Rep Ab Challenge", sets:1, reps:"100 total reps", desc:"25 crunches + 25 leg raises + 25 bicycle crunches + 25 Russian twists. Rest only when needed. Track your time each week to measure improvement.", image:"", demo:"https://www.youtube.com/results?search_query=100+ab+challenge+workout" },
          { name:"L-Sit Attempt", sets:3, reps:"10 sec hold", desc:"On parallel bars or between two sturdy chairs, straighten legs forward parallel to floor. Advanced move — keep working at it. Even a tuck hold counts.", image:"", demo:"https://www.youtube.com/results?search_query=l+sit+exercise+tutorial" },
          { name:"Turkish Get-Up (Core)", sets:2, reps:"3 each side", desc:"From lying to standing with one arm extended overhead. Slow, deliberate movement. Demands total-body stability with core as the anchor.", image:"", demo:"https://www.youtube.com/results?search_query=turkish+get+up+exercise" },
          { name:"Breathing Reset", sets:1, reps:"5 min", desc:"Lie on back, knees bent. Deep belly breathing — inhale 4 sec, hold 2 sec, exhale 6 sec. Activates parasympathetic system for recovery.", image:"", demo:"https://www.youtube.com/results?search_query=diaphragmatic+breathing+exercise" },
        ],
      }
    },
  },
  running: {
    plans: {
      "5K":  { color:"#43a05a", emoji:"🏃",   weeks:6,  desc:"Beginner-friendly. Build from 2km to 5km in 6 weeks.", schedule:[
        {week:1,day:1,type:"Easy Run",dist:2,dur:20,desc:"Very easy pace. Conversational. Just get moving."},
        {week:1,day:2,type:"Rest/Walk",dist:0,dur:30,desc:"Brisk 30-minute walk. Active recovery."},
        {week:1,day:3,type:"Intervals",dist:2.5,dur:25,desc:"4 × 2 min run, 2 min walk."},
        {week:1,day:4,type:"Rest",dist:0,dur:0,desc:"Full rest day."},
        {week:1,day:5,type:"Easy Run",dist:2.5,dur:25,desc:"Slightly longer easy run."},
        {week:1,day:6,type:"Long Run",dist:3,dur:30,desc:"Your longest run this week."},
        {week:2,day:1,type:"Easy Run",dist:2.5,dur:25,desc:"Easy warm-up run."},
        {week:2,day:2,type:"Walk/Jog",dist:3,dur:30,desc:"Alternate 3 min jog, 1 min walk."},
        {week:2,day:3,type:"Tempo",dist:2,dur:20,desc:"10 min easy, 5 min faster, 5 min easy."},
        {week:2,day:4,type:"Rest",dist:0,dur:0,desc:"Rest."},
        {week:2,day:5,type:"Easy Run",dist:3,dur:30,desc:"Comfortable 3km."},
        {week:2,day:6,type:"Long Run",dist:3.5,dur:35,desc:"3.5km continuous if possible."},
        {week:3,day:6,type:"Long Run",dist:4,dur:40,desc:"Your first 4km!"},
        {week:4,day:6,type:"Long Run",dist:4.5,dur:45,desc:"4.5km. Almost there!"},
        {week:5,day:6,type:"Long Run",dist:5,dur:50,desc:"Your first 5K! Celebrate!"},
        {week:6,day:6,type:"RACE DAY! 🏆",dist:5,dur:0,desc:"This is it! Run your 5K!"},
      ]},
      "10K": { color:"#1e88e5", emoji:"🏃‍♂️", weeks:8,  desc:"For runners who can run 5K. Double the distance in 8 weeks.", schedule:[
        {week:1,day:1,type:"Easy Run",dist:4,dur:38,desc:"Comfortable 4km base run."},
        {week:1,day:3,type:"Intervals",dist:4,dur:40,desc:"6 × 400m at 5K pace."},
        {week:1,day:6,type:"Long Run",dist:6,dur:58,desc:"First long run. Easy steady pace."},
        {week:4,day:6,type:"Long Run",dist:8,dur:75,desc:"8km. Great progress!"},
        {week:6,day:6,type:"Long Run",dist:10,dur:95,desc:"FIRST 10K! Major milestone."},
        {week:8,day:6,type:"RACE DAY! 🏆",dist:10,dur:0,desc:"10K Race Day!"},
      ]},
      "HM":  { color:"#fb8c00", emoji:"🏃‍♀️", weeks:12, desc:"Half Marathon (21.1km). For runners with a solid 10K base.", schedule:[
        {week:1,day:6,type:"Long Run",dist:10,dur:95,desc:"Long run base."},
        {week:6,day:6,type:"Long Run",dist:16,dur:150,desc:"Building toward race distance."},
        {week:12,day:6,type:"RACE DAY! 🏆",dist:21.1,dur:0,desc:"Half Marathon Race Day!"},
      ]},
      "FM":  { color:"#e53935", emoji:"🏅",   weeks:16, desc:"Full Marathon (42.2km). Serious training required.", schedule:[
        {week:1,day:6,type:"Long Run",dist:16,dur:148,desc:"First long run of marathon training."},
        {week:8,day:6,type:"Long Run",dist:28,dur:260,desc:"Peak long run territory."},
        {week:16,day:6,type:"RACE DAY! 🏆",dist:42.2,dur:0,desc:"MARATHON RACE DAY!"},
      ]},
    }
  },

  hydration: {
    // One plan per module — scientifically tailored to activity type
    default: {
      title: "Daily Hydration Plan",
      targets: { training: 3.0, rest: 2.5 },
      schedule: [
        { time:"7:00 AM",        amount:500, label:"Wake-up glass" },
        { time:"9:00 AM",        amount:400, label:"Mid-morning" },
        { time:"12:00 PM",       amount:500, label:"Before lunch" },
        { time:"3:00 PM",        amount:400, label:"Afternoon" },
        { time:"Pre-Workout",    amount:400, label:"30 min before" },
        { time:"During Workout", amount:500, label:"Sip every 15 min" },
        { time:"Post-Workout",   amount:500, label:"Within 30 min" },
        { time:"8:00 PM",        amount:300, label:"Evening" },
      ],
      tips: [
        "Urine colour should be pale yellow — dark means you need more water.",
        "Add a pinch of Himalayan pink salt on heavy training days to replace electrolytes.",
        "Drink 200–300ml extra per 30 min in hot or humid weather.",
      ]
    },

    cardio: {
      title: "Home Cardio Hydration Plan",
      targets: { training: 3.5, rest: 2.5 },
      schedule: [
        { time:"Wake-Up (7 AM)",     amount:500, label:"Start metabolism, flush overnight waste" },
        { time:"Pre-Workout (30 min)", amount:400, label:"Hydrate before intense cardio" },
        { time:"During Cardio",      amount:600, label:"150ml every 15 min — cardio causes heavy sweat" },
        { time:"Post-Workout (30 min)", amount:500, label:"Replace sweat losses immediately" },
        { time:"Mid-Morning",        amount:400, label:"Sustained hydration between sessions" },
        { time:"Before Lunch",       amount:300, label:"Aids digestion and nutrient absorption" },
        { time:"Afternoon (3 PM)",   amount:400, label:"Prevents afternoon energy dip" },
        { time:"Evening (7 PM)",     amount:300, label:"Light — avoid excess before sleep" },
      ],
      tips: [
        "Cardio causes 0.5–1.5L sweat/hour — drink before you feel thirsty.",
        "Add coconut water or electrolyte tabs after sessions longer than 45 minutes.",
        "Cold water (15°C) absorbs 30% faster than room temperature during exercise.",
        "Weigh yourself before and after — drink 1.5L per kg lost during session.",
        "Avoid sugary sports drinks for sessions under 60 min — plain water is sufficient.",
      ]
    },

    gym: {
      title: "Gym Workout Hydration Plan",
      targets: { training: 4.0, rest: 2.5 },
      schedule: [
        { time:"Wake-Up (7 AM)",      amount:500, label:"Rehydrate after 7–8 hrs without water" },
        { time:"Pre-Workout (60 min)", amount:500, label:"Top up glycogen and joints for lifting" },
        { time:"Pre-Workout (15 min)", amount:250, label:"Final top-up before first set" },
        { time:"During Lifting",      amount:750, label:"200ml between every 2–3 sets" },
        { time:"Post-Workout (30 min)", amount:600, label:"Critical — begin recovery immediately" },
        { time:"With Protein Meal",   amount:400, label:"Aids protein synthesis and digestion" },
        { time:"Afternoon",           amount:500, label:"Joints and muscle repair require hydration" },
        { time:"Evening",             amount:400, label:"Casein protein digestion needs extra water" },
      ],
      tips: [
        "Heavy lifting causes micro-tears — muscles repair faster when fully hydrated.",
        "Dehydration of just 2% body weight reduces strength by up to 10%.",
        "Creatine users need an extra 500ml daily — creatine draws water into muscles.",
        "Sip water between sets, not during reps — avoid bloating mid-lift.",
        "Post-workout: aim for 150% of fluid lost (e.g. lost 500ml → drink 750ml).",
        "Joint health: cartilage is 80% water — consistent hydration prevents knee/shoulder pain.",
      ]
    },

    yoga: {
      title: "Yoga Practice Hydration Plan",
      targets: { training: 2.5, rest: 2.0 },
      schedule: [
        { time:"Wake-Up (6:30 AM)",   amount:500, label:"Warm water with lemon — cleanses and alkalises" },
        { time:"30 Min Before Yoga",  amount:200, label:"Small sip only — avoid heavy stomach during poses" },
        { time:"During Practice",     amount:200, label:"Tiny sips only if very thirsty — don't interrupt flow" },
        { time:"Post-Practice",       amount:400, label:"Rehydrate mindfully after deep stretches" },
        { time:"Mid-Morning",         amount:400, label:"Room temperature water preferred in yoga lifestyle" },
        { time:"Before Lunch",        amount:300, label:"30 min before meals for optimal digestion" },
        { time:"Afternoon",           amount:350, label:"Herbal teas count — tulsi, ginger, chamomile" },
        { time:"Evening",             amount:250, label:"Light — calming the body before rest" },
      ],
      tips: [
        "Yoga tradition prefers room-temperature or warm water — cold water can disrupt digestive fire (agni).",
        "Avoid drinking large amounts 30 min before or during practice — it compresses the core.",
        "Coconut water is the ideal post-yoga drink — natural electrolytes and calming properties.",
        "Hot yoga (Bikram) requires 1L extra — you lose significantly more through sweat.",
        "Herbal teas (tulsi, ginger, peppermint) count toward daily intake and support digestion.",
        "Eating water-rich foods (cucumber, watermelon, oranges) aligns with yogic diet principles.",
      ]
    },

    stretching: {
      title: "Stretching & Recovery Hydration Plan",
      targets: { training: 2.5, rest: 2.0 },
      schedule: [
        { time:"Wake-Up",             amount:500, label:"Warm water — hydrates overnight-stiff muscles" },
        { time:"Before Stretching",   amount:300, label:"Warm muscles stretch better when hydrated" },
        { time:"During Stretching",   amount:200, label:"Small sips — stretching is low intensity" },
        { time:"Post-Stretching",     amount:300, label:"Flush released toxins from fascia" },
        { time:"Mid-Morning",         amount:400, label:"Collagen synthesis requires hydration" },
        { time:"Lunch Time",          amount:400, label:"Support joint lubrication throughout day" },
        { time:"Afternoon",           amount:300, label:"Consistent low-level hydration is key" },
        { time:"Evening",             amount:200, label:"Light — this is a recovery/rest day" },
      ],
      tips: [
        "Fascia (connective tissue) is 70% water — dehydration makes it stiff and less elastic.",
        "Warm water before stretching loosens muscle fibres faster than cold water.",
        "Collagen (joint and muscle repair) synthesis requires adequate vitamin C and hydration.",
        "Bone broth counts toward intake and provides collagen directly.",
        "Avoid alcohol on stretching/rest days — it dehydrates and slows muscle repair by 24hrs.",
        "Magnesium-rich water (or supplement) on rest days reduces muscle soreness significantly.",
      ]
    },

    running: {
      title: "Running & Walking Hydration Plan",
      targets: { training: 4.5, rest: 2.5 },
      schedule: [
        { time:"Wake-Up (6 AM)",       amount:500, label:"Start the day hydrated before early runs" },
        { time:"2 Hours Before Run",   amount:500, label:"Pre-load hydration — kidneys process excess" },
        { time:"15 Min Before Run",    amount:200, label:"Final top-up without bloating" },
        { time:"During Run (<45 min)", amount:400, label:"150–200ml every 20 min — small frequent sips" },
        { time:"During Run (>45 min)", amount:700, label:"Sports drink or water + salt every 20–30 min" },
        { time:"Post-Run (30 min)",    amount:600, label:"Most critical window — begin recovery immediately" },
        { time:"Post-Run (2 hrs)",     amount:500, label:"Continue sipping — 1.5L per kg lost" },
        { time:"Evening",              amount:400, label:"Support overnight muscle and joint recovery" },
      ],
      tips: [
        "Running loses 500ml–1.5L per hour depending on heat, humidity and pace.",
        "The thirst signal lags 20 min behind actual need — drink on a schedule, not when thirsty.",
        "For runs over 60 min, add electrolytes (sodium, potassium) — water alone causes hyponatremia.",
        "Hot weather running: pre-cool with 500ml ice-cold water 10 min before — reduces core temp.",
        "Weigh before and after every long run. Drink 1.5L for every 1kg lost.",
        "Marathon training: increase daily intake by 1L on days with runs over 16km.",
        "Signs of dehydration while running: dark urine, headache, cramping, nausea, confusion — stop immediately.",
      ]
    },
  },

    diet: {
    modules: {
      core:       { title:"Core & Abs Diet Plan",   meals:[
        { time:"Pre-Workout",  name:"Light Fuel",          items:"Banana or 3-4 dates + black coffee", cal:140, notes:"30 min before — easy to digest, quick energy" },
        { time:"Post-Workout", name:"Protein Recovery",    items:"Whey protein shake or 3 boiled eggs + 1 banana", cal:280, notes:"Within 30 min — repair micro-tears in core muscles" },
        { time:"Breakfast",    name:"Balanced Start",      items:"Oats + chia seeds + berries + Greek yogurt", cal:420, notes:"Complex carbs + protein for sustained energy" },
        { time:"Lunch",        name:"High-Protein Meal",   items:"Grilled chicken/fish + brown rice + mixed vegetables", cal:550, notes:"Adequate protein (1.6-2g/kg body weight daily)" },
        { time:"Evening Snack",name:"Clean Carbs",         items:"Sweet potato + cottage cheese or peanut butter", cal:230, notes:"Fuel for recovery without excess fat" },
        { time:"Dinner",       name:"Lean Recovery Meal",  items:"Dal/lentils + 2 chapati + salad with olive oil", cal:480, notes:"Include anti-inflammatory foods like turmeric" },
      ]},
      cardio:     { title:"Cardio Day Diet Plan",   meals:[
        { time:"Pre-Workout",  name:"Energy Boost",     items:"Banana + black coffee or green tea", cal:150, notes:"30-45 min before session" },
        { time:"Post-Workout", name:"Recovery Meal",    items:"2 boiled eggs + 1 slice whole wheat toast", cal:220, notes:"Within 30 min after" },
        { time:"Breakfast",    name:"Carb-Forward Meal",items:"Oats porridge with fruit and nuts", cal:380, notes:"Replenish glycogen" },
        { time:"Lunch",        name:"Balanced Meal",    items:"Brown rice + grilled chicken 150g + vegetables", cal:560, notes:"Protein + complex carbs" },
        { time:"Snack",        name:"Afternoon Fuel",   items:"Greek yogurt + handful of almonds", cal:220, notes:"Sustained energy" },
        { time:"Dinner",       name:"Light Recovery",   items:"Lentil soup + 2 chapati + salad", cal:480, notes:"Early, light dinner" },
      ]},
      gym:        { title:"Gym Day Diet Plan",      meals:[
        { time:"Pre-Workout",  name:"Power Fuel",        items:"Banana + 2 boiled eggs + optional coffee", cal:280, notes:"60 min before lifting" },
        { time:"Intra-Workout",name:"Hydration",         items:"Water + optional BCAA drink", cal:50, notes:"Sip during session" },
        { time:"Post-Workout", name:"Anabolic Window",   items:"Whey protein shake or 200g Greek yogurt + fruit", cal:280, notes:"Within 30 min — critical!" },
        { time:"Lunch",        name:"Muscle Building",   items:"Brown rice 200g + grilled chicken 180g + vegetables", cal:620, notes:"2-3 hrs post-workout" },
        { time:"Snack",        name:"Protein Boost",     items:"Cottage cheese or paneer 100g + fruit", cal:200, notes:"Afternoon" },
        { time:"Dinner",       name:"Casein Meal",       items:"Dal + 2 chapati + salad + glass of milk", cal:520, notes:"Slow-digesting protein overnight" },
      ]},
      yoga:       { title:"Yoga Day Diet Plan",     meals:[
        { time:"Pre-Yoga",  name:"Light Energy",       items:"Small banana or 4-5 dates + herbal tea", cal:120, notes:"30-60 min before. Avoid heavy food." },
        { time:"Post-Yoga", name:"Nourishment",        items:"Smoothie: banana + spinach + almond milk + honey", cal:240, notes:"Replenish mindfully" },
        { time:"Breakfast", name:"Sattvic Breakfast",  items:"Poha or upma + coconut chutney + herbal tea", cal:360, notes:"Light, digestible" },
        { time:"Lunch",     name:"Balanced Thali",     items:"Dal + rice + sabzi + curd + salad", cal:580, notes:"Largest meal of day" },
        { time:"Snack",     name:"Light Snack",        items:"Fresh fruit + handful walnuts", cal:180, notes:"Afternoon, light" },
        { time:"Dinner",    name:"Early Light Dinner", items:"Khichdi or vegetable soup + bread", cal:420, notes:"By 7pm ideally" },
      ]},
      stretching: { title:"Rest/Stretch Day Diet Plan", meals:[
        { time:"Morning",  name:"Anti-Inflammatory",items:"Turmeric milk or golden latte + fruit", cal:200, notes:"Anti-inflammatory start" },
        { time:"Breakfast",name:"Protein + Fibre",   items:"2 eggs any style + whole grain toast + avocado", cal:420, notes:"Sustained energy" },
        { time:"Lunch",    name:"Omega-Rich Meal",   items:"Grilled fish or tofu + quinoa + roasted vegetables", cal:540, notes:"Recovery nutrition" },
        { time:"Snack",    name:"Collagen Boost",    items:"Bone broth or gelatin-rich foods", cal:120, notes:"Supports joint health" },
        { time:"Dinner",   name:"Recovery Dinner",   items:"Chicken/lentil soup + whole grain bread", cal:460, notes:"Easy to digest" },
      ]},
      running: { title:"Running Day Diet Plan", meals:[
        { time:"Pre-Run (2-3 hrs)", name:"Main Pre-Run Meal", items:"Oats with banana + honey OR 2 slices toast + peanut butter + banana", cal:380, notes:"Easy to digest carbs — avoid fibre and fat close to run" },
        { time:"Pre-Run (30 min)", name:"Quick Energy Top-Up", items:"1 banana OR 4–5 dates OR half energy bar", cal:120, notes:"Quick-release glucose — nothing heavy" },
        { time:"During Run (>60 min)", name:"Intra-Run Fuel", items:"Energy gel OR banana chunk OR 3–4 dates every 45 min", cal:100, notes:"Per serving — only needed for runs over 60 min" },
        { time:"Post-Run (30 min)", name:"Recovery Window", items:"Chocolate milk OR whey shake + banana OR Greek yogurt + mango", cal:320, notes:"CRITICAL: 3:1 carb:protein ratio — this window is gold" },
        { time:"Post-Run Meal (1-2 hrs)", name:"Full Recovery Meal", items:"White rice + grilled chicken/fish + roasted vegetables", cal:620, notes:"White rice preferred post-run — faster glycogen replenishment than brown" },
        { time:"Evening Snack", name:"Overnight Recovery", items:"Cottage cheese (paneer) OR casein protein + warm milk", cal:220, notes:"Slow-digesting protein repairs muscles during sleep" },
      ]},
    }
  }
};

window.DEFAULT_USERS = [
  { id:"u_admin", name:"Admin User",  email:"admin@fitflow.com", password:"admin123", tempPassword:"", isFirstLogin:false, role:"ADMIN", status:"ACTIVE", createdDate:"2025-01-01" },
];

// APP_DATA_DEFAULT set after data-cali.js loads
window.APP_DATA_DEFAULT = null;
