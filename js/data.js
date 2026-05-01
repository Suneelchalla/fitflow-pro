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
      days: {
        Monday: [
          { name:"Barbell Squat", sets:3, reps:"12 reps", desc:"Bar on traps, feet shoulder-width. Squat until thighs parallel to floor.", image:"", demo:"https://www.youtube.com/results?search_query=barbell+squat+form" },
          { name:"Bench Press", sets:3, reps:"10 reps", desc:"Grip bar slightly wider than shoulders. Lower to mid-chest, press up.", image:"", demo:"https://www.youtube.com/results?search_query=bench+press+form" },
          { name:"Bent-Over Row", sets:3, reps:"12 reps", desc:"Hinge at hips, pull bar to lower chest. Squeeze shoulder blades.", image:"", demo:"https://www.youtube.com/results?search_query=bent+over+row+form" },
          { name:"Overhead Press", sets:3, reps:"10 reps", desc:"Press barbell from shoulders to overhead. Lock out elbows.", image:"", demo:"https://www.youtube.com/results?search_query=overhead+press+form" },
          { name:"Romanian Deadlift", sets:3, reps:"12 reps", desc:"Slight knee bend, hinge at hips, lower bar along legs.", image:"", demo:"https://www.youtube.com/results?search_query=romanian+deadlift+form" },
          { name:"Cable Plank", sets:3, reps:"45 sec", desc:"Plank with cable weight. Advanced core anti-extension drill.", image:"", demo:"https://www.youtube.com/results?search_query=plank+exercise+gym" },
        ],
        Tuesday: [
          { name:"Deadlift", sets:3, reps:"8 reps", desc:"Feet hip-width, bar over laces. Push floor away, keep bar close.", image:"", demo:"https://www.youtube.com/results?search_query=deadlift+form+tutorial" },
          { name:"Incline Dumbbell Press", sets:3, reps:"12 reps", desc:"30-45° bench angle. Press dumbbells from chest level upward.", image:"", demo:"https://www.youtube.com/results?search_query=incline+dumbbell+press" },
          { name:"Lat Pulldown", sets:3, reps:"12 reps", desc:"Grip wide. Pull bar to upper chest, lean slightly back.", image:"", demo:"https://www.youtube.com/results?search_query=lat+pulldown+form" },
          { name:"Leg Press", sets:3, reps:"15 reps", desc:"Feet shoulder-width on platform. Lower sled until 90° knee angle.", image:"", demo:"https://www.youtube.com/results?search_query=leg+press+form" },
          { name:"Dumbbell Curl", sets:3, reps:"12 each", desc:"Supinate wrist as you curl. Full range of motion.", image:"", demo:"https://www.youtube.com/results?search_query=dumbbell+bicep+curl+form" },
          { name:"Tricep Pushdown", sets:3, reps:"15 reps", desc:"Cable attachment at shoulder height. Push down to lockout.", image:"", demo:"https://www.youtube.com/results?search_query=tricep+pushdown+cable" },
        ],
        Wednesday: [
          { name:"Hack Squat", sets:3, reps:"12 reps", desc:"Machine squat variant. Feet forward on platform.", image:"", demo:"https://www.youtube.com/results?search_query=hack+squat+machine" },
          { name:"Dumbbell Shoulder Press", sets:3, reps:"12 reps", desc:"Seated or standing. Press dumbbells from ear height to overhead.", image:"", demo:"https://www.youtube.com/results?search_query=dumbbell+shoulder+press" },
          { name:"Seated Cable Row", sets:3, reps:"12 reps", desc:"Pull cable handle to lower abs. Keep chest tall.", image:"", demo:"https://www.youtube.com/results?search_query=seated+cable+row+form" },
          { name:"Leg Curl", sets:3, reps:"12 reps", desc:"Lying or seated. Curl heel toward glute.", image:"", demo:"https://www.youtube.com/results?search_query=leg+curl+machine" },
          { name:"Dumbbell Lateral Raise", sets:3, reps:"15 reps", desc:"Raise arms to shoulder height with slight bend.", image:"", demo:"https://www.youtube.com/results?search_query=lateral+raise+form" },
          { name:"Ab Crunch Machine", sets:3, reps:"20 reps", desc:"Pull handles toward knees while contracting abs.", image:"", demo:"https://www.youtube.com/results?search_query=ab+crunch+machine" },
        ],
        Thursday: [
          { name:"Bulgarian Split Squat", sets:3, reps:"10 each", desc:"Rear foot elevated. Lower front leg until 90°.", image:"", demo:"https://www.youtube.com/results?search_query=bulgarian+split+squat" },
          { name:"Cable Fly", sets:3, reps:"15 reps", desc:"Mid-height cables. Bring handles together in arc motion.", image:"", demo:"https://www.youtube.com/results?search_query=cable+fly+chest+form" },
          { name:"Face Pulls", sets:3, reps:"15 reps", desc:"Cable at head height. Pull to face, elbows high.", image:"", demo:"https://www.youtube.com/results?search_query=face+pulls+form" },
          { name:"Hammer Curl", sets:3, reps:"12 each", desc:"Neutral grip (thumbs up). Curl without supinating.", image:"", demo:"https://www.youtube.com/results?search_query=hammer+curl+form" },
          { name:"Calf Raise", sets:3, reps:"20 reps", desc:"On platform or flat floor. Rise onto toes, hold 1 second.", image:"", demo:"https://www.youtube.com/results?search_query=calf+raise+form" },
          { name:"Hanging Leg Raise", sets:3, reps:"12 reps", desc:"Hang from bar. Raise legs to 90°.", image:"", demo:"https://www.youtube.com/results?search_query=hanging+leg+raise+form" },
        ],
        Friday: [
          { name:"Power Clean", sets:3, reps:"6 reps", desc:"Olympic lift. Pull bar from floor explosively, catch at shoulders.", image:"", demo:"https://www.youtube.com/results?search_query=power+clean+form+tutorial" },
          { name:"Dips", sets:3, reps:"12 reps", desc:"On parallel bars, lower until elbows 90°.", image:"", demo:"https://www.youtube.com/results?search_query=dips+exercise+form" },
          { name:"Pull-Ups", sets:3, reps:"8 reps", desc:"Full hang, pull until chin over bar.", image:"", demo:"https://www.youtube.com/results?search_query=pull+ups+form" },
          { name:"Leg Extension", sets:3, reps:"15 reps", desc:"Machine. Extend legs to full lockout.", image:"", demo:"https://www.youtube.com/results?search_query=leg+extension+machine+form" },
          { name:"EZ Bar Skull Crusher", sets:3, reps:"12 reps", desc:"Lying on bench, lower bar to forehead, extend.", image:"", demo:"https://www.youtube.com/results?search_query=skull+crushers+form" },
          { name:"Farmer's Carry", sets:3, reps:"40m", desc:"Hold heavy dumbbells, walk with tall posture.", image:"", demo:"https://www.youtube.com/results?search_query=farmers+carry+exercise" },
        ],
        Saturday: [
          { name:"Full Body Circuit", sets:3, reps:"5 rounds", desc:"Squat 8 + Push 8 + Row 8 + Press 8. Light-moderate weight.", image:"", demo:"https://www.youtube.com/results?search_query=full+body+circuit+gym" },
          { name:"Cable Woodchop", sets:3, reps:"12 each", desc:"Rotate cable from high to low across body.", image:"", demo:"https://www.youtube.com/results?search_query=cable+woodchop+exercise" },
          { name:"Seated Row Close Grip", sets:3, reps:"12 reps", desc:"Close-grip attachment. Pull to navel.", image:"", demo:"https://www.youtube.com/results?search_query=close+grip+seated+row" },
          { name:"Hip Thrust", sets:3, reps:"15 reps", desc:"Shoulders on bench, bar on hips. Drive hips to ceiling.", image:"", demo:"https://www.youtube.com/results?search_query=barbell+hip+thrust+form" },
          { name:"Shrugs", sets:3, reps:"15 reps", desc:"Heavy dumbbells or barbell. Shrug shoulders straight up.", image:"", demo:"https://www.youtube.com/results?search_query=shrugs+exercise+form" },
          { name:"Ab Wheel Rollout", sets:3, reps:"10 reps", desc:"From knees, roll wheel out to full extension, return.", image:"", demo:"https://www.youtube.com/results?search_query=ab+wheel+rollout+form" },
        ],
      }
    },

    yoga: {
      name: "Yoga",
      emoji: "🧘",
      color: "grad-yoga",
      days: {
        Monday: [
          { name:"Sun Salutation A", hold:"5 rounds", rounds:3, desc:"Mountain → Forward Fold → Halfway Lift → Plank → Cobra → Downdog.", image:"", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+yoga" },
          { name:"Warrior I", hold:"45 sec each", rounds:3, desc:"Front knee bent 90°, back leg straight, arms reach overhead.", image:"", demo:"https://www.youtube.com/results?search_query=warrior+1+yoga+pose" },
          { name:"Warrior II", hold:"45 sec each", rounds:3, desc:"Wide stance, front knee over ankle, arms parallel to floor.", image:"", demo:"https://www.youtube.com/results?search_query=warrior+2+yoga+pose" },
          { name:"Tree Pose", hold:"30 sec each", rounds:3, desc:"Balance on one leg, foot on inner thigh. Hands at heart or overhead.", image:"", demo:"https://www.youtube.com/results?search_query=tree+pose+yoga" },
          { name:"Child's Pose", hold:"60 sec", rounds:3, desc:"Kneel, extend arms forward, rest forehead on mat.", image:"", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"3 min", rounds:1, desc:"Complete relaxation on back. Allow body to absorb the practice.", image:"", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ],
        Tuesday: [
          { name:"Cat-Cow", hold:"10 rounds", rounds:3, desc:"Alternate arching and rounding spine with breath.", image:"", demo:"https://www.youtube.com/results?search_query=cat+cow+yoga" },
          { name:"Downward Dog", hold:"60 sec", rounds:3, desc:"Inverted V shape. Press hands and feet into mat.", image:"", demo:"https://www.youtube.com/results?search_query=downward+dog+yoga" },
          { name:"Pigeon Pose", hold:"60 sec each", rounds:3, desc:"Deep hip opener. Front shin parallel to mat, back leg extended.", image:"", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga" },
          { name:"Seated Forward Fold", hold:"60 sec", rounds:3, desc:"Legs extended, hinge forward from hips.", image:"", demo:"https://www.youtube.com/results?search_query=seated+forward+fold+yoga" },
          { name:"Supine Twist", hold:"45 sec each", rounds:3, desc:"Lie on back, knee across body, arms wide.", image:"", demo:"https://www.youtube.com/results?search_query=supine+spinal+twist+yoga" },
          { name:"Legs Up The Wall", hold:"3 min", rounds:1, desc:"Passive inversion. Legs vertical against wall.", image:"", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
        ],
        Wednesday: [
          { name:"Triangle Pose", hold:"45 sec each", rounds:3, desc:"Wide stance, extend over front leg, hand to shin or floor.", image:"", demo:"https://www.youtube.com/results?search_query=triangle+pose+yoga" },
          { name:"Boat Pose", hold:"30 sec", rounds:3, desc:"Balance on sit bones, legs and torso form a V.", image:"", demo:"https://www.youtube.com/results?search_query=boat+pose+yoga" },
          { name:"Camel Pose", hold:"30 sec", rounds:3, desc:"Kneeling back bend. Hands on heels. Opens chest.", image:"", demo:"https://www.youtube.com/results?search_query=camel+pose+yoga" },
          { name:"Extended Side Angle", hold:"45 sec each", rounds:3, desc:"Front arm rests on thigh or floor, back arm stretches overhead.", image:"", demo:"https://www.youtube.com/results?search_query=extended+side+angle+yoga" },
          { name:"Bridge Pose", hold:"45 sec", rounds:3, desc:"Lie on back, feet flat, lift hips. Squeeze glutes.", image:"", demo:"https://www.youtube.com/results?search_query=bridge+pose+yoga" },
          { name:"Happy Baby", hold:"2 min", rounds:1, desc:"Lie on back, hold outer feet. Rock gently side to side.", image:"", demo:"https://www.youtube.com/results?search_query=happy+baby+pose+yoga" },
        ],
        Thursday: [
          { name:"Chair Pose", hold:"45 sec", rounds:3, desc:"Feet together, sit back as if on invisible chair.", image:"", demo:"https://www.youtube.com/results?search_query=chair+pose+yoga" },
          { name:"Eagle Pose", hold:"30 sec each", rounds:3, desc:"One leg wrapped around other, arms intertwined.", image:"", demo:"https://www.youtube.com/results?search_query=eagle+pose+yoga" },
          { name:"Half Moon Pose", hold:"30 sec each", rounds:3, desc:"Balance on one leg and hand. Other arm and leg extend.", image:"", demo:"https://www.youtube.com/results?search_query=half+moon+pose+yoga" },
          { name:"Wide-Leg Forward Fold", hold:"60 sec", rounds:3, desc:"Feet wide, fold forward, head toward floor.", image:"", demo:"https://www.youtube.com/results?search_query=wide+legged+forward+fold+yoga" },
          { name:"Fish Pose", hold:"30 sec", rounds:3, desc:"On back, arch thoracic spine, crown of head on mat.", image:"", demo:"https://www.youtube.com/results?search_query=fish+pose+yoga" },
          { name:"Corpse Pose Extended", hold:"4 min", rounds:1, desc:"Extended Savasana with body scan meditation.", image:"", demo:"https://www.youtube.com/results?search_query=savasana+body+scan+yoga" },
        ],
        Friday: [
          { name:"Crow Pose Prep", hold:"5 attempts", rounds:3, desc:"Squat, place knees on upper arms, lean forward and find balance.", image:"", demo:"https://www.youtube.com/results?search_query=crow+pose+yoga+beginners" },
          { name:"Plank to Chaturanga", hold:"10 reps", rounds:3, desc:"High plank, lower with elbows hugging body.", image:"", demo:"https://www.youtube.com/results?search_query=chaturanga+yoga+form" },
          { name:"Cobra Pose", hold:"30 sec", rounds:3, desc:"Lie prone, place hands under shoulders. Press up, elbows soft.", image:"", demo:"https://www.youtube.com/results?search_query=cobra+pose+yoga" },
          { name:"Lizard Pose", hold:"45 sec each", rounds:3, desc:"Low lunge with front foot outside hand. Deep hip flexor stretch.", image:"", demo:"https://www.youtube.com/results?search_query=lizard+pose+yoga" },
          { name:"Headstand Prep", hold:"30 sec", rounds:3, desc:"Forearms on mat, crown on mat, hips lift (dolphin pose).", image:"", demo:"https://www.youtube.com/results?search_query=headstand+prep+yoga" },
          { name:"Meditation Sit", hold:"5 min", rounds:1, desc:"Comfortable seated position. Focus on breath.", image:"", demo:"https://www.youtube.com/results?search_query=yoga+meditation+breathing" },
        ],
        Saturday: [
          { name:"Full Flow Practice", hold:"20 min", rounds:1, desc:"Freestyle: combine all learned poses.", image:"", demo:"https://www.youtube.com/results?search_query=20+minute+yoga+flow+full+body" },
          { name:"Yin Hip Sequence", hold:"5 min", rounds:1, desc:"Hold each hip-opening pose for 1 minute: Dragon, Shoelace, Frog.", image:"", demo:"https://www.youtube.com/results?search_query=yin+yoga+hips" },
          { name:"Shoulder Opener", hold:"45 sec each", rounds:3, desc:"Thread-the-needle, shoulder-to-floor stretches.", image:"", demo:"https://www.youtube.com/results?search_query=shoulder+opener+yoga" },
          { name:"Restorative Child's Pose", hold:"3 min", rounds:1, desc:"Supported with blanket under torso.", image:"", demo:"https://www.youtube.com/results?search_query=restorative+yoga+childs+pose" },
          { name:"Seated Meditation", hold:"10 min", rounds:1, desc:"Eyes closed, breath awareness, body scan.", image:"", demo:"https://www.youtube.com/results?search_query=10+minute+guided+meditation" },
          { name:"Gratitude Journaling", hold:"5 min", rounds:1, desc:"Write 3 things you're grateful for and 1 fitness win this week.", image:"", demo:"" },
        ],
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
