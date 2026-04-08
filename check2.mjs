import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://mlammuevxjrnjbpwuzoe.supabase.co', 'sb_publishable_fluQTWLs88mUOm7H-UaGUw_v9kpoZ0G');

(async () => {
  for (let i = -1; i <= 8; i++) {
    const res = await supabase.from('menu_weekly_schedule').insert({
      teacher_id: "00000000-0000-0000-0000-000000000000",
      week_pattern: "A",
      day_name: i,
      is_active: false,
      main_food_codes: [],
      menu_items: []
    });
    let errorMsg = 'success';
    if (res.error) {
       if (res.error.message.includes('check constraint')) {
          errorMsg = 'CHECK CONSTRAINT VIOLATED';
       } else if (res.error.message.includes('row-level security')) {
          errorMsg = 'PASSED CHECK (hit RLS)';
       } else {
          errorMsg = res.error.message;
       }
    }
    console.log(`day_name = ${i} -> ${errorMsg}`);
  }
})();
