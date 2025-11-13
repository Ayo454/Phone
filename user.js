const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'user.json');

// Helper to read all users
function getAllUsers() {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Helper to save all users
function saveAllUsers(users) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

// Add a new user application
function addUserApplication(application) {
    const users = getAllUsers();
    users.push({
        ...application,
        submittedAt: new Date().toISOString()
    });
    saveAllUsers(users);
}

// Export functions
module.exports = {
    getAllUsers,
    addUserApplication
};
