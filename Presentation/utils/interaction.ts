import readline from 'readline';

/**
 * Prompts the user to select an option from a list
 * @param promptText - The prompt message (e.g., "Select Theme:")
 * @param options - Object containing options (e.g., config.themes)
 * @returns - The key of the selected option
 */
export async function selectOption(promptText: string, options: Record<string, any>): Promise<string | null> {
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
 * @param questionText - The question to ask
 * @returns - True for Yes, False for No
 */
export async function askQuestion(questionText: string): Promise<boolean> {
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

/**
 * Prompts the user for a text input
 * @param promptText - The prompt message to display
 * @returns - The string entered by the user
 */
export async function askTextInput(promptText: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log(`\n${promptText} (Press Enter on an empty line to submit):`);

    return new Promise((resolve) => {
        const lines: string[] = [];
        rl.on('line', (line) => {
            if (line.trim() === '') {
                rl.close();
            } else {
                lines.push(line);
            }
        });

        rl.on('close', () => {
            resolve(lines.join('\n').trim());
        });
    });
}
