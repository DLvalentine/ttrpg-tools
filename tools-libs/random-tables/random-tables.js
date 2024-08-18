// TODO: document flags in _template.yaml
// TODO: display style? would be cool to display things instead of dumping the table. Could use YAML's multi-line string thing and add the field like so: [result] to "inject" it
// TODO: printf formatting in tables? Should that be another flag? Should that just be the multi-line thing I describe above?
// TODO: What if we want mixed nested rolls with variable quantity - e.g. a sack of gems: 1 ruby, 1 diamond, 2 emerald. I may want to break this up a little if I keep adding features lol
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
    nested: 'nested'
};

const rollTable = (table) => {
    if(table) {
        const diceRoll = dice.rollNumeric(dice.format(table.info.diceString));

        for(let value of table.values) {
            let rollWithinRange = (Array.isArray(value.roll) && diceRoll >= value.roll[0] && diceRoll <= value.roll[1]);
            let exactRoll = (!(Array.isArray(value.roll)) && diceRoll === value.roll);

            if( rollWithinRange || exactRoll) {
                let result = _.pick(value, table.info.properties);

                // Check to see if we have a nested roll, then roll it
                if(value.flags) {
                    value.flags.forEach(flag => {
                        const [flagName, flaggedField] = flag.split('_');

                        if(flagName === flags.nested) {
                            const nestedTableName = result[flaggedField];
                            result[flaggedField] = rollTable(tables[nestedTableName]);
                        }
                    });
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