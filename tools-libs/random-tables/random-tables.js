// -- DISPLAY --
// TODO: display style? would be cool to display things instead of dumping the table. Could use YAML's multi-line string thing and add the field like so: [result] to "inject" it
// TODO: printf formatting in tables? Should that be another flag? Should that just be the multi-line thing I describe above?
// TODO: plural nested rolls are especially bad, but not horrible. I think they could benefit most from this.
// NOTE: Using console.table in the meantime.

import _ from 'lodash';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import dice from '../dice/dice.js';

let tables = {};

const readYAML = (path) => {
    const raw = fs.readFileSync(path, 'utf8');
    return yaml.load(raw);
}

const loadTable = (tableName, path, filename) => {
    // Bail if the table is already loaded.
    if(tables[tableName])
        return;

    try {
        const data = readYAML(`${path}${filename}.yaml`);
        if(data) {
            tables[tableName] = data;

            if(data.info.dependencies) {
                data.info.dependencies.forEach(dep => {
                    const isDepObject = typeof dep === Object;

                    const depTableName = isDepObject ? dep.tablename || dep.filename : dep;
                    const depPath = isDepObject ? dep.path || path : path;
                    const depFilename = isDepObject ? dep.filename || dep.tablename : dep;

                    loadTable(depTableName, depPath, depFilename);
                });
            }
        } else {
            console.error(`[ERROR] Table ${tableName} has no data.`);
            return;
        }
    } catch (e) {
        console.error(`[ERROR] Unable to load table: ${e}`);
        return;
    }
};

const loadTablesFromManifest = () => {
    const manifest = readYAML('./tools-libs/random-tables/data/manifest.yaml');

    for (const [tableName, {path, filename, hidden}] of Object.entries(manifest.tables)) {
        if(!hidden) {
            loadTable(tableName, path, filename);
        }
    }
};

const flags = {
    nested: 'nested',
    plural: 'plural'
};

const rollTable = (table) => {
    if(table) {
        const diceRoll = dice.rollNumeric(dice.format(table.info.diceString));

        for(let value of table.values) {
            const rollWithinRange = (Array.isArray(value.roll) && diceRoll >= value.roll[0] && diceRoll <= value.roll[1]);
            const exactRoll = (!(Array.isArray(value.roll)) && diceRoll === value.roll);

            if( rollWithinRange || exactRoll) {
                let result = _.pick(value, table.info.exposed);

                // Check for a quantity field, to see if we need to roll on that, too
                // Checking on value instead of result, since quantity might be hidden
                // Checking before rolling nested, too, since rolling N number of times on a nested table is supported
                let rolledQuantity;
                if(value.quantity) {

                    if(Array.isArray(value.quantity)) {
                        rolledQuantity = _.random(value.quantity[0], value.quantity[1]);

                        // Update result's quantity if exposed
                        if(result.quantity) {
                            result.quantity = rolledQuantity;
                        }
                    }
                }

                // Check to see if we have a nested roll, then roll it
                // TODO / NOTE: I think this only allows for one nested roll, too. I need to fix that.
                // NOTE: Could probably knock out both problems at once. Collect all the nested fields, then for each run the code below to do nesting and check for plural
                if(value.flags) {
                    const nestedField = value.flags.find(flag => flag.includes(flags.nested)).split('_')[1];
                    const nestedTableName = result[nestedField];
                    
                    if(nestedField) {
                        const quantity = rolledQuantity || result.quantity || value.quantity;

                        // TODO / NOTE: plural currently only affects the first nested field. probably need to go the plural_field route and verify that way, in the event that you have multiple plural nested fields
                        // TODO: I'll take care of that once I get caught up on documentation
                        // TODO: update documentation once this is working
                        if(value.flags.find(flag => flag.includes(flags.plural)) && quantity) {
                            let pluralResult = [];
                            
                            _.times(quantity, () => {
                                pluralResult.push(rollTable(tables[nestedTableName]));
                            });

                            result[nestedField] = pluralResult;
                        } else {
                            result[nestedField] = rollTable(tables[nestedTableName]);
                        }
                    }
                }
                return result;
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