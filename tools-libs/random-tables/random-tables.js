// -- DISPLAY --
// TODO: display style? would be cool to display things instead of dumping the table. Could use YAML's multi-line string thing and add the field like so: [result] to "inject" it
// TODO: printf formatting in tables? Should that be another flag? Should that just be the multi-line thing I describe above?
// TODO: nested quantity rolls are especially bad, but not horrible. I think they could benefit most from this.
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

// Tokens to be used when parsing field values
const tokens = {
    table: '$t|' // When found, we know the field value needs to be determined from a roll on another table. May also have a quantity. E.g. $n|table:2 or $n|table:[1,4] for a rolled quantity
};

const getOrRollQuantity = (rawQuantity, parse = false) => {
    if(!rawQuantity) {
        return 1;
    }

    let quantity = rawQuantity;

    if(parse) {
        quantity = JSON.parse(rawQuantity);
    }

    if(Array.isArray(quantity)) {
        return _.random(quantity[0], quantity[1]);
    } else {
        return quantity;
    }
}

const rollFieldTable = (fieldValue) => {
    const fieldValueWithoutToken = fieldValue.split(tokens.table)[1];
    const fieldTableName = fieldValueWithoutToken.split(':')[0];
    const fieldTableQuantity = getOrRollQuantity(fieldValueWithoutToken.split(':')[1], true);
    
    const tableRolls = [];
    _.times(fieldTableQuantity, () => {
        tableRolls.push(rollTable(tables[fieldTableName]));
    });
    
    if(fieldTableQuantity === 1) {
        return tableRolls[0];
    } else {
        return tableRolls;
    }
}

const rollTable = (table) => {
    if(table) {
        const diceRoll = dice.rollNumeric(dice.format(table.info.diceString));

        for(let value of table.values) {
            const rollWithinRange = (Array.isArray(value.roll) && diceRoll >= value.roll[0] && diceRoll <= value.roll[1]);
            const exactRoll = (!(Array.isArray(value.roll)) && diceRoll === value.roll);

            if(rollWithinRange || exactRoll) {
                let result = _.pick(value, table.info.exposed);
                
                // Quantity might not be exposed, so set it after we pick the table
                if(result.quantity) {
                    result.quantity = getOrRollQuantity(result.quantity);
                }

                // TODO field object + nesting + quantity, field array + nesting + quantity
                // TODO replace all usages of "nest" with "table"
                Object.keys(result).forEach(field => {
                    if(Array.isArray(result[field])) {
                        result[field].forEach((item, idx, arr) => {
                            if(typeof item === 'string' && item.includes(tokens.table)) {
                                arr[idx] = rollFieldTable(item);
                            }
                        });
                    } else if(typeof result[field] === 'object') {
                        Object.keys(result[field]).forEach(key => {
                            if(typeof result[field][key] === 'string' && result[field][key].includes(tokens.table)) {
                                result[field][key] = rollFieldTable(result[field][key]);
                            }
                        });
                    } else if(typeof result[field] === 'string') {
                        if(result[field].includes(tokens.table)) {
                            result[field] = rollFieldTable(result[field]);
                        }
                    }
                });

                return result;
            }
        }
        console.error(`[ERROR] No result found in ${table.name} for roll: ${diceRoll}. Check your data!`)
        return;
    } else {
        console.error(`[ERROR] Table ${table} is not loaded or does not exist.`);
    }
};

// TODO if I plan to use this with further projects (UNE or Mythic GME tool?), we should not assume we want to load from manifest by default
// TODO ^ if that's done, we probably want to expose loadTablesFromManifest and loadTable, too, and remove `tables` - which would require usage updates
loadTablesFromManifest();
const randomTables = {tables, rollTable};
export default randomTables;