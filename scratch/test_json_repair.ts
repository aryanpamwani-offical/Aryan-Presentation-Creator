function repairTruncatedJson(jsonStr: string): string {
    let str = jsonStr.trim();

    // 1. Unescaped control characters inside JSON strings (e.g. raw newlines in codeblock)
    // Replace raw newlines inside string values with \n
    str = str.replace(/[\x00-\x1F]/g, (c) => {
        if (c === '\n') return '\\n';
        if (c === '\r') return '\\r';
        if (c === '\t') return '\\t';
        return '';
    });

    // 2. Remove dangling incomplete key-values at the end, e.g. `, "key":` or `, "key"`
    str = str.replace(/,\s*"[^"]*"?\s*:?\s*$/, '');
    str = str.replace(/,\s*$/, '');

    // 3. Check for unclosed string literal
    let inString = false;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '"' && (i === 0 || str[i - 1] !== '\\')) {
            inString = !inString;
        }
    }
    if (inString) {
        str += '"';
    }

    // 4. Remove dangling trailing commas again after quote closure
    str = str.replace(/,\s*([\]}])/g, '$1');
    str = str.replace(/,\s*$/, '');

    // 5. Balance open/close brackets
    const stack: string[] = [];
    inString = false;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && (i === 0 || str[i - 1] !== '\\')) {
            inString = !inString;
        } else if (!inString) {
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                    stack.pop();
                }
            }
        }
    }

    while (stack.length > 0) {
        str += stack.pop();
    }

    return str;
}

// Test cases
const truncated1 = `[  {"id": 0, "slide_number": 1, "type": "title", "title": "JavaScript Basics", "localImagePath": "/javascript.png", "imageUrl": "", "subtitle": "Variables, Keywords, And Math"},  {"id": 1, "slide_numb`;

console.log('Truncated Input:', truncated1);
const repaired1 = repairTruncatedJson(truncated1);
console.log('Repaired JSON:', repaired1);
console.log('Parsed successfully:', Array.isArray(JSON.parse(repaired1)));
