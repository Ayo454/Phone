const fs = require('fs').promises;
const path = require('path');

class UserModel {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'data', 'users.json');
    }

    async getAllUsers() {
        try {
            const raw = await fs.readFile(this.dataPath, 'utf8');
            const users = JSON.parse(raw || '[]');
            return Array.isArray(users) ? users : [];
        } catch (err) {
            if (err.code === 'ENOENT') {
                // If file doesn't exist, create it with empty array
                await fs.writeFile(this.dataPath, '[]', 'utf8');
                return [];
            }
            throw err;
        }
    }

    async addUser(userData) {
        const users = await this.getAllUsers();
        users.push({
            ...userData,
            receivedAt: new Date().toISOString()
        });
        await fs.writeFile(this.dataPath, JSON.stringify(users, null, 2), 'utf8');
        return userData;
    }

    async updateUser(index, userData) {
        const users = await this.getAllUsers();
        if (index >= 0 && index < users.length) {
            users[index] = { ...users[index], ...userData };
            await fs.writeFile(this.dataPath, JSON.stringify(users, null, 2), 'utf8');
            return users[index];
        }
        throw new Error('User not found');
    }
}

module.exports = new UserModel();