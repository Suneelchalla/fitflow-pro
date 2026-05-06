// ── DEFAULT DATA ─────────────────────────────────────────────────
// Bump this number when exercise data changes — triggers auto-seed to Sheets
const DATA_VERSION = 17;

window.APP_DATA = {

  quotes: [
    { text: "The only bad workout is the one that didn't happen." },
    { text: "Sweat is the cologne of accomplishment." },
    { text: "Fitness is not about being better than someone else. It's about being better than you used to be." },
    { text: "Push yourself because no one else is going to do it for you." },
    { text: "Your body can stand almost anything. It's your mind you have to convince." },
    { text: "Don't wish for it. Work for it." },
    { text: "Be stronger than your strongest excuse." },
    { text: "The pain you feel today will be the strength you feel tomorrow." },
    { text: "Take care of your body. It's the only place you have to live." },
    { text: "Sweat is just fat crying." },
    { text: "No matter how slow you go, you're still lapping everybody on the couch." },
    { text: "Strive for progress, not perfection." },
    { text: "Wake up. Work out. Look hot. Kick ass." },
    { text: "The hardest lift of all is lifting your butt off the couch." },
    { text: "If it doesn't challenge you, it doesn't change you." },
    { text: "Discipline is doing what you hate to do but doing it like you love it." },
    { text: "You don't have to be extreme, just consistent." },
    { text: "Train insane or remain the same." },
    { text: "The body achieves what the mind believes." },
    { text: "A one-hour workout is 4% of your day. No excuses." },
    { text: "Don't count the days, make the days count." },
    { text: "Sore today, strong tomorrow." },
    { text: "Suck it up. One day you won't have to suck it in." },
    { text: "Excuses don't burn calories." },
    { text: "You are stronger than you think." },
    { text: "It never gets easier, you just get stronger." },
    { text: "Today's reps are tomorrow's records." },
    { text: "Make yourself proud." },
    { text: "Wake up with determination, go to bed with satisfaction." },
    { text: "If you want something you've never had, you must do something you've never done." },
    { text: "Good things come to those who sweat." },
    { text: "When you feel like quitting, think about why you started." },
    { text: "Earn your body. Own your life." },
    { text: "Fitness is like a relationship. You can't cheat and expect it to work." },
    { text: "The miracle isn't that I finished. The miracle is that I had the courage to start." },
    { text: "Your future self is watching you right now through your memories." },
    { text: "Don't stop until you're proud." },
    { text: "Champions train, losers complain." },
    { text: "The clock is ticking. Are you becoming the person you want to be?" },
    { text: "Stop saying tomorrow." },
    { text: "Strong is the new skinny." },
    { text: "Make your body the sexiest outfit you'll ever own." },
    { text: "Tough times don't last. Tough people do." },
    { text: "I will sweat, I will breathe hard, I will hurt — but I will not stop." },
    { text: "What hurts today makes you stronger tomorrow." },
    { text: "When in doubt, work it out." },
    { text: "If you still look cute at the end of your workout, you didn't train hard enough." },
    { text: "Pain is weakness leaving the body." },
    { text: "Fall in love with taking care of yourself." },
    { text: "The difference between who you are and who you want to be is what you do." },
    { text: "Show up for yourself." },
    { text: "Believe in yourself and your body will follow." },
    { text: "Stop wishing. Start doing." },
    { text: "Hustle for that muscle." },
    { text: "Eat clean. Train mean. Live lean." },
    { text: "Be the warrior, not the worrier." },
    { text: "Doubt kills more dreams than failure ever will." },
    { text: "Action is the foundational key to all success." },
    { text: "If you can dream it, you can do it." },
    { text: "Run when you can, walk if you have to, crawl if you must — just never give up." },
    { text: "Slow progress is still progress." },
    { text: "Don't be afraid to fail. Be afraid not to try." },
    { text: "Success starts with self-discipline." },
    { text: "Your only limit is you." },
    { text: "Today I will do what others won't, so tomorrow I can accomplish what others can't." },
    { text: "Stronger every day. Inside and out." },
    { text: "Some people want it to happen, some wish it would happen, others make it happen." },
    { text: "Don't limit your challenges. Challenge your limits." },
    { text: "Energy and persistence conquer all things." },
    { text: "It's a slow process, but quitting won't speed it up." },
    { text: "Wake up. Show up. Don't give up." },
    { text: "Hard work beats talent when talent doesn't work hard." },
    { text: "There is no magic pill. Only hard work and consistency." },
    { text: "Rest, but never quit." },
    { text: "If you can't fly, then run. If you can't run, then walk. But by all means, keep moving." },
    { text: "Make sweat your best accessory." },
    { text: "Train like a beast, look like a beauty." },
    { text: "I don't sweat — I sparkle." },
    { text: "Don't let your dreams stay dreams." },
    { text: "Choose to be unstoppable." },
    { text: "Your goals don't care how you feel. Get to work." },
    { text: "Comfort is the enemy of progress." },
    { text: "Excuses are the nails to build a house of failure." },
    { text: "Be the kind of person your future self will thank." },
    { text: "What you do today is what matters most." },
    { text: "Champions keep playing until they get it right." },
    { text: "When you want to give up, remember why you started." },
    { text: "Health is wealth. Invest daily." },
    { text: "Skip the elevator. Take the stairs of life." },
    { text: "Discipline yourself today, and you'll be better tomorrow." },
    { text: "It's not about having time. It's about making time." },
    { text: "Stop wishing for a different body. Start working for one." },
    { text: "Strong people don't put others down. They lift them up." },
    { text: "Be a warrior, not a worrier." },
    { text: "You are one workout away from a good mood." },
    { text: "If it doesn't suck, it's not worth it." },
    { text: "Big goals get big results. Small goals get small results." },
    { text: "There are no shortcuts to anywhere worth going." },
    { text: "Trust the process. Even when you can't see progress." },
    { text: "The body benefits from movement, the mind benefits from stillness." },
    { text: "Fitness is a journey, not a destination." },
    { text: "Today's choice is tomorrow's body." },
    { text: "Stop looking for a quick fix. Get fit for life." },
    { text: "Don't compare your beginning to someone else's middle." },
    { text: "Earn the body you want. Don't wish for it." },
    { text: "Lift heavy. Run far. Live well." },
    { text: "Strength doesn't come from what you can do. It comes from overcoming what you couldn't." },
    { text: "The hard days are what make you stronger." },
    { text: "Be unstoppable. Be relentless. Be you." },
    { text: "When the going gets tough, the tough get going." },
    { text: "Some days you'll feel like a beast. Some days you'll feel beaten. Show up anyway." },
    { text: "Quitting lasts forever. Pain is temporary." },
    { text: "Your goals are non-negotiable." },
    { text: "If it's important to you, you'll find a way. If not, you'll find an excuse." },
    { text: "Sometimes the strongest among us are the ones who smile through silent pain." },
    { text: "You're not tired. You're uninspired." },
    { text: "Build the body. Build the mind. Build the life." },
    { text: "Train your weakness, race your strength." },
    { text: "There's no traffic on the extra mile." },
    { text: "Run when you can. Walk if you must. Just keep going." },
    { text: "Movement is medicine." },
    { text: "Be obsessed or be average." },
    { text: "Tough days build tough people." },
    { text: "Done is better than perfect." },
    { text: "Set the goal. Crush the goal." },
    { text: "Your sweat is the price of greatness." },
    { text: "Doubt your doubts before you doubt your dreams." },
    { text: "Stop hating your body. Start changing it." },
    { text: "Health is the new wealth." },
    { text: "Move your body, free your mind." },
    { text: "Be relentless about becoming better." },
    { text: "Every workout is a step closer." },
    { text: "Burn calories, not bridges." },
    { text: "Strong body. Stronger mind. Strongest will." },
    { text: "Confidence is built one workout at a time." },
    { text: "Make yourself a priority." },
    { text: "Train like there's no finish line." },
    { text: "Your only competition is yesterday's you." },
    { text: "Get comfortable with being uncomfortable." },
    { text: "If you're not pushing yourself, you're falling behind." },
    { text: "Every drop of sweat is an investment." },
    { text: "Show up even when you don't feel like it. That's how you win." },
    { text: "Excuses get you nowhere. Effort gets you everywhere." },
    { text: "Fall seven times, stand up eight." },
    { text: "You don't have to be great to start, but you have to start to be great." },
    { text: "Believe you can and you're halfway there." },
    { text: "Discipline is choosing between what you want now and what you want most." },
    { text: "Make every rep count." },
    { text: "Strong mind. Strong body. Strong life." },
    { text: "Be a beast. Be a legend. Be unstoppable." },
    { text: "Win the morning, win the day." }
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
      useProgressive: true,
      phases: [
        { from:1,  to:12, label:"Phase 1 — Foundation",            color:"#2e7d46" },
        { from:13, to:24, label:"Phase 2 — Building Strength",     color:"#1565c0" },
        { from:25, to:36, label:"Phase 3 — Deepening Practice",    color:"#6a1b9a" },
        { from:37, to:48, label:"Phase 4 — Inversions & Arm Balances", color:"#bf360c" },
        { from:49, to:60, label:"Phase 5 — Professional Flow",     color:"#ad1457" },
      ],
      schedule: {

        // ══════════════════════════════════════════════════════════════════
        // PHASE 1 — FOUNDATION (Days 1–12) — Complete Beginner
        // Learn breathing, basic poses, Sun Salutation A
        // ══════════════════════════════════════════════════════════════════

        "Day 1": { focus: "Breath Awareness & Body Scan", poses: [
          { name:"Diaphragmatic Breathing", hold:"5 min", desc:"Lie on back, hands on belly. Inhale deep into abdomen — feel belly rise, chest stays still. Exhale fully. This is the foundation of all yoga. Practice slow 4-count inhale, 6-count exhale.", demo:"https://www.youtube.com/results?search_query=diaphragmatic+breathing+yoga+beginner" },
          { name:"Body Scan Meditation", hold:"3 min", desc:"Lying flat, close eyes. Bring awareness to each body part from feet to head. Notice tension without trying to change it. Prepares the mind for yoga practice.", demo:"https://www.youtube.com/results?search_query=body+scan+meditation+yoga" },
          { name:"Cat-Cow Stretch", hold:"10 rounds", desc:"On all fours, wrists under shoulders. Inhale — drop belly, lift head and tailbone (Cow). Exhale — round spine to ceiling, tuck chin and tailbone (Cat). Move one vertebra at a time. Sync breath with movement.", demo:"https://www.youtube.com/results?search_query=cat+cow+yoga+beginners" },
          { name:"Child's Pose (Balasana)", hold:"90 sec", desc:"Kneel, sit back on heels, extend arms forward, rest forehead on mat. Breathe into the lower back. This is your rest pose — return here whenever needed throughout your practice.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga+beginners" },
          { name:"Supine Knee Hugs", hold:"60 sec", desc:"Lying on back, pull both knees to chest. Rock gently side to side to massage the lower back. Releases tension built up from sitting all day.", demo:"https://www.youtube.com/results?search_query=supine+knee+hugs+yoga" },
          { name:"Savasana (Corpse Pose)", hold:"5 min", desc:"Lie completely flat, arms at sides, palms up, feet slightly apart. Close eyes. Let every muscle relax completely. Do not skip this — it is the most important pose. The body absorbs the practice here.", demo:"https://www.youtube.com/results?search_query=savasana+yoga+beginner" },
        ]},

        "Day 2": { focus: "Spine Mobility", poses: [
          { name:"Neck Rolls", hold:"5 each direction", desc:"Seated or standing. Slowly roll head in full circles — right 5 times, left 5 times. Never force or crunch. Release neck tension before practice.", demo:"https://www.youtube.com/results?search_query=neck+rolls+yoga+warm+up" },
          { name:"Cat-Cow (deeper)", hold:"12 rounds", desc:"Today focus on maximum range — belly drops as low as possible in Cow, spine rounds as high as possible in Cat. Pause 1 second at each end. Builds beautiful spinal mobility.", demo:"https://www.youtube.com/results?search_query=cat+cow+yoga+deeper" },
          { name:"Seated Forward Fold (Paschimottanasana)", hold:"90 sec", desc:"Sit with legs straight. Inhale lengthen spine tall. Exhale fold forward from the hips — NOT the waist. Hold shins, ankles or feet. Keep back as flat as possible. Each exhale, release a little deeper.", demo:"https://www.youtube.com/results?search_query=seated+forward+fold+yoga+beginner" },
          { name:"Supine Spinal Twist", hold:"75 sec each side", desc:"Lying on back, hug right knee to chest then let it fall across body to the left. Extend right arm out, turn head right. Breathe deeply into the twist. Switch sides. Detoxifying and deeply releasing.", demo:"https://www.youtube.com/results?search_query=supine+spinal+twist+yoga" },
          { name:"Legs Up the Wall (Viparita Karani)", hold:"3 min", desc:"Sit sideways to wall, swing legs up. Rest with hips close to wall, legs vertical. Completely passive. Reverses blood flow, relieves tired legs, calms nervous system. Wonderful recovery pose.", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
          { name:"Savasana", hold:"4 min", desc:"Complete relaxation. Feel the spine you just worked settling into the floor. Notice how different your back feels vs Day 1.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 3": { focus: "Standing Poses Foundation", poses: [
          { name:"Mountain Pose (Tadasana)", hold:"2 min", desc:"Stand with feet hip-width. Ground through all four corners of feet. Lift kneecaps, engage thighs. Lengthen tailbone down, lift chest. Arms at sides, palms forward. This simple pose teaches you how to stand correctly. The foundation of ALL standing poses.", demo:"https://www.youtube.com/results?search_query=mountain+pose+tadasana+yoga" },
          { name:"Standing Forward Fold (Uttanasana)", hold:"90 sec", desc:"From Mountain, hinge at hips and fold forward. Bend knees generously — this is NOT about touching toes. Let head hang heavy. Grab opposite elbows and sway. Decompress the spine.", demo:"https://www.youtube.com/results?search_query=standing+forward+fold+yoga+beginner" },
          { name:"Low Lunge (Anjaneyasana)", hold:"75 sec each side", desc:"Step right foot forward between hands, lower left knee to mat. Hips sink forward and down. Arms reach overhead or rest on front thigh. Deep hip flexor stretch — most people are very tight here. Hold and breathe.", demo:"https://www.youtube.com/results?search_query=low+lunge+yoga+beginner" },
          { name:"Downward Facing Dog (Adho Mukha Svanasana)", hold:"90 sec", desc:"Hands shoulder-width, feet hip-width, form inverted V. Press firmly through hands, lift hips high. Pedal feet alternately to warm up calves. This iconic pose stretches the entire back of the body.", demo:"https://www.youtube.com/results?search_query=downward+dog+yoga+alignment" },
          { name:"Child's Pose", hold:"90 sec", desc:"Rest after first standing work. Notice your hips and hamstrings.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"4 min", desc:"You have now learned the 5 most important foundational poses. Rest and integrate.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 4": { focus: "Hip Opening — Beginner", poses: [
          { name:"Butterfly Pose (Baddha Konasana)", hold:"2 min", desc:"Sit with soles of feet together, knees wide. Hold feet or ankles. Sit tall first, then gently fold forward. Inner thigh and groin opener. Don't push knees down — let them relax naturally.", demo:"https://www.youtube.com/results?search_query=butterfly+pose+yoga" },
          { name:"Figure 4 Stretch", hold:"90 sec each side", desc:"Lying on back. Cross right ankle over left thigh (figure 4 shape). Flex right foot to protect knee. Pull both legs toward chest. Targets glutes and piriformis — tight spots for most people.", demo:"https://www.youtube.com/results?search_query=figure+4+hip+stretch+yoga" },
          { name:"Low Lunge Hip Circles", hold:"60 sec each side", desc:"In low lunge position, make gentle circles with front knee — loosening the hip joint. 10 circles each direction. Follow with deeper lunge hold.", demo:"https://www.youtube.com/results?search_query=low+lunge+hip+circles+yoga" },
          { name:"Pigeon Pose Prep (Eka Pada Rajakapotasana prep)", hold:"90 sec each side", desc:"From downward dog, bring right shin toward front of mat (or right knee behind right wrist). Lower hips. Support on hands or fold forward. This pose will transform your hip flexibility over time.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+beginner+yoga" },
          { name:"Happy Baby (Ananda Balasana)", hold:"2 min", desc:"Lying on back, grab outer edges of feet. Knees wide toward armpits. Rock gently side to side. Massages the lower back and sacrum. One of the most pleasant poses in yoga.", demo:"https://www.youtube.com/results?search_query=happy+baby+pose+yoga" },
          { name:"Savasana", hold:"4 min", desc:"Hips have done significant work today. Allow the release to settle in.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 5": { focus: "Sun Salutation A — Step by Step", poses: [
          { name:"Sun Salutation A — Learn each step", hold:"3 slow rounds", desc:"Mountain → Arms up (Urdhva Hastasana) → Forward Fold → Halfway Lift (Ardha Uttanasana) → Plank → Lower down (Chaturanga) → Cobra (Bhujangasana) → Downward Dog → Forward Fold → Arms up → Mountain. Do each step SLOWLY. Understand what each position feels like before moving on.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+step+by+step+beginner" },
          { name:"Cobra Pose (Bhujangasana)", hold:"30 sec × 3", desc:"Lie prone, hands under shoulders. Inhale, press through hands, lift chest. Keep elbows soft — this is NOT a push-up. Shoulders back and down. Opens chest and strengthens the back.", demo:"https://www.youtube.com/results?search_query=cobra+pose+yoga+form" },
          { name:"Plank Hold", hold:"20 sec × 3", desc:"Wrists under shoulders, body in straight line head to heels. Engage core, squeeze glutes. Don't let hips sag or pike. This is the foundation of arm strength for yoga.", demo:"https://www.youtube.com/results?search_query=plank+pose+yoga" },
          { name:"Sun Salutation A — Flow", hold:"3 rounds", desc:"Now do 3 full rounds linking breath to movement. Inhale up, exhale fold. Don't rush. Feel each transition. This is the backbone of yoga practice.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+flow+yoga" },
          { name:"Child's Pose", hold:"90 sec", desc:"Rest after your first complete Sun Salutation practice.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"5 min", desc:"You have learned Sun Salutation A — one of the most important sequences in yoga. Rest well.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 6": { focus: "Balance & Warriors", poses: [
          { name:"Tree Pose (Vrksasana)", hold:"45 sec each side", desc:"Stand on right leg. Place left foot on inner calf or inner thigh — never on the knee. Hands at heart or overhead. Find a fixed gaze point (drishti). Balance requires relaxed focus, not tension.", demo:"https://www.youtube.com/results?search_query=tree+pose+yoga+beginner" },
          { name:"Warrior I (Virabhadrasana I)", hold:"45 sec each side", desc:"Step right foot forward 4 feet. Front knee over ankle, back foot at 45°. Hips square forward. Arms reach overhead, palms face each other. Strong and grounded — feel the power of this pose.", demo:"https://www.youtube.com/results?search_query=warrior+1+yoga+beginners" },
          { name:"Warrior II (Virabhadrasana II)", hold:"45 sec each side", desc:"Wide stance. Front knee over ankle. Arms parallel to floor, gaze over front fingers. Hips open to the side — different from Warrior I. Hold for 5 full breaths. Build the burn.", demo:"https://www.youtube.com/results?search_query=warrior+2+yoga+beginners" },
          { name:"Reverse Warrior (Viparita Virabhadrasana)", hold:"30 sec each side", desc:"From Warrior II, flip front palm up, reach that arm back and up, lean back slightly. Back hand slides down back leg. Opens the side body and chest beautifully.", demo:"https://www.youtube.com/results?search_query=reverse+warrior+yoga" },
          { name:"Downward Dog", hold:"60 sec", desc:"After standing work, let the spine decompress. Pedal the heels.", demo:"https://www.youtube.com/results?search_query=downward+dog+yoga" },
          { name:"Savasana", hold:"5 min", desc:"6 days complete — you have built a strong foundation. Rest deeply.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 7": { focus: "Yin Rest & Restore", poses: [
          { name:"Yin Butterfly", hold:"3 min", desc:"Soles of feet together, completely relax forward. No effort, no pushing. Let gravity slowly open the inner thighs. This is yin — passive, long holds, surrender.", demo:"https://www.youtube.com/results?search_query=yin+yoga+butterfly" },
          { name:"Yin Seated Forward Fold", hold:"3 min", desc:"Legs extended, completely relax forward. Arms wherever comfortable. No trying to reach further. Just breathe and surrender. Feel connective tissue slowly releasing.", demo:"https://www.youtube.com/results?search_query=yin+yoga+forward+fold" },
          { name:"Dragon Pose (Low Lunge Yin)", hold:"2 min each side", desc:"Low lunge, hold completely still. Don't adjust every 30 seconds — stay with the sensation. This is where real change happens in yin. Breathe into the hip flexor.", demo:"https://www.youtube.com/results?search_query=dragon+pose+yin+yoga" },
          { name:"Sleeping Swan (Yin Pigeon)", hold:"2 min each side", desc:"Pigeon shape but fully relaxed. Forehead on mat or block. Completely passive. This accesses the deepest hip opening available in yoga.", demo:"https://www.youtube.com/results?search_query=sleeping+swan+yin+yoga" },
          { name:"Legs Up Wall", hold:"4 min", desc:"Complete passive inversion. Lets blood flow return from legs. Calms the nervous system. One of the best recovery poses in existence.", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
          { name:"Savasana with Body Scan", hold:"7 min", desc:"Week 1 complete. Systematically relax every body part from feet to crown. You have established a real practice. Notice how your body already feels different from Day 1.", demo:"https://www.youtube.com/results?search_query=savasana+body+scan+yoga" },
        ]},

        "Day 8": { focus: "Core Strength for Yoga", poses: [
          { name:"Boat Pose (Navasana)", hold:"30 sec × 3", desc:"Sit, lean back slightly, lift feet. Legs straight or bent in V shape. Arms parallel to floor. Core engages hard. Build the core strength essential for arm balances and inversions later.", demo:"https://www.youtube.com/results?search_query=boat+pose+yoga+beginner" },
          { name:"Plank Hold — Extended", hold:"30 sec × 3", desc:"Wrists under shoulders. Core tight. Hold longer than Day 5. Each week you'll build duration. This is your arm and core strength for the entire journey.", demo:"https://www.youtube.com/results?search_query=plank+pose+yoga" },
          { name:"Side Plank (Vasisthasana)", hold:"20 sec each side", desc:"From plank, rotate to balance on one hand and outer edge of foot. Other arm reaches up. Targets obliques and shoulder stability. Modify by lowering bottom knee.", demo:"https://www.youtube.com/results?search_query=side+plank+yoga+beginner" },
          { name:"Bridge Pose (Setu Bandhasana)", hold:"60 sec × 3", desc:"Lie on back, feet flat near glutes. Press feet into floor, lift hips high. Clasp hands under back. Hold firmly. Opens chest, strengthens glutes and lower back.", demo:"https://www.youtube.com/results?search_query=bridge+pose+yoga" },
          { name:"Supine Twist", hold:"60 sec each side", desc:"Release lower back after core work.", demo:"https://www.youtube.com/results?search_query=supine+twist+yoga" },
          { name:"Savasana", hold:"4 min", desc:"Core work is intense. Let the muscles recover fully.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 9": { focus: "Backbends — Heart Opening", poses: [
          { name:"Sphinx Pose", hold:"2 min", desc:"Lie prone, forearms flat, elbows under shoulders. Gentle supported backbend. Excellent for lower back health. Entry-level backbend that everyone can do.", demo:"https://www.youtube.com/results?search_query=sphinx+pose+yoga" },
          { name:"Cobra Pose (Bhujangasana)", hold:"45 sec × 3", desc:"Press through hands, lift chest. Elbows soft. Today hold longer and go deeper than Day 5. Feel the chest fully opening.", demo:"https://www.youtube.com/results?search_query=cobra+pose+yoga" },
          { name:"Locust Pose (Shalabhasana)", hold:"30 sec × 3", desc:"Lie prone, arms at sides. Inhale, lift chest, arms and legs simultaneously. Entire back body strengthens. Essential preparation for deeper backbends.", demo:"https://www.youtube.com/results?search_query=locust+pose+yoga" },
          { name:"Camel Pose (Ustrasana)", hold:"30 sec × 2", desc:"Kneel, hands on lower back. Lift chest to ceiling. Option to reach for heels. Intense chest and throat opener. Come out slowly and sit back in child's pose immediately after.", demo:"https://www.youtube.com/results?search_query=camel+pose+yoga+beginner" },
          { name:"Child's Pose — Extended hold", hold:"3 min", desc:"ESSENTIAL after backbends. Never skip the counter pose. Spine decompresses and recovers.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"5 min", desc:"Backbends are energising — you may feel a rush. Let it settle in savasana.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 10": { focus: "Sun Salutation Flow + Triangle", poses: [
          { name:"Sun Salutation A × 4", hold:"4 rounds", desc:"Now you know it well. Build heat. Find your rhythm. Each round smoother than the last.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+flow" },
          { name:"Triangle Pose (Trikonasana)", hold:"60 sec each side", desc:"Feet 4 feet apart, front foot forward. Reach front arm to shin/block/floor, back arm to ceiling. Both legs straight. Full lateral body stretch. Look up at top hand.", demo:"https://www.youtube.com/results?search_query=triangle+pose+yoga" },
          { name:"Extended Side Angle (Utthita Parsvakonasana)", hold:"45 sec each side", desc:"Warrior II shape. Lower forearm to front thigh or hand to floor. Top arm reaches overhead beside ear. Full lateral stretch from foot to fingertips.", demo:"https://www.youtube.com/results?search_query=extended+side+angle+pose+yoga" },
          { name:"Wide-Leg Forward Fold (Prasarita Padottanasana)", hold:"90 sec", desc:"Feet wide (4-5 feet). Fold forward, hands to floor. Head may touch floor eventually. Inner leg and hamstring opener.", demo:"https://www.youtube.com/results?search_query=wide+leg+forward+fold+yoga" },
          { name:"Seated Forward Fold", hold:"2 min", desc:"Cool the body after standing work. Go deeper than Day 2.", demo:"https://www.youtube.com/results?search_query=seated+forward+fold+yoga" },
          { name:"Savasana", hold:"5 min", desc:"10 days complete. You have a real yoga practice now.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 11": { focus: "Twists & Detox", poses: [
          { name:"Seated Spinal Twist (Ardha Matsyendrasana)", hold:"90 sec each side", desc:"Sit, bend right knee, place right foot outside left thigh. Right hand on floor behind, left elbow to outside of right knee. Twist. Look over right shoulder. Detoxifying for digestive organs.", demo:"https://www.youtube.com/results?search_query=seated+spinal+twist+yoga" },
          { name:"Revolved Triangle (Parivrtta Trikonasana)", hold:"45 sec each side", desc:"Triangle but twisted — opposite hand to front shin or floor. Back arm to ceiling. Challenging balance. Use a block under bottom hand if needed.", demo:"https://www.youtube.com/results?search_query=revolved+triangle+pose+yoga" },
          { name:"Revolved Chair Pose", hold:"30 sec each side", desc:"Chair pose, bring hands to heart in prayer, twist right elbow to left knee. Hold. Switch. Challenges balance while deepening the twist.", demo:"https://www.youtube.com/results?search_query=revolved+chair+pose+yoga" },
          { name:"Thread the Needle", hold:"90 sec each side", desc:"On all fours, slide right arm under body along floor. Right shoulder and cheek rest on mat. Passive shoulder and thoracic spine twist. Deep upper back release.", demo:"https://www.youtube.com/results?search_query=thread+the+needle+yoga" },
          { name:"Supine Twist — Deep", hold:"90 sec each side", desc:"Both knees stacked to one side for deeper twist. Let gravity do the work. Breathe into the lower back.", demo:"https://www.youtube.com/results?search_query=supine+spinal+twist+yoga+deep" },
          { name:"Savasana", hold:"5 min", desc:"Twisting is deeply detoxifying. Rest fully after this practice.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 12": { focus: "Phase 1 Complete — Full Foundation Practice", poses: [
          { name:"Sun Salutation A × 5", hold:"5 rounds", desc:"All 5 rounds. Building, flowing, breathing. You know this sequence now.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+flow" },
          { name:"Warrior I + II + Reverse Warrior", hold:"45 sec each side", desc:"Flow through the warrior sequence both sides. Find the strength in these poses.", demo:"https://www.youtube.com/results?search_query=warrior+1+2+reverse+warrior+yoga+flow" },
          { name:"Triangle + Extended Side Angle", hold:"45 sec each side", desc:"Standing lateral sequence. Both sides. Feel the openness in the side body.", demo:"https://www.youtube.com/results?search_query=triangle+extended+side+angle+yoga" },
          { name:"Pigeon Pose", hold:"2 min each side", desc:"Deep hip opener. Your hips have improved since Day 4. Notice the difference.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga" },
          { name:"Bridge Pose × 3", hold:"60 sec each", desc:"Strong and stable. Your back is stronger than Day 8.", demo:"https://www.youtube.com/results?search_query=bridge+pose+yoga" },
          { name:"Savasana", hold:"8 min", desc:"Phase 1 complete. 12 days. You have the complete foundation of yoga. You are no longer a beginner. Rest deeply and celebrate.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        // ══════════════════════════════════════════════════════════════════
        // PHASE 2 — BUILDING STRENGTH (Days 13–24) — Intermediate Beginner
        // Sun Salutation B, deeper poses, Pranayama, Crow prep
        // ══════════════════════════════════════════════════════════════════

        "Day 13": { focus: "Sun Salutation B + Pranayama", poses: [
          { name:"Ujjayi Breath (Ocean Breath)", hold:"5 min practice", desc:"Constrict the back of the throat slightly to create an audible ocean sound with each breath. Breathe only through nose. This breath is used throughout Ashtanga and Vinyasa yoga. Master this — it transforms practice.", demo:"https://www.youtube.com/results?search_query=ujjayi+breath+yoga" },
          { name:"Sun Salutation B — Learn sequence", hold:"2 slow rounds", desc:"Adds Chair Pose and Warrior I to Sun Sal A. Mountain → Chair → Forward Fold → Halfway Lift → Plank → Lower → Cobra → Downward Dog → Warrior I right → Plank → Lower → Updog → Downdog → Warrior I left → Plank → Lower → Updog → Downdog → Forward fold → Chair → Mountain.", demo:"https://www.youtube.com/results?search_query=sun+salutation+B+beginner+yoga" },
          { name:"Chair Pose (Utkatasana)", hold:"60 sec × 3", desc:"Feet together or hip-width. Sit back deeply as if into an invisible chair. Arms overhead. Quads burning is normal. Hold and breathe. Builds leg strength crucial for advanced poses.", demo:"https://www.youtube.com/results?search_query=chair+pose+yoga" },
          { name:"Sun Salutation A × 3", hold:"3 rounds", desc:"Return to A and flow. Feel how much smoother it is than Week 1.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+flow" },
          { name:"Standing Forward Fold — Extended hold", hold:"2 min", desc:"Longer hold today. Legs may be straighter now than Day 3. Notice the improvement.", demo:"https://www.youtube.com/results?search_query=standing+forward+fold+yoga" },
          { name:"Savasana", hold:"5 min", desc:"Pranayama and Sun Salutation B — two major additions to your practice today.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 14": { focus: "Shoulder & Chest Opening", poses: [
          { name:"Puppy Pose (Uttana Shishosana)", hold:"2 min", desc:"On all fours, walk hands forward while hips stay above knees. Chest melts toward floor. Powerful shoulder and thoracic spine opener. Hold still and breathe into the chest.", demo:"https://www.youtube.com/results?search_query=puppy+pose+yoga" },
          { name:"Cow Face Arms (Gomukhasana arms)", hold:"90 sec each side", desc:"Reach right arm up, bend elbow behind head. Left arm behind back from below. Try to clasp fingers or hold a strap. Most intense shoulder stretch in yoga. Don't force.", demo:"https://www.youtube.com/results?search_query=cow+face+arms+yoga" },
          { name:"Thread the Needle — Both sides", hold:"2 min each side", desc:"Deep shoulder and upper back release. Today go deeper and stay longer.", demo:"https://www.youtube.com/results?search_query=thread+the+needle+yoga" },
          { name:"Camel Pose × 3", hold:"30 sec each", desc:"Going deeper than Day 9. Both hands reaching for heels if accessible. Maximum chest expansion.", demo:"https://www.youtube.com/results?search_query=camel+pose+yoga" },
          { name:"Fish Pose (Matsyasana)", hold:"60 sec × 2", desc:"On back, hands under hips. Arch thoracic spine, crown of head on mat. Chest lifts high. Counter pose for forward folds and excellent chest opener.", demo:"https://www.youtube.com/results?search_query=fish+pose+yoga" },
          { name:"Savasana", hold:"5 min", desc:"Shoulder and chest opening is deep work. Let the body integrate.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 15": { focus: "Hip Flexors & Deep Lunges", poses: [
          { name:"Crescent Lunge (High Lunge)", hold:"60 sec each side", desc:"Back knee lifted. Arms overhead. Sink hips forward and down. Much more intense than low lunge. Feel the deep hip flexor stretch.", demo:"https://www.youtube.com/results?search_query=crescent+lunge+yoga" },
          { name:"Lizard Pose (Utthan Pristhasana)", hold:"90 sec each side", desc:"Low lunge with front foot outside hand. Option to lower forearms for deeper opening. One of the most effective hip flexor and groin stretches available.", demo:"https://www.youtube.com/results?search_query=lizard+pose+yoga" },
          { name:"Half Splits (Ardha Hanumanasana)", hold:"90 sec each side", desc:"From low lunge, straighten front leg, hinge forward. Foot flexed. Intense hamstring stretch — preparation for full splits.", demo:"https://www.youtube.com/results?search_query=half+splits+yoga" },
          { name:"Pigeon Pose — Deeper hold", hold:"2.5 min each side", desc:"Stay longer than before. Sink deeper with each exhale. Your hips are opening. This pose is transformational if practiced consistently.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga+deeper" },
          { name:"Reclined Hero (Supta Virasana)", hold:"60 sec", desc:"Sit between heels, lean back on hands or elbows. Intense quad and hip flexor stretch. Use a blanket under hips if needed.", demo:"https://www.youtube.com/results?search_query=reclined+hero+pose+yoga" },
          { name:"Savasana", hold:"5 min", desc:"Hip flexor work is among the most important in yoga. Rest well.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 16": { focus: "Intermediate Balance Poses", poses: [
          { name:"Warrior III (Virabhadrasana III)", hold:"30 sec each side", desc:"From Warrior I, hinge forward, lift back leg parallel to floor. Arms forward or at sides. Single-leg balance with full body parallel to ground. Requires strength AND focus.", demo:"https://www.youtube.com/results?search_query=warrior+3+yoga" },
          { name:"Half Moon Pose (Ardha Chandrasana)", hold:"30 sec each side", desc:"From Triangle, shift weight to front foot and bottom hand (or block). Lift back leg parallel to floor. Top arm reaches to ceiling. Challenging balance requiring open hips and strength.", demo:"https://www.youtube.com/results?search_query=half+moon+pose+yoga" },
          { name:"Eagle Pose (Garudasana)", hold:"45 sec each side", desc:"Cross right leg over left, hook foot if possible. Cross right arm under left, bind or touch palms. Hips sink. Balance and concentration combined. Compresses then releases hip and shoulder joints.", demo:"https://www.youtube.com/results?search_query=eagle+pose+yoga" },
          { name:"Standing Split (Urdhva Prasarita Eka Padasana)", hold:"45 sec each side", desc:"Forward fold on one leg, lift other leg as high as possible. Hands to floor or blocks. Combines hamstring and hip flexor stretch with balance.", demo:"https://www.youtube.com/results?search_query=standing+split+yoga" },
          { name:"Downward Dog", hold:"90 sec", desc:"Reset and decompress after balance work.", demo:"https://www.youtube.com/results?search_query=downward+dog+yoga" },
          { name:"Savasana", hold:"5 min", desc:"Balance poses demand full mental focus. Rest the mind completely.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 17": { focus: "Vinyasa Flow — Building Heat", poses: [
          { name:"Sun Salutation A × 3 + B × 3", hold:"6 rounds total", desc:"Build heat with both sequences back to back. Use Ujjayi breath throughout. This is now your warm-up for stronger practices.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+B+yoga+flow" },
          { name:"Warrior I → II → Triangle → Half Moon", hold:"45 sec each side", desc:"Flow through the standing sequence both sides. This is vinyasa — movement linked to breath.", demo:"https://www.youtube.com/results?search_query=standing+yoga+sequence+vinyasa+flow" },
          { name:"Crow Pose Preparation (wrist + core warm-up)", hold:"5 min practice", desc:"Wrist circles, extensions, flexions (critical before arm balances). Then: squat deep, place hands on floor, practice leaning weight into hands. Feel what it's like to shift forward.", demo:"https://www.youtube.com/results?search_query=crow+pose+preparation+yoga" },
          { name:"Chaturanga Push-Ups", hold:"10 reps × 3", desc:"High plank → lower to low plank with elbows hugging ribs. Builds tricep and core strength for all arm balances. This is the most important strength exercise in yoga.", demo:"https://www.youtube.com/results?search_query=chaturanga+yoga+tutorial" },
          { name:"Child's Pose", hold:"2 min", desc:"Recover wrists and reset.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"5 min", desc:"Strong practice today. Let the body absorb the heat.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 18": { focus: "Shoulder Stands & Inversions Intro", poses: [
          { name:"Plow Pose (Halasana)", hold:"60 sec × 2", desc:"From lying, lift hips and swing legs overhead, toes toward floor. Hands support lower back. Intense neck and upper back stretch. Do NOT turn head while in this pose.", demo:"https://www.youtube.com/results?search_query=plow+pose+yoga" },
          { name:"Supported Shoulder Stand (Sarvangasana)", hold:"2 min × 2", desc:"From plow, lift legs to ceiling. Hands on lower back for support, elbows on mat. Queen of all poses — builds strength, reverses fatigue, improves circulation. Requires preparation — don't skip plow first.", demo:"https://www.youtube.com/results?search_query=shoulder+stand+yoga+beginners" },
          { name:"Fish Pose — Counter pose", hold:"90 sec", desc:"MANDATORY after shoulder stand. Arch thoracic spine in opposite direction. Never skip this counter pose.", demo:"https://www.youtube.com/results?search_query=fish+pose+yoga" },
          { name:"Dolphin Pose", hold:"60 sec × 3", desc:"Forearms on mat, hips lifted like downward dog on forearms. Builds shoulder stability for headstand. Most important preparatory pose for inversions.", demo:"https://www.youtube.com/results?search_query=dolphin+pose+yoga" },
          { name:"Supine Twist", hold:"90 sec each side", desc:"Release the neck and spine after inversion work.", demo:"https://www.youtube.com/results?search_query=supine+twist+yoga" },
          { name:"Savasana", hold:"6 min", desc:"Inversions are intense for the nervous system. Rest completely and longer today.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 19": { focus: "Wheel Pose Preparation", poses: [
          { name:"Bridge Pose × 5 — Progressive", hold:"60 sec each", desc:"5 rounds building intensity. Press actively through feet and hands. Build the back strength and chest opening required for wheel pose.", demo:"https://www.youtube.com/results?search_query=bridge+pose+yoga" },
          { name:"Wheel Pose Attempt (Urdhva Dhanurasana)", hold:"3 attempts", desc:"Lie on back, hands by ears fingers pointing toward shoulders, feet flat. Press up to crown of head first. Pause. Then straighten arms fully. This is the biggest backbend in beginner yoga. Don't force — it will come.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga+beginner" },
          { name:"Wild Thing (Camatkarasana)", hold:"30 sec each side", desc:"From downward dog, flip to side and let back leg sweep open. Arch back, reach free arm. A joyful heart opener that prepares the body for wheel.", demo:"https://www.youtube.com/results?search_query=wild+thing+pose+yoga" },
          { name:"Supported Fish with Block", hold:"3 min", desc:"Block under thoracic spine. Chest opens passively. Full surrender. Excellent wheel preparation.", demo:"https://www.youtube.com/results?search_query=supported+fish+pose+yoga" },
          { name:"Child's Pose — Extended", hold:"3 min", desc:"Essential counter pose after intensive backbend work.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"6 min", desc:"Backbend day — the nervous system needs extra recovery time.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 20": { focus: "Yin Deep Release — Week 3", poses: [
          { name:"Sleeping Swan (Yin Pigeon)", hold:"4 min each side", desc:"Deepest hip release in yoga. Hold longer than any previous yin session. Don't adjust — stay and breathe through sensation.", demo:"https://www.youtube.com/results?search_query=sleeping+swan+yin+yoga" },
          { name:"Shoelace Pose (Yin)", hold:"3 min each side", desc:"Stack knees on top of each other, fold forward. Deep outer hip and IT band release. Sensation will be strong — breathe.", demo:"https://www.youtube.com/results?search_query=shoelace+pose+yin+yoga" },
          { name:"Dragon Pose — Both sides", hold:"3 min each side", desc:"Low lunge completely still. Deepest hip flexor yin pose. Feel the connective tissue opening.", demo:"https://www.youtube.com/results?search_query=dragon+pose+yin+yoga" },
          { name:"Yin Seated Spinal Twist", hold:"2 min each side", desc:"Seated twist, held passively. Let the spine rotate without effort.", demo:"https://www.youtube.com/results?search_query=yin+yoga+spinal+twist" },
          { name:"Legs Up Wall", hold:"5 min", desc:"Complete recovery. Nervous system reset.", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
          { name:"Savasana", hold:"8 min", desc:"Yin sessions need the longest savasana. Allow full integration.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 21": { focus: "Crow Pose — First Arm Balance", poses: [
          { name:"Wrist Warm-Up — Complete", hold:"5 min", desc:"Circles, extensions, flexions, prayer position, reverse prayer. Never skip before arm balances. Wrist injuries from skipping warm-up are the most common yoga injury.", demo:"https://www.youtube.com/results?search_query=wrist+warm+up+yoga+arm+balance" },
          { name:"Crow Pose (Bakasana)", hold:"10 attempts", desc:"Squat deep, hands shoulder-width on floor. Place knees on backs of upper arms (not inside elbows). Lean forward until feet lift. This is the gateway arm balance — everything else builds from here. It may take weeks. That is normal.", demo:"https://www.youtube.com/results?search_query=crow+pose+yoga+step+by+step" },
          { name:"Chaturanga × 15", hold:"15 reps", desc:"Core and tricep strength for arm balances. Focus on keeping elbows hugging ribs.", demo:"https://www.youtube.com/results?search_query=chaturanga+yoga" },
          { name:"Tripod Headstand Prep", hold:"5 attempts", desc:"Hands in triangle position with crown of head on floor. Practice lifting one leg at a time. This is your first headstand preparation.", demo:"https://www.youtube.com/results?search_query=tripod+headstand+preparation+yoga" },
          { name:"Child's Pose", hold:"3 min", desc:"Wrist and shoulder recovery. Critical after arm balance practice.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"5 min", desc:"Arm balances require full concentration. Let the mind rest.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 22": { focus: "Full Wheel & Splits Preparation", poses: [
          { name:"Sun Salutation A × 4 + B × 2", hold:"6 rounds", desc:"Full warm-up for today's deep backbend and flexibility work.", demo:"https://www.youtube.com/results?search_query=sun+salutation+yoga+flow" },
          { name:"Wheel Pose (Urdhva Dhanurasana) × 5", hold:"30 sec each", desc:"Full wheel five times. Each attempt, try to walk hands closer to feet. This pose energises the entire nervous system.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga+full" },
          { name:"Splits Preparation (Hanumanasana prep)", hold:"2 min each side", desc:"From low lunge, slide front foot forward and back foot back as far as possible. Use blocks under hands. This begins the long journey to full splits.", demo:"https://www.youtube.com/results?search_query=splits+preparation+yoga" },
          { name:"Half Splits — Extended", hold:"2 min each side", desc:"Front leg straight, hinge forward. Hamstrings are stretching toward splits range.", demo:"https://www.youtube.com/results?search_query=half+splits+yoga" },
          { name:"Child's Pose", hold:"3 min", desc:"Counter pose after deep backbend and split work.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"6 min", desc:"Intense flexibility and strength session today. Full rest.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 23": { focus: "Nadi Shodhana + Ashtanga Seated Intro", poses: [
          { name:"Nadi Shodhana (Alternate Nostril Breathing)", hold:"10 min", desc:"Close right nostril, inhale left 4 counts. Close left, exhale right 4 counts. Inhale right. Close right, exhale left. One round. This balances the nervous system, reduces anxiety, and prepares for deeper practice. A daily pranayama practice.", demo:"https://www.youtube.com/results?search_query=alternate+nostril+breathing+yoga" },
          { name:"Dandasana (Staff Pose)", hold:"2 min", desc:"Sit with legs extended, back straight. Flex feet. Press hands into floor. Looks simple — feels intense. Foundation of all seated poses.", demo:"https://www.youtube.com/results?search_query=dandasana+staff+pose+yoga" },
          { name:"Seated Forward Fold (Paschimottanasana) — Deep", hold:"3 min", desc:"Full forward fold from dandasana. Hold much longer today. Let the hamstrings slowly release. The connective tissue needs time.", demo:"https://www.youtube.com/results?search_query=paschimottanasana+yoga" },
          { name:"Purvottanasana (Upward Plank)", hold:"30 sec × 3", desc:"From dandasana, place hands behind hips, lift entire body into reverse plank. Toes toward floor. Opens chest and strengthens back of body.", demo:"https://www.youtube.com/results?search_query=upward+plank+pose+yoga" },
          { name:"Janu Sirsasana (Head-to-Knee Pose)", hold:"90 sec each side", desc:"One leg extended, other bent with foot to inner thigh. Fold over extended leg. Classic seated forward fold — opens hamstrings unilaterally.", demo:"https://www.youtube.com/results?search_query=janu+sirsasana+yoga" },
          { name:"Savasana", hold:"6 min", desc:"Pranayama + seated sequence — complete integration needed.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 24": { focus: "Phase 2 Complete — Strong Full Practice", poses: [
          { name:"Sun Salutation A × 5 + B × 3", hold:"8 rounds total", desc:"Full Surya Namaskar practice. You are now comfortable with both sequences. Build heat.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+B+yoga" },
          { name:"Standing Sequence — All poses", hold:"45 sec each", desc:"Warrior I → II → Reverse Warrior → Triangle → Extended Side Angle → Half Moon. Both sides. This is now your standard standing sequence.", demo:"https://www.youtube.com/results?search_query=standing+yoga+sequence+vinyasa" },
          { name:"Crow Pose Practice", hold:"10 attempts", desc:"Keep working at Bakasana. Each practice session it gets more familiar.", demo:"https://www.youtube.com/results?search_query=crow+pose+yoga" },
          { name:"Wheel Pose × 3", hold:"30 sec each", desc:"Use the strength you've built. Push harder.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga" },
          { name:"Pigeon Pose", hold:"2 min each side", desc:"Hips significantly more open than Day 4. Notice.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+yoga" },
          { name:"Savasana", hold:"8 min", desc:"Phase 2 complete. You are an intermediate practitioner. Rest and celebrate your progress.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        // ══════════════════════════════════════════════════════════════════
        // PHASE 3 — DEEPENING PRACTICE (Days 25–36) — Intermediate
        // Headstand, splits, full primary seated, advanced backbends
        // ══════════════════════════════════════════════════════════════════

        "Day 25": { focus: "Headstand Preparation — Serious Training", poses: [
          { name:"Dolphin Pose — Extended holds", hold:"60 sec × 5", desc:"5 full rounds of dolphin. Build the shoulder and upper back endurance for headstand. This is the most critical preparation.", demo:"https://www.youtube.com/results?search_query=dolphin+pose+yoga" },
          { name:"Dolphin Push-Ups", hold:"15 reps × 3", desc:"Lower forehead toward floor and lift back up. Direct headstand strength builder.", demo:"https://www.youtube.com/results?search_query=dolphin+push+ups+yoga" },
          { name:"Headstand (Sirsasana) Wall Practice", hold:"5 attempts", desc:"Forearms in triangle, crown lightly on mat. Walk feet toward face. Kick up to wall. Hold 30 seconds if possible. Use wall for confidence. King of all poses.", demo:"https://www.youtube.com/results?search_query=headstand+yoga+wall+preparation" },
          { name:"Crow Pose — Hold longer", hold:"5 holds of 10+ seconds", desc:"If you haven't got crow yet, keep working. If you have it, hold longer each time.", demo:"https://www.youtube.com/results?search_query=crow+pose+yoga" },
          { name:"Child's Pose", hold:"3 min", desc:"Wrists and shoulders need recovery after inversion prep.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"7 min", desc:"Headstand preparation is the most demanding practice in Phase 3. Rest completely.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 26": { focus: "Full Splits Journey", poses: [
          { name:"Hip Flexor Sequence", hold:"90 sec each", desc:"Low lunge → Lizard → Half splits → all done on each side before switching. The full hip flexor and hamstring preparation sequence for splits.", demo:"https://www.youtube.com/results?search_query=hip+flexor+sequence+yoga" },
          { name:"Hanumanasana (Splits) — Wall supported", hold:"3 min each side", desc:"Front foot to wall, slide as close to splits as possible. Blocks under hands. This is the full splits journey. Your range improves measurably each session.", demo:"https://www.youtube.com/results?search_query=hanumanasana+splits+yoga+wall" },
          { name:"Side Splits Prep (Samakonasana)", hold:"2 min", desc:"Feet wide, fold forward. Working toward side splits over time. Different muscle groups from front splits.", demo:"https://www.youtube.com/results?search_query=side+splits+yoga+preparation" },
          { name:"Pigeon Pose — Forward fold", hold:"3 min each side", desc:"Fold completely forward in pigeon. Forehead to mat. Deepest hip opening session yet.", demo:"https://www.youtube.com/results?search_query=pigeon+pose+forward+fold+yoga" },
          { name:"Reclined Hamstring Stretch", hold:"2 min each side", desc:"On back, strap or towel around foot, leg to ceiling. Gentle hamstring lengthening after splits work.", demo:"https://www.youtube.com/results?search_query=reclined+hamstring+stretch+yoga" },
          { name:"Savasana", hold:"7 min", desc:"Splits training requires significant recovery. Take the full 7 minutes.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 27": { focus: "Ashtanga Primary Series — Seated Sequence", poses: [
          { name:"Sun Salutation A × 5 + B × 3", hold:"8 rounds", desc:"Primary series always begins with Surya Namaskar. Full warm-up.", demo:"https://www.youtube.com/results?search_query=sun+salutation+ashtanga" },
          { name:"Primary Series Seated — Poses 1-4", hold:"90 sec each", desc:"Paschimottanasana (seated forward fold) → Purvottanasana (upward plank) → Ardha Baddha Padma Paschimottanasana (half bound lotus forward fold) → Triang Mukhaikapada Paschimottanasana (three-limbed forward fold). Learn each one.", demo:"https://www.youtube.com/results?search_query=ashtanga+primary+series+seated+poses" },
          { name:"Marichyasana A & B", hold:"90 sec each side", desc:"Marichi's pose — deep forward fold with one knee bent. Multiple variations. Foundational seated twist-and-fold of primary series.", demo:"https://www.youtube.com/results?search_query=marichyasana+yoga+A+B" },
          { name:"Navasana (Boat Pose) × 5", hold:"30 sec each", desc:"Five rounds of boat pose. Primary series staple. Core strength milestone.", demo:"https://www.youtube.com/results?search_query=navasana+boat+pose+ashtanga" },
          { name:"Bhujapidasana Prep (Shoulder Pressing Pose)", hold:"5 attempts", desc:"Squat, hook arms under knees, lean forward. Preparation for this arm balance in primary series.", demo:"https://www.youtube.com/results?search_query=bhujapidasana+yoga+preparation" },
          { name:"Savasana", hold:"8 min", desc:"Ashtanga primary series is demanding. Primary series savasana should always be at least 8 minutes.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 28": { focus: "Forearm Stand Preparation", poses: [
          { name:"Dolphin Pose — Max holds", hold:"90 sec × 5", desc:"Build toward Pincha Mayurasana. Maximum shoulder endurance training.", demo:"https://www.youtube.com/results?search_query=dolphin+pose+yoga" },
          { name:"Forearm Stand (Pincha Mayurasana) Prep", hold:"10 attempts", desc:"Forearms parallel on mat (unlike headstand triangle). Kick one leg then other toward wall. This inversion requires more shoulder flexibility than headstand. Use wall completely at first.", demo:"https://www.youtube.com/results?search_query=forearm+stand+yoga+preparation" },
          { name:"Wheel Pose × 5", hold:"45 sec each", desc:"Building backbend for scorpion pose eventually.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga" },
          { name:"Headstand — Extended hold", hold:"3 min total", desc:"If you have headstand, build duration. If not, continue wall kicks.", demo:"https://www.youtube.com/results?search_query=headstand+yoga" },
          { name:"Supported Fish", hold:"3 min", desc:"Recover the neck and spine after inversions.", demo:"https://www.youtube.com/results?search_query=supported+fish+pose+yoga" },
          { name:"Savasana", hold:"8 min", desc:"Two inversions in one session. Nervous system needs extended rest.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 29": { focus: "Advanced Twists & Binds", poses: [
          { name:"Marichyasana C & D", hold:"90 sec each side", desc:"Deep twisting bind. C is a seated twist with bind. D adds half lotus. These are advanced poses that may take months — attempt what you can.", demo:"https://www.youtube.com/results?search_query=marichyasana+C+D+yoga" },
          { name:"Revolved Side Angle (Parivrtta Parsvakonasana)", hold:"45 sec each side", desc:"Warrior I with opposite elbow to knee. Prayer or bind with arms. Challenging balance + twist combined.", demo:"https://www.youtube.com/results?search_query=revolved+side+angle+pose+yoga" },
          { name:"Pasasana (Noose Pose) Prep", hold:"60 sec each side", desc:"Squat, heels on floor (or on a rolled mat), deep twist with bind. One of the most advanced twists. Work toward it.", demo:"https://www.youtube.com/results?search_query=pasasana+yoga+preparation" },
          { name:"Supine Twist — Deepest version", hold:"3 min each side", desc:"Both knees to one side, maximum rotation. Long hold.", demo:"https://www.youtube.com/results?search_query=supine+twist+yoga+deep" },
          { name:"Legs Up Wall", hold:"4 min", desc:"Neutralise the spine after intensive twist work.", demo:"https://www.youtube.com/results?search_query=legs+up+wall+yoga" },
          { name:"Savasana", hold:"7 min", desc:"Twists are deeply detoxifying. Rest and let the body process.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 30": { focus: "Yin Deep Tissue — Complete Body", poses: [
          { name:"Yin Shoelace — Extended", hold:"5 min each side", desc:"Longest yin hold so far. Deep hip outer rotator and IT band work.", demo:"https://www.youtube.com/results?search_query=shoelace+yin+yoga" },
          { name:"Yin Sleeping Swan", hold:"5 min each side", desc:"Deepest hip flexor yin. Stay absolutely still. Breathe.", demo:"https://www.youtube.com/results?search_query=sleeping+swan+yin+yoga" },
          { name:"Yin Sphinx/Seal", hold:"4 min", desc:"Backbend yin — stay passive in sphinx or progress to seal (straight arms). Targets lumbar spine.", demo:"https://www.youtube.com/results?search_query=yin+yoga+sphinx+seal" },
          { name:"Yin Butterfly — Forward fold", hold:"4 min", desc:"Complete hip and inner thigh release.", demo:"https://www.youtube.com/results?search_query=yin+yoga+butterfly" },
          { name:"Yin Twisted Dragon", hold:"2 min each side", desc:"Dragon lunge with spinal twist added. Deepest combined yin pose.", demo:"https://www.youtube.com/results?search_query=twisted+dragon+yin+yoga" },
          { name:"Savasana", hold:"10 min", desc:"Full yin session requires the longest integration. 10 full minutes.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 31": { focus: "Side Crow & Advanced Arm Balances", poses: [
          { name:"Crow Pose — Warm-up", hold:"5 holds", desc:"Your crow should be solid now. Use it as warm-up for side crow.", demo:"https://www.youtube.com/results?search_query=crow+pose+yoga" },
          { name:"Side Crow (Parsva Bakasana)", hold:"5 attempts each side", desc:"From squat, twist, stack knees on one upper arm. Lean forward to take flight. Requires rotation strength and concentration.", demo:"https://www.youtube.com/results?search_query=side+crow+pose+yoga" },
          { name:"Eight-Angle Pose (Astavakrasana) Prep", hold:"5 attempts each side", desc:"Thread right leg over right arm, hook left ankle. Extend legs to the side. Advanced arm balance in primary series.", demo:"https://www.youtube.com/results?search_query=eight+angle+pose+yoga" },
          { name:"Crow → Chaturanga Jump-Back", hold:"10 reps", desc:"From crow, extend into chaturanga — jump back to plank. This linking transition is essential in advanced vinyasa.", demo:"https://www.youtube.com/results?search_query=crow+to+chaturanga+yoga" },
          { name:"Child's Pose", hold:"3 min", desc:"Wrist recovery after intensive arm balance session.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"7 min", desc:"Arm balances tax the entire neuromuscular system. Full rest.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 32": { focus: "Headstand — Full Practice", poses: [
          { name:"Dolphin + Dolphin Push-Ups", hold:"60 sec × 3 + 15 reps × 3", desc:"Complete headstand prep. Maximum shoulder build.", demo:"https://www.youtube.com/results?search_query=dolphin+pose+push+ups+yoga" },
          { name:"Headstand (Sirsasana) — Full", hold:"3-5 min total practice", desc:"King of all poses. Forearms on mat, head lightly placed. Walk feet in, lift both legs. Use wall as needed. Hold for as long as comfortable. Build duration each session.", demo:"https://www.youtube.com/results?search_query=headstand+yoga+full+tutorial" },
          { name:"Shoulder Stand Sequence", hold:"3 min full sequence", desc:"Shoulder stand → Plow → Ear Pressure Pose. Classic finishing sequence.", demo:"https://www.youtube.com/results?search_query=shoulder+stand+plow+pose+yoga" },
          { name:"Fish Pose", hold:"2 min", desc:"Mandatory counter pose.", demo:"https://www.youtube.com/results?search_query=fish+pose+yoga" },
          { name:"Seated Forward Fold — Extended", hold:"3 min", desc:"Decompress spine after inversion sequence.", demo:"https://www.youtube.com/results?search_query=seated+forward+fold+yoga" },
          { name:"Savasana", hold:"10 min", desc:"Headstand is the most powerful pose in yoga. It deserves the longest savasana.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 33": { focus: "Kapotasana — King Pigeon", poses: [
          { name:"Full Warm-Up — Sun Salutations", hold:"5 rounds A + 3 rounds B", desc:"Full warm-up before deep backbend work.", demo:"https://www.youtube.com/results?search_query=sun+salutation+yoga" },
          { name:"Wheel Pose × 5 — Deep holds", hold:"60 sec each", desc:"Maximum backbend warm-up before king pigeon.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga" },
          { name:"Eka Pada Raja Kapotasana", hold:"90 sec each side", desc:"Pigeon with back leg bent — reach back and hold the foot with same-side hand. Combines deep hip opening (front) with intense backbend. One of the most photogenic advanced poses.", demo:"https://www.youtube.com/results?search_query=eka+pada+raja+kapotasana+yoga" },
          { name:"Kapotasana Prep", hold:"3 attempts", desc:"From kneeling, backbend deeply toward the floor. Hands reach for heels. Deepest backbend in primary series. Requires wheel as prerequisite.", demo:"https://www.youtube.com/results?search_query=kapotasana+yoga" },
          { name:"Child's Pose — Extended", hold:"4 min", desc:"Full spine counter pose after intensive backbend.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"8 min", desc:"Deep backbend session complete.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 34": { focus: "Full Lotus & Seated Mastery", poses: [
          { name:"Hip Opening Sequence", hold:"2 min each pose", desc:"Butterfly → Figure 4 → Pigeon both sides. Full hip preparation for lotus.", demo:"https://www.youtube.com/results?search_query=hip+opening+sequence+yoga" },
          { name:"Half Lotus (Ardha Padmasana)", hold:"5 min each side", desc:"One foot on opposite thigh. Sit for 5 full minutes each side. This is prerequisite for full lotus.", demo:"https://www.youtube.com/results?search_query=half+lotus+yoga" },
          { name:"Full Lotus (Padmasana)", hold:"10 min meditation", desc:"Both feet on opposite thighs. The seat of the Buddha. If not accessible use half lotus. Meditate here — this is the highest seated position in yoga.", demo:"https://www.youtube.com/results?search_query=full+lotus+pose+yoga+padmasana" },
          { name:"Tolasana (Scale Pose)", hold:"10 sec × 5", desc:"In lotus or cross-legged, press hands into floor and lift entire body off ground. Extreme core and arm strength.", demo:"https://www.youtube.com/results?search_query=tolasana+scale+pose+yoga" },
          { name:"Baddha Padmasana (Bound Lotus)", hold:"2 min", desc:"In full lotus, reach arms behind back to hold opposite feet. Deep shoulder opening combined with lotus.", demo:"https://www.youtube.com/results?search_query=bound+lotus+yoga" },
          { name:"Savasana", hold:"10 min", desc:"Lotus is meditative. Savasana is also meditative. Observe the stillness.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 35": { focus: "Kapalabhati + Advanced Pranayama", poses: [
          { name:"Kapalabhati (Skull Shining Breath)", hold:"10 min", desc:"Short sharp exhales through nose, passive inhale. Start 60/min, build to 120/min. Clears sinuses, energises mind, heats the core. Advanced pranayama. Do not practice if pregnant or with high blood pressure.", demo:"https://www.youtube.com/results?search_query=kapalabhati+pranayama+yoga" },
          { name:"Nadi Shodhana — Extended", hold:"10 min", desc:"Alternate nostril breathing with extended ratios: inhale 4, hold 16, exhale 8. Advanced version.", demo:"https://www.youtube.com/results?search_query=nadi+shodhana+pranayama+advanced" },
          { name:"Bhramari (Humming Bee Breath)", hold:"10 min", desc:"Inhale deeply, exhale with long humming sound. Index fingers close ear flaps. Profoundly calming. Used before meditation.", demo:"https://www.youtube.com/results?search_query=bhramari+pranayama+yoga" },
          { name:"Silent Meditation in Lotus", hold:"20 min", desc:"No guidance. Sit in full or half lotus. Eyes closed. Breathe naturally. Observe thoughts without following them. This is the ultimate purpose of all yoga practice.", demo:"https://www.youtube.com/results?search_query=silent+meditation+yoga" },
          { name:"Yoga Nidra (Yogic Sleep)", hold:"10 min", desc:"Lie in savasana and follow the body scan into a state between sleep and wakefulness. The deepest possible rest.", demo:"https://www.youtube.com/results?search_query=yoga+nidra+guided" },
          { name:"Savasana", hold:"10 min", desc:"Pranayama + meditation + yoga nidra — the complete inner practice. Rest in silence.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 36": { focus: "Phase 3 Complete — Advanced Full Practice", poses: [
          { name:"Complete Pranayama", hold:"15 min", desc:"Kapalabhati 5 min → Nadi Shodhana 5 min → Meditation 5 min. Always begin practice this way from now on.", demo:"https://www.youtube.com/results?search_query=pranayama+sequence+yoga" },
          { name:"Sun Salutation A × 5 + B × 5", hold:"10 rounds", desc:"Full energising practice. Ujjayi breath throughout.", demo:"https://www.youtube.com/results?search_query=sun+salutation+A+B+yoga" },
          { name:"Full Standing Sequence", hold:"45 sec each", desc:"All standing poses: Warriors I II III → Reverse Warrior → Triangle → Extended Side Angle → Half Moon → Standing Split. Both sides. This is your standing sequence.", demo:"https://www.youtube.com/results?search_query=full+standing+yoga+sequence" },
          { name:"Arm Balances Sequence", hold:"Practice", desc:"Crow → Side Crow → Eight-Angle. All three arm balances in sequence. You have come far.", demo:"https://www.youtube.com/results?search_query=arm+balances+sequence+yoga" },
          { name:"Inversion Sequence", hold:"Practice", desc:"Headstand 3 min → Shoulder Stand 3 min → Plow 2 min → Fish 2 min. Full inversion sequence.", demo:"https://www.youtube.com/results?search_query=inversion+sequence+yoga" },
          { name:"Savasana", hold:"12 min", desc:"Phase 3 complete. You have achieved an advanced practice level. Only one phase remains. Rest deeply.", demo:"https://www.youtube.com/results?search_query=savasana+yoga+long" },
        ]},

        // ══════════════════════════════════════════════════════════════════
        // PHASE 4 — INVERSIONS & ARM BALANCES (Days 37–48) — Advanced
        // Handstand, forearm stand, scorpion, drop-backs
        // ══════════════════════════════════════════════════════════════════

        "Day 37": { focus: "Handstand — Beginning the Journey", poses: [
          { name:"Wrist + Shoulder Warm-Up", hold:"5 min", desc:"Complete warm-up for handstand practice. Circles, extensions, shoulder rotations.", demo:"https://www.youtube.com/results?search_query=wrist+shoulder+warm+up+handstand" },
          { name:"Handstand at Wall — Kick-ups", hold:"20 attempts", desc:"Hands 6 inches from wall. Kick one leg up then bring the other. Both feet to wall. Hold 30 seconds. The most important skill in advanced yoga. Will take months of practice.", demo:"https://www.youtube.com/results?search_query=handstand+yoga+against+wall" },
          { name:"Hollow Body Hold", hold:"30 sec × 5", desc:"Lying on back, press lower back to floor, lift legs and shoulder blades. Arms overhead. This is the shape of a perfect handstand.", demo:"https://www.youtube.com/results?search_query=hollow+body+hold+yoga+handstand" },
          { name:"Pike Push-Ups", hold:"15 reps × 3", desc:"Downward dog position, bend elbows until head approaches floor, push back up. Direct handstand strength builder.", demo:"https://www.youtube.com/results?search_query=pike+push+ups+handstand+training" },
          { name:"Child's Pose", hold:"3 min", desc:"Wrist recovery is critical after handstand training.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"8 min", desc:"Handstand training is the most physically demanding practice in this program.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 38": { focus: "Forearm Stand (Pincha Mayurasana) — Full", poses: [
          { name:"Dolphin Sequence", hold:"90 sec × 5", desc:"Build maximum shoulder endurance for forearm stand.", demo:"https://www.youtube.com/results?search_query=dolphin+pose+yoga" },
          { name:"Forearm Stand — Wall practice", hold:"10 holds", desc:"Forearms parallel, kick both legs up to wall. Hold 30-60 seconds. More shoulder flexibility required than headstand. Elegant inversion.", demo:"https://www.youtube.com/results?search_query=forearm+stand+yoga+pincha+mayurasana" },
          { name:"Forearm Stand — Free balance attempts", hold:"5 attempts", desc:"Away from wall. Find the balance point. Even 1 second is a win.", demo:"https://www.youtube.com/results?search_query=forearm+stand+free+balance+yoga" },
          { name:"Scorpion Prep (Vrschikasana)", hold:"5 attempts", desc:"From forearm stand, bend knees toward head. Ultimate backbend-inversion combination.", demo:"https://www.youtube.com/results?search_query=scorpion+pose+yoga+preparation" },
          { name:"Supported Fish", hold:"3 min", desc:"Counter pose for backbend inversions.", demo:"https://www.youtube.com/results?search_query=supported+fish+pose+yoga" },
          { name:"Savasana", hold:"10 min", desc:"Two inversions in one session. Maximum rest needed.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 39": { focus: "Drop-Backs & Wheel to Standing", poses: [
          { name:"Full Warm-Up + Wheel × 5", hold:"Wheel 60 sec each", desc:"Maximum backbend warm-up for today's advanced work.", demo:"https://www.youtube.com/results?search_query=wheel+pose+yoga" },
          { name:"Wheel Drop-Back Practice", hold:"10 attempts", desc:"Stand with feet hip-width. Lift arms overhead. Lean back, look for floor. Drop hands to floor into wheel from standing. Requires courage, backbend range, and strength. Start against wall.", demo:"https://www.youtube.com/results?search_query=wheel+pose+drop+back+yoga" },
          { name:"Standing Up from Wheel", hold:"5 attempts", desc:"From wheel, rock forward and stand up. Completes the drop-back cycle. A professional-level skill.", demo:"https://www.youtube.com/results?search_query=standing+up+from+wheel+yoga" },
          { name:"Kapotasana — Full", hold:"60 sec × 3", desc:"Deepest backbend. Full commitment.", demo:"https://www.youtube.com/results?search_query=kapotasana+yoga" },
          { name:"Child's Pose — Extended", hold:"5 min", desc:"Counter pose after extreme backbend work.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"10 min", desc:"Drop-backs are a major milestone. Rest and integrate.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 40": { focus: "Splits — Full Expression", poses: [
          { name:"Full Hip Opening Warm-Up", hold:"90 sec each pose", desc:"Lizard → Half Splits → Pigeon both sides. Complete splits preparation.", demo:"https://www.youtube.com/results?search_query=hip+opening+warm+up+splits" },
          { name:"Front Splits (Hanumanasana)", hold:"3 min each side", desc:"Full splits or maximum range. Blocks under hands. 3 minutes each side — longest hold yet. Breathe deeply.", demo:"https://www.youtube.com/results?search_query=hanumanasana+splits+yoga" },
          { name:"Side Splits (Samakonasana)", hold:"3 min", desc:"Both legs extending sideways. Hands on floor. Side splits work different muscles than front.", demo:"https://www.youtube.com/results?search_query=side+splits+yoga" },
          { name:"Compass Pose (Parivrtta Surya Yantrasana)", hold:"60 sec each side", desc:"Seated, one leg lifted with arm through it, other hand on floor. Combines splits and twist. Advanced pose.", demo:"https://www.youtube.com/results?search_query=compass+pose+yoga" },
          { name:"Supine Hamstring Stretch", hold:"3 min each side", desc:"Recovery stretch after splits training.", demo:"https://www.youtube.com/results?search_query=supine+hamstring+stretch+yoga" },
          { name:"Savasana", hold:"10 min", desc:"Splits training puts maximum demand on connective tissue. Full rest required.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 41": { focus: "Ashtanga Primary Series — Full Standing + Seated", poses: [
          { name:"Full Pranayama", hold:"15 min", desc:"Complete pranayama practice before primary series.", demo:"https://www.youtube.com/results?search_query=pranayama+before+yoga" },
          { name:"Sun Salutation A × 5 + B × 3", hold:"Full warm-up", desc:"Primary series begins with Surya Namaskar.", demo:"https://www.youtube.com/results?search_query=sun+salutation+ashtanga" },
          { name:"Full Standing Sequence", hold:"30 sec each", desc:"All primary series standing poses in order. Both sides.", demo:"https://www.youtube.com/results?search_query=ashtanga+primary+series+standing" },
          { name:"Seated Sequence — Poses 1-8", hold:"90 sec each", desc:"Paschimottanasana → Purvottanasana → Janu Sirsasana A/B/C → Marichyasana A/B/C/D.", demo:"https://www.youtube.com/results?search_query=ashtanga+primary+series+seated" },
          { name:"Navasana × 5", hold:"30 sec each", desc:"Five boats. Core focus of primary series.", demo:"https://www.youtube.com/results?search_query=navasana+ashtanga" },
          { name:"Savasana", hold:"12 min", desc:"Full primary series is 90 minutes at advanced level. This abbreviated version still warrants full rest.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 42": { focus: "Handstand — Freestanding Progress", poses: [
          { name:"Handstand Warm-Up", hold:"5 min complete", desc:"Wrists, shoulders, hollow body practice.", demo:"https://www.youtube.com/results?search_query=handstand+warm+up" },
          { name:"Wall Handstand — Shape work", hold:"10 holds × 30 sec", desc:"Perfect the hollow body shape against wall. Squeeze glutes, press through shoulders.", demo:"https://www.youtube.com/results?search_query=handstand+hollow+body+wall" },
          { name:"Chest-to-Wall Handstand", hold:"10 holds", desc:"Face wall, hands close to wall. Forces hollow body position. Better training shape than back-to-wall.", demo:"https://www.youtube.com/results?search_query=chest+to+wall+handstand+yoga" },
          { name:"Freestanding Attempts", hold:"20 min dedicated", desc:"Away from wall. Kick up, find balance, fall, repeat. One second of balance is real progress. This takes months — be persistent.", demo:"https://www.youtube.com/results?search_query=freestanding+handstand+yoga+tips" },
          { name:"Recovery — Dolphin", hold:"60 sec × 3", desc:"Decompress shoulders after handstand training.", demo:"https://www.youtube.com/results?search_query=dolphin+pose+yoga" },
          { name:"Savasana", hold:"10 min", desc:"Handstand is the peak of Phase 4. Full rest.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 43": { focus: "Yin Full Body — Advanced Holds", poses: [
          { name:"Yin Sleeping Swan", hold:"6 min each side", desc:"Longest yin hold of the program. Full hip surrender.", demo:"https://www.youtube.com/results?search_query=sleeping+swan+yin+yoga" },
          { name:"Yin Shoelace", hold:"5 min each side", desc:"Deep outer hip. Stay completely still.", demo:"https://www.youtube.com/results?search_query=shoelace+yin+yoga" },
          { name:"Yin Seal", hold:"5 min", desc:"Full backbend yin. Completely passive. Let the lumbar curve develop.", demo:"https://www.youtube.com/results?search_query=seal+pose+yin+yoga" },
          { name:"Yin Straddle/Pancake", hold:"5 min", desc:"Legs wide, fold forward completely. Passive inner thigh and hamstring release.", demo:"https://www.youtube.com/results?search_query=yin+yoga+straddle+pancake" },
          { name:"Yin Savasana", hold:"5 min", desc:"Extended lying yin before final savasana.", demo:"https://www.youtube.com/results?search_query=yin+yoga+savasana" },
          { name:"Savasana", hold:"12 min", desc:"Deepest yin session of the program. Longest savasana of the program. Allow complete integration.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 44": { focus: "Complete Advanced Practice", poses: [
          { name:"Pranayama + Meditation", hold:"20 min", desc:"Kapalabhati 5 min → Nadi Shodhana 5 min → Silent meditation 10 min. Professional level beginning.", demo:"https://www.youtube.com/results?search_query=pranayama+meditation+yoga" },
          { name:"Sun Salutations × 10", hold:"10 rounds A+B mixed", desc:"Build maximum heat.", demo:"https://www.youtube.com/results?search_query=sun+salutation+yoga+flow" },
          { name:"Arm Balances — All three", hold:"Practice each", desc:"Crow → Side Crow → Eight-Angle. Flow between them.", demo:"https://www.youtube.com/results?search_query=arm+balances+sequence+yoga" },
          { name:"Inversions — All three", hold:"2 min each", desc:"Headstand → Forearm Stand → Shoulder Stand. The complete inversion sequence.", demo:"https://www.youtube.com/results?search_query=inversion+sequence+yoga" },
          { name:"Splits + Wheel", hold:"3 min each", desc:"Flexibility work.", demo:"https://www.youtube.com/results?search_query=splits+wheel+pose+yoga" },
          { name:"Savasana", hold:"12 min", desc:"Phase 4 near complete. You have achieved an extraordinary level of practice.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 45": { focus: "Handstand + Lotus + Phase 4 Milestone", poses: [
          { name:"Full handstand session", hold:"20 min dedicated", desc:"Maximum handstand practice. Every session builds the skill.", demo:"https://www.youtube.com/results?search_query=handstand+practice+yoga" },
          { name:"Full Lotus Meditation", hold:"15 min", desc:"Sit in padmasana. Complete silence. Observe the mind.", demo:"https://www.youtube.com/results?search_query=full+lotus+meditation" },
          { name:"Primary Series — Highlights", hold:"30 min flow", desc:"Sun Sals → Standing → Seated highlights → Inversions → Savasana. Your practice, your pace.", demo:"https://www.youtube.com/results?search_query=ashtanga+primary+series+short" },
          { name:"Wheel Drop-Backs", hold:"10 attempts", desc:"Keep refining this skill.", demo:"https://www.youtube.com/results?search_query=wheel+drop+back+yoga" },
          { name:"Kapotasana", hold:"60 sec × 3", desc:"Deepest backbend maintained.", demo:"https://www.youtube.com/results?search_query=kapotasana+yoga" },
          { name:"Savasana", hold:"15 min", desc:"Phase 4 complete. You are an advanced yoga practitioner by any standard. Rest deeply. One phase remains.", demo:"https://www.youtube.com/results?search_query=savasana+yoga+long" },
        ]},

        // ══════════════════════════════════════════════════════════════════
        // PHASE 5 — PROFESSIONAL FLOW (Days 46–60) — Professional Level
        // Full Ashtanga, teaching practice, complete mastery
        // ══════════════════════════════════════════════════════════════════

        "Day 46": { focus: "Professional Morning Practice", poses: [
          { name:"Morning Pranayama Ritual", hold:"20 min", desc:"Kapalabhati 5 min → Nadi Shodhana 10 min → Bhramari 5 min. This is how a professional practitioner begins every day.", demo:"https://www.youtube.com/results?search_query=morning+pranayama+yoga+ritual" },
          { name:"Ashtanga Primary — Full Standing", hold:"Full sequence", desc:"All standing poses of primary series with full vinyasa between each side.", demo:"https://www.youtube.com/results?search_query=ashtanga+primary+series+standing+full" },
          { name:"Ashtanga Primary — Full Seated", hold:"Full sequence", desc:"All seated poses through Navasana with jump-throughs and jump-backs.", demo:"https://www.youtube.com/results?search_query=ashtanga+primary+series+seated+full" },
          { name:"Finishing Sequence", hold:"Full sequence", desc:"Shoulderstand → Plow → Fish → Headstand → Lotus → Savasana.", demo:"https://www.youtube.com/results?search_query=ashtanga+finishing+sequence" },
          { name:"Lotus Meditation", hold:"10 min", desc:"Seated silence after practice.", demo:"https://www.youtube.com/results?search_query=lotus+meditation+yoga" },
          { name:"Savasana", hold:"15 min", desc:"Full primary series. Professional level practice. 15 minutes minimum savasana.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 48": { focus: "Teaching-Level Sequencing", poses: [
          { name:"Design Your Own Sequence", hold:"60 min practice", desc:"Using all 60 days of knowledge — design and practice your own 60-minute sequence. Include: pranayama, warm-up, standing, backbends, twists, inversions, savasana. This is what it means to have a yoga practice.", demo:"https://www.youtube.com/results?search_query=yoga+sequence+design+advanced" },
          { name:"Headstand — Extended Hold", hold:"5 min", desc:"Hold headstand for 5 continuous minutes. Mind becomes still in inversions.", demo:"https://www.youtube.com/results?search_query=headstand+yoga+5+minutes" },
          { name:"Handstand Free Practice", hold:"20 min", desc:"Every session adds balance time.", demo:"https://www.youtube.com/results?search_query=handstand+practice+yoga" },
          { name:"Scorpion (Vrschikasana)", hold:"5 attempts", desc:"Forearm stand with feet curling toward head. Ultimate backbend-inversion.", demo:"https://www.youtube.com/results?search_query=scorpion+pose+yoga" },
          { name:"Savasana", hold:"15 min", desc:"Creating your own sequence is the mark of a true practitioner.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
          { name:"Journaling", hold:"5 min", desc:"Write: What poses feel natural? Where do you still struggle? What does your body need? This reflection is part of professional practice.", demo:"" },
        ]},

        "Day 50": { focus: "Complete Ashtanga + Advanced Backbends", poses: [
          { name:"Full Pranayama + Meditation", hold:"20 min", desc:"Complete inner practice to begin.", demo:"https://www.youtube.com/results?search_query=pranayama+meditation+yoga" },
          { name:"Sun Salutation A × 5 + B × 5", hold:"10 rounds", desc:"Full energising sequence.", demo:"https://www.youtube.com/results?search_query=sun+salutation+yoga" },
          { name:"Primary Series Highlights", hold:"45 min flow", desc:"Standing → Key seated poses → Navasana × 5 → Arm balances.", demo:"https://www.youtube.com/results?search_query=ashtanga+yoga+primary+highlights" },
          { name:"Advanced Backbend Sequence", hold:"Practice", desc:"Wheel × 5 → Drop-backs × 5 → Kapotasana × 3 → Eka Pada Raja Kapotasana both sides.", demo:"https://www.youtube.com/results?search_query=advanced+backbend+sequence+yoga" },
          { name:"Full Inversion Sequence", hold:"15 min", desc:"Headstand 5 min → Forearm Stand 3 min → Shoulder Stand 5 min → Fish 2 min.", demo:"https://www.youtube.com/results?search_query=inversion+sequence+yoga" },
          { name:"Savasana", hold:"15 min", desc:"Day 50 of 60. You are a professional yoga practitioner. Rest fully.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 53": { focus: "Splits Mastery + Lotus Advanced", poses: [
          { name:"Complete Split Warm-Up", hold:"Full sequence", desc:"All hip and hamstring preparation before full splits.", demo:"https://www.youtube.com/results?search_query=splits+warm+up+yoga" },
          { name:"Front Splits Both Sides", hold:"5 min each side", desc:"Longest split hold. Notice how far you've come since Day 26.", demo:"https://www.youtube.com/results?search_query=hanumanasana+splits+yoga" },
          { name:"Side Splits", hold:"5 min", desc:"Complete side split practice.", demo:"https://www.youtube.com/results?search_query=side+splits+yoga" },
          { name:"Compass Pose + Visvamitrasana", hold:"60 sec each side", desc:"Advanced poses combining splits and side plank.", demo:"https://www.youtube.com/results?search_query=visvamitrasana+yoga" },
          { name:"Bound Lotus in Savasana", hold:"5 min", desc:"Lie in savasana in bound lotus position. Unique integration pose.", demo:"https://www.youtube.com/results?search_query=lotus+savasana+yoga" },
          { name:"Savasana", hold:"12 min", desc:"Splits training is complete. The flexibility you've built is permanent if maintained.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 56": { focus: "Advanced Arm Balance Mastery", poses: [
          { name:"Complete Arm Balance Warm-Up", hold:"10 min", desc:"Wrists, core, shoulder strength preparation.", demo:"https://www.youtube.com/results?search_query=arm+balance+warm+up+yoga" },
          { name:"Crow → Headstand Transition", hold:"10 attempts", desc:"From crow, extend into tripod headstand. Advanced transition.", demo:"https://www.youtube.com/results?search_query=crow+to+headstand+yoga" },
          { name:"Koundinyasana I & II", hold:"5 attempts each", desc:"Advanced arm balances from primary and second series. Legs extend in different directions.", demo:"https://www.youtube.com/results?search_query=koundinyasana+yoga" },
          { name:"Handstand to Forearm Stand Transition", hold:"5 attempts", desc:"Advanced inversion transition.", demo:"https://www.youtube.com/results?search_query=handstand+forearm+stand+transition+yoga" },
          { name:"Child's Pose — Extended", hold:"5 min", desc:"Full wrist and shoulder recovery.", demo:"https://www.youtube.com/results?search_query=child's+pose+yoga" },
          { name:"Savasana", hold:"12 min", desc:"Advanced arm balance session complete.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 58": { focus: "The Professional Full Practice", poses: [
          { name:"Pranayama Ritual", hold:"20 min", desc:"Complete professional pranayama practice to open.", demo:"https://www.youtube.com/results?search_query=pranayama+morning+ritual" },
          { name:"Full Ashtanga Primary", hold:"75 min", desc:"Complete primary series from first breath to last vinyasa. All standing. All seated. Full finishing sequence. This is the international standard of a professional Ashtanga practice.", demo:"https://www.youtube.com/results?search_query=ashtanga+yoga+primary+series+full+led+class" },
          { name:"Advanced Poses", hold:"15 min", desc:"After primary: Handstand practice + Kapotasana + Splits. Your complete advanced repertoire.", demo:"https://www.youtube.com/results?search_query=advanced+yoga+poses" },
          { name:"Lotus Meditation", hold:"15 min", desc:"Sit in padmasana. Complete silence. Observe the result of 58 days of practice.", demo:"https://www.youtube.com/results?search_query=lotus+meditation" },
          { name:"Yoga Nidra", hold:"20 min", desc:"Deep yogic sleep. Full integration of 58 days.", demo:"https://www.youtube.com/results?search_query=yoga+nidra+guided" },
          { name:"Savasana", hold:"20 min", desc:"Almost there. Two more days. Rest as a professional rests — completely and without thought.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 59": { focus: "Your Practice — Free Form", poses: [
          { name:"Morning Pranayama", hold:"15 min", desc:"Begin as you always will from now on.", demo:"https://www.youtube.com/results?search_query=morning+pranayama+yoga" },
          { name:"Your Yoga — 60 Minutes", hold:"60 min", desc:"No instructions today. You have been given all the tools. Practice what your body calls for. Move through poses that feel right. Hold what needs holding. Rest when needed. This is YOUR practice.", demo:"https://www.youtube.com/results?search_query=advanced+yoga+practice" },
          { name:"Extended Headstand", hold:"5+ min", desc:"The king of poses. Hold as long as your practice allows.", demo:"https://www.youtube.com/results?search_query=headstand+yoga" },
          { name:"Handstand Free Practice", hold:"15 min", desc:"Last dedicated handstand session. Every second of balance is earned.", demo:"https://www.youtube.com/results?search_query=handstand+yoga" },
          { name:"Full Lotus Pranayama", hold:"10 min", desc:"Breathe in padmasana. Feel the completion approaching.", demo:"https://www.youtube.com/results?search_query=lotus+pranayama+yoga" },
          { name:"Savasana", hold:"20 min", desc:"One day remains. You have built something extraordinary. Rest.", demo:"https://www.youtube.com/results?search_query=savasana+yoga" },
        ]},

        "Day 60": { focus: "🏆 Professional Yoga — Journey Complete", poses: [
          { name:"Final Pranayama Ritual", hold:"20 min", desc:"Kapalabhati 5 min → Nadi Shodhana 5 min → Bhramari 5 min → Meditation 5 min. Begin your final day exactly as a professional begins every day — with breath and presence.", demo:"https://www.youtube.com/results?search_query=morning+pranayama+yoga" },
          { name:"60-Day Celebration Practice", hold:"60-90 min", desc:"Your practice. All of it. Sun Salutations → Standing sequence → Arm balances → Backbends → Splits → Inversions → Seated → Finishing. No instructions needed. You ARE the practice now.", demo:"https://www.youtube.com/results?search_query=advanced+yoga+practice" },
          { name:"Full Lotus Meditation", hold:"20 min", desc:"Sit in padmasana. Eyes closed. No technique — just be. This is what 60 days has prepared you for. The poses were never the destination. This stillness was.", demo:"https://www.youtube.com/results?search_query=padmasana+meditation" },
          { name:"Yoga Nidra — Final", hold:"20 min", desc:"Lie down. Enter the space between sleep and wakefulness. 60 days of work and transformation integrating into your being.", demo:"https://www.youtube.com/results?search_query=yoga+nidra+deep+relaxation" },
          { name:"Gratitude Practice", hold:"5 min", desc:"Seated. Hands at heart. Silently acknowledge every practice. Every early morning. Every difficult pose. Every time you wanted to stop but didn't. The practice continues — this is not an end. It is the beginning of a lifelong relationship with yoga.", demo:"" },
          { name:"Final Savasana", hold:"20 min", desc:"60 days. You began as a beginner and end as a professional. You have the headstand, the crow, the splits, the wheel, the pranayama, the meditation, and the flow. The mat will always be here. Namaste. 🙏", demo:"https://www.youtube.com/results?search_query=savasana+yoga+final+relaxation" },
        ]},

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
