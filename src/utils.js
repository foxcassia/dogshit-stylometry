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


exports.jsonToBulletedList = (json) => {
    // Helper function to create a list item
    function createListItem(content) {
        return `<li>${content}</li>`;
    }

    // Helper function to handle arrays
    function handleArray(array) {
        let listItems = array.map(item => {
            if (typeof item === 'object') {
                return `<li>${exports.jsonToBulletedList(item)}</li>`;
            }
            return createListItem(item);
        }).join('');
        return `<ul>${listItems}</ul>`;
    }

    // Helper function to handle objects
    function handleObject(obj) {
        let listItems = Object.entries(obj).map(([key, value]) => {
            if (typeof value === 'object') {
                return `<li>${key}: ${exports.jsonToBulletedList(value)}</li>`;
            }
            return createListItem(`${key}: ${value}`);
        }).join('');
        return `<ul>${listItems}</ul>`;
    }

    if (Array.isArray(json)) {
        return handleArray(json);
    } else if (typeof json === 'object') {
        return handleObject(json);
    } else {
        return createListItem(json);
    }
}