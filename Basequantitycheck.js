// ================================================
// STEP 1️⃣: Load the page and setup structure
// ================================================
document.addEventListener("DOMContentLoaded", async () => {
    const baseQuantities = await loadBaseQuantities(); // fetch data from JSON
    const page = new Page(baseQuantities);
    page.loadPage();
});

// ================================================
// STEP 2️⃣: Fetch the base quantities data
// ================================================
async function loadBaseQuantities() {
    try {
        const response = await fetch("Basequantities.json"); // Correct file in same folder
        if (!response.ok) throw new Error("Failed to load Basequantities.json");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error loading base quantities:", error);
        alert("Could not load Basequantities.json file. Please check the file is in the same folder as the HTML and use a local server.");
        return {};
    }
}

// ================================================
// STEP 3️⃣: Main Page + Header setup
// ================================================
class Page {
    constructor(baseQuantities) {
        this.baseQuantities = baseQuantities;
    }

    loadPage() {
        new Header().createHeader();
        new InputField(this.baseQuantities).createButtons();
    }
}

class Header {
    createHeader() {
        const header = document.createElement("header");
        header.className = "header";

        // Header title
        const text = document.createElement("span");
        text.textContent = "Base Quantities Checker";
        text.className = "header-title";
        header.appendChild(text);

        // Logo
        const logo = document.createElement("img");
        logo.src = "logo.png";  // make sure it's in same folder as index.html
        logo.alt = "Company Logo";
        logo.className = "header-logo";
        header.appendChild(logo);

        // Add header to page
        document.body.prepend(header);
    }
}



// ================================================
// STEP 4️⃣: Create dynamic buttons from JSON data
// ================================================
class InputField {
    constructor(baseQuantities) {
        this.baseQuantities = baseQuantities;
    }

    createButtons() {
        for (const elementName in this.baseQuantities) {
            const container = document.createElement("div");
            container.className = "input-container";

            const button = document.createElement("button");
            button.className = "newexecutebutton";
            button.innerText = `Check ${elementName} Base Quantities`;

            button.onclick = async () => {
                const hasIssues = await checkBaseQuantitiesDynamic(
                    elementName,
                    this.baseQuantities[elementName]
                );

                if (hasIssues === "noElements") {
                    alert(`${elementName} not present in the model.`);
                } else if (hasIssues === "allOk") {
                    alert(`All ${elementName} elements are OK.`);
                } else if (hasIssues === "issuesFound") {
                    alert(`${elementName} elements with zero, negative, or undefined values added to their respective selection sets.`);
                }
            };

            container.append(button);
            document.body.append(container);
        }
    }
}

// ================================================
// STEP 5️⃣: Core logic — check base quantities
// ================================================
async function checkBaseQuantitiesDynamic(ifcPartial, properties) {
    const allElements = await desiteAPI.getAllElements("geometry");
    const filteredElements = [];

    for (const element of allElements) {
    // Get both properties
    const type = await desiteAPI.getPropertyValue(element, "ifcType", "xs:string");
    const typeObject = await desiteAPI.getPropertyValue(element, "ifcTypeObject", "xs:string");

    // Convert to lowercase for comparison
    const typeLower = type ? type.toLowerCase() : "";
    const typeObjectLower = typeObject ? typeObject.toLowerCase() : "";

    // Check if either matches the target
    if (typeLower.includes(ifcPartial.toLowerCase()) || typeObjectLower.includes(ifcPartial.toLowerCase())) {
        filteredElements.push(element);
    }
}

    if (filteredElements.length === 0) {
        return "noElements";
    }

    await desiteAPI.showElementsOnly(filteredElements);

    const selSetsWithElements = new Set();
    const elementIdsBySet = {};

    // Check all elements
for (const element of filteredElements) {
    const id = await desiteAPI.idListToStr(element);

    for (const prop of properties) {
        let value;
        // Try all possible keys until a value is found
        for (const key of prop.keys) {
            value = await desiteAPI.getPropertyValue(element, key, "xs:double");
            if (value !== null && value !== undefined) break;
        }

        if (value === null || value === undefined) value = undefined;

        let status = null;
        if (value === 0) status = "zero";
        else if (value < 0) status = "negative";
        else if (value === undefined) status = "undefined";

        if (status) {
            const setName = `${ifcPartial} with ${status} ${prop.displayName}`;
            if (!elementIdsBySet[setName]) elementIdsBySet[setName] = [];
            elementIdsBySet[setName].push(id);
            selSetsWithElements.add(setName);
        }
    }
}


    // If all are fine
    if (selSetsWithElements.size === 0) {
        return "allOk";
    }

    // Create selection sets and add IDs in bulk
    for (const [setName, ids] of Object.entries(elementIdsBySet)) {
        if (ids.length > 0) {
            const selSet = await desiteAPI.createSelectionSet(setName);
            await desiteAPI.addToSelectionSetGeometry(selSet, ids.join(";"));
        }
    }

    return "issuesFound";
}









