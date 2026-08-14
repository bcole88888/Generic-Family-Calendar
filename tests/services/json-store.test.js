const fs = require('fs');
const path = require('path');
const JsonStore = require('../../services/json-store');

const TEST_FILE = path.join(__dirname, 'test-store.json');

describe('JsonStore', () => {
    let store;

    beforeEach(() => {
        if (fs.existsSync(TEST_FILE)) {
            fs.unlinkSync(TEST_FILE);
        }
        store = new JsonStore(TEST_FILE, { default: true });
    });

    afterEach(() => {
        if (fs.existsSync(TEST_FILE)) {
            fs.unlinkSync(TEST_FILE);
        }
    });

    test('should return default data if file does not exist', () => {
        const data = store.read();
        expect(data).toEqual({ default: true });
        // It should also create the file
        expect(fs.existsSync(TEST_FILE)).toBe(true);
    });

    test('should read data from file', () => {
        const testData = { foo: 'bar' };
        fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
        const data = store.read();
        expect(data).toEqual(testData);
    });

    test('should write data to file', () => {
        const newData = { foo: 'baz' };
        store.write(newData);
        const content = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
        expect(content).toEqual(newData);
    });
});
