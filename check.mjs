import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://mlammuevxjrnjbpwuzoe.supabase.co', 'sb_publishable_fluQTWLs88mUOm7H-UaGUw_v9kpoZ0G');

(async () => {
  // Let's attempt to insert day_name 0 to 7 to see what works
  // We will assume 00000000-0000-0000-0000-000000000000 fails foreign key if the check passes
  for (let i = 0; i <= 7; i++) {
    const res = await supabase.from('menu_weekly_schedule').insert({
      teacher_id: "00000000-0000-0000-0000-000000000000",
      week_pattern: "A",
      day_name: i,
      is_active: false,
      main_food_codes: [],
      menu_items: []
    });
    console.log(`id: ${i}, error:`, res.error ? (res.error.details || res.error.message || res.error.code) : 'success');
  }
  
  // also try string day names just in case
  const days = ["Monday", "Tuesday", "1"];
  for (const d of days) {
      const res = await supabase.from('menu_weekly_schedule').insert({
      teacher_id: "00000000-0000-0000-0000-000000000000",
      week_pattern: "A",
      day_name: d,
      is_active: false,
      main_food_codes: [],
      menu_items: []
    });
    console.log(`string: ${d}, error:`, res.error ? (res.error.details || res.error.message || res.error.code) : 'success');
  }
})();
