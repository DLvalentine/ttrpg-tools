// TODO: Support nested tables: either results, rolls, or both? I think nested results are more viable. E.g. a loot table where a "sack of gems" contains a gem type
// TODO: Support flags: may need a more robust way of doing it, but maintain the list in _template.yaml in new roll type examples to show what flags are available and how they work. I'm using strings because they're easier to read, but not as performant
// TODO: table manifest dependencies, or other validation (dependencies should be hidden?) - may want to refactor loadTable/load..Manifest to make this cleaner, too. E.g. loadManifest just reads the list, loadTable appends to the tables obj, etc.
// TODO: display style? would be cool to display things instead of dumping the table
import _ from 'lodash';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import dice from '../dice/dice.js';

let tables = {};

const loadTable = (path) => {
    try {
        const contents = fs.readFileSync(path, 'utf8');
        return yaml.load(contents);        
    } catch (e) {
        console.error(`[ERROR] Unable to load table: ${e}`);
        return;
    }
};

const loadTablesFromManifest = () => {
    tables = {};
    const manifest = loadTable('./tools-libs/random-tables/data/manifest.yaml');

    for (const [tableName, {path, filename, hidden}] of Object.entries(manifest.tables)) {
        if(!hidden) {
            const data = loadTable(`${path}${filename}.yaml`);
            if (data) {
                tables[tableName] = data;
            } else {
                console.error(`[ERROR] Table ${tableName} has no data.`);
            }
        }
    }
};

const rollTable = (table) => {
    if(table) {
        const diceRoll = dice.rollNumeric(dice.format(table.info.diceString));

        for(let value of table.values) {
            if(Array.isArray(value.roll)) {
                // This roll has a range of possible values
                if(diceRoll >= value.roll[0] && diceRoll <= value.roll[1]) {
                    return _.pick(value, table.info.properties);
                }
            } else if (diceRoll === value.roll) {
                return _.pick(value, table.info.properties);
            }
        }
        console.error(`[ERROR] No result found in ${table.name} for roll: ${diceRoll}. Check your data!`)
        return null;
    } else {
        console.error(`[ERROR] Table ${table} is not loaded or does not exist.`);
    }
};

// TODO if I plan to use this with further projects (UNE or Mythic GME tool?), we should not assume we want to load from manifest by default
// TODO ^ if that's done, we probably want to expose loadTablesFromManifest and loadTable, too, and remove `tables` - which would require usage updates
loadTablesFromManifest();
const randomTables = {tables, rollTable};
export default randomTables;