$filePath = 'c:\Users\lrath\PMPY\src\components\DailyLogForm.tsx'
$content = Get-Content $filePath -Raw

# Specific block that is currently broken
$brokenBlock = '(?s)if \(oldConsumption\) \{.*?if \(!delData \|\| delData.length === 0\) \{.*?\}'

$newBlock = 'if (oldConsumption) {
          const itemsToRestore = Array.from(new Set([
            ...(oldConsumption.main_foods_all || [oldConsumption.main_food]),
            ...(oldConsumption.ingredients_used || [])
          ])).filter(Boolean);
          
          const oldPrimary = Number(oldConsumption.meals_served_primary || 0);
          const oldUpper = Number(oldConsumption.meals_served_upper_primary || 0);

          for (const item of itemsToRestore as string[]) {
            const grams = foodGramsMap[item] || { primary: GRAMS_PRIMARY, upper: GRAMS_UPPER };
            const kgToRestore = ((oldPrimary * grams.primary) + (oldUpper * grams.upper)) / 1000;
            
            if (kgToRestore > 0) {
              const currentStock = inventory.find(i => i.item_name === item || i.item_code === item || (foodNameMap[item] && i.item_name === foodNameMap[item]));
              if (currentStock) {
                const newBalance = Number(currentStock.current_balance) + kgToRestore;
                await (supabase as any).from("inventory_stock").update({ current_balance: newBalance }).eq("id", currentStock.id);
              }
            }
          }
          await (supabase as any).from("consumption_logs").delete().eq("id", oldConsumption.id);
        }

       const { data: delData, error: delErr } = await (supabase as any)
         .from("daily_logs")
         .delete()
         .eq("id", existingLogId)
         .eq("teacher_id", userId)
         .select();
         
       if (delErr) throw delErr;
       if (!delData || delData.length === 0) {
           throw new Error("Supabase rejected deletion. Please verify RLS policies.")'

$content = $content -replace [regex]::Escape($brokenBlock), $newBlock

# If regex replace fails, try a direct string replace for a smaller part
if ($content -notmatch 'oldConsumption.main_foods_all') {
    # Fallback: Just replace the itemsToRestore line if we can find it
    $targetLine = 'const itemsToRestore = Array.from(new Set(\[\.\.\.localMainFoods, \.\.\.localIngredients\]))\.filter\(Boolean\);'
    $content = $content -replace $targetLine, 'const itemsToRestore = Array.from(new Set([...(oldConsumption.main_foods_all || [oldConsumption.main_food]), ...(oldConsumption.ingredients_used || [])])).filter(Boolean);'
}

Set-Content $filePath $content -NoNewline
