// ── DEFAULT DATA ─────────────────────────────────────────────────
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

  modules: {
    cardio: {
      name: "Home Cardio",
      emoji: "🏠",
      color: "grad-cardio",
      days: {
        Monday: [
          { name:"Jumping Jacks", sets:3, reps:"45 sec", desc:"Stand upright, jump feet apart while raising arms overhead. Return to start. High-energy full-body warm-up.", image:"", demo:"https://www.youtube.com/results?search_query=jumping+jacks+exercise" },
          { name:"High Knees", sets:3, reps:"40 sec", desc:"Run in place driving knees up to waist height. Pump arms. Great cardio and core activator.", image:"", demo:"https://www.youtube.com/results?search_query=high+knees+exercise" },
          { name:"Burpees", sets:3, reps:"10 reps", desc:"From standing, drop to push-up position, perform push-up, jump feet to hands, explode upward with arms overhead.", image:"", demo:"https://www.youtube.com/results?search_query=burpees+exercise" },
          { name:"Mountain Climbers", sets:3, reps:"40 sec", desc:"In push-up position, alternate driving knees toward chest rapidly. Keep hips level. Cardio + core combo.", image:"", demo:"https://www.youtube.com/results?search_query=mountain+climbers+exercise" },
          { name:"Jump Squats", sets:3, reps:"15 reps", desc:"Perform squat, then explode upward into a jump. Land softly with bent knees. Builds explosive leg power.", image:"", demo:"https://www.youtube.com/results?search_query=jump+squats+exercise" },
          { name:"Plank Hold", sets:3, reps:"45 sec", desc:"Forearms on floor, body straight from head to heels. Squeeze glutes and core. Do not let hips sag.", image:"", demo:"https://www.youtube.com/results?search_query=plank+hold+exercise" },
        ],
        Tuesday: [
          { name:"Skipping (Shadow)", sets:3, reps:"60 sec", desc:"Mimic skipping rope motion with arms and alternating foot hops. Light, rhythmic cardio.", image:"", demo:"https://www.youtube.com/results?search_query=shadow+skipping+exercise" },
          { name:"Star Jumps", sets:3, reps:"20 reps", desc:"Jump with arms and legs spread wide (star shape) then return. High-impact, full-body cardio.", image:"", demo:"https://www.youtube.com/results?search_query=star+jumps+exercise" },
          { name:"Push-Ups", sets:3, reps:"12 reps", desc:"Hands shoulder-width, body straight. Lower chest to floor, push up. Builds chest, shoulders, triceps.", image:"", demo:"https://www.youtube.com/results?search_query=pushups+exercise" },
          { name:"Squat Pulses", sets:3, reps:"30 sec", desc:"Hold squat position and pulse up and down 3-4 inches. Keeps constant tension on quads and glutes.", image:"", demo:"https://www.youtube.com/results?search_query=squat+pulses+exercise" },
          { name:"Flutter Kicks", sets:3, reps:"40 sec", desc:"Lie on back, lift legs 6 inches, alternate small up-down kicks. Targets lower abs.", image:"", demo:"https://www.youtube.com/results?search_query=flutter+kicks+exercise" },
          { name:"Shadow Boxing", sets:3, reps:"60 sec", desc:"Alternate jabs, crosses, and hooks in the air. Full upper-body cardio and coordination drill.", image:"", demo:"https://www.youtube.com/results?search_query=shadow+boxing+cardio" },
        ],
        Wednesday: [
          { name:"Bear Crawls", sets:3, reps:"30 sec", desc:"On hands and feet (knees off floor), crawl forward and back. Full-body stabiliser and cardio.", image:"", demo:"https://www.youtube.com/results?search_query=bear+crawl+exercise" },
          { name:"Lateral Shuffles", sets:3, reps:"40 sec", desc:"Shuffle side to side quickly, staying in athletic stance. Builds lateral agility and cardio.", image:"", demo:"https://www.youtube.com/results?search_query=lateral+shuffle+exercise" },
          { name:"Tricep Dips", sets:3, reps:"15 reps", desc:"Use a chair or floor. Hands behind you, lower body by bending elbows to 90°, press back up.", image:"", demo:"https://www.youtube.com/results?search_query=tricep+dips+exercise" },
          { name:"Bicycle Crunches", sets:3, reps:"20 reps", desc:"Alternate touching elbow to opposite knee while extending other leg. Best abdominal activator.", image:"", demo:"https://www.youtube.com/results?search_query=bicycle+crunches+exercise" },
          { name:"Reverse Lunges", sets:3, reps:"12 each", desc:"Step backward into a lunge. Knee tracks over ankle. Builds glutes, quads, and balance.", image:"", demo:"https://www.youtube.com/results?search_query=reverse+lunges+exercise" },
          { name:"Inchworms", sets:3, reps:"10 reps", desc:"Bend at hips, walk hands out to push-up position and back. Full-body mobility and strength.", image:"", demo:"https://www.youtube.com/results?search_query=inchworm+exercise" },
        ],
        Thursday: [
          { name:"Speed Skaters", sets:3, reps:"40 sec", desc:"Leap side to side mimicking a speed skater. Builds lateral power, coordination, and cardio.", image:"", demo:"https://www.youtube.com/results?search_query=speed+skater+exercise" },
          { name:"Knee Push-Ups", sets:3, reps:"15 reps", desc:"Modified push-up from knees. Great for building pressing strength at a lower intensity.", image:"", demo:"https://www.youtube.com/results?search_query=knee+pushups+exercise" },
          { name:"Sumo Squat", sets:3, reps:"15 reps", desc:"Wide stance, toes out. Squat deeply keeping chest up. Emphasises inner thighs and glutes.", image:"", demo:"https://www.youtube.com/results?search_query=sumo+squat+exercise" },
          { name:"Superman Hold", sets:3, reps:"30 sec", desc:"Lie face down, lift arms and legs simultaneously. Squeezes lower back and glutes.", image:"", demo:"https://www.youtube.com/results?search_query=superman+hold+exercise" },
          { name:"Box Step-Ups", sets:3, reps:"12 each", desc:"Step up and down on a chair or step. Builds quads and glutes with minimal impact.", image:"", demo:"https://www.youtube.com/results?search_query=step+ups+exercise" },
          { name:"Hollow Hold", sets:3, reps:"30 sec", desc:"Lie on back, press lower back to floor, raise legs and shoulders. Deep core activation.", image:"", demo:"https://www.youtube.com/results?search_query=hollow+hold+exercise" },
        ],
        Friday: [
          { name:"Tabata Burpees", sets:3, reps:"20 sec on/10 off", desc:"Maximum effort burpees for 20 seconds, rest 10 seconds. Extreme cardio and full-body conditioning.", image:"", demo:"https://www.youtube.com/results?search_query=tabata+burpees" },
          { name:"Wall Sit", sets:3, reps:"45 sec", desc:"Back against wall, thighs parallel to floor. Static hold. Burns quads and tests mental toughness.", image:"", demo:"https://www.youtube.com/results?search_query=wall+sit+exercise" },
          { name:"Diamond Push-Ups", sets:3, reps:"10 reps", desc:"Hands form a diamond shape under chest. Targets triceps intensely. Chest stays over hands.", image:"", demo:"https://www.youtube.com/results?search_query=diamond+pushups+exercise" },
          { name:"Donkey Kicks", sets:3, reps:"15 each", desc:"On all fours, kick one leg back and up, squeezing glute at top. Isolates glute muscles.", image:"", demo:"https://www.youtube.com/results?search_query=donkey+kicks+exercise" },
          { name:"Crab Walks", sets:3, reps:"30 sec", desc:"Seated position, lift hips and walk forward and back on hands and feet. Shoulders and triceps.", image:"", demo:"https://www.youtube.com/results?search_query=crab+walk+exercise" },
          { name:"Dead Bug", sets:3, reps:"10 each side", desc:"On back, extend opposite arm and leg while keeping lower back pressed down. Core stability.", image:"", demo:"https://www.youtube.com/results?search_query=dead+bug+exercise" },
        ],
        Saturday: [
          { name:"AMRAP Circuits", sets:3, reps:"5 min", desc:"As Many Rounds As Possible: 5 push-ups + 10 squats + 15 jumping jacks. Note your score.", image:"", demo:"https://www.youtube.com/results?search_query=AMRAP+workout+cardio" },
          { name:"Long Plank", sets:3, reps:"60 sec", desc:"Extended plank challenge. Focus on breathing and keeping full-body tension throughout.", image:"", demo:"https://www.youtube.com/results?search_query=long+plank+challenge" },
          { name:"Squat to Press", sets:3, reps:"12 reps", desc:"Hold light weights or water bottles. Squat down, press overhead as you stand. Full body.", image:"", demo:"https://www.youtube.com/results?search_query=squat+to+press+exercise" },
          { name:"Plank Shoulder Taps", sets:3, reps:"20 taps", desc:"In high plank, alternate touching opposite shoulder. Resists rotation. Core and shoulder stability.", image:"", demo:"https://www.youtube.com/results?search_query=plank+shoulder+taps" },
          { name:"Standing Oblique Crunches", sets:3, reps:"15 each", desc:"Standing, bring elbow down to meet rising knee on same side. Works obliques.", image:"", demo:"https://www.youtube.com/results?search_query=standing+oblique+crunches" },
          { name:"Cool Down Walk", sets:1, reps:"5 min", desc:"Walk in place at slow pace. Deep breaths. Gradual heart rate reduction and recovery.", image:"", demo:"" },
        ],
      }
    },

    gym: {
      name: "Gym Workouts",
      emoji: "🏋️",
      color: "grad-gym",
      days: {
        Monday: [
          { name:"Barbell Squat", sets:3, reps:"12 reps", desc:"Bar on traps, feet shoulder-width. Squat until thighs parallel to floor. Drive through heels to stand.", image:"", demo:"https://www.youtube.com/results?search_query=barbell+squat+form" },
          { name:"Bench Press", sets:3, reps:"10 reps", desc:"Grip bar slightly wider than shoulders. Lower to mid-chest, press up explosively. Keep feet flat.", image:"", demo:"https://www.youtube.com/results?search_query=bench+press+form" },
          { name:"Bent-Over Row", sets:3, reps:"12 reps", desc:"Hinge at hips, pull bar to lower chest. Squeeze shoulder blades. Keep back neutral throughout.", image:"", demo:"https://www.youtube.com/results?search_query=bent+over+row+form" },
          { name:"Overhead Press", sets:3, reps:"10 reps", desc:"Press barbell from shoulders to overhead. Lock out elbows. Core tight, no lower-back arch.", image:"", demo:"https://www.youtube.com/results?search_query=overhead+press+form" },
          { name:"Romanian Deadlift", sets:3, reps:"12 reps", desc:"Slight knee bend, hinge at hips, lower bar along legs. Feel hamstring stretch. Drive hips forward.", image:"", demo:"https://www.youtube.com/results?search_query=romanian+deadlift+form" },
          { name:"Cable Plank", sets:3, reps:"45 sec", desc:"Plank on cable machine with weight. Advanced core anti-extension drill.", image:"", demo:"https://www.youtube.com/results?search_query=plank+exercise+gym" },
        ],
        Tuesday: [
          { name:"Deadlift", sets:3, reps:"8 reps", desc:"Feet hip-width, bar over laces. Push floor away, keep bar close. Hips and shoulders rise together.", image:"", demo:"https://www.youtube.com/results?search_query=deadlift+form+tutorial" },
          { name:"Incline Dumbbell Press", sets:3, reps:"12 reps", desc:"30-45° bench angle. Press dumbbells from chest level upward. Targets upper chest.", image:"", demo:"https://www.youtube.com/results?search_query=incline+dumbbell+press" },
          { name:"Lat Pulldown", sets:3, reps:"12 reps", desc:"Grip wide. Pull bar to upper chest, lean slightly back. Control the return. Builds wide lats.", image:"", demo:"https://www.youtube.com/results?search_query=lat+pulldown+form" },
          { name:"Leg Press", sets:3, reps:"15 reps", desc:"Feet shoulder-width on platform. Lower sled until 90° knee angle. Press through full foot.", image:"", demo:"https://www.youtube.com/results?search_query=leg+press+form" },
          { name:"Dumbbell Curl", sets:3, reps:"12 each", desc:"Supinate wrist as you curl. Full range of motion. Don't swing body. Squeeze at top.", image:"", demo:"https://www.youtube.com/results?search_query=dumbbell+bicep+curl+form" },
          { name:"Tricep Pushdown", sets:3, reps:"15 reps", desc:"Cable attachment at shoulder height. Push down to lockout keeping upper arms still.", image:"", demo:"https://www.youtube.com/results?search_query=tricep+pushdown+cable" },
        ],
        Wednesday: [
          { name:"Hack Squat", sets:3, reps:"12 reps", desc:"Machine squat variant. Feet forward on platform. Emphasises quads with less lower-back stress.", image:"", demo:"https://www.youtube.com/results?search_query=hack+squat+machine" },
          { name:"Dumbbell Shoulder Press", sets:3, reps:"12 reps", desc:"Seated or standing. Press dumbbells from ear height to overhead. Full shoulder development.", image:"", demo:"https://www.youtube.com/results?search_query=dumbbell+shoulder+press" },
          { name:"Seated Cable Row", sets:3, reps:"12 reps", desc:"Pull cable handle to lower abs. Keep chest tall. Squeeze mid-back at contraction.", image:"", demo:"https://www.youtube.com/results?search_query=seated+cable+row+form" },
          { name:"Leg Curl", sets:3, reps:"12 reps", desc:"Lying or seated. Curl heel toward glute. Controlled return. Isolates hamstrings.", image:"", demo:"https://www.youtube.com/results?search_query=leg+curl+machine" },
          { name:"Dumbbell Lateral Raise", sets:3, reps:"15 reps", desc:"Raise arms to shoulder height with slight bend. Thumbs slightly down. Side delts.", image:"", demo:"https://www.youtube.com/results?search_query=lateral+raise+form" },
          { name:"Ab Crunch Machine", sets:3, reps:"20 reps", desc:"Pull handles toward knees while contracting abs. Controlled tempo, feel the crunch.", image:"", demo:"https://www.youtube.com/results?search_query=ab+crunch+machine" },
        ],
        Thursday: [
          { name:"Bulgarian Split Squat", sets:3, reps:"10 each", desc:"Rear foot elevated. Lower front leg until 90°. Excellent single-leg quad and glute builder.", image:"", demo:"https://www.youtube.com/results?search_query=bulgarian+split+squat" },
          { name:"Cable Fly", sets:3, reps:"15 reps", desc:"Mid-height cables. Bring handles together in arc motion. Stretches and contracts chest fully.", image:"", demo:"https://www.youtube.com/results?search_query=cable+fly+chest+form" },
          { name:"Face Pulls", sets:3, reps:"15 reps", desc:"Cable at head height. Pull to face, elbows high. Builds rear delts and external rotators.", image:"", demo:"https://www.youtube.com/results?search_query=face+pulls+form" },
          { name:"Hammer Curl", sets:3, reps:"12 each", desc:"Neutral grip (thumbs up). Curl without supinating. Targets brachialis and brachioradialis.", image:"", demo:"https://www.youtube.com/results?search_query=hammer+curl+form" },
          { name:"Calf Raise", sets:3, reps:"20 reps", desc:"On platform or flat floor. Rise onto toes, hold 1 second, lower slowly. Builds soleus and gastrocnemius.", image:"", demo:"https://www.youtube.com/results?search_query=calf+raise+form" },
          { name:"Hanging Leg Raise", sets:3, reps:"12 reps", desc:"Hang from bar. Raise legs to 90° (or higher). Powerful lower ab and hip flexor exercise.", image:"", demo:"https://www.youtube.com/results?search_query=hanging+leg+raise+form" },
        ],
        Friday: [
          { name:"Power Clean", sets:3, reps:"6 reps", desc:"Olympic lift. Pull bar from floor explosively, catch at shoulders. Full-body power development.", image:"", demo:"https://www.youtube.com/results?search_query=power+clean+form+tutorial" },
          { name:"Dips", sets:3, reps:"12 reps", desc:"On parallel bars, lower until elbows 90°. Lean forward for chest, upright for triceps.", image:"", demo:"https://www.youtube.com/results?search_query=dips+exercise+form" },
          { name:"Pull-Ups", sets:3, reps:"8 reps", desc:"Full hang, pull until chin over bar. Engage lats from the start. Best back width builder.", image:"", demo:"https://www.youtube.com/results?search_query=pull+ups+form" },
          { name:"Leg Extension", sets:3, reps:"15 reps", desc:"Machine. Extend legs to full lockout. Pause 1 second. Lowers slowly. Quad isolation.", image:"", demo:"https://www.youtube.com/results?search_query=leg+extension+machine+form" },
          { name:"EZ Bar Skull Crusher", sets:3, reps:"12 reps", desc:"Lying on bench, lower bar to forehead, extend. Elbows stationary. Tricep mass builder.", image:"", demo:"https://www.youtube.com/results?search_query=skull+crushers+form" },
          { name:"Farmer's Carry", sets:3, reps:"40m", desc:"Hold heavy dumbbells, walk with tall posture. Grip, traps, and core strength finisher.", image:"", demo:"https://www.youtube.com/results?search_query=farmers+carry+exercise" },
        ],
        Saturday: [
          { name:"Full Body Circuit", sets:3, reps:"5 rounds", desc:"Squat 8 + Push 8 + Row 8 + Press 8. Light-moderate weight. Conditioning and muscle endurance.", image:"", demo:"https://www.youtube.com/results?search_query=full+body+circuit+gym" },
          { name:"Cable Woodchop", sets:3, reps:"12 each", desc:"Rotate cable from high to low across body. Builds rotational core strength and obliques.", image:"", demo:"https://www.youtube.com/results?search_query=cable+woodchop+exercise" },
          { name:"Seated Row Close Grip", sets:3, reps:"12 reps", desc:"Close-grip attachment. Pull to navel. Focus on mid-back thickness.", image:"", demo:"https://www.youtube.com/results?search_query=close+grip+seated+row" },
          { name:"Hip Thrust", sets:3, reps:"15 reps", desc:"Shoulders on bench, bar on hips. Drive hips to ceiling squeezing glutes. Glute hypertrophy.", image:"", demo:"https://www.youtube.com/results?search_query=barbell+hip+thrust+form" },
          { name:"Shrugs", sets:3, reps:"15 reps", desc:"Heavy dumbbells or barbell. Shrug shoulders straight up. Hold 1 second. Builds traps.", image:"", demo:"https://www.youtube.com/results?search_query=shrugs+exercise+form" },
          { name:"Ab Wheel Rollout", sets:3, reps:"10 reps", desc:"From knees, roll wheel out to full extension, return. Advanced core exercise.", image:"", demo:"https://www.youtube.com/results?search_query=ab+wheel+rollout+form" },
        ],
      }
    },

    yoga: {
      name: "Yoga",
      emoji: "🧘",
      color: "grad-yoga",
      days: {
        Monday: [
          { name:"Sun Salutation A", sets:3, reps:"5 rounds", desc:"Classic vinyasa sequence: Mountain → Forward Fold → Halfway Lift → Plank → Cobra → Downdog. Warms entire body.", image:"", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+yoga" },
          { name:"Warrior I", sets:3, reps:"45 sec each", desc:"Front knee bent 90°, back leg straight, arms reach overhead. Builds strength and opens hip flexors.", image:"", demo:"https://www.youtube.com/results?search_query=warrior+1+yoga+pose" },
          { name:"Warrior II", sets:3, reps:"45 sec each", desc:"Wide stance, front knee over ankle, arms parallel to floor. Builds hip strength and focus.", image:"", demo:"https://www.youtube.com/results?search_query=warrior+2+yoga+pose" },
          { name:"Tree Pose", sets:3, reps:"30 sec each", desc:"Balance on one leg, foot on inner thigh. Hands at heart or overhead. Builds balance and focus.", image:"", demo:"https://www.youtube.com/results?search_query=tree+pose+yoga" },
          { name:"Child's Pose", sets:3, reps:"60 sec", desc:"Kneel, extend arms forward, rest forehead on mat. Restores and relaxes the nervous system.", image:"", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", sets:1, reps:"3 min", desc:"Complete relaxation on back. Allow body to absorb the practice. Essential for recovery.", image:"", demo:"https://www.youtube.com/results?search_query=savasana+yoga+relaxation" },
        ],
        Tuesday: [
          { name:"Cat-Cow", sets:3, reps:"10 rounds", desc:"On all fours, alternate arching and rounding spine with breath. Spinal mobility and warm-up.", image:"", demo:"https://www.youtube.com/results?search_query=cat+cow+yoga" },
          { name:"Downward Dog", sets:3, reps:"60 sec", desc:"Inverted V shape. Press hands and feet into mat. Stretch hamstrings, calves and shoulders.", image:"", demo:"https://www.youtube.com/results?search_query=downward+dog+yoga" },
          { name:"Pigeon Pose", sets:3, reps:"60 sec each", desc:"Deep hip opener. Front shin parallel to mat, back leg extended. Hold and breathe deeply.", image:"", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga" },
          { name:"Seated Forward Fold", sets:3, reps:"60 sec", desc:"Legs extended, hinge forward from hips. Hold feet or shins. Hamstrings and lower back stretch.", image:"", demo:"https://www.youtube.com/results?search_query=seated+forward+fold+yoga" },
          { name:"Supine Twist", sets:3, reps:"45 sec each", desc:"Lie on back, knee across body, arms wide. Releases lower back and spinal rotators.", image:"", demo:"https://www.youtube.com/results?search_query=supine+spinal+twist+yoga" },
          { name:"Legs Up The Wall", sets:1, reps:"3 min", desc:"Passive inversion. Legs vertical against wall. Improves circulation and reduces leg fatigue.", image:"", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
        ],
        Wednesday: [
          { name:"Triangle Pose", sets:3, reps:"45 sec each", desc:"Wide stance, extend over front leg, hand to shin or floor. Lengthens sides and opens chest.", image:"", demo:"https://www.youtube.com/results?search_query=triangle+pose+yoga" },
          { name:"Boat Pose", sets:3, reps:"30 sec", desc:"Balance on sit bones, legs and torso form a V. Arms parallel to floor. Core strength pose.", image:"", demo:"https://www.youtube.com/results?search_query=boat+pose+yoga" },
          { name:"Camel Pose", sets:3, reps:"30 sec", desc:"Kneeling back bend. Hands on heels. Opens chest, hip flexors, and front of body.", image:"", demo:"https://www.youtube.com/results?search_query=camel+pose+yoga" },
          { name:"Extended Side Angle", sets:3, reps:"45 sec each", desc:"Front arm rests on thigh or floor, back arm stretches overhead. Opens lateral body fully.", image:"", demo:"https://www.youtube.com/results?search_query=extended+side+angle+yoga" },
          { name:"Bridge Pose", sets:3, reps:"45 sec", desc:"Lie on back, feet flat, lift hips. Squeeze glutes. Opens chest and strengthens posterior chain.", image:"", demo:"https://www.youtube.com/results?search_query=bridge+pose+yoga" },
          { name:"Happy Baby", sets:1, reps:"2 min", desc:"Lie on back, hold outer feet. Rock gently side to side. Deep hip and lower back release.", image:"", demo:"https://www.youtube.com/results?search_query=happy+baby+pose+yoga" },
        ],
        Thursday: [
          { name:"Chair Pose", sets:3, reps:"45 sec", desc:"Feet together, sit back as if on invisible chair. Arms overhead. Intense quad and core challenge.", image:"", demo:"https://www.youtube.com/results?search_query=chair+pose+yoga" },
          { name:"Eagle Pose", sets:3, reps:"30 sec each", desc:"One leg wrapped around other, arms intertwined. Balance pose for concentration and joint mobility.", image:"", demo:"https://www.youtube.com/results?search_query=eagle+pose+yoga" },
          { name:"Half Moon Pose", sets:3, reps:"30 sec each", desc:"Balance on one leg and hand. Other arm and leg extend. Builds balance, strength, and openness.", image:"", demo:"https://www.youtube.com/results?search_query=half+moon+pose+yoga" },
          { name:"Wide-Leg Forward Fold", sets:3, reps:"60 sec", desc:"Feet wide, fold forward, head toward floor or mat. Deeply stretches inner thighs and hamstrings.", image:"", demo:"https://www.youtube.com/results?search_query=wide+legged+forward+fold+yoga" },
          { name:"Fish Pose", sets:3, reps:"30 sec", desc:"On back, arch thoracic spine, crown of head on mat. Counterpose for forward bends. Opens chest.", image:"", demo:"https://www.youtube.com/results?search_query=fish+pose+yoga" },
          { name:"Corpse Pose Extended", sets:1, reps:"4 min", desc:"Extended Savasana with body scan meditation. Full release of all physical and mental tension.", image:"", demo:"https://www.youtube.com/results?search_query=savasana+body+scan+yoga" },
        ],
        Friday: [
          { name:"Crow Pose Prep", sets:3, reps:"5 attempts", desc:"Squat, place knees on upper arms, lean forward and find balance. Builds arm strength and confidence.", image:"", demo:"https://www.youtube.com/results?search_query=crow+pose+yoga+beginners" },
          { name:"Plank to Chaturanga", sets:3, reps:"10 reps", desc:"High plank, lower with elbows hugging body. Yoga push-up. Builds upper body and core strength.", image:"", demo:"https://www.youtube.com/results?search_query=chaturanga+yoga+form" },
          { name:"Cobra Pose", sets:3, reps:"30 sec", desc:"Lie prone, place hands under shoulders. Press up, elbows soft. Opens chest and lower back.", image:"", demo:"https://www.youtube.com/results?search_query=cobra+pose+yoga" },
          { name:"Lizard Pose", sets:3, reps:"45 sec each", desc:"Low lunge with front foot outside hand. Deep hip flexor and groin stretch. Intense and beneficial.", image:"", demo:"https://www.youtube.com/results?search_query=lizard+pose+yoga" },
          { name:"Headstand Prep", sets:3, reps:"30 sec", desc:"Forearms on mat, crown on mat, hips lift (dolphin pose). Builds shoulder strength for inversions.", image:"", demo:"https://www.youtube.com/results?search_query=headstand+prep+yoga" },
          { name:"Meditation Sit", sets:1, reps:"5 min", desc:"Comfortable seated position, eyes closed. Focus on breath. Reduces cortisol and improves mental clarity.", image:"", demo:"https://www.youtube.com/results?search_query=yoga+meditation+breathing" },
        ],
        Saturday: [
          { name:"Full Flow Practice", sets:1, reps:"20 min", desc:"Freestyle: combine all learned poses. Flow at own pace. This is your creative yoga practice day.", image:"", demo:"https://www.youtube.com/results?search_query=20+minute+yoga+flow+full+body" },
          { name:"Yin Hip Sequence", sets:1, reps:"5 min", desc:"Hold each hip-opening pose for 1 minute: Dragon, Shoelace, Frog. Deep connective tissue release.", image:"", demo:"https://www.youtube.com/results?search_query=yin+yoga+hips" },
          { name:"Shoulder Opener", sets:3, reps:"45 sec each", desc:"Thread-the-needle, shoulder-to-floor stretches. Releases chronic tension from desk work.", image:"", demo:"https://www.youtube.com/results?search_query=shoulder+opener+yoga" },
          { name:"Restorative Child's Pose", sets:1, reps:"3 min", desc:"Supported with blanket under torso. Completely passive restoration.", image:"", demo:"https://www.youtube.com/results?search_query=restorative+yoga+childs+pose" },
          { name:"Seated Meditation", sets:1, reps:"10 min", desc:"Eyes closed, breath awareness, body scan. Weekly mental reset and stress release practice.", image:"", demo:"https://www.youtube.com/results?search_query=10+minute+guided+meditation" },
          { name:"Gratitude Journaling", sets:1, reps:"5 min", desc:"Write 3 things you're grateful for and 1 fitness win this week. Powerful for consistency.", image:"", demo:"" },
        ],
      }
    },

    stretching: {
      name: "Stretching",
      emoji: "🤸",
      color: "grad-stretch",
      days: {
        Monday: [
          { name:"Neck Rolls", sets:3, reps:"5 each dir", desc:"Slowly roll head in full circles. Releases tension in neck muscles. Never force the movement.", image:"", demo:"https://www.youtube.com/results?search_query=neck+rolls+stretch" },
          { name:"Chest Opener Stretch", sets:3, reps:"45 sec", desc:"Clasp hands behind back, open chest, lift chin. Counters forward head and rounded shoulder posture.", image:"", demo:"https://www.youtube.com/results?search_query=chest+opener+stretch" },
          { name:"Hip Flexor Lunge", sets:3, reps:"45 sec each", desc:"Low lunge, front knee 90°. Push hips forward and down. Essential stretch for desk workers.", image:"", demo:"https://www.youtube.com/results?search_query=hip+flexor+lunge+stretch" },
          { name:"Standing Hamstring Stretch", sets:3, reps:"40 sec each", desc:"Foot on ledge, hinge forward from hips. Maintains hamstring length and lower back health.", image:"", demo:"https://www.youtube.com/results?search_query=standing+hamstring+stretch" },
          { name:"Quad Stretch", sets:3, reps:"30 sec each", desc:"Standing, pull foot to glute. Hold wall if needed. Stretches full quadricep and knee joint.", image:"", demo:"https://www.youtube.com/results?search_query=standing+quad+stretch" },
          { name:"Calf Stretch", sets:3, reps:"30 sec each", desc:"Heel on floor, lean forward. Both straight and bent-knee variations to hit both calf muscles.", image:"", demo:"https://www.youtube.com/results?search_query=calf+stretch+wall" },
        ],
        Tuesday: [
          { name:"Doorway Chest Stretch", sets:3, reps:"45 sec", desc:"Hands on doorframe, lean forward. Deep chest and anterior shoulder stretch for all desk workers.", image:"", demo:"https://www.youtube.com/results?search_query=doorway+chest+stretch" },
          { name:"Thoracic Rotation", sets:3, reps:"10 each", desc:"Seated, rotate upper body left and right. Opens thoracic spine and reduces back stiffness.", image:"", demo:"https://www.youtube.com/results?search_query=thoracic+rotation+stretch" },
          { name:"Seated Pigeon", sets:3, reps:"60 sec each", desc:"Ankle on opposite knee (figure 4). Lean forward. Deep glute and piriformis stretch.", image:"", demo:"https://www.youtube.com/results?search_query=seated+pigeon+pose+stretch" },
          { name:"IT Band Stretch", sets:3, reps:"45 sec each", desc:"Cross one leg behind other, lean sideways. Stretches the iliotibial band — prevents knee pain.", image:"", demo:"https://www.youtube.com/results?search_query=IT+band+stretch" },
          { name:"Wrist and Forearm Stretch", sets:3, reps:"30 sec each", desc:"Extend arm, bend wrist down and up. Essential for laptop/phone users and gym goers.", image:"", demo:"https://www.youtube.com/results?search_query=wrist+forearm+stretch" },
          { name:"Ankle Circles", sets:3, reps:"10 each dir", desc:"Slow ankle rotations in both directions. Improves joint mobility and prevents sprains.", image:"", demo:"https://www.youtube.com/results?search_query=ankle+circles+mobility" },
        ],
        Wednesday: [
          { name:"Butterfly Stretch", sets:3, reps:"60 sec", desc:"Soles of feet together, lean forward gently. Inner thigh and groin stretch. Use elbows on knees.", image:"", demo:"https://www.youtube.com/results?search_query=butterfly+stretch" },
          { name:"Figure 4 Glute Stretch", sets:3, reps:"60 sec each", desc:"Lying on back, figure-4 with legs. Pull lower leg toward chest. Deep glute and hip stretch.", image:"", demo:"https://www.youtube.com/results?search_query=figure+4+glute+stretch" },
          { name:"Child's Pose with Reach", sets:3, reps:"45 sec each", desc:"Child's pose, walk hands to each side. Stretches lats, shoulders, and thoracic side body.", image:"", demo:"https://www.youtube.com/results?search_query=child's+pose+side+stretch" },
          { name:"Standing Side Stretch", sets:3, reps:"30 sec each", desc:"Arm overhead, reach and lean to opposite side. Full lateral body stretch.", image:"", demo:"https://www.youtube.com/results?search_query=standing+side+stretch" },
          { name:"Spinal Twist Seated", sets:3, reps:"45 sec each", desc:"Seated, one leg extended. Cross other foot over. Rotate toward bent knee. Spinal decompression.", image:"", demo:"https://www.youtube.com/results?search_query=seated+spinal+twist" },
          { name:"90-90 Hip Stretch", sets:3, reps:"60 sec each", desc:"Both legs at 90° angles on floor. Targets both internal and external hip rotators simultaneously.", image:"", demo:"https://www.youtube.com/results?search_query=90+90+hip+stretch" },
        ],
        Thursday: [
          { name:"Shoulder Cross-Body Stretch", sets:3, reps:"30 sec each", desc:"Pull arm across chest. Stretches posterior deltoid and rotator cuff. Great post-press day.", image:"", demo:"https://www.youtube.com/results?search_query=cross+body+shoulder+stretch" },
          { name:"Bicep Wall Stretch", sets:3, reps:"30 sec each", desc:"Hand flat on wall at shoulder height, rotate away. Stretches bicep and front of shoulder.", image:"", demo:"https://www.youtube.com/results?search_query=bicep+wall+stretch" },
          { name:"Lying Hamstring Stretch", sets:3, reps:"45 sec each", desc:"On back, loop band/towel around foot, extend leg. Isolates hamstrings without lower back strain.", image:"", demo:"https://www.youtube.com/results?search_query=lying+hamstring+stretch+band" },
          { name:"Frog Stretch", sets:3, reps:"60 sec", desc:"On all fours, knees wide, rock back. Deep inner thigh and groin opener. Breathe into it.", image:"", demo:"https://www.youtube.com/results?search_query=frog+stretch" },
          { name:"Upper Trap Stretch", sets:3, reps:"30 sec each", desc:"Tilt head to one side, hold with hand. Stretches upper trapezius. Relieves chronic neck tension.", image:"", demo:"https://www.youtube.com/results?search_query=upper+trap+stretch" },
          { name:"Thoracic Extension on Foam Roll", sets:3, reps:"60 sec", desc:"Foam roller perpendicular to spine. Extend over roller at different segments. Opens upper back.", image:"", demo:"https://www.youtube.com/results?search_query=thoracic+extension+foam+roller" },
        ],
        Friday: [
          { name:"Full Body Stretch Sequence", sets:1, reps:"15 min", desc:"Guided head-to-toe stretch. Start neck, work to shoulders, back, hips, legs. Hold each 45-60 sec.", image:"", demo:"https://www.youtube.com/results?search_query=full+body+stretch+sequence" },
          { name:"Couch Stretch", sets:3, reps:"60 sec each", desc:"Rear foot elevated, front foot forward. Deepest hip flexor and quad stretch. Target: 2 min per side.", image:"", demo:"https://www.youtube.com/results?search_query=couch+stretch+hip+flexor" },
          { name:"Pancake Stretch", sets:3, reps:"60 sec", desc:"Straddle position, fold forward. Opens hips and adductors. Progress slowly over weeks.", image:"", demo:"https://www.youtube.com/results?search_query=pancake+stretch" },
          { name:"Shoulder Capsule Stretch", sets:3, reps:"30 sec each", desc:"Arm across chest in horizontal position. Holds with other hand. Targets posterior capsule.", image:"", demo:"https://www.youtube.com/results?search_query=posterior+shoulder+capsule+stretch" },
          { name:"Active Lunge Stretch", sets:3, reps:"10 each", desc:"Dynamic lunge with rotation. Combines hip flexor and thoracic mobility. Functional movement.", image:"", demo:"https://www.youtube.com/results?search_query=lunge+with+twist+stretch" },
          { name:"Box Breathing Cooldown", sets:1, reps:"5 min", desc:"Inhale 4 sec, hold 4 sec, exhale 4 sec, hold 4 sec. Activates parasympathetic nervous system.", image:"", demo:"https://www.youtube.com/results?search_query=box+breathing+technique" },
        ],
        Saturday: [
          { name:"Yin Style Full Body", sets:1, reps:"20 min", desc:"Hold each stretch 2-3 minutes. No bouncing. Work into the deep connective tissue. Total restoration.", image:"", demo:"https://www.youtube.com/results?search_query=yin+yoga+full+body+20+minutes" },
          { name:"PNF Hamstring", sets:3, reps:"3 cycles each", desc:"Stretch, contract 6 sec, stretch further. Proprioceptive Neuromuscular Facilitation — fastest flexibility gains.", image:"", demo:"https://www.youtube.com/results?search_query=PNF+hamstring+stretch" },
          { name:"Hip Circle Mobility", sets:3, reps:"10 each dir", desc:"Wide stance, rotate hips in large circles. Lubricates hip joint and builds rotational range.", image:"", demo:"https://www.youtube.com/results?search_query=hip+circle+mobility" },
          { name:"Overhead Tricep Stretch", sets:3, reps:"30 sec each", desc:"Arm overhead, elbow bent. Push elbow back with other hand. Targets long head of tricep.", image:"", demo:"https://www.youtube.com/results?search_query=overhead+tricep+stretch" },
          { name:"Anterior Tib Stretch", sets:3, reps:"30 sec each", desc:"Kneel, top of foot on floor. Sit back on heels. Stretches shin muscles. Prevents shin splints.", image:"", demo:"https://www.youtube.com/results?search_query=anterior+tibialis+stretch" },
          { name:"Total Body Relax", sets:1, reps:"5 min", desc:"Lie still, progressive muscle relaxation. Tense and release each body part from feet to head.", image:"", demo:"https://www.youtube.com/results?search_query=progressive+muscle+relaxation" },
        ],
      }
    },
  },

  running: {
    plans: {
      "5K": {
        color: "#43a05a", emoji: "🏃", weeks: 6,
        desc: "Beginner-friendly. Build from 2km to 5km in 6 weeks.",
        schedule: [
          // Week 1
          { week:1, day:1, type:"Easy Run", dist:2, dur:20, desc:"Very easy pace. Conversational. Just get moving." },
          { week:1, day:2, type:"Rest/Walk", dist:0, dur:30, desc:"Brisk 30-minute walk. Active recovery." },
          { week:1, day:3, type:"Intervals", dist:2.5, dur:25, desc:"4 × 2 min run, 2 min walk. Feel the rhythm." },
          { week:1, day:4, type:"Rest", dist:0, dur:0, desc:"Full rest day. Sleep and stretch." },
          { week:1, day:5, type:"Easy Run", dist:2.5, dur:25, desc:"Slightly longer easy run. Same easy pace." },
          { week:1, day:6, type:"Long Run", dist:3, dur:30, desc:"Your longest run this week. Don't race it." },
          // Week 2
          { week:2, day:1, type:"Easy Run", dist:2.5, dur:25, desc:"Easy warm-up run to start the week." },
          { week:2, day:2, type:"Walk/Jog", dist:3, dur:30, desc:"Alternate 3 min jog, 1 min walk. 6 cycles." },
          { week:2, day:3, type:"Tempo", dist:2, dur:20, desc:"10 min easy, 5 min faster, 5 min easy. Introduce pace." },
          { week:2, day:4, type:"Rest", dist:0, dur:0, desc:"Rest. Your body is adapting." },
          { week:2, day:5, type:"Easy Run", dist:3, dur:30, desc:"Comfortable 3km." },
          { week:2, day:6, type:"Long Run", dist:3.5, dur:35, desc:"3.5km continuous if possible." },
          // Week 3
          { week:3, day:1, type:"Easy Run", dist:3, dur:28, desc:"Start to feel more comfortable at 3km." },
          { week:3, day:2, type:"Intervals", dist:3, dur:30, desc:"5 × 400m fast, 200m walk." },
          { week:3, day:3, type:"Recovery", dist:2, dur:20, desc:"Very easy recovery jog." },
          { week:3, day:4, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:3, day:5, type:"Continuous Run", dist:3.5, dur:35, desc:"Run the whole 3.5km without stopping." },
          { week:3, day:6, type:"Long Run", dist:4, dur:40, desc:"Your first 4km. Great milestone!" },
          // Week 4
          { week:4, day:1, type:"Easy Run", dist:3, dur:28, desc:"Easy 3km to recover from weekend." },
          { week:4, day:2, type:"Fartlek", dist:3, dur:30, desc:"Unstructured speed play. Pick up pace for lamp posts, slow down, repeat." },
          { week:4, day:3, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:4, day:4, type:"Tempo", dist:3, dur:28, desc:"8 min easy, 12 min comfortably hard, 8 min easy." },
          { week:4, day:5, type:"Easy Run", dist:3.5, dur:33, desc:"Comfortable easy run." },
          { week:4, day:6, type:"Long Run", dist:4.5, dur:45, desc:"4.5km. Almost there!" },
          // Week 5
          { week:5, day:1, type:"Easy Run", dist:3, dur:27, desc:"Keep it very easy. Big week coming." },
          { week:5, day:2, type:"Intervals", dist:3.5, dur:35, desc:"6 × 400m at goal 5K pace." },
          { week:5, day:3, type:"Rest", dist:0, dur:0, desc:"Full rest." },
          { week:5, day:4, type:"Easy Run", dist:4, dur:38, desc:"Build confidence for the long run." },
          { week:5, day:5, type:"Easy Run", dist:3, dur:27, desc:"Last easy run before big weekend." },
          { week:5, day:6, type:"Long Run", dist:5, dur:50, desc:"Your first 5K! Celebrate this milestone!" },
          // Week 6 - Race Week
          { week:6, day:1, type:"Easy Run", dist:3, dur:27, desc:"Light and easy. Stay loose." },
          { week:6, day:2, type:"Strides", dist:2, dur:20, desc:"4 × 20 sec fast strides with 60 sec rest. Stay sharp." },
          { week:6, day:3, type:"Rest", dist:0, dur:0, desc:"Total rest." },
          { week:6, day:4, type:"Easy Jog", dist:2, dur:18, desc:"Last easy shake-out run." },
          { week:6, day:5, type:"Rest", dist:0, dur:0, desc:"Rest completely. Hydrate well. Sleep early." },
          { week:6, day:6, type:"RACE DAY! 🏆", dist:5, dur:0, desc:"This is it! Run your 5K! You are ready!" },
        ]
      },
      "10K": {
        color: "#1e88e5", emoji: "🏃‍♂️", weeks: 8,
        desc: "For runners who can run 5K. Double the distance in 8 weeks.",
        schedule: [
          { week:1, day:1, type:"Easy Run", dist:4, dur:38, desc:"Comfortable 4km base run. Easy conversational pace." },
          { week:1, day:2, type:"Rest", dist:0, dur:0, desc:"Rest or easy walk." },
          { week:1, day:3, type:"Intervals", dist:4, dur:40, desc:"6 × 400m at 5K pace. 90 sec rest between." },
          { week:1, day:4, type:"Easy Run", dist:3, dur:28, desc:"Recovery run. Very easy." },
          { week:1, day:5, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:1, day:6, type:"Long Run", dist:6, dur:58, desc:"First long run. Easy steady pace. " },
          { week:2, day:1, type:"Easy Run", dist:4, dur:38, desc:"Easy run to start the week." },
          { week:2, day:2, type:"Tempo", dist:5, dur:45, desc:"10 min easy, 20 min tempo, 10 min easy." },
          { week:2, day:3, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:2, day:4, type:"Easy Run", dist:5, dur:47, desc:"Comfortable 5km." },
          { week:2, day:5, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:2, day:6, type:"Long Run", dist:7, dur:67, desc:"7km easy. The long run builds your base." },
          { week:3, day:1, type:"Easy Run", dist:5, dur:47, desc:"Easy 5km." },
          { week:3, day:2, type:"Intervals", dist:5, dur:50, desc:"8 × 400m at 10K goal pace. 90 sec rest." },
          { week:3, day:3, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:3, day:4, type:"Tempo Run", dist:5, dur:45, desc:"5km at comfortably hard effort." },
          { week:3, day:5, type:"Easy Run", dist:4, dur:38, desc:"Easy." },
          { week:3, day:6, type:"Long Run", dist:8, dur:75, desc:"8km. Great progress!" },
          { week:4, day:1, type:"Easy Run", dist:4, dur:38, desc:"Recovery week starts easy." },
          { week:4, day:2, type:"Easy Run", dist:5, dur:47, desc:"Easy run." },
          { week:4, day:3, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:4, day:4, type:"Easy Run", dist:4, dur:38, desc:"Easy." },
          { week:4, day:5, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:4, day:6, type:"Long Run", dist:6, dur:58, desc:"Reduced week - 6km. Recovery." },
          { week:5, day:1, type:"Easy Run", dist:5, dur:47, desc:"Back to building." },
          { week:5, day:2, type:"Intervals", dist:5, dur:50, desc:"10 × 400m at 10K pace." },
          { week:5, day:3, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:5, day:4, type:"Tempo", dist:6, dur:55, desc:"20 min easy + 20 min tempo + 10 min cool." },
          { week:5, day:5, type:"Easy Run", dist:4, dur:38, desc:"Easy." },
          { week:5, day:6, type:"Long Run", dist:9, dur:85, desc:"9km. You're getting there." },
          { week:6, day:1, type:"Easy Run", dist:5, dur:47, desc:"Start of peak week." },
          { week:6, day:2, type:"Intervals", dist:6, dur:60, desc:"5 × 1km at 10K goal pace. 2 min rest." },
          { week:6, day:3, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:6, day:4, type:"Tempo Run", dist:6, dur:55, desc:"6km at race effort." },
          { week:6, day:5, type:"Easy Run", dist:4, dur:38, desc:"Easy." },
          { week:6, day:6, type:"Long Run", dist:10, dur:95, desc:"FIRST 10K! Major milestone. Easy pace." },
          { week:7, day:1, type:"Easy Run", dist:5, dur:47, desc:"Taper starts." },
          { week:7, day:2, type:"Easy Run", dist:5, dur:47, desc:"Easy." },
          { week:7, day:3, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:7, day:4, type:"Strides", dist:4, dur:38, desc:"Easy run with 5 × 20 sec fast strides." },
          { week:7, day:5, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:7, day:6, type:"Easy Run", dist:6, dur:58, desc:"Last medium long run." },
          { week:8, day:1, type:"Easy Run", dist:4, dur:38, desc:"Race week. Easy only." },
          { week:8, day:2, type:"Strides", dist:3, dur:28, desc:"Easy + 4 strides. Stay sharp." },
          { week:8, day:3, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:8, day:4, type:"Easy Jog", dist:2, dur:20, desc:"Last tune-up. Very easy." },
          { week:8, day:5, type:"Rest", dist:0, dur:0, desc:"Rest. Eat well. Sleep. Hydrate." },
          { week:8, day:6, type:"RACE DAY! 🏆", dist:10, dur:0, desc:"10K Race Day! All your training has led here. Run your race!" },
        ]
      },
      "HM": {
        color: "#fb8c00", emoji: "🏃‍♀️", weeks: 12,
        desc: "Half Marathon (21.1km). For runners with a solid 10K base.",
        schedule: [
          { week:1, day:1, type:"Easy Run", dist:6, dur:57, desc:"Start of the half marathon journey. Easy 6km." },
          { week:1, day:2, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:1, day:3, type:"Tempo", dist:6, dur:55, desc:"Easy warm-up + 20 min tempo + cool-down." },
          { week:1, day:4, type:"Easy Run", dist:5, dur:47, desc:"Easy recovery run." },
          { week:1, day:5, type:"Rest", dist:0, dur:0, desc:"Rest." },
          { week:1, day:6, type:"Long Run", dist:10, dur:95, desc:"Long run base. Comfortable pace." },
          { week:4, day:6, type:"Long Run", dist:14, dur:130, desc:"14km. The long runs are the key to half marathon success." },
          { week:8, day:6, type:"Long Run", dist:18, dur:170, desc:"18km. Longest training run. You can do this!" },
          { week:12, day:6, type:"RACE DAY! 🏆", dist:21.1, dur:0, desc:"Half Marathon Race Day! 21.1km. All your hard work pays off today!" },
        ]
      },
      "FM": {
        color: "#e53935", emoji: "🏅", weeks: 16,
        desc: "Full Marathon (42.2km). For experienced runners. Serious training required.",
        schedule: [
          { week:1, day:1, type:"Easy Run", dist:8, dur:76, desc:"Marathon training begins. Comfortable easy effort." },
          { week:1, day:6, type:"Long Run", dist:16, dur:148, desc:"First long run of marathon training. Controlled pace." },
          { week:8, day:6, type:"Long Run", dist:28, dur:260, desc:"Peak long run territory. Mental strength is as important as physical." },
          { week:16, day:6, type:"RACE DAY! 🏆", dist:42.2, dur:0, desc:"MARATHON RACE DAY! 42.2km. You have done the work. Trust your training. Run your race!" },
        ]
      }
    }
  },

  hydration: {
    default: {
      title: "Daily Hydration Plan",
      targets: { training: 3.5, rest: 2.5 },
      schedule: [
        { time: "7:00 AM", amount: 500, label: "Wake-up glass" },
        { time: "9:00 AM", amount: 400, label: "Mid-morning" },
        { time: "12:00 PM", amount: 500, label: "Before lunch" },
        { time: "3:00 PM", amount: 400, label: "Afternoon" },
        { time: "Pre-Workout", amount: 400, label: "30 min before" },
        { time: "During Workout", amount: 600, label: "Sip every 15 min" },
        { time: "Post-Workout", amount: 500, label: "Within 30 min" },
        { time: "7:00 PM", amount: 300, label: "Evening" },
      ],
      tips: [
        "Add a pinch of Himalayan pink salt on heavy training days to replace electrolytes.",
        "Urine colour should be pale yellow. Dark yellow means you need more water.",
        "Coffee and tea count but also act as mild diuretics — compensate with extra water.",
        "Eat water-rich foods: cucumber, watermelon, oranges, and coconut water are excellent.",
        "Drink 200-300ml extra per 30 minutes in hot/humid weather.",
      ]
    }
  },

  diet: {
    modules: {
      cardio: {
        title: "Cardio Day Diet Plan",
        meals: [
          { time:"Pre-Workout", name:"Energy Boost", items:"Banana + black coffee or green tea", cal:150, notes:"30-45 min before session" },
          { time:"Post-Workout", name:"Recovery Meal", items:"2 boiled eggs + 1 slice whole wheat toast", cal:220, notes:"Within 30 min after" },
          { time:"Breakfast", name:"Carb-Forward Meal", items:"Oats porridge with fruit and nuts", cal:380, notes:"Replenish glycogen" },
          { time:"Lunch", name:"Balanced Meal", items:"Brown rice + grilled chicken 150g + vegetables", cal:560, notes:"Protein + complex carbs" },
          { time:"Snack", name:"Afternoon Fuel", items:"Greek yogurt + handful of almonds", cal:220, notes:"Sustained energy" },
          { time:"Dinner", name:"Light Recovery", items:"Lentil soup + 2 chapati + salad", cal:480, notes:"Early, light dinner" },
        ]
      },
      gym: {
        title: "Gym Day Diet Plan",
        meals: [
          { time:"Pre-Workout", name:"Power Fuel", items:"Banana + 2 boiled eggs + optional black coffee", cal:280, notes:"60 min before lifting" },
          { time:"Intra-Workout", name:"Hydration", items:"Water + optional BCAA drink", cal:50, notes:"Sip during session" },
          { time:"Post-Workout", name:"Anabolic Window", items:"Whey protein shake or 200g Greek yogurt + fruit", cal:280, notes:"Within 30 min — critical!" },
          { time:"Lunch", name:"Muscle Building Meal", items:"Brown rice 200g + grilled chicken 180g + vegetables", cal:620, notes:"2-3 hrs post-workout" },
          { time:"Snack", name:"Protein Boost", items:"Cottage cheese or paneer 100g + fruit", cal:200, notes:"Afternoon" },
          { time:"Dinner", name:"Casein Meal", items:"Dal + 2 chapati + salad + glass of milk", cal:520, notes:"Slow-digesting protein overnight" },
        ]
      },
      yoga: {
        title: "Yoga Day Diet Plan",
        meals: [
          { time:"Pre-Yoga", name:"Light Energy", items:"Small banana or 4-5 dates + herbal tea", cal:120, notes:"30-60 min before. Avoid heavy food." },
          { time:"Post-Yoga", name:"Nourishment", items:"Smoothie: banana + spinach + almond milk + honey", cal:240, notes:"Replenish mindfully" },
          { time:"Breakfast", name:"Sattvic Breakfast", items:"Poha or upma + coconut chutney + herbal tea", cal:360, notes:"Light, digestible" },
          { time:"Lunch", name:"Balanced Thali", items:"Dal + rice + sabzi + curd + salad", cal:580, notes:"Largest meal of day" },
          { time:"Snack", name:"Light Snack", items:"Fresh fruit + handful walnuts", cal:180, notes:"Afternoon, light" },
          { time:"Dinner", name:"Early Light Dinner", items:"Khichdi or vegetable soup + bread", cal:420, notes:"By 7pm ideally" },
        ]
      },
      stretching: {
        title: "Rest/Stretch Day Diet Plan",
        meals: [
          { time:"Morning", name:"Anti-Inflammatory", items:"Turmeric milk or golden latte + fruit", cal:200, notes:"Anti-inflammatory start" },
          { time:"Breakfast", name:"Protein + Fibre", items:"2 eggs any style + whole grain toast + avocado", cal:420, notes:"Sustained energy" },
          { time:"Lunch", name:"Omega-Rich Meal", items:"Grilled fish or tofu + quinoa + roasted vegetables", cal:540, notes:"Recovery nutrition" },
          { time:"Snack", name:"Collagen Boost", items:"Bone broth or gelatin-rich foods", cal:120, notes:"Supports joint health" },
          { time:"Dinner", name:"Recovery Dinner", items:"Chicken/lentil soup + whole grain bread", cal:460, notes:"Easy to digest" },
        ]
      }
    }
  }
};

// ── DEFAULT USERS (stored in localStorage as fallback) ───────────
window.DEFAULT_USERS = [
  {
    id: "u_001",
    name: "Admin User",
    email: "admin@fitflow.com",
    password: "admin123",
    role: "ADMIN",
    status: "ACTIVE",
    createdDate: "2025-01-01"
  },
  {
    id: "u_002",
    name: "Ravi Kumar",
    email: "user@fitflow.com",
    password: "user123",
    role: "USER",
    status: "ACTIVE",
    createdDate: "2025-01-01"
  }
];
