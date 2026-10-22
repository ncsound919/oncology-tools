const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const response = await ai\.models\.generateContent\(\{[\s\S]*?model: "gemini-3\.7-flash",[\s\S]*?contents: prompt,[\s\S]*?config: \{([\s\S]*?responseSchema:\s*\{[\s\S]*?\n\s*\},\n\s*\},\n\s*\}\);)\n\s*const text = response\.text;\n\s*if \(\!text\) \{\n\s*throw new Error\("Failed to receive agent response\."\);\n\s*\}\n\s*const synthesis = JSON\.parse\((.*?)\);/g;

// Instead of pure regex, let's just do AST or a simpler replacement.
