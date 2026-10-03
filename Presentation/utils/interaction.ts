import readline from "readline";

/**
 * Prompts the user to select an option from a list
 * @param promptText - The prompt message (e.g., "Select Theme:")
 * @param options - Object containing options (e.g., config.themes)
 * @returns - The key of the selected option
 */
export async function selectOption(promptText: string, options: Record<string, any>): Promise<string | null> {
    const optionsList = Object.keys(options);

    console.log(`\n${promptText}`);
    optionsList.forEach((key, index) => {
        const option = options[key];
        console.log(`${index + 1}. ${option.name || key}`);
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`\nSelect an option (1-${optionsList.length}): `, (answer) => {
            rl.close();
            const selectedIndex = parseInt(answer.trim()) - 1;
            if (selectedIndex >= 0 && selectedIndex < optionsList.length) {
                resolve(optionsList[selectedIndex]);
            } else {
                console.log("Invalid selection. Using default.");
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
            resolve(answer.trim().toLowerCase() === "y");
        });
    });
}

/**
 * Prompts the user for text input.
 * Handles both typed single-line and multi-line paste.
 * As soon as Enter is pressed once (or paste finishes), it immediately submits.
 * @param promptText - The prompt message to display
 * @returns - The string entered by the user
 */
export async function askTextInput(promptText: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });

    console.log(`\n${promptText} (Paste or type, press Enter once to submit):`);
    process.stdout.write("> ");

    return new Promise((resolve) => {
        const lines: string[] = [];
        let timer: any = null;

        const submit = () => {
            if (timer) clearTimeout(timer);
            rl.close();
            resolve(lines.join("\n").trim());
        };

        rl.on("line", (line) => {
            lines.push(line);
            if (timer) clearTimeout(timer);

            // Debounce by 80ms:
            // Pasted multi-line text streams in with <10ms intervals.
            // When Enter is pressed after typing, 80ms gives an instant response while capturing all input.
            timer = setTimeout(submit, 80);
        });

        rl.on("SIGINT", () => {
            rl.close();
            process.exit(0);
        });
    });
}


