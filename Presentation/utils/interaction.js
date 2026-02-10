import readline from 'readline';

/**
 * Prompts the user to select an option from a list
 * @param {string} promptText - The prompt message (e.g., "Select Theme:")
 * @param {object} options - Object containing options (e.g., config.themes)
 * @returns {Promise<string>} - The key of the selected option
 */
export async function selectOption(promptText, options) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const optionsList = Object.keys(options);

    console.log(`\n${promptText}`);
    optionsList.forEach((key, index) => {
        const option = options[key];
        console.log(`${index + 1}. ${option.name || key}`);
    });

    return new Promise((resolve) => {
        rl.question(`\nSelect an option (1-${optionsList.length}): `, (answer) => {
            rl.close();
            const selectedIndex = parseInt(answer) - 1;
            if (selectedIndex >= 0 && selectedIndex < optionsList.length) {
                resolve(optionsList[selectedIndex]);
            } else {
                console.log('Invalid selection. Using default.');
                resolve(null);
            }
        });
    });
}

/**
 * Prompts the user with a Yes/No question
 * @param {string} questionText - The question to ask
 * @returns {Promise<boolean>} - True for Yes, False for No
 */
export async function askQuestion(questionText) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`\n${questionText} (Y/N): `, (answer) => {
            rl.close();
            const isYes = answer.trim().toLowerCase() === 'y';
            resolve(isYes);
        });
    });
}
