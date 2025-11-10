const fs = require('fs');
const path = require('path');

(async function() {
  try {
    const usersFile = path.join(__dirname, 'user.json');
    const backupFile = path.join(__dirname, `user.json.bak.${Date.now()}`);

    if (!fs.existsSync(usersFile)) {
      console.error('user.json not found, aborting.');
      process.exit(1);
    }

    // Backup
    fs.copyFileSync(usersFile, backupFile);
    console.log('Backup created:', path.basename(backupFile));

    const raw = fs.readFileSync(usersFile, 'utf8');
    let applicants = [];
    try {
      applicants = JSON.parse(raw || '[]');
      if (!Array.isArray(applicants)) applicants = [];
    } catch (e) {
      console.error('Failed to parse user.json:', e.message);
      process.exit(1);
    }

    let modified = 0;
    const updated = applicants.map(app => {
      const out = Object.assign({}, app);
      if (!Object.prototype.hasOwnProperty.call(out, 'dob')) {
        out.dob = null;
        modified++;
      }
      if (!Object.prototype.hasOwnProperty.call(out, 'country')) {
        out.country = null;
        modified++;
      }
      return out;
    });

    fs.writeFileSync(usersFile, JSON.stringify(updated, null, 2), 'utf8');
    console.log(`Migration complete. Added ${modified} missing fields (dob/country).`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
