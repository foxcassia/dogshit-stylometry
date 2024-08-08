exports.calculateTokensJSON = (json) => {
    let tokenCount = 0;

    function traverse(obj) {
        if (obj === null || typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string') {
            tokenCount++;
        } else if (Array.isArray(obj)) {
            for (let item of obj) {
                traverse(item);
            }
        } else if (typeof obj === 'object') {
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    tokenCount++; // For the key
                    traverse(obj[key]); // For the value
                }
            }
        }
    }

    traverse(json);
    return tokenCount;
}