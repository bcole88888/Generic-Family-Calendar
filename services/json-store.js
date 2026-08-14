const fs = require('fs');
const path = require('path');

class JsonStore {
    constructor(filePath, defaultData = {}) {
        this.filePath = filePath;
        this.defaultData = defaultData;
        this.ensureDirectoryExists();
    }

    ensureDirectoryExists() {
        const dirname = path.dirname(this.filePath);
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname, { recursive: true });
        }
    }

    read() {
        try {
            if (!fs.existsSync(this.filePath)) {
                this.write(this.defaultData);
                return this.defaultData;
            }
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading file ${this.filePath}:`, error);
            return this.defaultData;
        }
    }

    write(data) {
        try {
            const tempFile = `${this.filePath}.tmp`;
            fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
            fs.renameSync(tempFile, this.filePath);
            return true;
        } catch (error) {
            console.error(`Error writing file ${this.filePath}:`, error);
            return false;
        }
    }
}

module.exports = JsonStore;
