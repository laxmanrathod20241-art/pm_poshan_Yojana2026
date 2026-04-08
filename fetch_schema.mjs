import https from 'https';

const url = 'https://mlammuevxjrnjbpwuzoe.supabase.co/rest/v1/?apikey=sb_publishable_fluQTWLs88mUOm7H-UaGUw_v9kpoZ0G';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    let keys;
    if (json.definitions) keys = Object.keys(json.definitions);
    else if (json.components && json.components.schemas) keys = Object.keys(json.components.schemas);
    console.log("SCHEMA KEYS:", keys);
  });
}).on('error', err => {
  console.log("Error: " + err.message);
});
