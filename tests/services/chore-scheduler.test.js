const fs = require('fs');
const { resetAllDailyChores, resetWeeklyPoints } = require('../../services/chore-scheduler');

// Mock fs
jest.mock('fs');

describe('ChoreScheduler', () => {
    const mockChores = {
        TestKid: {
            dailyChores: [
                { name: 'Task 1', completed: true, points: 10 },
                { name: 'Task 2', completed: false, points: 5 }
            ],
            weeklyChores: [],
            totalPoints: 10,
            weeklyPoints: 50
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock fs.readFileSync to return mockChores
        fs.readFileSync.mockReturnValue(JSON.stringify(mockChores));
        // Mock fs.existsSync to return true
        fs.existsSync.mockReturnValue(true);
    });

    test('resetAllDailyChores should reset completed status and add points to weekly total', () => {
        resetAllDailyChores();

        // Verify fs.writeFileSync was called
        expect(fs.writeFileSync).toHaveBeenCalled();

        // Get the data that was written
        const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
        const kid = writtenData.TestKid;

        // Check daily chores are reset
        expect(kid.dailyChores[0].completed).toBe(false);
        expect(kid.dailyChores[1].completed).toBe(false);

        // Check points logic (daily points reset, weekly points accumulated)
        // Original weeklyPoints: 50
        // Task 1 completed (10 points) -> added to weeklyPoints -> 60
        expect(kid.weeklyPoints).toBe(60);
        // Total points should be equal to weeklyPoints (since no weekly chores)
        expect(kid.totalPoints).toBe(60);
    });

    test('resetWeeklyPoints should reset weekly points to 0 and uncheck weekly chores', () => {
        // Setup mock with completed weekly chore
        mockChores.TestKid.weeklyChores = [
            { name: 'Weekly Task', completed: true, points: 20 }
        ];
        fs.readFileSync.mockReturnValue(JSON.stringify(mockChores));

        resetWeeklyPoints();

        expect(fs.writeFileSync).toHaveBeenCalled();
        const writtenData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);

        expect(writtenData.TestKid.weeklyPoints).toBe(0);
        // Weekly chores should be reset
        expect(writtenData.TestKid.weeklyChores[0].completed).toBe(false);
    });
});
