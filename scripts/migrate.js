// Render's old preDeployCommand (`node scripts/migrate.js`, a dashboard setting) runs this in the image.
// No database since site-v6: a no-op. Remove once the dashboard setting is cleared (PLAN C/P).
console.log('migrate: no database since site-v6; nothing to do');
