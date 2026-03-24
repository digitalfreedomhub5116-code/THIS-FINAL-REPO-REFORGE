// ── Skills Training Database ─────────────────────────────────────────────
export type SkillCategoryKey = 'COMBAT' | 'SOCIAL' | 'MENTAL' | 'SURVIVAL' | 'FINANCE' | 'LIFE';

export interface SkillLesson {
  id: string; title: string; content: string; practiceTask: string; videoUrl?: string;
}
export interface SkillLevel {
  level: number; title: string; description: string; lessons: SkillLesson[];
}
export interface Skill {
  id: string; name: string; category: SkillCategoryKey; icon: string;
  description: string; color: string; levels: SkillLevel[];
}
export interface SkillCategory {
  key: SkillCategoryKey; label: string; emoji: string; color: string; description: string;
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  { key: 'COMBAT', label: 'Combat & Martial Arts', emoji: '🥊', color: '#ef4444', description: 'Master fighting techniques and self-defense' },
  { key: 'SOCIAL', label: 'Social & Communication', emoji: '🗣️', color: '#8b5cf6', description: 'Level up your people skills' },
  { key: 'MENTAL', label: 'Mental & Cognitive', emoji: '🧠', color: '#06b6d4', description: 'Sharpen your mind and focus' },
  { key: 'SURVIVAL', label: 'Survival & Practical', emoji: '🏕️', color: '#22c55e', description: 'Essential real-world skills' },
  { key: 'FINANCE', label: 'Financial Intelligence', emoji: '💰', color: '#eab308', description: 'Master money and wealth building' },
  { key: 'LIFE', label: 'Life Skills', emoji: '🍳', color: '#f97316', description: 'Cooking, nutrition, and daily mastery' },
];

const L = (id: string, title: string, content: string, task: string): SkillLesson => ({ id, title, content, practiceTask: task });

export const SKILLS_DATABASE: Skill[] = [
  // ── COMBAT ──
  { id: 'boxing', name: 'Boxing Fundamentals', category: 'COMBAT', icon: '🥊', color: '#ef4444',
    description: 'Stance, punches, combos, and defense', levels: [
      { level: 1, title: 'The Stance', description: 'Foundation of everything', lessons: [
        L('box_1_1','Orthodox vs Southpaw','Your stance is your foundation. Orthodox (left foot forward) for right-handers; Southpaw for left. Feet shoulder-width, knees bent, weight on balls of feet. Lead hand at eye level, rear hand by chin. Elbows tucked. Stay relaxed but ready.','Hold your stance in front of a mirror for 2 minutes. Check: chin tucked, hands up, weight balanced.'),
        L('box_1_2','Footwork Basics','Never cross your feet. Push off the opposite foot to move. Step-drag pattern maintains your stance width. Always stay balanced and on the balls of your feet.','Practice box step: forward-back-left-right for 3 rounds of 2 min. Maintain stance throughout.'),
      ]},
      { level: 2, title: 'Basic Punches', description: 'Jab, cross, and combos', lessons: [
        L('box_2_1','The Jab (1)','Extend lead hand straight, rotating fist palm-down at extension. Snap back immediately. Power from rear foot push and shoulder rotation. Keep rear hand up.','Throw 100 jabs in front of mirror. Focus on full extension and snap back. Sets of 20.'),
        L('box_2_2','The Cross (2)','Rotate rear hip and shoulder forward, driving rear hand straight. Rear foot pivots. Power chain: foot pivot → hip → shoulder → fist. Return to guard immediately.','Practice 50 slow crosses focusing on kinetic chain, then 50 at speed.'),
        L('box_2_3','The 1-2 Combo','Jab to measure distance, immediately follow with cross. The cross lands before you fully retract the jab — rapid one-two rhythm.','Practice 1-2 combo for 5 rounds of 2 min with 30s rest. Focus on smooth rhythm.'),
      ]},
      { level: 3, title: 'Hooks & Defense', description: 'Power shots and defensive skills', lessons: [
        L('box_3_1','The Lead Hook (3)','Keep elbow at 90°. Pivot lead foot, rotate hips, swing arm horizontally. Fist parallel to ground. Power is in hip rotation, not arm swing.','Shadow box 3 rounds focusing on lead hooks. Alternate: jab-jab-hook, 1-2-hook.'),
        L('box_3_2','Slipping & Defense','Slip by bending knees and rotating torso slightly off centerline. Bob under hooks by tracing a U-shape with your head. Parry jabs with lead hand. Always counter after defending.','Partner drill: practice slipping 50 times each side with slow jabs. Counter with a jab after each slip.'),
      ]},
    ]},
  { id: 'muay_thai', name: 'Muay Thai Basics', category: 'COMBAT', icon: '🦵', color: '#dc2626',
    description: 'The Art of Eight Limbs — kicks, elbows, knees, clinch', levels: [
      { level: 1, title: 'Stance & Kicks', description: 'Foundation and the roundhouse', lessons: [
        L('mt_1_1','Muay Thai Stance','More square and upright than boxing to check kicks. Weight 50/50, hands higher for elbow defense. Upright posture allows kicks and knees easily.','Hold MT stance 3 min. Practice shifting weight. Compare to boxing stance.'),
        L('mt_1_2','The Teep (Push Kick)','MT\'s jab — controls distance. Lift lead knee, push with ball of foot into opponent\'s hip. Fast, snappy, keeps distance.','Practice teeps: 30 each leg against a bag or pad. Focus on hip extension and snap.'),
        L('mt_1_3','The Thai Roundhouse','Use the shin, not foot. Step 45° with lead foot, pivot, swing rear leg in wide arc. Hips drive through target. Drop kicking-side arm for momentum.','Kick heavy bag 30 times each leg. Focus on: 45° step, hip rotation, shin contact.'),
      ]},
      { level: 2, title: 'Elbows, Knees & Clinch', description: 'Close-range weapons', lessons: [
        L('mt_2_1','Elbow Strikes','Horizontal elbow targets temple. Diagonal elbow slashes down. Uppercut elbow drives up to chin. All use hip rotation for power. Tight, compact movements.','Shadow practice each elbow: 20 reps each side. Focus on sharp, compact movements.'),
        L('mt_2_2','Knee Strikes','Straight knee drives upward into body. Pull opponent down as knee rises. Curving knee swings from the side targeting ribs. In clinch, knees are primary.','Practice 30 straight knees each leg (hold chair for balance). Then 20 curving knees each side.'),
        L('mt_2_3','The Clinch','Lock hands behind opponent\'s head, forearms framing face. Pull head down, control posture. From here: throw knees, off-balance, sweep.','Partner drill: enter plum clinch, hold 10s, throw 3 light knees, reset. 10 reps.'),
      ]},
    ]},
  { id: 'bjj', name: 'Brazilian Jiu-Jitsu', category: 'COMBAT', icon: '🤼', color: '#b91c1c',
    description: 'Ground fighting — control, submissions, escapes', levels: [
      { level: 1, title: 'Positions', description: 'The hierarchy of control', lessons: [
        L('bjj_1_1','Position Hierarchy','From best to worst: Back mount → Mount → Side control → Half guard → Guard. Goal on top: advance position then submit. On bottom: sweep or submit from guard. Position before submission.','Study the hierarchy. Watch 10 min of BJJ matches identifying positions.'),
        L('bjj_1_2','Closed Guard Basics','Legs wrapped around opponent\'s waist. Control their posture by pulling down. Break grips. Use hips to create angles. Many attacks available from here.','With a partner, hold closed guard 2 min. Focus on posture control.'),
      ]},
      { level: 2, title: 'Submissions & Escapes', description: 'Finish or escape', lessons: [
        L('bjj_2_1','The Armbar','From guard: control one arm, throw leg over head, pinch knees around arm, bridge hips up pulling wrist to chest. Key: squeeze knees tight, lift hips.','Drill armbar from guard 20 times each side with a partner (slowly).'),
        L('bjj_2_2','Rear Naked Choke','From back control: slide forearm under chin, grab own bicep, hand behind head, squeeze elbows together expanding chest. Blood choke on carotid arteries.','Practice RNC grip 30 times on a pillow or compliant partner.'),
        L('bjj_2_3','Mount Escape (Upa)','Trap their arm to your chest. Hook same-side foot. Bridge explosively turning toward trapped side. They roll because no post on that side.','Drill upa escape 15 times each side. Focus on: trap arm, hook foot, bridge HIGH.'),
      ]},
    ]},
  { id: 'self_defense', name: 'Self-Defense', category: 'COMBAT', icon: '🛡️', color: '#991b1b',
    description: 'Practical awareness and physical defense', levels: [
      { level: 1, title: 'Awareness & Prevention', description: 'Avoid the fight', lessons: [
        L('sd_1_1','Situational Awareness','Color codes: White (unaware), Yellow (relaxed alertness — default), Orange (threat identified), Red (fight/flight). Stay in Yellow. Scan exits, threats, escape routes.','Spend one day in Code Yellow. Note exits in every room. Write 3 observations.'),
        L('sd_1_2','De-escalation','Speak calmly, open palms, create space. Don\'t match energy. "I don\'t want trouble." Give them a way to back down without losing face.','Role-play 5 scenarios with a friend: they escalate, you de-escalate.'),
      ]},
      { level: 2, title: 'Physical Defense', description: 'When you must act', lessons: [
        L('sd_2_1','Vulnerable Targets','Eyes (palm strike), throat (chop), groin (knee), knees (stomp). Palm strike is safer than a fist. Strike and create distance to escape.','Practice palm strikes on pillow: 30 each hand. Knee strikes: 20 each leg.'),
        L('sd_2_2','Escaping Grabs','Wrist grab: rotate toward thumb and yank. Bear hug from behind: drop weight, stomp foot, elbow ribs, turn and strike. Always create space then escape.','Drill each escape 10 times with partner. Wrist grab, bear hug, front choke.'),
      ]},
    ]},

  // ── SOCIAL ──
  { id: 'social_skills', name: 'Social Skills', category: 'SOCIAL', icon: '💬', color: '#8b5cf6',
    description: 'Build connections and navigate social situations', levels: [
      { level: 1, title: 'Conversation Foundations', description: 'Start and sustain great talks', lessons: [
        L('soc_1_1','Starting Conversations','Smile, eye contact, say something contextual. Be curious. "What brings you here?" beats "Nice weather" because it invites a story.','Start 3 conversations with strangers this week using contextual openers.'),
        L('soc_1_2','Active Listening','Maintain eye contact, nod, paraphrase what they said, ask follow-ups based on what they told you. Resist pivoting to yourself.','In 3 conversations, paraphrase before responding. Notice how it changes the interaction.'),
        L('soc_1_3','Asking Great Questions','Open-ended "What" and "How" questions are gold. Go deep on one topic rather than broad. Follow the thread — their answer contains your next question.','Write 10 open-ended questions. Use 3 in real conversations this week.'),
      ]},
      { level: 2, title: 'Rapport & Groups', description: 'Connect and lead', lessons: [
        L('soc_2_1','Mirroring & Matching','Subtly mirror body language, speech pace, energy. Match vocabulary and interests. This is attunement, not mimicry.','In 3 conversations, mirror body language and speech pace. Note the effect.'),
        L('soc_2_2','Group Dynamics','To join a group: approach with open body language, wait for a pause, contribute to current topic. Include quiet people by asking their opinion.','At a gathering, enter 2 group conversations and include someone quiet.'),
      ]},
    ]},
  { id: 'public_speaking', name: 'Public Speaking', category: 'SOCIAL', icon: '🎤', color: '#7c3aed',
    description: 'Speak with confidence and impact', levels: [
      { level: 1, title: 'Overcoming Fear', description: 'Manage nerves', lessons: [
        L('ps_1_1','Reframing Anxiety','Stage fright symptoms are identical to excitement. Say "I\'m excited" not "I\'m nervous." Your audience wants you to succeed. Nervousness is invisible 90% of the time.','Record yourself speaking 2 min on any topic. Watch it. The nervousness is barely visible. Do 3x this week.'),
        L('ps_1_2','Pre-Speech Ritual','Power pose 2 min (hands on hips). Box breathing: 5 cycles of inhale 4s, hold 4s, exhale 6s. Then speak. Pauses during speech feel long to you but barely register for audience.','Practice: 2 min power pose + 5 breaths + 1 min impromptu speech. Daily for 5 days.'),
      ]},
      { level: 2, title: 'Structure & Delivery', description: 'Organize for impact', lessons: [
        L('ps_2_1','Rule of Three','Structure every speech with 3 points. Within each: claim, story/example, takeaway. "Today I\'ll share three things..."','Write a 3-min speech using Rule of Three. Practice 3 times. Time yourself.'),
        L('ps_2_2','Vocal Variety & Presence','Vary pace, volume, pitch, and pauses. Slow for emphasis, fast for excitement. Pause 2-3s before key statements. Use purposeful gestures — open palms convey honesty.','Deliver your speech to a mirror. Focus on vocal variety and gestures. Record and review.'),
      ]},
    ]},
  { id: 'negotiation', name: 'Negotiation', category: 'SOCIAL', icon: '🤝', color: '#6d28d9',
    description: 'Win-win outcomes and influence', levels: [
      { level: 1, title: 'Core Principles', description: 'Foundation of every deal', lessons: [
        L('neg_1_1','Interests vs Positions','People state positions but have underlying interests. Ask "Why?" to discover them. Negotiate on interests to find creative win-win solutions.','Recall a past negotiation. Write each person\'s position vs real interest.'),
        L('neg_1_2','BATNA','Best Alternative To Negotiated Agreement — your Plan B. Strong BATNA = confidence to walk away. Determine yours and assess theirs before negotiating.','For a real upcoming negotiation, write: ideal outcome, your BATNA, their likely BATNA.'),
      ]},
      { level: 2, title: 'Tactical Techniques', description: 'Proven frameworks', lessons: [
        L('neg_2_1','Anchoring','First number sets the anchor. Make first offer when informed. Set it aggressively but justifiably. If they anchor first, explicitly de-anchor with data.','In a mock negotiation, always make the first offer. Notice how it shapes everything.'),
        L('neg_2_2','Mirroring & Labeling','Repeat their last 1-3 words as a question (mirroring). Name their emotion: "It sounds like you\'re frustrated..." (labeling). Both build rapport and extract info.','Practice mirroring and labeling in 3 conversations this week.'),
      ]},
    ]},
  { id: 'body_language', name: 'Body Language', category: 'SOCIAL', icon: '👁️', color: '#5b21b6',
    description: 'Read people and project confidence', levels: [
      { level: 1, title: 'Reading Others', description: 'Decode nonverbal signals', lessons: [
        L('bl_1_1','Baseline & Clusters','Never read a single gesture alone. Establish baseline, then look for clusters of cues pointing the same direction. Context is everything.','Observe 5 people in public for 10 min. Note baseline and 3 behavioral clusters each.'),
        L('bl_1_2','Eye Contact','Comfortable people maintain 60-70% eye contact. Break in baseline pattern signals comfort change. Darting eyes suggest anxiety.','In 5 conversations, track eye contact patterns. When do they break? What triggered it?'),
      ]},
      { level: 2, title: 'Projecting Confidence', description: 'Command presence', lessons: [
        L('bl_2_1','Power Posture','Stand tall, shoulders back and relaxed, chin parallel. Take up space. Walk with purpose. Open posture always. Your body language changes your brain chemistry.','Adopt power posture for one full day in every interaction. Note how people respond differently.'),
        L('bl_2_2','Charismatic Presence','Charisma = Power + Warmth + Presence. Easiest to improve: Presence. Phone away, full eye contact, don\'t scan the room. Being fully present is magnetic and rare.','For one week, practice radical presence in every conversation. No phone, full focus. Notice the difference.'),
      ]},
    ]},

  // ── MENTAL ──
  { id: 'focus', name: 'Focus & Meditation', category: 'MENTAL', icon: '🧘', color: '#06b6d4',
    description: 'Build unshakeable focus and clarity', levels: [
      { level: 1, title: 'Breath Foundations', description: 'Master your breath', lessons: [
        L('fm_1_1','Box Breathing','Navy SEAL technique: inhale 4s, hold 4s, exhale 4s, hold 4s. Activates parasympathetic nervous system. Works anywhere.','Practice box breathing 5 min (12 cycles). Do morning and evening. Note mental state before/after.'),
        L('fm_1_2','Mindful Breathing','Sit, close eyes, focus on breath sensation. When mind wanders, return without judgment. Each return IS the exercise — a mental rep.','Meditate 5 min. Count exhales to 10, restart. If lost, start over. Daily for 5 days.'),
      ]},
      { level: 2, title: 'Deep Work', description: 'Sustained focus protocols', lessons: [
        L('fm_2_1','Pomodoro Method','25-min focused blocks + 5-min breaks. 4 Pomodoros then 15-30 min break. NO distractions during blocks. Write distractions on a list.','Complete 4 Pomodoros on your most important task. Track distraction count per round.'),
        L('fm_2_2','Flow State Triggers','Flow requires: clear goals, immediate feedback, challenge ~4% above ability. Eliminate distractions. 15 min to enter flow — protect ramp-up time.','Design a flow ritual: consistent time, location, pre-work routine. Try 3 days.'),
      ]},
    ]},
  { id: 'speed_reading', name: 'Speed Reading', category: 'MENTAL', icon: '📖', color: '#0891b2',
    description: 'Read faster with better comprehension', levels: [
      { level: 1, title: 'Break Bad Habits', description: 'Foundation techniques', lessons: [
        L('sr_1_1','Eliminating Subvocalization','The habit of "speaking" words in your head limits you to ~250 wpm. Hum while reading or press tongue to roof of mouth. Your visual cortex is faster than auditory.','Read an article while humming. Compare comprehension to normal reading. Practice 15 min daily.'),
        L('sr_1_2','Using a Pointer','Use finger/pen to guide eyes. Prevents regression, reduces fixation time, creates rhythm. Can boost speed 25-50% immediately.','Read a chapter using a pointer. Time 10 min and count pages. Compare to normal speed.'),
      ]},
      { level: 2, title: 'Advanced Techniques', description: 'Chunking and peripheral vision', lessons: [
        L('sr_2_1','Word Chunking','Train eyes to grab 3-5 words at once. Draw 3 columns on a page, fixate once per column. Gradually reduce fixations per line.','Divide a page into 3 columns. Read fixating once per column. Do 5 pages.'),
        L('sr_2_2','Peripheral Vision','Focus on center word, read words on either side without moving eyes. Start with 3 words, work to 7.','Stare at center of a text line. Identify words on either side without moving eyes. 10 min practice.'),
      ]},
    ]},
  { id: 'memory', name: 'Memory Training', category: 'MENTAL', icon: '🧩', color: '#0e7490',
    description: 'Remember anything with proven techniques', levels: [
      { level: 1, title: 'Core Techniques', description: 'Memory Palace and spaced repetition', lessons: [
        L('mem_1_1','Memory Palace','Choose a familiar place, walk through mentally. Place items to remember at specific locations — make them vivid and absurd. To recall, walk the route. Spatial memory is extremely powerful.','Build a 10-location Memory Palace in your house. Memorize a 10-item list. Recall after 1 hour.'),
        L('mem_1_2','Spaced Repetition','You forget 80% within 24 hours. Review after 1, 3, 7, 14, 30 days. Test yourself (active recall) — 3x more effective than re-reading.','Create 20 flashcards. Review today, tomorrow, in 3 days. Track improvement.'),
      ]},
      { level: 2, title: 'Advanced Memory', description: 'Names, numbers, rapid learning', lessons: [
        L('mem_2_1','Remembering Names','1) Listen to the name. 2) Repeat it. 3) Associate with someone you know. 4) Create a visual linking face to name. 5) Use 2-3 times in conversation.','At next social event, memorize every name using the link method. Target: 10+ names.'),
        L('mem_2_2','The Major System','Convert numbers to consonants: 0=S, 1=T, 2=N, 3=M, 4=R, 5=L, 6=SH, 7=K, 8=F, 9=P. Add vowels to create words. Place images in Memory Palace.','Memorize the 10 conversions. Convert: 42, 15, 93. Memorize a 10-digit number.'),
      ]},
    ]},
  { id: 'chess', name: 'Strategic Thinking', category: 'MENTAL', icon: '♟️', color: '#155e75',
    description: 'Pattern recognition through chess', levels: [
      { level: 1, title: 'Foundations', description: 'Piece values and basic strategy', lessons: [
        L('ch_1_1','Opening Principles','Control center (e4,d4). Develop pieces quickly. Castle early. Don\'t move same piece twice without reason. Piece values: P=1, N=3, B=3, R=5, Q=9.','Play 3 games focusing only on center control and development. Note if you castled.'),
        L('ch_1_2','Basic Checkmates','Back rank mate, Scholar\'s Mate, King+Queen vs King. Recognizing patterns speeds up endgames.','Practice K+Q vs K until under 10 moves. Look for back rank mates in 3 games.'),
      ]},
      { level: 2, title: 'Tactics', description: 'Win material through combinations', lessons: [
        L('ch_2_1','Forks, Pins, Skewers','Fork: one piece attacks two. Pin: defender can\'t move without exposing more valuable piece. Skewer: reverse pin. Look every move.','Solve 20 tactical puzzles on lichess. Track accuracy.'),
        L('ch_2_2','Sacrifices & Calculation','Sometimes giving material leads to bigger gain. Calculate 2-3 moves ahead. "Will I get it back with interest?"','Solve 20 puzzles on discoveries/sacrifices. Play 2 games looking for opportunities.'),
      ]},
    ]},

  // ── SURVIVAL ──
  { id: 'survival', name: 'Survival Skills', category: 'SURVIVAL', icon: '🏕️', color: '#22c55e',
    description: 'Wilderness and emergency survival', levels: [
      { level: 1, title: 'Priorities', description: 'Shelter, water, fire, food', lessons: [
        L('surv_1_1','Rule of Threes','3 min without air, 3 hours without shelter, 3 days without water, 3 weeks without food. Priorities: danger → shelter → water → fire → food.','Walk in a park. Identify 3 shelter spots, 2 water sources, fire materials.'),
        L('surv_1_2','Emergency Shelter','Lean-to: prop branch against tree at 45°. Lean shorter branches along one side. Cover with 12+ inches of leaves. Keep it small for warmth.','Build a lean-to using natural materials. Target: functional in under 30 min.'),
      ]},
      { level: 2, title: 'Fire & Water', description: 'Essential survival skills', lessons: [
        L('surv_2_1','Fire Starting','Fire triangle: fuel, oxygen, heat. Tinder (dry grass, bark) → kindling (pencil-thick sticks) → fuel (arm-thick logs). Bird\'s nest of tinder, teepee of kindling. Ferro rod, matches, magnifying glass.','Practice starting a fire with matches using only natural tinder. Build a proper tinder bundle and teepee structure.'),
        L('surv_2_2','Water Purification','Never drink untreated water. Boiling (1 min at rolling boil) is most reliable. Chemical: iodine or chlorine tablets. Filter: improvise with sand, charcoal, cloth layers. Signs of water: green vegetation, animal tracks converging, low ground.','Boil water over your fire. Practice building an improvised filter with a bottle, sand, charcoal, and cloth.'),
      ]},
    ]},
  { id: 'first_aid', name: 'First Aid', category: 'SURVIVAL', icon: '🩹', color: '#16a34a',
    description: 'Emergency medical response', levels: [
      { level: 1, title: 'Life-Saving Basics', description: 'CPR and bleeding control', lessons: [
        L('fa_1_1','CPR Basics','Check responsiveness → Call emergency services → 30 chest compressions (2 inches deep, 100-120 bpm) → 2 rescue breaths → Repeat. Push hard and fast on center of chest. "Stayin\' Alive" tempo.','Watch a CPR demonstration video. Practice compressions on a pillow (30 reps at correct depth and rhythm). Repeat 5 cycles.'),
        L('fa_1_2','Bleeding Control','Direct pressure first — press firmly with clean cloth for 10+ min. Elevate above heart if possible. Tourniquet for life-threatening limb bleeding: 2-3 inches above wound, tighten until bleeding stops. Note the time.','Practice applying direct pressure bandage on your arm. Learn to tie an improvised tourniquet using a belt and stick.'),
      ]},
      { level: 2, title: 'Common Emergencies', description: 'Burns, fractures, choking', lessons: [
        L('fa_2_1','Burns & Fractures','Burns: cool with running water 10-20 min (not ice). Cover with clean non-stick dressing. Fractures: immobilize above and below the break. Splint with rigid material + padding. Don\'t try to realign.','Practice improvised splinting on your forearm using a magazine and cloth strips.'),
        L('fa_2_2','Choking Response','Conscious adult: 5 back blows between shoulder blades → 5 abdominal thrusts (Heimlich). Repeat. Unconscious: lower to ground, call emergency, begin CPR (check mouth for object before rescue breaths).','Practice the Heimlich position with a partner (without actual force). Learn hand placement.'),
      ]},
    ]},

  // ── FINANCE ──
  { id: 'financial_literacy', name: 'Financial Literacy', category: 'FINANCE', icon: '💳', color: '#eab308',
    description: 'Budgeting, saving, and money management', levels: [
      { level: 1, title: 'Money Foundations', description: 'Budget and save', lessons: [
        L('fin_1_1','50/30/20 Budget Rule','50% needs (rent, food, bills), 30% wants (entertainment, dining), 20% savings/investing. Track every rupee for one month. Awareness alone changes spending behavior.','Track all spending for 7 days. Categorize into needs/wants/savings. Calculate your actual ratios.'),
        L('fin_1_2','Emergency Fund','Save 3-6 months of expenses before investing. This protects you from debt spirals during emergencies. Automate transfers on payday. Start with ₹1000/month if needed.','Calculate your monthly expenses × 3. Open a separate savings account. Set up auto-transfer today.'),
        L('fin_1_3','Compound Interest','₹10,000/month at 12% annual return = ₹1 Crore in 20 years. Starting 5 years earlier doubles your wealth. Time in the market beats timing the market. Start now, even if small.','Calculate: if you invest ₹5000/month at 12% for 10, 20, 30 years. Use an online compound interest calculator. See the exponential curve.'),
      ]},
      { level: 2, title: 'Debt & Credit', description: 'Manage and eliminate debt', lessons: [
        L('fin_2_1','Good Debt vs Bad Debt','Good debt builds assets (education, business). Bad debt buys depreciating things (credit card spending, car loans). Pay off bad debt aggressively using avalanche (highest interest first) or snowball (smallest balance first) method.','List all debts with interest rates. Choose avalanche or snowball. Calculate payoff timeline.'),
        L('fin_2_2','Credit Score Mastery','Pay bills on time (35% of score). Keep credit utilization under 30% (30%). Don\'t close old accounts (15%). Avoid hard inquiries (10%). Mix of credit types helps (10%). Check your score monthly.','Check your credit score. Identify one action to improve it. Set up auto-pay for all bills.'),
      ]},
    ]},
  { id: 'investing', name: 'Investing Fundamentals', category: 'FINANCE', icon: '📈', color: '#ca8a04',
    description: 'Grow your wealth systematically', levels: [
      { level: 1, title: 'Getting Started', description: 'Stocks, funds, and index investing', lessons: [
        L('inv_1_1','Asset Classes','Stocks (high risk, high return), Bonds (low risk, low return), Real Estate, Gold, Fixed Deposits. Diversify across asset classes based on your age and risk tolerance. Young = more stocks.','Research and list 5 index funds available in India (e.g., Nifty 50, Sensex). Compare their 5-year returns.'),
        L('inv_1_2','SIP & Index Funds','Systematic Investment Plan: invest fixed amount monthly regardless of market. Index funds track the market (Nifty 50, Sensex) with low fees. 90% of actively managed funds underperform index funds long-term.','Open a demat account if you don\'t have one. Set up a ₹500 SIP in a Nifty 50 index fund.'),
      ]},
      { level: 2, title: 'Risk Management', description: 'Protect and grow', lessons: [
        L('inv_2_1','Diversification','Don\'t put all eggs in one basket. Spread across: asset classes, sectors, geographies. A simple portfolio: 60% equity index, 20% debt funds, 10% gold, 10% international. Rebalance yearly.','Design your ideal portfolio allocation. Compare it to your current investments. Identify gaps.'),
        L('inv_2_2','Risk Tolerance & Time Horizon','Your risk tolerance depends on: age, income stability, financial obligations, and personality. Longer time horizon = more risk acceptable. Never invest money you\'ll need within 3 years in stocks.','Write your investment time horizon for 3 goals (short, medium, long term). Assign appropriate asset allocation to each.'),
      ]},
    ]},

  // ── LIFE SKILLS ──
  { id: 'cooking', name: 'Cooking Fundamentals', category: 'LIFE', icon: '🍳', color: '#f97316',
    description: 'Essential cooking skills and core recipes', levels: [
      { level: 1, title: 'Kitchen Basics', description: 'Knife skills and heat control', lessons: [
        L('cook_1_1','Knife Skills','The claw grip: curl fingertips under, knuckles guide the blade. Rock the knife, don\'t lift and chop. Basic cuts: dice (cubes), julienne (matchsticks), mince (very fine). A sharp knife is safer than a dull one — it goes where you direct it.','Practice dicing an onion and a potato. Focus on claw grip and even cuts. Time yourself and aim for consistency, not speed.'),
        L('cook_1_2','Heat Control','High heat: searing meat, stir-frying. Medium: most cooking. Low: simmering, melting. Signs of correct heat: oil shimmers (ready for food), water droplets dance (pan is hot). Never crowd the pan — it drops temperature and steams instead of searing.','Cook an egg at 3 different heats: low (soft scramble), medium (fried egg), high (crispy edges). Notice how heat changes texture.'),
      ]},
      { level: 2, title: 'Core Recipes', description: 'Master 5 essential dishes', lessons: [
        L('cook_2_1','Perfect Dal & Rice','Dal: wash lentils, pressure cook with turmeric and water. Tadka: heat ghee, add cumin, mustard seeds, garlic, dry chilies, pour over dal. Rice: 1:2 ratio rice:water. Bring to boil, reduce to lowest heat, cover 15 min. Don\'t open lid.','Cook dal tadka and steamed rice from scratch. Focus on the tadka technique and rice ratio.'),
        L('cook_2_2','Stir-Fry Mastery','High heat + small pieces + constant motion = perfect stir-fry. Prep everything before turning on the stove (mise en place). Oil first, aromatics (garlic/ginger) 30 sec, hard veg, then soft veg, then protein. Sauce last. Total cook time: 5-7 min.','Make a vegetable stir-fry. Prep all ingredients first. Practice the wok toss (or spatula flip). Time your cook to under 7 minutes.'),
        L('cook_2_3','Eggs Five Ways','Boiled (6 min soft, 10 min hard), fried (butter, medium heat, baste with butter), scrambled (low heat, constant stir, remove before fully set — carryover cooking finishes them), omelette (beaten eggs, medium pan, tilt and fold), bhurji (Indian scramble with onion, tomato, spices).','Cook eggs all 5 ways in one session. Compare textures and techniques.'),
      ]},
    ]},
  { id: 'nutrition_science', name: 'Nutrition Science', category: 'LIFE', icon: '🧬', color: '#ea580c',
    description: 'Understand what fuels your body', levels: [
      { level: 1, title: 'Macronutrients', description: 'Protein, carbs, and fats', lessons: [
        L('ns_1_1','Protein','4 cal/g. Builds and repairs muscle. Aim for 1.6-2.2g per kg bodyweight for muscle growth. Complete proteins: eggs, meat, dairy, soy. Incomplete: most plants (combine rice+beans for complete profile). Space intake across meals for optimal synthesis.','Calculate your daily protein target (bodyweight kg × 2). Track protein for one day. Are you hitting it?'),
        L('ns_1_2','Carbs & Fats','Carbs: 4 cal/g. Primary energy source. Complex (oats, rice, vegetables) sustain energy. Simple (sugar, fruit) spike energy fast. Fats: 9 cal/g. Essential for hormones, brain function. Healthy: olive oil, nuts, avocado, fish. Avoid trans fats completely.','Track all food for one day. Calculate your carb/fat split. Compare to recommended: 40-50% carbs, 25-35% fats.'),
      ]},
      { level: 2, title: 'Applied Nutrition', description: 'Meal timing and supplements', lessons: [
        L('ns_2_1','Meal Timing & Frequency','Total daily intake matters most. But: protein every 3-4 hours optimizes synthesis. Pre-workout: carbs + protein 1-2 hours before. Post-workout: protein within 2 hours. Intermittent fasting works for some — it\'s about adherence, not magic.','Design your ideal meal schedule based on your routine. Plan protein distribution across meals.'),
        L('ns_2_2','Supplements That Work','Evidence-based: Creatine (5g daily, most studied supplement), Whey protein (convenience), Vitamin D (if deficient), Omega-3 (1-2g EPA+DHA daily). Everything else is marginal. Don\'t waste money on BCAAs if you eat enough protein.','Review your current supplements against this evidence-based list. Cut what\'s unnecessary. Add what\'s missing.'),
      ]},
    ]},
];
